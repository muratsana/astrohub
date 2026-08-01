-- 0055_tv_ve_youtube.sql
--
-- FAZ 8 — ASTROHUB TV ve YouTube'a hazır altyapı (§11).
--
-- ══════════════════════════════════════════════════════════════════════════
-- `radio_hosts` → `broadcast_hosts`: AYNI KİŞİYE İKİ PROFİL AÇILMASIN
--
-- §11.1 "sunucu/konuk profilleri" istiyor. İlk akla gelen `tv_hosts`
-- açmaktı; yapılmadı. Radyoda program sunan biri TV'de de program
-- sunabilir ve iki ayrı tablo o kişiye İKİ profil, iki adres, iki
-- biyografi verirdi — hangisinin güncel olduğu da kimsenin bilmediği bir
-- soru olurdu.
--
-- Sunucu bir KİŞİ; radyo ve TV onun çalıştığı iki mecra. Tablo bu yüzden
-- mecraya değil kişiye ait ve adı da öyle.
--
-- `alter table ... rename` politikaları, indeksleri, kısıtları ve yabancı
-- anahtarları koruyor; yalnızca adları eski kalıyor ve bu kozmetik.
-- ══════════════════════════════════════════════════════════════════════════

alter table if exists public.radio_hosts rename to broadcast_hosts;

comment on table public.broadcast_hosts is
  'Yayıncı/sunucu profili. Radyo ve TV ortak kullanıyor: aynı kişiye iki '
  'profil açmamak için tablo mecraya değil kişiye ait.';

-- ══════════════════════════════════════════════════════════════════════════
-- YOUTUBE BAĞLANTISI
--
-- ══════════════════════════════════════════════════════════════════════════
-- BU TABLO HİÇBİR ROLE OKUNMUYOR — POLİTİKA YOKLUĞU KUSUR DEĞİL, TASARIM
--
-- OAuth yenileme jetonu (`refresh_token`) burada duruyor ve durmak
-- ZORUNDA: jeton çalışma anında alınıyor, ortam değişkenine yazılamıyor
-- ve fonksiyon çağrıları arasında yaşaması gerekiyor.
--
-- O hâlde koruma "kim okuyabilir" sorusunda: RLS açık ve `select`
-- politikası HİÇ YOK. `anon` ve `authenticated` bu tabloyu okuyamıyor,
-- yazamıyor; yalnızca service role (RLS'i atlayan) erişiyor ve o da
-- sadece sunucu tarafı fonksiyonda.
--
-- Yöneticiye bile açılmadı. §11.3 "kanalı bağlama/ayırma, yalnızca
-- yetkili teknik admin" diyor — ama "bağlayabilmek" ile "jetonu
-- okuyabilmek" aynı şey değil. Yönetici bağlantıyı `youtube_connection_
-- status` görünümünden görüyor; jeton hiçbir arayüze gitmiyor.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.youtube_connection (
  /* Tek satır: site tek bir kanala bağlanıyor. Sabit birincil anahtar,
     "ikinci bağlantı" diye bir durumu imkânsız kılıyor. */
  id            boolean primary key default true
                constraint youtube_connection_single check (id),

  channel_id    text
                constraint youtube_channel_id_format
                check (channel_id is null or channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  channel_title text,

  /* SIRLAR. Hiçbir politika bu satırı okutmuyor. */
  refresh_token text,
  access_token  text,
  token_expires_at timestamptz,

  connected_at  timestamptz,
  connected_by  uuid references auth.users(id) on delete set null,
  last_sync_at  timestamptz,
  last_error    text,

  updated_at    timestamptz not null default now()
);

comment on table public.youtube_connection is
  'YouTube OAuth bağlantısı. SELECT politikası kasıtlı olarak YOK: '
  'yenileme jetonu yalnızca service role tarafından okunuyor.';

/**
 * Bağlantı DURUMU — jeton olmadan.
 *
 * Yöneticinin görmesi gereken şey "bağlı mı, hangi kanala, ne zaman
 * senkronlandı". Jetonun kendisi bu sorunun cevabı değil ve bu yüzden
 * fonksiyon jeton alanlarına hiç dokunmuyor; yalnızca VAR MI diye
 * bakıyor.
 */
create or replace function public.youtube_connection_status()
returns table (
  connected     boolean,
  channel_id    text,
  channel_title text,
  connected_at  timestamptz,
  last_sync_at  timestamptz,
  last_error    text,
  token_valid   boolean
)
language sql
stable
security definer
set search_path = public, app, pg_temp
as $$
  select
    c.channel_id is not null and c.refresh_token is not null,
    c.channel_id,
    c.channel_title,
    c.connected_at,
    c.last_sync_at,
    c.last_error,
    /* Jetonun KENDİSİ değil, geçerli olup olmadığı. */
    c.token_expires_at is not null and c.token_expires_at > now()
  from public.youtube_connection c
  where app.is_admin()
  limit 1;
$$;

revoke all on function public.youtube_connection_status() from public, anon;
grant execute on function public.youtube_connection_status() to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- API KOTASI (§11.2 "API quota izleme")
--
-- YouTube Data API günlük 10.000 birimlik kota veriyor ve bir arama
-- çağrısı 100 birim. Kotayı izlemeden senkronlayan bir sistem, günün
-- ortasında sessizce durur ve sebebi "video listesi güncellenmiyor"
-- olarak görünür — kaynağı bulunması zor bir hata.
--
-- Sayaç GÜN BAŞINA tutuluyor çünkü kota günlük sıfırlanıyor (Pasifik
-- saati). Tek bir toplam sayaç, dünkü harcamayı bugüne taşırdı.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.youtube_quota_log (
  quota_date date primary key default (now() at time zone 'America/Los_Angeles')::date,
  units_used integer not null default 0
             constraint youtube_quota_nonneg check (units_used >= 0),
  calls      integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.youtube_quota_log is
  'Günlük YouTube API harcaması. Gün sınırı Pasifik saatinde — kota orada sıfırlanıyor.';

-- ══════════════════════════════════════════════════════════════════════════
-- VİDEO ARŞİVİ (§11.1 "video arşivi", §11.3 "manuel video ekleme")
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.tv_videos (
  id            uuid primary key default gen_random_uuid(),
  /* YouTube video kimliği. Biçim kısıtı `<iframe src>` güvenliğinin
     ikinci yarısı — birincisi adresin kodda kurulması (0011). */
  youtube_id    text not null unique
                constraint tv_video_id_format
                check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),

  title         text not null,
  description   text not null default '',
  thumbnail_url text,
  duration_sec  integer
                constraint tv_video_duration_positive
                check (duration_sec is null or duration_sec > 0),
  published_at  timestamptz,

  category      text,
  tags          text[] not null default '{}',

  /* Kayıt nereden geldi: senkronizasyon mu, elle mi eklendi.
     SENKRONİZASYON ELLE EKLENENİ EZMEMELİ — elle eklenmiş bir kaydın
     başlığı editör tarafından düzeltilmiş olabilir. */
  source        text not null default 'manual'
                constraint tv_video_source
                check (source in ('manual', 'youtube')),

  /* Altyazı/döküm (§11.1 "altyazı/transcript alanları"). */
  transcript    text,
  captions_url  text,

  published     boolean not null default false,
  featured      boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tv_videos_published_idx
  on public.tv_videos (published, published_at desc);
create index if not exists tv_videos_featured_idx
  on public.tv_videos (featured) where featured and published;

-- ══════════════════════════════════════════════════════════════════════════
-- SERİ / PLAYLIST (§11.1 "seri/playlist")
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.tv_playlists (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  title       text not null,
  description text not null default '',
  cover_url   text,
  /* YouTube'daki karşılığı — senkronizasyon için. Boşsa yalnızca
     sitede var olan bir seri. */
  youtube_playlist_id text,
  published   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.tv_playlist_items (
  playlist_id uuid not null references public.tv_playlists(id) on delete cascade,
  video_id    uuid not null references public.tv_videos(id) on delete cascade,
  position    integer not null default 0,
  primary key (playlist_id, video_id)
);

create index if not exists tv_playlist_items_order_idx
  on public.tv_playlist_items (playlist_id, position);

-- ══════════════════════════════════════════════════════════════════════════
-- YAYIN ↔ SUNUCU ve YAYIN TAKİBİ
--
-- §11.1 "yayını takip etme", "hatırlatma", "canlı yayın bildirimi" —
-- üçü tek satır, radyodaki `program_follows` ile aynı gerekçe (0051):
-- takip eden kişi favorilemiştir ve yayın başlayınca haber alır;
-- `notify` ayrı çünkü "listemde dursun ama beni uyandırma" geçerli bir
-- tercih.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.tv_broadcast_hosts (
  broadcast_id uuid not null references public.tv_broadcasts(id) on delete cascade,
  host_id      uuid not null references public.broadcast_hosts(id) on delete cascade,
  position     integer not null default 0,
  primary key (broadcast_id, host_id)
);

create table if not exists public.tv_follows (
  user_id      uuid not null references auth.users(id) on delete cascade,
  broadcast_id uuid not null references public.tv_broadcasts(id) on delete cascade,
  notify       boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (user_id, broadcast_id)
);

create index if not exists tv_follows_broadcast_idx
  on public.tv_follows (broadcast_id) where notify;

-- ══════════════════════════════════════════════════════════════════════════
-- CANLI YAYIN DUYURUSU
--
-- Radyodaki `announce_program_live` ile aynı kapılar: yayımlanmamış
-- yayın duyurulamıyor (tıklanınca 404 veren bildirim, bildirim değil) ve
-- her duyuru denetim kaydına düşüyor.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function app.announce_tv_live(target uuid)
returns integer
language plpgsql
security definer
set search_path = public, app, pg_temp
as $$
declare
  yayin record;
  alici record;
  sayac integer := 0;
begin
  if not app.is_admin() then
    raise exception 'Yetkisiz' using errcode = '42501';
  end if;

  select id, slug, title, published into yayin
    from public.tv_broadcasts where id = target;

  if not found then
    raise exception 'Yayın bulunamadı' using errcode = 'P0002';
  end if;

  if not yayin.published then
    raise exception 'Yayımlanmamış yayın için canlı bildirimi gönderilemez'
      using errcode = '22023';
  end if;

  for alici in
    select f.user_id from public.tv_follows f
     where f.broadcast_id = target and f.notify
  loop
    perform app.notify(
      alici.user_id, null, 'broadcast_live',
      yayin.title || ' canlı yayında',
      null, '/tv', 'tv_broadcast', yayin.id
    );
    sayac := sayac + 1;
  end loop;

  insert into public.audit_logs (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), 'tv.broadcast_live', 'tv_broadcast', target::text,
          jsonb_build_object('alici_sayisi', sayac));

  return sayac;
end;
$$;

create or replace function public.announce_tv_live(target uuid)
returns integer
language sql
volatile
security definer
set search_path = public, app, pg_temp
as $$
  select app.announce_tv_live(target);
$$;

revoke all on function app.announce_tv_live(uuid) from public, anon;
revoke all on function public.announce_tv_live(uuid) from public, anon;
grant execute on function public.announce_tv_live(uuid) to authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════

alter table public.youtube_connection   enable row level security;
alter table public.youtube_quota_log    enable row level security;
alter table public.tv_videos            enable row level security;
alter table public.tv_playlists         enable row level security;
alter table public.tv_playlist_items    enable row level security;
alter table public.tv_broadcast_hosts   enable row level security;
alter table public.tv_follows           enable row level security;

/* YOUTUBE_CONNECTION: POLİTİKA YOK. Bu bir eksik değil — dosyanın
   başındaki gerekçe. Ayrıca açık grant'lar da geri alınıyor: RLS
   politikası olmayan bir tabloya `grant select` verilirse PostgREST
   yine de boş sonuç döner, ama yetkiyi hiç vermemek daha az varsayım. */
revoke all on public.youtube_connection from anon, authenticated;

/* KOTA: yönetici okuyor, kimse yazmıyor (yazma service role'de). */
drop policy if exists youtube_quota_read on public.youtube_quota_log;
create policy youtube_quota_read on public.youtube_quota_log
  for select using (app.is_admin());

drop policy if exists tv_videos_read on public.tv_videos;
create policy tv_videos_read on public.tv_videos
  for select using (published or app.is_admin());

drop policy if exists tv_videos_write on public.tv_videos;
create policy tv_videos_write on public.tv_videos
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists tv_playlists_read on public.tv_playlists;
create policy tv_playlists_read on public.tv_playlists
  for select using (published or app.is_admin());

drop policy if exists tv_playlists_write on public.tv_playlists;
create policy tv_playlists_write on public.tv_playlists
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists tv_playlist_items_read on public.tv_playlist_items;
create policy tv_playlist_items_read on public.tv_playlist_items
  for select using (
    exists (
      select 1 from public.tv_playlists p
       where p.id = playlist_id and (p.published or app.is_admin())
    )
  );

drop policy if exists tv_playlist_items_write on public.tv_playlist_items;
create policy tv_playlist_items_write on public.tv_playlist_items
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists tv_broadcast_hosts_read on public.tv_broadcast_hosts;
create policy tv_broadcast_hosts_read on public.tv_broadcast_hosts
  for select using (
    exists (
      select 1 from public.tv_broadcasts b
       where b.id = broadcast_id and (b.published or app.is_admin())
    )
  );

drop policy if exists tv_broadcast_hosts_write on public.tv_broadcast_hosts;
create policy tv_broadcast_hosts_write on public.tv_broadcast_hosts
  for all using (app.is_admin()) with check (app.is_admin());

drop policy if exists tv_follows_own on public.tv_follows;
create policy tv_follows_own on public.tv_follows
  for all using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- `updated_at`
drop trigger if exists tv_videos_touch on public.tv_videos;
create trigger tv_videos_touch before update on public.tv_videos
  for each row execute function app.touch_radio_updated_at();

drop trigger if exists tv_playlists_touch on public.tv_playlists;
create trigger tv_playlists_touch before update on public.tv_playlists
  for each row execute function app.touch_radio_updated_at();

drop trigger if exists youtube_connection_touch on public.youtube_connection;
create trigger youtube_connection_touch before update on public.youtube_connection
  for each row execute function app.touch_radio_updated_at();
