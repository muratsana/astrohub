-- 0008_equipment_and_targets.sql
-- Ekipman veritabanı (§9.2) ve astronomik hedef kataloğu (§8.2).
--
-- Bu iki modül birlikte geliyor çünkü ikisi de **referans veri**: kullanıcı
-- üretmez, editör yönetir, herkes okur. Aynı yetki deseni ikisinde de geçerli
-- ve tek dosyada durmaları o deseni tekrar tekrar yazmamızı önlüyor.
--
-- İKİ KATMANLI SPEC (§9.2)
-- Ekipman modellerinde sık filtrelenen alanlar (odak, açıklık, piksel) typed
-- kolon; kategoriye özgü ayrıntılar JSONB. Hepsini JSONB'ye koymak filtreyi
-- indekssiz bırakır; hepsini kolona koymak kategori sayısı kadar boş kolon
-- üretir. Sınır şu: **listede filtrelenen** alan kolondur.

-- ══════════════════════════════════════════════════════════════════════════
-- EKİPMAN KATEGORİLERİ VE MARKALAR
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.equipment_categories (
  id          text primary key,             -- 'optik-tup', 'montur' …
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.equipment_brands (
  id         text primary key,              -- 'sky-watcher', 'zwo' …
  name       text not null,
  website    text,
  created_at timestamptz not null default now(),
  constraint equipment_brand_website_scheme
    check (website is null or website ~* '^https?://')
);

comment on constraint equipment_brand_website_scheme on public.equipment_brands is
  'Yalnızca http(s). javascript: gibi şemalar istemcide bağlantıya dönüşmemeli (§15.4).';

-- ══════════════════════════════════════════════════════════════════════════
-- EKİPMAN MODELLERİ
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.equipment_models (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  brand_id     text not null references public.equipment_brands (id) on delete restrict,
  category_id  text not null references public.equipment_categories (id) on delete restrict,
  model        text not null,
  summary      text,
  price_hint   text,

  /* ── Sık filtrelenen typed alanlar ── */
  focal_length_mm     numeric(8,2),
  aperture_mm         numeric(8,2),
  pixel_size_um       numeric(6,3),
  sensor_width_mm     numeric(6,2),
  sensor_height_mm    numeric(6,2),
  payload_capacity_kg numeric(6,2),
  weight_kg           numeric(7,3),
  backfocus_mm        numeric(6,2),

  /* ── Kategoriye özgü ayrıntı (§9.2 ikinci katman) ── */
  specs        jsonb not null default '{}'::jsonb,
  notes        text[] not null default '{}',

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint equipment_slug_format check (slug ~ '^[a-z0-9-]{2,80}$'),
  constraint equipment_focal_positive
    check (focal_length_mm is null or focal_length_mm > 0),
  constraint equipment_aperture_positive
    check (aperture_mm is null or aperture_mm > 0)
);

create index if not exists equipment_models_category_idx
  on public.equipment_models (category_id, model);
create index if not exists equipment_models_brand_idx
  on public.equipment_models (brand_id, model);
-- Marka+model araması trigram ile: kullanıcı "eq6" ya da "asi 2600" yazıyor.
create index if not exists equipment_models_search_idx
  on public.equipment_models using gin (model gin_trgm_ops);
create index if not exists equipment_models_specs_idx
  on public.equipment_models using gin (specs jsonb_path_ops);

drop trigger if exists equipment_models_set_updated_at on public.equipment_models;
create trigger equipment_models_set_updated_at
  before update on public.equipment_models
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- HEDEF KATALOĞU
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.celestial_objects (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  /** Birincil katalog kodu: 'M 31'. Boşluklu yazım kanoniktir. */
  catalog        text not null,
  kind           text not null,
  constellation  text not null,

  /* Koordinatlar derece cinsinden saklanır — sunum biçimi arayüzün işi.
     "20h 58m 47s" gibi metinler sıralanamaz ve hesaba giremez. */
  ra_deg         numeric(9,5),
  dec_deg        numeric(9,5),

  magnitude      numeric(5,2),
  /** Açısal boyut, arcdakika. Dairesel cisimlerde iki alan eşittir. */
  size_major_arcmin numeric(8,2),
  size_minor_arcmin numeric(8,2),

  best_months        text,
  difficulty         text,
  recommended_focal  text,
  recommended_filters text,
  description        text not null default '',

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint celestial_slug_format check (slug ~ '^[a-z0-9-]{2,80}$'),
  constraint celestial_ra_range check (ra_deg is null or (ra_deg >= 0 and ra_deg < 360)),
  constraint celestial_dec_range check (dec_deg is null or (dec_deg between -90 and 90))
);

create index if not exists celestial_objects_kind_idx
  on public.celestial_objects (kind, name);
create index if not exists celestial_objects_name_trgm_idx
  on public.celestial_objects using gin (name gin_trgm_ops);

drop trigger if exists celestial_objects_set_updated_at on public.celestial_objects;
create trigger celestial_objects_set_updated_at
  before update on public.celestial_objects
  for each row execute function app.set_updated_at();

/*
 * KATALOG KİMLİKLERİ — ayrı tablo, bilinçli.
 *
 * Bir cismin M 31, NGC 224 ve UGC 454 gibi birden çok kodu vardır ve
 * kullanıcı hangisini yazacağı belli değildir. Diziye koymak "NGC224"
 * aramasını indeksten mahrum bırakır; ayrı satır her koda kendi indeksini
 * verir.
 *
 * `normalized` boşluksuz ve küçük harfli kopyadır: kullanıcı "M31" yazar,
 * katalog "M 31" tutar. Bu eşleşme arayüzde bir kez hataya yol açtı
 * (bkz. denetim raporu §2.5), burada veritabanı seviyesinde çözülüyor.
 */
create table if not exists public.catalog_identifiers (
  object_id   uuid not null references public.celestial_objects (id) on delete cascade,
  code        text not null,
  normalized  text generated always as (
    lower(replace(replace(code, ' ', ''), '-', ''))
  ) stored,
  is_primary  boolean not null default false,
  primary key (object_id, code)
);

create index if not exists catalog_identifiers_normalized_idx
  on public.catalog_identifiers (normalized);

-- ══════════════════════════════════════════════════════════════════════════
-- RLS — referans veri deseni: herkes okur, editör yazar
-- ══════════════════════════════════════════════════════════════════════════
alter table public.equipment_categories enable row level security;
alter table public.equipment_brands     enable row level security;
alter table public.equipment_models     enable row level security;
alter table public.celestial_objects    enable row level security;
alter table public.catalog_identifiers  enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'equipment_categories', 'equipment_brands', 'equipment_models',
    'celestial_objects', 'catalog_identifiers'
  ]
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using (true)', t, t
    );

    execute format('drop policy if exists %I_editor_write on public.%I', t, t);
    execute format(
      'create policy %I_editor_write on public.%I for all to authenticated '
      'using (app.is_admin() or app.has_role(''content_editor'')) '
      'with check (app.is_admin() or app.has_role(''content_editor''))',
      t, t
    );
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİLER (bkz. 0003 — TRUNCATE RLS'e tabi değildir)
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array[
    'equipment_categories', 'equipment_brands', 'equipment_models',
    'celestial_objects', 'catalog_identifiers'
  ]
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon', t);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', t
    );
  end loop;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- BAŞLANGIÇ KATEGORİLERİ
-- ══════════════════════════════════════════════════════════════════════════
insert into public.equipment_categories (id, name, position) values
  ('optik-tup',    'Optik Tüp',      1),
  ('montur',       'Montür',         2),
  ('astro-kamera', 'Astro Kamera',   3),
  ('filtre',       'Filtre',         4),
  ('guide',        'Guide Sistemi',  5),
  ('aksesuar',     'Aksesuar',       6)
on conflict (id) do nothing;
