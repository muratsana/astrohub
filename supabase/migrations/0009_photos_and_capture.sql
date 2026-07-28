-- 0009_photos_and_capture.sql
-- Fotoğraflar, sürümler, pozlamalar, beğeni/yorum (§8.1, §9.2, §10).
--
-- ÜÇ KRİTİK KURAL BU DOSYADA VERİTABANINA YAZILIYOR:
--
--   1. KOTA (§4.2) — 50 aktif yayımlanmış fotoğraf. Şartname "çift
--      doğrulama" diyor: ön yüz asla tek otorite değil. Tetikleyici burada,
--      istemcinin ne yaptığından bağımsız olarak sınırı uyguluyor.
--
--   2. SÜRÜMLER KOTAYA GİRMEZ (§8.1). Bu yüzden sürümler ayrı tabloda ve
--      kota sayımı yalnızca `astro_photos` üzerinden yapılıyor. Aynı kural
--      `domain/photography/versions.ts` içinde de yazılı; iki taraf aynı
--      tanımı kullanmak zorunda.
--
--   3. KONUM MAHREMİYETİ (§15.3). Tam koordinat fotoğraf satırında DEĞİL,
--      ayrı bir tabloda ve yalnızca sahibine açık. Sebebi RLS'in satır
--      bazlı olması: aynı satırda tutulup "bu kolonu gizle" denemez.
--      Herkese açık satırda yalnızca yuvarlanmış koordinat ve etiket var.

-- ══════════════════════════════════════════════════════════════════════════
-- ENUM'LAR
-- ══════════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'photo_status' and n.nspname = 'app') then
    create type app.photo_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'location_visibility' and n.nspname = 'app') then
    create type app.location_visibility as enum (
      'exact', 'approximate', 'region', 'hidden'
    );
  end if;

  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where t.typname = 'photo_version_kind' and n.nspname = 'app') then
    create type app.photo_version_kind as enum (
      'ilk-isleme', 'yeni-entegrasyon', 'farkli-palet',
      'yeni-kalibrasyon', 'revize-isleme'
    );
  end if;
end;
$$;

-- ══════════════════════════════════════════════════════════════════════════
-- FOTOĞRAFLAR
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.astro_photos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  slug        text unique not null,
  title       text not null,
  description text not null default '',

  object_id   uuid references public.celestial_objects (id) on delete set null,
  /** Katalogda olmayan hedefler için serbest metin (kuyruklu yıldız, manzara). */
  target_label text,

  photo_type  text not null,
  palette     text,
  status      app.photo_status not null default 'draft',

  captured_at date,
  published_at timestamptz,

  /* ── Konum: KAMUYA AÇIK kısım (§15.3) ── */
  location_label      text,
  location_visibility app.location_visibility not null default 'approximate',
  /** Yuvarlanmış koordinat: yalnızca `exact` dışındaki seviyelerde anlamlı. */
  location_approx_lat numeric(6,3),
  location_approx_lon numeric(6,3),
  bortle      smallint,
  sqm         numeric(5,2),

  /* ── Ekipman: veritabanı bağı + serbest metin yedeği ── */
  optic_id    uuid references public.equipment_models (id) on delete set null,
  camera_id   uuid references public.equipment_models (id) on delete set null,
  mount_id    uuid references public.equipment_models (id) on delete set null,
  setup_text  jsonb not null default '{}'::jsonb,

  /* ── Telif ve beyan (§15.4–15.6) ── */
  license          text not null default 'Tüm hakları saklıdır',
  ai_declared      boolean not null default false,
  copyright_confirmed boolean not null default false,

  /* Denormalize sayaçlar: her listede alt sorgu çalıştırmamak için. */
  like_count    integer not null default 0,
  comment_count integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint astro_photos_slug_format check (slug ~ '^[a-z0-9-]{3,120}$'),
  constraint astro_photos_title_length check (char_length(title) between 3 and 160),
  constraint astro_photos_bortle_range check (bortle is null or bortle between 1 and 9),
  /* Yayımlanan kayıt telif onayı taşımak zorunda: onaysız yayın, §15.5'teki
     sorumluluğu hiç kimseye bağlamadan içerik yayımlamak olurdu. */
  constraint astro_photos_publish_requires_copyright check (
    status <> 'published' or copyright_confirmed
  ),
  constraint astro_photos_publish_requires_date check (
    status <> 'published' or published_at is not null
  )
);

comment on column public.astro_photos.location_approx_lat is
  'Yuvarlanmış koordinat. Tam koordinat photo_exact_locations tablosundadır (§15.3).';

create index if not exists astro_photos_user_idx
  on public.astro_photos (user_id, status, created_at desc);
create index if not exists astro_photos_published_idx
  on public.astro_photos (status, published_at desc)
  where status = 'published';
create index if not exists astro_photos_object_idx
  on public.astro_photos (object_id) where object_id is not null;
create index if not exists astro_photos_title_trgm_idx
  on public.astro_photos using gin (title gin_trgm_ops);

drop trigger if exists astro_photos_set_updated_at on public.astro_photos;
create trigger astro_photos_set_updated_at
  before update on public.astro_photos
  for each row execute function app.set_updated_at();

-- ══════════════════════════════════════════════════════════════════════════
-- KOTA ZORLAMASI (§4.2) — ÇİFT DOĞRULAMANIN SUNUCU YARISI
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.active_photo_count(target_user uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select count(*)::integer
    from public.astro_photos
   where user_id = target_user
     and status = 'published';
$$;

comment on function app.active_photo_count is
  'Kullanıcının aktif yayımlanmış fotoğraf sayısı. Sürümler sayılmaz (§8.1).';

create or replace function app.enforce_photo_quota()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  limit_count constant integer := 50;  -- §4.1
  current_count integer;
begin
  -- Yalnızca yayına GEÇİŞ kotayı ilgilendirir. Yayımlanmış bir kaydın
  -- başlığını düzenlemek sayacı tekrar kontrol etmeyi gerektirmez.
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;

  select app.active_photo_count(new.user_id) into current_count;

  if current_count >= limit_count then
    raise exception
      'Aktif fotoğraf kotası dolu (% / %). Yeni fotoğraf yayımlamak için mevcut bir kaydı arşivleyin.',
      current_count, limit_count
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists astro_photos_quota on public.astro_photos;
create trigger astro_photos_quota
  before insert or update on public.astro_photos
  for each row execute function app.enforce_photo_quota();

-- ══════════════════════════════════════════════════════════════════════════
-- TAM KOORDİNAT — AYRI TABLO, YALNIZCA SAHİBİNE AÇIK (§15.3)
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.photo_exact_locations (
  photo_id  uuid primary key references public.astro_photos (id) on delete cascade,
  latitude  numeric(9,6) not null,
  longitude numeric(9,6) not null,
  /** EXIF'ten mi geldi, kullanıcı mı girdi? Denetimde fark eder. */
  source    text not null default 'user',
  created_at timestamptz not null default now(),
  constraint photo_exact_lat_range check (latitude between -90 and 90),
  constraint photo_exact_lon_range check (longitude between -180 and 180)
);

comment on table public.photo_exact_locations is
  'Tam koordinatlar. RLS satır bazlı olduğu için ayrı tablodadır: aynı satırda tutulup "bu kolonu gizle" denemez (§15.3).';

-- ══════════════════════════════════════════════════════════════════════════
-- SÜRÜMLER (§8.1) — KOTAYA GİRMEZ
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.photo_versions (
  id           uuid primary key default gen_random_uuid(),
  photo_id     uuid not null references public.astro_photos (id) on delete cascade,
  label        text not null,
  kind         app.photo_version_kind not null,
  note         text not null default '',
  /** Object storage yolu — public URL DEĞİL (§10.6: orijinal public olmaz). */
  storage_path text,
  palette      text,
  published_at timestamptz not null default now(),
  position     integer not null default 0,
  constraint photo_versions_label_length check (char_length(label) between 1 and 80)
);

create index if not exists photo_versions_photo_idx
  on public.photo_versions (photo_id, published_at);

-- ══════════════════════════════════════════════════════════════════════════
-- POZLAMALAR
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.photo_exposures (
  id          uuid primary key default gen_random_uuid(),
  photo_id    uuid not null references public.astro_photos (id) on delete cascade,
  /** Sürüme özgü pozlama; boşsa fotoğrafın geneli. */
  version_id  uuid references public.photo_versions (id) on delete cascade,
  filter      text not null,
  frames      integer not null,
  exposure_seconds numeric(8,2) not null,
  position    integer not null default 0,
  constraint photo_exposures_frames_positive check (frames > 0),
  constraint photo_exposures_seconds_positive check (exposure_seconds > 0)
);

create index if not exists photo_exposures_photo_idx
  on public.photo_exposures (photo_id, position);

-- ══════════════════════════════════════════════════════════════════════════
-- BEĞENİ VE YORUM
-- ══════════════════════════════════════════════════════════════════════════
create table if not exists public.photo_likes (
  photo_id  uuid not null references public.astro_photos (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (photo_id, user_id)
);

create table if not exists public.photo_comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.astro_photos (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_comments_body_length check (char_length(body) between 2 and 5000)
);

create index if not exists photo_comments_photo_idx
  on public.photo_comments (photo_id, created_at);

drop trigger if exists photo_comments_set_updated_at on public.photo_comments;
create trigger photo_comments_set_updated_at
  before update on public.photo_comments
  for each row execute function app.set_updated_at();

/*
 * Sayaçlar tetikleyiciyle güncellenir — istemci iki adımı ayrı gönderirse
 * (beğeni + sayaç) arada kopan bağlantı sayacı kalıcı olarak yanlışa
 * düşürüyor. Forum tarafında aynı karar verilmişti (bkz. 0004).
 */
create or replace function app.photo_touch_counters()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  target uuid;
  delta  integer;
begin
  if tg_op = 'INSERT' then
    target := new.photo_id;
    delta := 1;
  else
    target := old.photo_id;
    delta := -1;
  end if;

  if tg_table_name = 'photo_likes' then
    update public.astro_photos
       set like_count = greatest(0, like_count + delta)
     where id = target;
  else
    update public.astro_photos
       set comment_count = greatest(0, comment_count + delta)
     where id = target;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists photo_likes_counter on public.photo_likes;
create trigger photo_likes_counter
  after insert or delete on public.photo_likes
  for each row execute function app.photo_touch_counters();

drop trigger if exists photo_comments_counter on public.photo_comments;
create trigger photo_comments_counter
  after insert or delete on public.photo_comments
  for each row execute function app.photo_touch_counters();

-- ══════════════════════════════════════════════════════════════════════════
-- RLS
-- ══════════════════════════════════════════════════════════════════════════
alter table public.astro_photos          enable row level security;
alter table public.photo_exact_locations enable row level security;
alter table public.photo_versions        enable row level security;
alter table public.photo_exposures       enable row level security;
alter table public.photo_likes           enable row level security;
alter table public.photo_comments        enable row level security;

/* Fotoğraf: yayımlanmış olan herkese açık; taslak yalnızca sahibine. */
drop policy if exists astro_photos_read on public.astro_photos;
create policy astro_photos_read on public.astro_photos
  for select using (
    status = 'published'
    or auth.uid() = user_id
    or app.is_admin()
    or app.has_role('moderator')
  );

drop policy if exists astro_photos_insert_own on public.astro_photos;
create policy astro_photos_insert_own on public.astro_photos
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists astro_photos_update_own on public.astro_photos;
create policy astro_photos_update_own on public.astro_photos
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists astro_photos_delete_own on public.astro_photos;
create policy astro_photos_delete_own on public.astro_photos
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists astro_photos_moderate on public.astro_photos;
create policy astro_photos_moderate on public.astro_photos
  for all to authenticated
  using (app.is_admin() or app.has_role('moderator'))
  with check (app.is_admin() or app.has_role('moderator'));

/*
 * TAM KOORDİNAT: yalnızca sahibi ve admin.
 *
 * Moderatör bile göremiyor — hassas nokta ihbarı geldiğinde moderatörün
 * karara varması için koordinat gerekmiyor, konum etiketi ve görsel yetiyor.
 * Yetkiyi en dar tutmak, sızma yüzeyini en dar tutmaktır.
 */
drop policy if exists photo_exact_locations_owner on public.photo_exact_locations;
create policy photo_exact_locations_owner on public.photo_exact_locations
  for all to authenticated
  using (
    app.is_admin()
    or exists (
      select 1 from public.astro_photos p
      where p.id = photo_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.astro_photos p
      where p.id = photo_id and p.user_id = auth.uid()
    )
  );

/* Sürüm ve pozlamalar fotoğrafın görünürlüğünü izler. */
do $$
declare
  t text;
begin
  foreach t in array array['photo_versions', 'photo_exposures']
  loop
    execute format('drop policy if exists %I_read on public.%I', t, t);
    execute format(
      'create policy %I_read on public.%I for select using ('
      '  exists (select 1 from public.astro_photos p'
      '           where p.id = photo_id'
      '             and (p.status = ''published'' or p.user_id = auth.uid()'
      '                  or app.is_admin() or app.has_role(''moderator''))))',
      t, t
    );

    execute format('drop policy if exists %I_write_own on public.%I', t, t);
    execute format(
      'create policy %I_write_own on public.%I for all to authenticated '
      'using (exists (select 1 from public.astro_photos p'
      '                where p.id = photo_id and p.user_id = auth.uid())) '
      'with check (exists (select 1 from public.astro_photos p'
      '                     where p.id = photo_id and p.user_id = auth.uid()))',
      t, t
    );
  end loop;
end;
$$;

/* Beğeni: herkes sayabilir, yalnızca kendi beğenisini ekler/siler. */
drop policy if exists photo_likes_read on public.photo_likes;
create policy photo_likes_read on public.photo_likes for select using (true);

drop policy if exists photo_likes_own on public.photo_likes;
create policy photo_likes_own on public.photo_likes
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* Yorum: yayımlanmış fotoğrafta herkes okur; yazmak oturum ister. */
drop policy if exists photo_comments_read on public.photo_comments;
create policy photo_comments_read on public.photo_comments
  for select using (
    exists (
      select 1 from public.astro_photos p
      where p.id = photo_id
        and (p.status = 'published' or p.user_id = auth.uid()
             or app.is_admin() or app.has_role('moderator'))
    )
  );

drop policy if exists photo_comments_insert_own on public.photo_comments;
create policy photo_comments_insert_own on public.photo_comments
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.astro_photos p
      where p.id = photo_id and p.status = 'published'
    )
  );

drop policy if exists photo_comments_update_own on public.photo_comments;
create policy photo_comments_update_own on public.photo_comments
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists photo_comments_delete_own on public.photo_comments;
create policy photo_comments_delete_own on public.photo_comments
  for delete to authenticated
  using (auth.uid() = user_id or app.is_admin() or app.has_role('moderator'));

-- ══════════════════════════════════════════════════════════════════════════
-- YETKİLER
-- ══════════════════════════════════════════════════════════════════════════
do $$
declare
  t text;
begin
  foreach t in array array[
    'astro_photos', 'photo_versions', 'photo_exposures',
    'photo_likes', 'photo_comments'
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

-- Tam koordinat tablosuna anon HİÇBİR yetki almaz.
revoke all on public.photo_exact_locations from anon, authenticated;
grant select, insert, update, delete on public.photo_exact_locations to authenticated;
