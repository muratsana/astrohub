-- 0010_events_sites_marketplace.sql
-- Etkinlikler (§7.5–7.6, §8.4), gözlem noktaları (§8.5, §9.3) ve
-- ikinci el ilanlar (§7.13).
--
-- Üçü tek dosyada çünkü üçü de **yer bildiren** içerik ve konum mahremiyeti
-- kuralı (§15.3) her birinde farklı sonuç veriyor. Kuralı üç kez ayrı ayrı
-- yorumlamak yerine bir kez burada karşılaştırmalı yazmak daha savunulabilir:
--
--   ETKİNLİK  → tam koordinat KAMUYA AÇIK. İlan edilmiş bir etkinlik adresi
--               zaten herkese duyurulmuştur; gizlemek katılımı engeller.
--   GÖZLEM    → yalnızca YAKLAŞIK koordinat açık. Nokta çoğu zaman kamuya
--   NOKTASI     açık arazi olsa da kullanıcı katkısıyla eklenir ve tam
--               koordinat hem alanı hem katkı vereni riske atar.
--   İLAN      → koordinat YOK, yalnızca şehir. Satıcının evi bir adrestir.
--
-- Yani "konumu gizle" tek bir kural değil; içeriğin kime ait olduğuna göre
-- değişen bir karar. Kolon şeması bu kararı taşıyor: etkinlikte lat/lon
-- kolonu var, noktada `_approx` ekiyle var, ilanda hiç yok.

-- ══════════════════════════════════════════════════════════════════════════
-- DURUM ENUM'LARI
-- ══════════════════════════════════════════════════════════════════════════
do $mig$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'event_status' and n.nspname = 'app') then
    create type app.event_status as enum ('draft', 'published', 'cancelled');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'site_status' and n.nspname = 'app') then
    create type app.site_status as enum ('pending', 'published', 'rejected');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'listing_status' and n.nspname = 'app') then
    create type app.listing_status as enum (
      'draft', 'active', 'reserved', 'sold', 'archived'
    );
  end if;
end;
$mig$;

-- ══════════════════════════════════════════════════════════════════════════
-- ETKİNLİKLER
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  event_type  text not null,
  status      app.event_status not null default 'draft',

  city        text not null,
  venue       text not null,
  /* Çevrimiçi etkinlikte koordinat yoktur; harita bu kayıtları ayrı listeler. */
  latitude    numeric(9,6),
  longitude   numeric(9,6),
  /* Yakınlık sorgusu için türetilmiş geography — lat/lon okunabilir kalsın
     diye kolonlar korunuyor, indeks bu türetilmiş sütunda. */
  location    geography(point, 4326) generated always as (
    case when latitude is null or longitude is null then null
         else public.st_setsrid(public.st_makepoint(longitude, latitude), 4326)::geography
    end
  ) stored,

  starts_at   timestamptz not null,
  ends_at     timestamptz,

  free                boolean not null default true,
  camping             boolean not null default false,
  kids_friendly       boolean not null default false,
  astrophoto_focused  boolean not null default false,
  telescopes_provided boolean not null default false,

  capacity         integer,
  registered_count integer not null default 0,

  /* Organizatör iki biçimde: platform hesabı (varsa) ve görünen ad.
     Dış kaynaktan derlenen etkinliklerin hesabı yoktur ama adı vardır. */
  organizer_id       uuid references auth.users (id) on delete set null,
  organizer_name     text not null,
  organizer_verified boolean not null default false,

  description      text not null default '',
  observed_targets text[] not null default '{}',
  rules            text[] not null default '{}',

  /* Kaynak şeffaflığı (§8.4): veri nereden geldi, en son ne zaman doğrulandı.
     Dış kaynaktan derlenen bir tarih değiştiğinde kullanıcı kime bakacağını
     bilmeli; "bizde böyle yazıyor" bir cevap değil. */
  source_name             text,
  source_last_verified_at date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint events_title_length check (char_length(title) between 3 and 200),
  constraint events_lat_range check (latitude is null or latitude between -90 and 90),
  constraint events_lon_range check (longitude is null or longitude between -180 and 180),
  /* Koordinat ya iki parça birden var ya hiç yok: tek başına enlem
     haritada sessizce yanlış yere pin koyar. */
  constraint events_coords_paired check (
    (latitude is null) = (longitude is null)
  ),
  constraint events_end_after_start check (ends_at is null or ends_at > starts_at),
  constraint events_capacity_positive check (capacity is null or capacity > 0)
);

create index if not exists events_starts_idx
  on public.events (starts_at) where status = 'published';
create index if not exists events_city_idx on public.events (city, starts_at);
create index if not exists events_type_idx on public.events (event_type, starts_at);
create index if not exists events_location_idx
  on public.events using gist (location) where location is not null;
create index if not exists events_title_trgm_idx
  on public.events using gin (title gin_trgm_ops);

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function app.set_updated_at();

/* Program akışı ayrı satırlarda: JSONB'de tutulsa tek bir oturumun saatini
   düzeltmek tüm diziyi yeniden yazmak olurdu ve iki editör aynı anda
   çalıştığında biri diğerini silerdi. */
create table if not exists public.event_sessions (
  id        uuid primary key default gen_random_uuid(),
  event_id  uuid not null references public.events (id) on delete cascade,
  starts_at text not null,          -- '21:30' — güne göreli, saat dilimi taşımaz
  title     text not null,
  speaker   text,
  position  integer not null default 0,
  constraint event_sessions_title_length check (char_length(title) between 1 and 200)
);

create index if not exists event_sessions_event_idx
  on public.event_sessions (event_id, position);

/*
 * KAYIT — kontenjan sayacı tetikleyiciyle.
 *
 * İstemcinin "kaydı ekle, sonra sayacı artır" göndermesi kabul edilemez:
 * arada kopan bağlantı kontenjanı kalıcı olarak yanlışa düşürür ve
 * kapasitesi dolmamış görünen bir etkinlik fazladan kayıt alır.
 */
create table if not exists public.event_registrations (
  event_id   uuid not null references public.events (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create or replace function app.event_touch_registered()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
begin
  if tg_op = 'INSERT' then
    update public.events
       set registered_count = registered_count + 1
     where id = new.event_id;
    return new;
  else
    update public.events
       set registered_count = greatest(0, registered_count - 1)
     where id = old.event_id;
    return old;
  end if;
end;
$fn$;

drop trigger if exists event_registrations_counter on public.event_registrations;
create trigger event_registrations_counter
  after insert or delete on public.event_registrations
  for each row execute function app.event_touch_registered();

/* Kontenjan kontrolü sunucuda: dolu bir etkinliğe kayıt, istemci ne
   gösterirse göstersin, veritabanı seviyesinde reddedilir. */
create or replace function app.enforce_event_capacity()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
declare
  cap integer;
  taken integer;
begin
  select capacity, registered_count into cap, taken
    from public.events where id = new.event_id;

  if cap is not null and taken >= cap then
    raise exception 'Etkinlik kontenjanı dolu (% / %).', taken, cap
      using errcode = 'check_violation';
  end if;

  return new;
end;
$fn$;

drop trigger if exists event_registrations_capacity on public.event_registrations;
create trigger event_registrations_capacity
  before insert on public.event_registrations
  for each row execute function app.enforce_event_capacity();

-- ══════════════════════════════════════════════════════════════════════════
-- GÖZLEM NOKTALARI (§8.5, §9.3)
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.observing_sites (
  id        uuid primary key default gen_random_uuid(),
  slug      text unique not null,
  name      text not null,
  region    text not null,
  status    app.site_status not null default 'pending',

  /* YAKLAŞIK koordinat — dosya başındaki karşılaştırmaya bakınız.
     Birkaç yüz metrelik hata yakınlık sıralamasını bozmaz; tam koordinat
     ise noktayı ve katkı vereni gereksiz yere açığa çıkarır. */
  approx_latitude  numeric(8,4) not null,
  approx_longitude numeric(8,4) not null,
  location  geography(point, 4326) generated always as (
    public.st_setsrid(public.st_makepoint(approx_longitude, approx_latitude), 4326)::geography
  ) stored,

  altitude_m   integer,
  bortle       smallint,
  sqm          numeric(5,2),
  road_access  text,
  south_horizon text,
  best_months  text,

  /* Tesis olanakları typed kolon: listede filtrelenen alan JSONB'de durursa
     indeks kullanılamaz (aynı gerekçe 0008'de ekipman için de yazıldı). */
  has_water       boolean not null default false,
  has_toilet      boolean not null default false,
  has_electricity boolean not null default false,
  has_cell_signal boolean not null default false,
  has_tent_area   boolean not null default false,
  caravan_ok      boolean not null default false,

  description text not null default '',
  warnings    text[] not null default '{}',

  submitted_by uuid references auth.users (id) on delete set null,
  rating       numeric(3,2) not null default 0,
  review_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint observing_sites_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint observing_sites_lat_range check (approx_latitude between -90 and 90),
  constraint observing_sites_lon_range check (approx_longitude between -180 and 180),
  constraint observing_sites_bortle_range check (bortle is null or bortle between 1 and 9),
  constraint observing_sites_sqm_range check (sqm is null or sqm between 15 and 23),
  constraint observing_sites_rating_range check (rating between 0 and 5)
);

comment on column public.observing_sites.approx_latitude is
  'Yaklaşık koordinat. Tam koordinat bilinçli olarak saklanmaz (§15.3).';

create index if not exists observing_sites_location_idx
  on public.observing_sites using gist (location);
create index if not exists observing_sites_region_idx
  on public.observing_sites (region, name);
create index if not exists observing_sites_bortle_idx
  on public.observing_sites (bortle) where status = 'published';

drop trigger if exists observing_sites_set_updated_at on public.observing_sites;
create trigger observing_sites_set_updated_at
  before update on public.observing_sites
  for each row execute function app.set_updated_at();

/*
 * ÖLÇÜMLER — noktanın SQM/Bortle geçmişi.
 *
 * Tek bir `sqm` kolonu yetmez: gökyüzü kalitesi mevsime, aya ve yıllar
 * içinde artan ışık kirliliğine göre değişir. Işık kirliliği karşılaştırma
 * aracı (`/isik-kirliligi`) bu tablodan besleniyor; lisanslı bir harita
 * verimiz olmadığı için gösterdiğimiz tek sayı kendi ölçümlerimizdir ve
 * kimin ne zaman ölçtüğü kayıtta durmalıdır.
 */
create table if not exists public.site_measurements (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null references public.observing_sites (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  measured_at date not null,
  sqm         numeric(5,2),
  bortle      smallint,
  /** 'sqm-l', 'sqm-lu', 'tahmin' … Yöntem bilinmeden sayı karşılaştırılamaz. */
  method      text,
  note        text not null default '',
  created_at  timestamptz not null default now(),
  constraint site_measurements_has_value check (sqm is not null or bortle is not null),
  constraint site_measurements_sqm_range check (sqm is null or sqm between 15 and 23),
  constraint site_measurements_bortle_range check (bortle is null or bortle between 1 and 9)
);

create index if not exists site_measurements_site_idx
  on public.site_measurements (site_id, measured_at desc);

create table if not exists public.site_reviews (
  id        uuid primary key default gen_random_uuid(),
  site_id   uuid not null references public.observing_sites (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  rating    smallint not null,
  body      text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, user_id),
  constraint site_reviews_rating_range check (rating between 1 and 5)
);

create index if not exists site_reviews_site_idx
  on public.site_reviews (site_id, created_at desc);

drop trigger if exists site_reviews_set_updated_at on public.site_reviews;
create trigger site_reviews_set_updated_at
  before update on public.site_reviews
  for each row execute function app.set_updated_at();

/* Puan ortalaması yeniden hesaplanır, artırımlı güncellenmez: bir
   değerlendirme düzenlendiğinde artırımlı formül eski puanı bilmek zorunda
   ve tetikleyicide bunu doğru yapmak, tabloyu yeniden okumaktan pahalı. */
create or replace function app.site_refresh_rating()
returns trigger
language plpgsql
security definer set search_path = ''
as $fn$
declare
  target uuid := coalesce(new.site_id, old.site_id);
begin
  update public.observing_sites s
     set rating = coalesce(round(agg.avg_rating, 2), 0),
         review_count = agg.n
    from (
      select avg(rating)::numeric as avg_rating, count(*)::integer as n
        from public.site_reviews where site_id = target
    ) agg
   where s.id = target;

  return coalesce(new, old);
end;
$fn$;

drop trigger if exists site_reviews_rating on public.site_reviews;
create trigger site_reviews_rating
  after insert or update or delete on public.site_reviews
  for each row execute function app.site_refresh_rating();

-- ══════════════════════════════════════════════════════════════════════════
-- İLANLAR (§7.13)
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  seller_id   uuid not null references auth.users (id) on delete cascade,
  title       text not null,
  category_id text not null references public.equipment_categories (id) on delete restrict,
  /** Ekipman veritabanındaki karşılığı — künye ve fiyat bağlamı oradan gelir. */
  model_id    uuid references public.equipment_models (id) on delete set null,

  price       numeric(12,2) not null,
  currency    text not null default 'TRY',
  negotiable  boolean not null default false,

  city        text not null,
  condition   text not null,
  has_invoice boolean not null default false,
  shipping_ok boolean not null default false,

  description text not null default '',
  includes    text[] not null default '{}',

  status    app.listing_status not null default 'draft',
  posted_at timestamptz,
  sold_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint listings_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint listings_title_length check (char_length(title) between 5 and 200),
  constraint listings_price_positive check (price > 0),
  constraint listings_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint listings_condition_allowed check (
    condition in ('Sıfır gibi', 'Çok iyi', 'İyi', 'Yıpranmış')
  ),
  constraint listings_active_needs_date check (
    status not in ('active', 'reserved') or posted_at is not null
  ),
  /*
   * İLETİŞİM PLATFORM İÇİNDE KALIR (§7.13).
   *
   * İlan metnine e-posta yazmak, moderasyonu ve anlaşmazlıkta kaydı
   * tamamen devre dışı bırakan en yaygın kaçış yolu. Kısıt yalnızca
   * e-posta arıyor; telefon numarası aramıyor çünkü seri numarası,
   * odak uzunluğu ve model kodu ("ASI 2600 MC") rakam dizileriyle dolu
   * ve otomatik yakalama burada yanlış pozitif üretir. Telefon
   * moderasyonun işi — kısıt, yalnızca kesin olanı reddediyor.
   */
  constraint listings_no_email check (
    description !~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[a-z]{2,}'
  )
);

create index if not exists listings_active_idx
  on public.listings (status, posted_at desc) where status = 'active';
create index if not exists listings_category_idx
  on public.listings (category_id, price);
create index if not exists listings_seller_idx
  on public.listings (seller_id, created_at desc);
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

drop trigger if exists listings_set_updated_at on public.listings;
create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════
alter table public.events              enable row level security;
alter table public.event_sessions      enable row level security;
alter table public.event_registrations enable row level security;
alter table public.observing_sites     enable row level security;
alter table public.site_measurements   enable row level security;
alter table public.site_reviews        enable row level security;
alter table public.listings            enable row level security;

/* ── Etkinlik: yayımlanan herkese açık; taslak sahibine ve editöre ── */
drop policy if exists events_read on public.events;
create policy events_read on public.events
  for select using (
    status <> 'draft'
    or auth.uid() = organizer_id
    or app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  );

/* Etkinlik yayımlamak bir yetkidir (§4.4): doğrulanmış organizatör, içerik
   editörü ya da yönetici. Herkesin etkinlik açabildiği bir takvim, kısa
   sürede reklam panosuna döner. */
drop policy if exists events_write on public.events;
create policy events_write on public.events
  for all to authenticated
  using (
    app.is_admin()
    or app.has_role('content_editor')
    or (app.has_role('verified_organizer') and auth.uid() = organizer_id)
  )
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (app.has_role('verified_organizer') and auth.uid() = organizer_id)
  );

drop policy if exists event_sessions_read on public.event_sessions;
create policy event_sessions_read on public.event_sessions
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.status <> 'draft' or e.organizer_id = auth.uid()
             or app.is_admin() or app.has_role('content_editor'))
    )
  );

drop policy if exists event_sessions_write on public.event_sessions;
create policy event_sessions_write on public.event_sessions
  for all to authenticated
  using (
    app.is_admin() or app.has_role('content_editor')
    or exists (select 1 from public.events e
                where e.id = event_id and e.organizer_id = auth.uid())
  )
  with check (
    app.is_admin() or app.has_role('content_editor')
    or exists (select 1 from public.events e
                where e.id = event_id and e.organizer_id = auth.uid())
  );

/*
 * KAYIT LİSTESİ GİZLİDİR.
 *
 * Katılımcı yalnızca kendi kaydını görür; organizatör kendi etkinliğinin
 * listesini görür. "Kim geliyor" bilgisini herkese açmak, bir gecede
 * kimin evde olmayacağını ilan etmektir.
 */
drop policy if exists event_registrations_read on public.event_registrations;
create policy event_registrations_read on public.event_registrations
  for select to authenticated using (
    auth.uid() = user_id
    or app.is_admin()
    or exists (select 1 from public.events e
                where e.id = event_id and e.organizer_id = auth.uid())
  );

drop policy if exists event_registrations_own on public.event_registrations;
create policy event_registrations_own on public.event_registrations
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* ── Gözlem noktası: yayımlanan herkese açık, katkı oturum ister ── */
drop policy if exists observing_sites_read on public.observing_sites;
create policy observing_sites_read on public.observing_sites
  for select using (
    status = 'published'
    or auth.uid() = submitted_by
    or app.is_admin()
    or app.has_role('moderator')
    or app.has_role('content_editor')
  );

/* Katkı 'pending' başlar: WITH CHECK bunu zorluyor, yani kullanıcı kendi
   kaydını doğrudan yayına alamaz. Moderasyon adımını atlatan bir katkı
   akışı, moderasyonun kendisini gereksizleştirir. */
drop policy if exists observing_sites_submit on public.observing_sites;
create policy observing_sites_submit on public.observing_sites
  for insert to authenticated
  with check (auth.uid() = submitted_by and status = 'pending');

drop policy if exists observing_sites_update_own on public.observing_sites;
create policy observing_sites_update_own on public.observing_sites
  for update to authenticated
  using (auth.uid() = submitted_by and status = 'pending')
  with check (auth.uid() = submitted_by and status = 'pending');

drop policy if exists observing_sites_editor on public.observing_sites;
create policy observing_sites_editor on public.observing_sites
  for all to authenticated
  using (app.is_admin() or app.has_role('content_editor') or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('content_editor') or app.has_role('moderator'));

drop policy if exists site_measurements_read on public.site_measurements;
create policy site_measurements_read on public.site_measurements
  for select using (
    exists (select 1 from public.observing_sites s
             where s.id = site_id and s.status = 'published')
    or app.is_admin() or app.has_role('content_editor')
  );

drop policy if exists site_measurements_own on public.site_measurements;
create policy site_measurements_own on public.site_measurements
  for all to authenticated
  using (auth.uid() = user_id or app.is_admin() or app.has_role('content_editor'))
  with check (auth.uid() = user_id or app.is_admin() or app.has_role('content_editor'));

drop policy if exists site_reviews_read on public.site_reviews;
create policy site_reviews_read on public.site_reviews
  for select using (
    exists (select 1 from public.observing_sites s
             where s.id = site_id and s.status = 'published')
    or auth.uid() = user_id
    or app.is_admin() or app.has_role('moderator')
  );

drop policy if exists site_reviews_own on public.site_reviews;
create policy site_reviews_own on public.site_reviews
  for all to authenticated
  using (auth.uid() = user_id or app.is_admin() or app.has_role('moderator'))
  with check (auth.uid() = user_id);

/* ── İlan: aktif olan herkese açık; taslak yalnızca satıcıya ── */
drop policy if exists listings_read on public.listings;
create policy listings_read on public.listings
  for select using (
    status in ('active', 'reserved', 'sold')
    or auth.uid() = seller_id
    or app.is_admin()
    or app.has_role('moderator')
  );

drop policy if exists listings_write_own on public.listings;
create policy listings_write_own on public.listings
  for all to authenticated
  using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists listings_moderate on public.listings;
create policy listings_moderate on public.listings
  for all to authenticated
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİLER (bkz. 0003 — TRUNCATE RLS'e tabi değildir)
-- ══════════════════════════════════════════════════════════════════════════
do $mig$
declare
  t text;
begin
  foreach t in array array[
    'events', 'event_sessions', 'observing_sites',
    'site_measurements', 'site_reviews', 'listings'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t
    );
  end loop;
end;
$mig$;

/* Kayıt tablosuna anon hiçbir yetki almaz: katılımcı listesi oturum ister. */
revoke all on public.event_registrations from anon, authenticated;
grant select, insert, delete on public.event_registrations to authenticated;
