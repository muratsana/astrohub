-- ════════════════════════════════════════════════════════════════════════════
-- 0042 — BİLDİRİM MERKEZİ
--
-- `notification_preferences` 0003'ten beri duruyordu ve HİÇBİR ŞEYİ
-- yönetmiyordu: tercih tablosu vardı, tercih edilecek bildirim yoktu.
-- Bu göç o boşluğu kapatıyor.
--
-- ÜÇ KARAR BU DOSYAYI ŞEKİLLENDİRDİ:
--
-- 1. BİLDİRİM İSTEMCİDEN YAZILAMAZ. `insert` yetkisi `authenticated`
--    rolüne hiç verilmiyor. Bir kullanıcı başkasının adına "X seni takip
--    etti" bildirimi uyduramasın diye; üretimin tek yolu tetikleyiciler
--    ve yönetici RPC'si.
--
-- 2. KATEGORİ VERİTABANINDA TÜRETİLİYOR. 18 bildirim türünün hangi
--    kategoriye düştüğü tek yerde yazıyor (`app.notification_category_of`)
--    ve kolon o fonksiyondan üretiliyor. İstemcide ikinci bir eşleme
--    tutsaydık, tercih ekranında "sosyal"i kapatan kullanıcı veritabanının
--    "içerik" saydığı bir bildirimi almaya devam ederdi.
--
-- 3. TEKİLLEŞTİRME OKUNMAMIŞ PENCEREYE BAĞLI. Aynı kişi aynı fotoğrafa
--    beş yorum yazınca beş satır değil bir satır oluyor — ama kullanıcı
--    okuduktan sonra yeni yorum yeni bildirim üretiyor. Kalıcı tekillik
--    (okundu olsa bile ikinciyi engellemek) bildirimi bir kez alıp bir
--    daha asla duymamak demekti.
-- ════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════
-- TÜRLER
--
-- Enum, serbest metin değil: tetikleyicide yazım hatası göç sırasında
-- patlıyor, üretimde sessizce "unknown" bir tür üretmiyor.
-- ══════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'app' and t.typname = 'notification_kind') then
    create type app.notification_kind as enum (
      -- sosyal
      'follow',            -- biri seni takip etti
      'comment',           -- fotoğrafına yorum geldi
      'comment_reply',     -- forum konuna yanıt geldi
      'like',              -- fotoğrafın beğenildi
      'rating',            -- fotoğrafın puanlandı
      'message',           -- yeni mesaj
      -- içerik
      'photo_featured',    -- fotoğrafın öne çıkarıldı
      'moderation',        -- moderasyon sonucu
      'listing',           -- ilanınla ilgili gelişme
      -- etkinlik
      'event_new',         -- şehrinde yeni etkinlik
      'event_changed',     -- takip ettiğin etkinlik değişti
      'event_cancelled',   -- etkinlik iptal edildi
      'event_reminder',    -- etkinlik hatırlatması
      -- yayın
      'broadcast_live',    -- radyo/TV yayını başladı
      -- sistem
      'membership',        -- üyelik/ödeme
      'announcement',      -- site duyurusu
      'system',            -- teknik bildirim
      'admin_direct'       -- yöneticiden doğrudan mesaj
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'app' and t.typname = 'notification_category') then
    create type app.notification_category as enum (
      'sosyal', 'icerik', 'etkinlik', 'yayin', 'sistem'
    );
  end if;
end $$;

/*
 * TÜR → KATEGORİ. Tek kaynak.
 *
 * `immutable` işaretli çünkü üretilen kolon (`generated always as`) ancak
 * değişmez bir ifadeden beslenebilir. Eşleme zaten sabit: bir türün
 * kategorisi zamanla değişecek bir şey değil, değişirse göçle değişir.
 */
create or replace function app.notification_category_of(kind app.notification_kind)
returns app.notification_category
language sql
immutable
as $$
  select case kind
    when 'follow'          then 'sosyal'
    when 'comment'         then 'sosyal'
    when 'comment_reply'   then 'sosyal'
    when 'like'            then 'sosyal'
    when 'rating'          then 'sosyal'
    when 'message'         then 'sosyal'
    when 'photo_featured'  then 'icerik'
    when 'moderation'      then 'icerik'
    when 'listing'         then 'icerik'
    when 'event_new'       then 'etkinlik'
    when 'event_changed'   then 'etkinlik'
    when 'event_cancelled' then 'etkinlik'
    when 'event_reminder'  then 'etkinlik'
    when 'broadcast_live'  then 'yayin'
    else 'sistem'
  end::app.notification_category;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- TABLO
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  /* Alıcı. Silinirse bildirimleri de gider — kimsenin okumayacağı
     satırları saklamanın anlamı yok. */
  user_id     uuid not null references auth.users(id) on delete cascade,
  /* Eylemi yapan. Hesabı silinse bile bildirim ayakta kalsın diye
     `set null`: "Bir kullanıcı fotoğrafını beğendi" hâlâ doğru cümle. */
  actor_id    uuid references auth.users(id) on delete set null,
  kind        app.notification_kind not null,
  category    app.notification_category
                generated always as (app.notification_category_of(kind)) stored,

  /* METİN SATIRDA DONDURULUYOR, İLİŞKİDEN ÜRETİLMİYOR.
     "Ali fotoğrafını beğendi" cümlesini her okumada profiles+astro_photos
     birleştirerek kurmak, silinen bir fotoğrafta bildirimi okunamaz hâle
     getirirdi. Bildirim bir OLAY KAYDI: olduğu andaki hâlini taşıyor. */
  title       text not null,
  body        text,
  /* Tıklanınca gidilecek uygulama içi yol. Boşsa bildirim bağlantı
     değil, düz satır — "gidilecek bir yer yok" hâli geçerli. */
  url         text,

  /* Tekilleştirme ve temizlik için hedef. Çok biçimli olduğu için yabancı
     anahtar yok; silme temizliği aşağıdaki tetikleyicilerde. */
  subject_type text,
  subject_id   uuid,

  read_at     timestamptz,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),

  constraint notifications_title_len check (char_length(title) between 1 and 200),
  constraint notifications_body_len  check (body is null or char_length(body) <= 500),
  constraint notifications_url_len   check (url is null or char_length(url) <= 300),
  /* Uygulama içi yol; mutlak URL kabul edilmiyor. Bildirim listesi
     dışarıya açılan bir kapı olmamalı. */
  constraint notifications_url_local check (url is null or url like '/%')
);

comment on table public.notifications is
  'Bildirim merkezi (§8.13). Yalnızca tetikleyiciler ve app.notify() yazar.';

/* Liste sorgusu: kendi bildirimlerim, yeniden eskiye, arşivlenmemişler. */
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

/* Zil rozetindeki sayı — kısmi indeks, okunmuşları hiç taşımıyor. */
create index if not exists notifications_unread_idx
  on public.notifications (user_id)
  where read_at is null and archived_at is null;

/* Kayıt silinince ilgili bildirimleri toplamak için. */
create index if not exists notifications_subject_idx
  on public.notifications (subject_type, subject_id)
  where subject_id is not null;

/*
 * TEKİLLEŞTİRME.
 *
 * Aynı alıcı + aynı tür + aynı hedef + aynı eyleyen, OKUNMAMIŞ olduğu
 * sürece tek satır. `app.notify()` bu indekse yaslanıp `on conflict do
 * nothing` diyor.
 *
 * `coalesce` gerekli: NULL'lar birbirine eşit sayılmaz, dolayısıyla
 * eyleyeni ya da hedefi olmayan sistem bildirimleri indeks olmadan
 * çoğalırdı.
 */
create unique index if not exists notifications_unread_unique
  on public.notifications (
    user_id,
    kind,
    coalesce(subject_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(actor_id,   '00000000-0000-0000-0000-000000000000'::uuid)
  )
  where read_at is null and archived_at is null;

-- ══════════════════════════════════════════════════════════════════════════
-- KULLANICI YALNIZCA OKUNDU/ARŞİV DURUMUNU DEĞİŞTİREBİLİR
--
-- `update` yetkisi gerekli (okundu işaretlemek için) ama metni
-- değiştirmek değil. RLS bunu ifade edemiyor — satır bazlı, kolon bazlı
-- değil. Tetikleyici eski değerleri geri yazıyor.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.notifications_guard_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  /* Yönetici içerik düzeltmesi yapabilir (yanlış yazılmış duyuru).
     Sıradan kullanıcı için içerik alanları dokunulmaz. */
  if app.is_admin() then
    return new;
  end if;

  new.user_id      := old.user_id;
  new.actor_id     := old.actor_id;
  new.kind         := old.kind;
  new.title        := old.title;
  new.body         := old.body;
  new.url          := old.url;
  new.subject_type := old.subject_type;
  new.subject_id   := old.subject_id;
  new.created_at   := old.created_at;
  return new;
end $$;

drop trigger if exists notifications_guard on public.notifications;
create trigger notifications_guard
  before update on public.notifications
  for each row execute function app.notifications_guard_fields();

-- ══════════════════════════════════════════════════════════════════════════
-- TERCİH KONTROLÜ
--
-- `notification_preferences.categories` biçimi: {"sosyal": false}.
-- YOKLUK İZİN DEMEK: satırı olmayan ya da anahtarı olmayan kullanıcı
-- bildirimi alır. Tersi olsaydı (yokluk = kapalı) tercih tablosuna hiç
-- dokunmamış her kullanıcı sessiz kalırdı.
--
-- SİSTEM KATEGORİSİ KAPATILAMAZ. Üyelik bitişi, moderasyon kararı, hesap
-- uyarısı — bunları kapatmak kullanıcıyı kendi hesabıyla ilgili
-- gelişmelerden habersiz bırakırdı. Tercih ekranında da bu kategori
-- kapatılabilir gösterilmiyor.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.notification_allowed(
  target_user uuid,
  kind app.notification_kind
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when app.notification_category_of(kind) = 'sistem' then true
    else coalesce(
      (select (p.categories ->> app.notification_category_of(kind)::text)::boolean
         from public.notification_preferences p
        where p.user_id = target_user),
      true
    )
  end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- MERKEZİ ÜRETİCİ
--
-- Her tetikleyici kendi kontrol listesini yazsaydı biri engellemeyi,
-- diğeri tercihi unuturdu. Dört kural burada, tek yerde:
--   kendine bildirim yok · engelli ikili arasında bildirim yok ·
--   kapalı kategori yok · okunmamış kopya yok.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.notify(
  recipient    uuid,
  actor        uuid,
  kind         app.notification_kind,
  title        text,
  body         text default null,
  url          text default null,
  subject_type text default null,
  subject_id   uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  created uuid;
begin
  if recipient is null then
    return null;
  end if;

  /* Kendi eylemin sana bildirim değil. Kendi fotoğrafına yorum yazınca
     "yorum geldi" demek, bildirimi gürültüye çevirirdi. */
  if actor is not null and actor = recipient then
    return null;
  end if;

  if actor is not null and app.is_blocked(actor, recipient) then
    return null;
  end if;

  if not app.notification_allowed(recipient, kind) then
    return null;
  end if;

  insert into public.notifications (
    user_id, actor_id, kind, title, body, url, subject_type, subject_id
  )
  values (
    recipient, actor, kind, left(title, 200), left(body, 500), url,
    subject_type, subject_id
  )
  on conflict do nothing
  returning id into created;

  return created;
end $$;

-- ══════════════════════════════════════════════════════════════════════════
-- ÜRETİM TETİKLEYİCİLERİ
-- ══════════════════════════════════════════════════════════════════════════

/*
 * FOTOĞRAF YORUMU.
 *
 * Hedef fotoğrafın KENDİSİ (yorum değil): aynı kişi aynı fotoğrafa üç
 * yorum yazdığında üç bildirim yerine bir bildirim çıksın diye. Kullanıcı
 * fotoğrafı açtığında üç yorumu da görüyor zaten.
 */
create or replace function app.notify_photo_comment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  photo record;
  who   text;
begin
  select p.user_id, p.slug, p.title into photo
    from public.astro_photos p where p.id = new.photo_id;

  if photo.user_id is null then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.user_id;

  perform app.notify(
    photo.user_id,
    new.user_id,
    'comment',
    coalesce(who, 'Bir üye') || ' fotoğrafına yorum yaptı',
    photo.title,
    '/fotograf/' || photo.slug,
    'photo',
    new.photo_id
  );
  return new;
end $$;

drop trigger if exists photo_comments_notify on public.photo_comments;
create trigger photo_comments_notify
  after insert on public.photo_comments
  for each row execute function app.notify_photo_comment();

/* FOTOĞRAF BEĞENİSİ. */
create or replace function app.notify_photo_like()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  photo record;
  who   text;
begin
  select p.user_id, p.slug, p.title into photo
    from public.astro_photos p where p.id = new.photo_id;

  if photo.user_id is null then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.user_id;

  perform app.notify(
    photo.user_id,
    new.user_id,
    'like',
    coalesce(who, 'Bir üye') || ' fotoğrafını beğendi',
    photo.title,
    '/fotograf/' || photo.slug,
    'photo',
    new.photo_id
  );
  return new;
end $$;

drop trigger if exists photo_likes_notify on public.photo_likes;
create trigger photo_likes_notify
  after insert on public.photo_likes
  for each row execute function app.notify_photo_like();

/*
 * TAKİP.
 *
 * Hedef takip edenin KENDİSİ: aynı kişi takip edip bırakıp tekrar takip
 * ettiğinde okunmamış tek bildirim kalıyor.
 */
create or replace function app.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who    text;
  handle text;
begin
  select coalesce(pr.display_name, pr.username::text, 'Bir üye'), pr.username::text
    into who, handle
    from public.profiles pr where pr.id = new.follower_id;

  perform app.notify(
    new.followee_id,
    new.follower_id,
    'follow',
    coalesce(who, 'Bir üye') || ' seni takip etmeye başladı',
    null,
    case when handle is not null then '/profil/' || handle else null end,
    'user',
    new.follower_id
  );
  return new;
end $$;

drop trigger if exists follows_notify on public.follows;
create trigger follows_notify
  after insert on public.follows
  for each row execute function app.notify_follow();

/*
 * FORUM YANITI.
 *
 * Konu sahibine gidiyor. Konudaki diğer katılımcılara da göndermek
 * ("bu konuyu takip ediyorsun") ayrı bir abonelik tablosu ister; onsuz
 * herkese göndermek, bir kez yazdığı konudan aylarca bildirim almak
 * demekti.
 */
create or replace function app.notify_forum_reply()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  thread record;
  who    text;
begin
  select t.author_id, t.slug, t.title into thread
    from public.forum_threads t where t.id = new.thread_id;

  if thread.author_id is null then
    return new;
  end if;

  select coalesce(pr.display_name, pr.username::text, 'Bir üye') into who
    from public.profiles pr where pr.id = new.author_id;

  perform app.notify(
    thread.author_id,
    new.author_id,
    'comment_reply',
    coalesce(who, 'Bir üye') || ' konuna yanıt yazdı',
    thread.title,
    '/forum/' || thread.slug,
    'forum_thread',
    new.thread_id
  );
  return new;
end $$;

drop trigger if exists forum_posts_notify on public.forum_posts;
create trigger forum_posts_notify
  after insert on public.forum_posts
  for each row execute function app.notify_forum_reply();

/*
 * MODERASYON SONUCU.
 *
 * SITE-AUDIT §356'nın açık bulgusu: rapor eden kişi raporunun ne olduğunu
 * öğrenemiyordu. Kuyruk kapandığında raporlayana sonuç gidiyor.
 *
 * `actor` YOK. Kararı veren moderatörün kimliği raporlayana açılmamalı;
 * bu bir kurum kararı, kişisel bir cevap değil. Eyleyen boş olunca
 * `app.notify` engelleme kontrolünü de atlıyor — doğrusu bu: raporladığın
 * kişiyi engellemiş olman raporunun sonucunu öğrenmene engel değil.
 */
create or replace function app.notify_moderation_result()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reported_by is null then
    return new;
  end if;

  if new.status = old.status or new.status not in ('approved', 'rejected') then
    return new;
  end if;

  perform app.notify(
    new.reported_by,
    null,
    'moderation',
    case new.status
      when 'approved' then 'Raporun incelendi ve haklı bulundu'
      else 'Raporun incelendi'
    end,
    coalesce(new.resolution_note, 'İncelemeyi tamamladık, teşekkürler.'),
    null,
    'moderation',
    new.id
  );
  return new;
end $$;

drop trigger if exists moderation_queue_notify on public.moderation_queue;
create trigger moderation_queue_notify
  after update on public.moderation_queue
  for each row execute function app.notify_moderation_result();

-- ══════════════════════════════════════════════════════════════════════════
-- SİLİNEN KAYDIN BİLDİRİMİ
--
-- Bildirimin metni satırda donduğu için silinen fotoğrafta bildirim
-- OKUNABİLİR kalıyor — ama bağlantısı 404'e gider. Kullanıcıya kendi
-- bildirim listesinden ölü bağlantı sunmak yerine satırı topluyoruz.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.notifications_clean_subject()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.notifications
   where subject_type = tg_argv[0]
     and subject_id = old.id;
  return old;
end $$;

drop trigger if exists astro_photos_notify_cleanup on public.astro_photos;
create trigger astro_photos_notify_cleanup
  after delete on public.astro_photos
  for each row execute function app.notifications_clean_subject('photo');

drop trigger if exists forum_threads_notify_cleanup on public.forum_threads;
create trigger forum_threads_notify_cleanup
  after delete on public.forum_threads
  for each row execute function app.notifications_clean_subject('forum_thread');

-- ══════════════════════════════════════════════════════════════════════════
-- YÖNETİCİ BİLDİRİMİ
--
-- `insert` yetkisi hiçbir role verilmediği için duyuru göndermenin tek
-- yolu bu RPC. Rol kontrolü fonksiyonun içinde: `security definer` bir
-- fonksiyona yetkisiz erişim, tabloya doğrudan yazma yetkisi vermekle
-- aynı şey olurdu.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function public.notify_user(
  recipient uuid,
  title     text,
  body      text default null,
  url       text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not app.is_admin() then
    raise exception 'Yalnızca yöneticiler bildirim gönderebilir.'
      using errcode = 'insufficient_privilege';
  end if;

  return app.notify(
    recipient, null, 'admin_direct', title, body, url, null, null
  );
end $$;

grant execute on function public.notify_user(uuid, text, text, text) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- SATIR GÜVENLİĞİ
-- ══════════════════════════════════════════════════════════════════════════
alter table public.notifications enable row level security;

drop policy if exists notifications_read_own on public.notifications;
create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

/*
 * INSERT YETKİSİ YOK — YAZIM HATASI DEĞİL.
 * Tetikleyiciler ve app.notify() `security definer`, tablo sahibinin
 * yetkisiyle yazıyor; istemcinin yazma yolu tümüyle kapalı.
 */
grant select, update, delete on public.notifications to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- CANLI YAYIN
--
-- Zil rozetinin yenilenmek için sayfa yenilenmesini beklemesi, bildirim
-- merkezini bir gelen kutusundan çok bir arşive çevirirdi. Realtime
-- yayınında RLS geçerli: her kullanıcı yalnızca kendi satırını duyuyor.
-- ══════════════════════════════════════════════════════════════════════════
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
