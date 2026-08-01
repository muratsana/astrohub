-- 0053_podcast_arsivi.sql
--
-- FAZ 7 — §10.4 podcast altyapısı.
--
-- ══════════════════════════════════════════════════════════════════════════
-- DİNLEME GEÇMİŞİ TUTULMUYOR
--
-- §10.4 iki şey istiyor: "dinleme ilerlemesi" ve "bölüm analitiği".
-- İkisini de vermenin kolay yolu her oynatmaya bir satır yazmaktır ve o
-- satırlar toplandığında ortaya kullanıcıların ne dinlediğini gösteren
-- bir geçmiş veritabanı çıkar. Bu şemada öyle bir tablo YOK.
--
--   ilerleme  → `episode_progress`, kişi başına bölüm başına TEK satır.
--               Üzerine yazılıyor, biriktirilmiyor: "kaldığın yer" bir
--               imleçtir, bir günlük değil.
--   analitik  → `podcast_episodes.play_count`, tek sayaç. Kimin
--               oynattığı hiçbir yere yazılmıyor.
--
-- 0051'de dinleyici SAYISI tutup dinleyici LİSTESİ tutmama kararı
-- neyse, bu da aynı kararın podcast tarafı.
--
-- ══════════════════════════════════════════════════════════════════════════
-- ZAMANLANMIŞ YAYIN RLS'İN İÇİNDE
--
-- §10.4 "zamanlanmış yayın" istiyor. `status = 'published'` yeterli
-- değil: saati gelmemiş bir bölüm de o statüde bekliyor. Zamanı
-- politikanın içine koymasaydık, bölüm yayın saatinden önce API'den
-- okunabilirdi — "yayında değil" yalnızca arayüzün söylediği bir şey
-- olurdu ve adresi bilen herkes erişirdi.
-- ══════════════════════════════════════════════════════════════════════════

create type app.publish_status as enum ('draft', 'review', 'published');

-- ══════════════════════════════════════════════════════════════════════════
-- SERİ
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.podcasts (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  summary      text not null default '',
  description  text not null default '',
  cover_url    text,

  category     text,
  tags         text[] not null default '{}',
  language     text not null default 'tr',

  /* RSS üretimine hazır alanlar (§10.4 "RSS feed üretimine hazır
     yapı"). Feed'i şimdi üretmiyoruz ama alanları sonradan eklemek
     yayımlanmış bölümlerin künyesini geriye dönük doldurmak demekti. */
  author       text,
  owner_email  text,
  explicit     boolean not null default false,

  /* İlgili radyo programı — podcast çoğu zaman bir programın arşivi.
     Zorunlu değil: programı olmayan bağımsız seriler de olabilir. */
  program_id   uuid references public.radio_programs(id) on delete set null,

  status       app.publish_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists podcasts_status_idx
  on public.podcasts (status, title);

-- ══════════════════════════════════════════════════════════════════════════
-- BÖLÜM
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.podcast_episodes (
  id           uuid primary key default gen_random_uuid(),
  podcast_id   uuid not null references public.podcasts(id) on delete cascade,
  slug         text not null,
  title        text not null,
  summary      text not null default '',
  description  text not null default '',
  cover_url    text,

  /* Sezon/bölüm. İkisi de boş olabilir: bölüm numarası vermeyen
     seriler var ve zorlamak uydurma numara ürettirirdi. */
  season       integer
    constraint podcast_episodes_season_positive
    check (season is null or season > 0),
  episode_no   integer
    constraint podcast_episodes_episode_positive
    check (episode_no is null or episode_no > 0),

  /* Ses dosyası — Supabase storage yolu ya da dış adres. */
  audio_url    text,
  audio_bytes  bigint,
  duration_sec integer
    constraint podcast_episodes_duration_positive
    check (duration_sec is null or duration_sec > 0),

  /* Bölüm marker'ları (§10.4): [{"saniye":0,"baslik":"Giriş"}, …]
     JSONB çünkü hep bölümle birlikte okunuyor, hiç bölümler arası
     sorgulanmıyor. */
  markers      jsonb not null default '[]'::jsonb
    constraint podcast_episodes_markers_array
    check (jsonb_typeof(markers) = 'array'),

  /* Transkript. Satırda duruyor; Postgres uzun metni zaten TOAST'a
     taşıyor. Şart: liste sorguları kolonlarını AÇIKÇA saysın —
     `select *` bir liste isteğinde megabaytlarca metin çeker. */
  transcript   text,

  /* İndirme mi, yalnızca akış mı (§10.4 "indirme veya yalnızca stream
     politikası"). Yalnızca akışta arayüz indirme bağlantısı
     göstermiyor; bu bir DRM değil, ifade edilmiş bir tercih. */
  allow_download boolean not null default true,

  status       app.publish_status not null default 'draft',

  /* Zamanlanmış yayın. `status = 'published'` ve `publish_at <= now()`
     birlikte "yayında" demek; ikisi de RLS politikasının içinde. */
  publish_at   timestamptz,

  /* Analitik: tek sayaç. Kimin oynattığı hiçbir yerde yok. */
  play_count   bigint not null default 0,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (podcast_id, slug)
);

create index if not exists podcast_episodes_feed_idx
  on public.podcast_episodes (podcast_id, publish_at desc)
  where status = 'published';

comment on column public.podcast_episodes.play_count is
  'Toplam oynatma. Kim oynattı bilgisi kasıtlı olarak tutulmuyor.';

/* KONUKLAR.
   Site hesabı olan konuk `host_id` ile bağlanıyor; olmayan yalnızca
   adıyla duruyor. Ad HER İKİ durumda da satırda: yayımlanmış bir
   bölümün künyesi, konuğun profili sonradan silinse bile okunabilir
   kalmalı — bildirim metninin satırda dondurulmasıyla aynı gerekçe. */
create table if not exists public.episode_guests (
  id         uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.podcast_episodes(id) on delete cascade,
  host_id    uuid references public.radio_hosts(id) on delete set null,
  name       text not null,
  role       text,
  url        text,
  position   integer not null default 0
);

create index if not exists episode_guests_episode_idx
  on public.episode_guests (episode_id, position);
create index if not exists episode_guests_host_idx
  on public.episode_guests (host_id) where host_id is not null;

-- ══════════════════════════════════════════════════════════════════════════
-- DİNLEME İLERLEMESİ — imleç, günlük değil
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.episode_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  episode_id   uuid not null references public.podcast_episodes(id) on delete cascade,
  position_sec integer not null default 0
    constraint episode_progress_position_nonneg check (position_sec >= 0),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, episode_id)
);

-- ══════════════════════════════════════════════════════════════════════════
-- SERİ TAKİBİ — yeni bölüm bildirimi
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.podcast_follows (
  user_id    uuid not null references auth.users(id) on delete cascade,
  podcast_id uuid not null references public.podcasts(id) on delete cascade,
  notify     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, podcast_id)
);

create index if not exists podcast_follows_podcast_idx
  on public.podcast_follows (podcast_id) where notify;

-- ══════════════════════════════════════════════════════════════════════════
-- YAYIMLANDI BİLDİRİMİ
--
-- Tetikleyici, bölüm YAYINA GEÇTİĞİ AN çalışıyor — kaydedildiği an
-- değil. Zamanlanmış bir bölüm ileri tarihli `publish_at` ile
-- kaydedildiğinde bildirim gitmemeli; saati geldiğinde `publish_at`i
-- geçmiş hâle getiren şey zamanın kendisi, bir UPDATE değil.
--
-- Bu yüzden bildirimi iki yol tetikliyor:
--   1. Kaydedilirken zaten yayında olan bölüm (tetikleyici),
--   2. Saati gelen bölüm (`app.dispatch_due_episodes`, cron).
-- İkisi de aynı fonksiyonu çağırıyor ve `announced_at` ikinci kez
-- gönderilmesini engelliyor.
-- ══════════════════════════════════════════════════════════════════════════

alter table public.podcast_episodes
  add column if not exists announced_at timestamptz;

comment on column public.podcast_episodes.announced_at is
  'Yeni bölüm bildirimi gönderildiği an. Dolu satır ikinci kez duyurulmaz.';

create or replace function app.announce_episode(target uuid)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  bolum  record;
  alici  record;
  sayac  integer := 0;
begin
  select e.id, e.slug, e.title, e.status, e.publish_at, e.announced_at,
         e.podcast_id, p.slug as podcast_slug, p.title as podcast_title,
         p.status as podcast_status
    into bolum
    from public.podcast_episodes e
    join public.podcasts p on p.id = e.podcast_id
   where e.id = target
   for update of e;

  if not found then
    return 0;
  end if;

  /* Üç kapı. Yayında olmayan bölüm, yayında olmayan seri ve zaten
     duyurulmuş bölüm — üçünde de bildirim gitmemeli. Tıklanınca 404
     veren bir bildirim, bildirim değil. */
  if bolum.announced_at is not null then return 0; end if;
  if bolum.status <> 'published' or bolum.podcast_status <> 'published' then
    return 0;
  end if;
  if bolum.publish_at is null or bolum.publish_at > now() then return 0; end if;

  for alici in
    select f.user_id
      from public.podcast_follows f
     where f.podcast_id = bolum.podcast_id
       and f.notify
  loop
    perform app.notify(
      alici.user_id,
      null,
      'podcast_episode',
      bolum.podcast_title || ': yeni bölüm',
      bolum.title,
      '/radyo/podcast/' || bolum.podcast_slug || '/' || bolum.slug,
      'podcast_episode',
      bolum.id
    );
    sayac := sayac + 1;
  end loop;

  update public.podcast_episodes set announced_at = now() where id = target;
  return sayac;
end;
$$;

create or replace function app.episode_publish_announce()
returns trigger
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  /* Yalnızca yayına GEÇİŞTE. Yayımlanmış bir bölümün başlığını
     düzeltmek yeni bir duyuru üretmemeli. */
  if new.status = 'published'
     and new.publish_at is not null
     and new.publish_at <= now()
     and new.announced_at is null
  then
    perform app.announce_episode(new.id);
  end if;
  return null;
end;
$$;

drop trigger if exists podcast_episodes_announce on public.podcast_episodes;
create trigger podcast_episodes_announce
  after insert or update of status, publish_at on public.podcast_episodes
  for each row execute function app.episode_publish_announce();

/* Saati gelen zamanlanmış bölümler — cron bunu çağırıyor. */
create or replace function app.dispatch_due_episodes(batch_size integer default 20)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  bolum record;
  sayac integer := 0;
begin
  for bolum in
    select e.id
      from public.podcast_episodes e
      join public.podcasts p on p.id = e.podcast_id
     where e.status = 'published'
       and p.status = 'published'
       and e.announced_at is null
       and e.publish_at is not null
       and e.publish_at <= now()
     order by e.publish_at
     limit batch_size
     for update of e skip locked
  loop
    perform app.announce_episode(bolum.id);
    sayac := sayac + 1;
  end loop;

  return sayac;
end;
$$;

revoke all on function app.dispatch_due_episodes(integer) from public, anon, authenticated;

/* OYNATMA SAYACI. Doğrudan `update` yetkisi verilmiyor: o yetki
   sayacı istediği değere yazma yetkisidir. Fonksiyon yalnızca bir
   artırıyor ve yayında olmayan bölümü saymıyor. */
create or replace function public.count_episode_play(target uuid)
returns void
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
begin
  update public.podcast_episodes
     set play_count = play_count + 1
   where id = target
     and status = 'published'
     and publish_at is not null
     and publish_at <= now();
end;
$$;

revoke all on function public.count_episode_play(uuid) from public;
grant execute on function public.count_episode_play(uuid) to anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════

alter table public.podcasts         enable row level security;
alter table public.podcast_episodes enable row level security;
alter table public.episode_guests   enable row level security;
alter table public.episode_progress enable row level security;
alter table public.podcast_follows  enable row level security;

drop policy if exists podcasts_read on public.podcasts;
create policy podcasts_read on public.podcasts
  for select using (status = 'published' or app.is_admin());

drop policy if exists podcasts_write on public.podcasts;
create policy podcasts_write on public.podcasts
  for all using (app.is_admin()) with check (app.is_admin());

/* ZAMAN POLİTİKANIN İÇİNDE. `publish_at > now()` olan bölüm, statüsü
   `published` olsa bile okunmuyor. */
drop policy if exists podcast_episodes_read on public.podcast_episodes;
create policy podcast_episodes_read on public.podcast_episodes
  for select using (
    app.is_admin()
    or (
      status = 'published'
      and publish_at is not null
      and publish_at <= now()
      and exists (
        select 1 from public.podcasts p
         where p.id = podcast_id and p.status = 'published'
      )
    )
  );

drop policy if exists podcast_episodes_write on public.podcast_episodes;
create policy podcast_episodes_write on public.podcast_episodes
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists episode_guests_read on public.episode_guests;
create policy episode_guests_read on public.episode_guests
  for select using (
    exists (select 1 from public.podcast_episodes e where e.id = episode_id)
  );

drop policy if exists episode_guests_write on public.episode_guests;
create policy episode_guests_write on public.episode_guests
  for all using (app.is_admin()) with check (app.is_admin());

/* İLERLEME VE TAKİP: yalnızca kendi satırın. Yönetici de okumuyor —
   birinin bir bölümün neresinde kaldığı, yönetimin işi değil. */
drop policy if exists episode_progress_own on public.episode_progress;
create policy episode_progress_own on public.episode_progress
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists podcast_follows_own on public.podcast_follows;
create policy podcast_follows_own on public.podcast_follows
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- `updated_at`
drop trigger if exists podcasts_touch on public.podcasts;
create trigger podcasts_touch before update on public.podcasts
  for each row execute function app.touch_radio_updated_at();

drop trigger if exists podcast_episodes_touch on public.podcast_episodes;
create trigger podcast_episodes_touch before update on public.podcast_episodes
  for each row execute function app.touch_radio_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- BİLDİRİM KATEGORİSİ — podcast bölümü `yayin` kategorisinde
-- ══════════════════════════════════════════════════════════════════════════

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
    when 'podcast_episode' then 'yayin'
    else 'sistem'
  end::app.notification_category;
$$;
