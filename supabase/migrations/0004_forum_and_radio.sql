-- 0004_forum_and_radio.sql
-- Forum (kategori / konu / mesaj) ve Radyo (çalma listesi) modülleri.
--
-- İLKE: her tablo RLS ve politikalarıyla BİRLİKTE gelir. 0002'de RLS ayrı
-- bir bölüme bırakılmıştı ve uzak projeye hiç uygulanmadı — tablolar aylarca
-- açıkta kaldı. Bu dosyada her tablonun politikaları hemen altındadır.

-- ══════════════════════════════════════════════════════════════════════════
-- FORUM KATEGORİLERİ
-- Kategori seti editoryal bir karardır; kullanıcı kategori açamaz. Kullanıcı
-- açabildiğinde forumlar hızla birbirinin kopyası on beş kategoriye dönüşüyor.
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.forum_categories (
  id          text primary key,              -- 'ekipman', 'isleme' …
  name        text not null,
  description text not null default '',
  position    integer not null default 0,    -- listeleme sırası
  created_at  timestamptz not null default now()
);

comment on table public.forum_categories is
  'Sabit forum kategorileri. Yalnızca admin/content_editor yazar.';

alter table public.forum_categories enable row level security;

drop policy if exists forum_categories_read on public.forum_categories;
create policy forum_categories_read on public.forum_categories
  for select using (true);

drop policy if exists forum_categories_admin_write on public.forum_categories;
create policy forum_categories_admin_write on public.forum_categories
  for all using (app.is_admin()) with check (app.is_admin());

-- ══════════════════════════════════════════════════════════════════════════
-- KONULAR
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.forum_threads (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  title          text not null,
  body           text not null,
  category_id    text not null references public.forum_categories (id),
  author_id      uuid not null references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- Son mesaj zamanı. Sıralamayı hızlandırmak için denormalize edilir;
  -- her listelemede alt sorgu çalıştırmak forum büyüdükçe pahalılaşıyor.
  last_activity_at timestamptz not null default now(),
  reply_count    integer not null default 0,
  view_count     integer not null default 0,
  pinned         boolean not null default false,
  locked         boolean not null default false,
  -- Çözüm olarak işaretlenen yanıt. FK yok: forum_posts bu tablodan sonra
  -- oluşuyor ve karşılıklı bağımlılık migration sırasını kilitliyor.
  solution_post_id uuid,
  tags           text[] not null default '{}',
  constraint forum_threads_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint forum_threads_title_length check (char_length(title) between 8 and 160)
);

comment on column public.forum_threads.last_activity_at is
  'Son mesaj zamanı (denormalize). Sıralama bunun üzerinden yapılır.';

create index if not exists forum_threads_activity_idx
  on public.forum_threads (pinned desc, last_activity_at desc);
create index if not exists forum_threads_category_idx
  on public.forum_threads (category_id, last_activity_at desc);
-- Türkçe tam metin arama yerine trigram: kısmi ve yazım hatalı aramalarda
-- daha iyi çalışıyor ve Postgres'te Türkçe sözlük yapılandırması gerektirmiyor.
create index if not exists forum_threads_title_trgm_idx
  on public.forum_threads using gin (title gin_trgm_ops);

drop trigger if exists forum_threads_set_updated_at on public.forum_threads;
create trigger forum_threads_set_updated_at
  before update on public.forum_threads
  for each row execute function app.set_updated_at();

alter table public.forum_threads enable row level security;

-- Okuma herkese açık: forum içeriği arama motorlarında görünmeli.
drop policy if exists forum_threads_read on public.forum_threads;
create policy forum_threads_read on public.forum_threads
  for select using (true);

-- Konu açmak oturum ister; başkasının adına konu açılamaz.
drop policy if exists forum_threads_insert_own on public.forum_threads;
create policy forum_threads_insert_own on public.forum_threads
  for insert with check (auth.uid() = author_id);

drop policy if exists forum_threads_update_own on public.forum_threads;
create policy forum_threads_update_own on public.forum_threads
  for update
  using (auth.uid() = author_id and not locked)
  with check (auth.uid() = author_id);

/*
 * MODERASYON ALANLARININ KORUNMASI.
 *
 * RLS satır bazlıdır, KOLON BAZLI DEĞİLDİR. "Sahibi kendi konusunu
 * güncelleyebilir" politikası tek başına, kullanıcının kendi konusunu
 * `pinned = true` yapmasına ya da `locked` bayrağını kaldırmasına da izin
 * verir — politika satıra bakar, hangi kolonun değiştiğine bakmaz.
 *
 * Bunu politika içinde çözmeye çalışmak (WITH CHECK içinde alt sorguyla eski
 * değeri okumak) işe yaramıyor: alt sorgudaki `id` hem dış satırı hem iç
 * tabloyu işaret ettiği için ifade sessizce kendisiyle eşleşiyor. Doğru
 * mekanizma tetikleyicidir — OLD ve NEW burada gerçekten ayrı.
 *
 * Yetkili kullanıcıda tetikleyici çekilir; yetkisizde eski değerler
 * hataya düşürmek yerine geri yazılır. Sessizce yoksaymak, arayüzün
 * "kaydedildi" deyip bayrağın dönmemesi anlamına gelirdi; bu yüzden
 * moderasyon alanı değiştirilmeye çalışılırsa açık hata veriyoruz.
 */
create or replace function app.forum_guard_moderation_fields()
returns trigger
language plpgsql
-- SECURITY INVOKER (varsayılan) BİLİNÇLİ. Tanımlayıcı olsaydı `current_user`
-- her çağrıda `postgres` olurdu ve aşağıdaki rol kontrolü hiçbir şey ayırt
-- edemezdi.
set search_path = ''
as $$
begin
  /*
   * Yalnızca istemci rollerini kısıtla.
   *
   * `reply_count` ve `last_activity_at` alanlarını, aşağıdaki
   * `app.forum_touch_thread()` tetikleyicisi (SECURITY DEFINER, yani
   * `postgres` olarak) güncelliyor. Bu erken çıkış olmadan her yanıt
   * yazma girişimi kendi sayaç güncellemesinde bu korumaya çarpıp
   * hata veriyordu — foruma hiç mesaj yazılamazdı.
   */
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if app.is_admin() or app.has_role('moderator') then
    return new;
  end if;

  if new.pinned is distinct from old.pinned
     or new.locked is distinct from old.locked
     or new.reply_count is distinct from old.reply_count
     or new.view_count is distinct from old.view_count
     or new.author_id is distinct from old.author_id
     or new.created_at is distinct from old.created_at then
    raise exception 'moderasyon alanları yalnızca moderatör tarafından değiştirilebilir'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists forum_threads_guard_moderation on public.forum_threads;
create trigger forum_threads_guard_moderation
  before update on public.forum_threads
  for each row execute function app.forum_guard_moderation_fields();

drop policy if exists forum_threads_moderate on public.forum_threads;
create policy forum_threads_moderate on public.forum_threads
  for all
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

-- ══════════════════════════════════════════════════════════════════════════
-- MESAJLAR
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.forum_posts (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references public.forum_threads (id) on delete cascade,
  author_id  uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited     boolean not null default false,
  constraint forum_posts_body_length check (char_length(body) between 2 and 20000)
);

create index if not exists forum_posts_thread_idx
  on public.forum_posts (thread_id, created_at);

drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
  before update on public.forum_posts
  for each row execute function app.set_updated_at();

alter table public.forum_posts enable row level security;

drop policy if exists forum_posts_read on public.forum_posts;
create policy forum_posts_read on public.forum_posts
  for select using (true);

-- Kilitli konuya yanıt yazılamaz — kontrol veritabanında, arayüzde değil.
drop policy if exists forum_posts_insert_own on public.forum_posts;
create policy forum_posts_insert_own on public.forum_posts
  for insert with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.forum_threads t
      where t.id = thread_id and not t.locked
    )
  );

drop policy if exists forum_posts_update_own on public.forum_posts;
create policy forum_posts_update_own on public.forum_posts
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id);

drop policy if exists forum_posts_delete_own on public.forum_posts;
create policy forum_posts_delete_own on public.forum_posts
  for delete using (auth.uid() = author_id);

drop policy if exists forum_posts_moderate on public.forum_posts;
create policy forum_posts_moderate on public.forum_posts
  for all
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

/*
 * Yanıt sayacı ve son etkinlik zamanı tetikleyiciyle güncellenir.
 *
 * Uygulama katmanında güncellemek yerine burada yapmanın nedeni: sayaç
 * ancak mesaj gerçekten yazıldıysa artmalı. İstemci iki adımı ayrı
 * gönderirse (mesaj + sayaç) arada kopan bağlantı sayaçları kalıcı olarak
 * yanlışa düşürüyor.
 */
create or replace function app.forum_touch_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT') then
    update public.forum_threads
       set reply_count = reply_count + 1,
           last_activity_at = new.created_at
     where id = new.thread_id;
    return new;
  elsif (tg_op = 'DELETE') then
    update public.forum_threads
       set reply_count = greatest(0, reply_count - 1)
     where id = old.thread_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_posts_touch_thread on public.forum_posts;
create trigger forum_posts_touch_thread
  after insert or delete on public.forum_posts
  for each row execute function app.forum_touch_thread();

-- Çözüm işaretinin FK'si tablo oluştuktan sonra eklenir.
alter table public.forum_threads
  drop constraint if exists forum_threads_solution_fk;
alter table public.forum_threads
  add constraint forum_threads_solution_fk
  foreign key (solution_post_id) references public.forum_posts (id)
  on delete set null;

-- ══════════════════════════════════════════════════════════════════════════
-- RADYO
-- ══════════════════════════════════════════════════════════════════════════
create type public.radio_source as enum ('mp3', 'spotify');

create table if not exists public.radio_tracks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  artist       text not null default '',
  source       public.radio_source not null,
  /*
   * mp3  → `radio` bucket'ındaki nesne yolu (tam URL değil).
   *        Yol saklamak, proje/CDN adresi değiştiğinde tüm satırları
   *        güncellemek zorunda kalmamayı sağlar.
   * spotify → https://open.spotify.com/track/<id>
   */
  path         text not null,
  duration_sec integer,
  note         text,
  position     integer not null default 0,
  published    boolean not null default false,
  added_by     uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint radio_tracks_duration_sane
    check (duration_sec is null or duration_sec between 1 and 7200)
);

comment on table public.radio_tracks is
  'Radyo çalma listesi. Yalnızca published=true olanlar yayına girer.';

create index if not exists radio_tracks_playlist_idx
  on public.radio_tracks (published, position);

alter table public.radio_tracks enable row level security;

-- Yayındaki parçalar herkese açık; taslaklar yalnızca yönetime görünür.
drop policy if exists radio_tracks_read_published on public.radio_tracks;
create policy radio_tracks_read_published on public.radio_tracks
  for select using (published or app.is_admin() or app.has_role('content_editor'));

drop policy if exists radio_tracks_editor_write on public.radio_tracks;
create policy radio_tracks_editor_write on public.radio_tracks
  for all
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİLER (bkz. 0003 — TRUNCATE RLS'e tabi değildir)
-- ══════════════════════════════════════════════════════════════════════════
revoke all on public.forum_categories from anon, authenticated;
revoke all on public.forum_threads    from anon, authenticated;
revoke all on public.forum_posts      from anon, authenticated;
revoke all on public.radio_tracks     from anon, authenticated;

-- anon salt okur: forum ve radyo içeriği giriş yapmadan da görünür.
grant select on public.forum_categories to anon;
grant select on public.forum_threads    to anon;
grant select on public.forum_posts      to anon;
grant select on public.radio_tracks     to anon;

grant select, insert, update, delete on public.forum_categories to authenticated;
grant select, insert, update, delete on public.forum_threads    to authenticated;
grant select, insert, update, delete on public.forum_posts      to authenticated;
grant select, insert, update, delete on public.radio_tracks     to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- BAŞLANGIÇ KATEGORİLERİ
-- ══════════════════════════════════════════════════════════════════════════
insert into public.forum_categories (id, name, description, position) values
  ('baslangic',        'Başlangıç',        'İlk teleskop, ilk kayıt, temel sorular', 1),
  ('ekipman',          'Ekipman',          'Teleskop, montür, kamera, filtre; kurulum ve arıza', 2),
  ('isleme',           'Görüntü İşleme',   'Yığınlama, kalibrasyon, streç, gürültü', 3),
  ('gozlem-raporlari', 'Gözlem Raporları', 'Gece notları, seeing koşulları, gözlem günlükleri', 4),
  ('saha-ve-seyahat',  'Saha ve Seyahat',  'Karanlık gökyüzü noktaları, kamp, yol ve lojistik', 5),
  ('yazilim',          'Yazılım',          'NINA, PHD2, PixInsight, Siril, ASCOM/INDI', 6)
on conflict (id) do nothing;
