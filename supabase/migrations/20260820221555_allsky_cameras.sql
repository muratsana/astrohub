-- ALLSKY kamera yönetimi.
--
-- Public sayfa yalnızca `enabled` kayıtları okur. Yönetim paneli aynı
-- tabloyu admin yetkisiyle okur/yazar. Verilen kaynak HTML sayfası da
-- saklanır, fakat sayfada hafif ve kontrollü olması için doğrudan canlı
-- görüntü adresi (`image_url`) çizilir.

create table if not exists public.allsky_cameras (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null
    check (char_length(trim(title)) between 2 and 120),
  page_url text not null
    check (page_url ~ '^https://[^[:space:]]+$'),
  image_url text not null
    check (image_url ~ '^https://[^[:space:]]+$'),
  location_label text not null default '',
  owner_name text not null default '',
  camera_model text not null default '',
  lens_label text not null default '',
  refresh_seconds integer not null default 15
    check (refresh_seconds between 5 and 3600),
  position integer not null default 100
    check (position >= 1),
  enabled boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

drop trigger if exists allsky_cameras_set_updated_at on public.allsky_cameras;
create trigger allsky_cameras_set_updated_at
  before update on public.allsky_cameras
  for each row execute function app.set_updated_at();

create index if not exists allsky_cameras_public_idx
  on public.allsky_cameras (enabled, position, title);

alter table public.allsky_cameras enable row level security;

drop policy if exists allsky_cameras_read_enabled on public.allsky_cameras;
create policy allsky_cameras_read_enabled on public.allsky_cameras
  for select
  to anon, authenticated
  using (enabled or app.is_admin());

drop policy if exists allsky_cameras_admin_insert on public.allsky_cameras;
create policy allsky_cameras_admin_insert on public.allsky_cameras
  for insert
  to authenticated
  with check (app.is_admin());

drop policy if exists allsky_cameras_admin_update on public.allsky_cameras;
create policy allsky_cameras_admin_update on public.allsky_cameras
  for update
  to authenticated
  using (app.is_admin())
  with check (app.is_admin());

drop policy if exists allsky_cameras_admin_delete on public.allsky_cameras;
create policy allsky_cameras_admin_delete on public.allsky_cameras
  for delete
  to authenticated
  using (app.is_admin());

revoke all on public.allsky_cameras from anon, authenticated;
grant select on public.allsky_cameras to anon, authenticated;
grant insert, update, delete on public.allsky_cameras to authenticated;

insert into public.allsky_cameras (
  slug,
  title,
  page_url,
  image_url,
  location_label,
  owner_name,
  camera_model,
  lens_label,
  refresh_seconds,
  position,
  enabled,
  notes
)
values (
  'ozdens-beypazari',
  'Ozdens ALLSKY CAM',
  'https://ozdensobs.com/allsky/index.php',
  'https://ozdensobs.com/allsky/image.jpg',
  'Ankara, Beypazarı',
  'Emre OZDEN',
  'ZWOASI676MC',
  '2.1 mm',
  5,
  1,
  true,
  'Beypazarı all-sky kamera yayını.'
)
on conflict (slug) do update
set title = excluded.title,
    page_url = excluded.page_url,
    image_url = excluded.image_url,
    location_label = excluded.location_label,
    owner_name = excluded.owner_name,
    camera_model = excluded.camera_model,
    lens_label = excluded.lens_label,
    refresh_seconds = excluded.refresh_seconds,
    position = excluded.position,
    enabled = excluded.enabled,
    notes = excluded.notes;

-- `0062` yeni kurulumlar için tohumu güncellendi. Bu göç ise mevcut canlı
-- veritabanında yönetici menüye dokunmuş olsa bile yeni modülün tek satır
-- olarak görünmesini sağlar; mevcut sıra korunur, kayıt sona eklenir.
insert into public.nav_links (menu, label, path, position)
select 'header', 'ALLSKY', '/allsky', s.position
  from (
    select coalesce(max(position), 0) + 1 as position
      from public.nav_links
     where menu = 'header'
  ) as s
 where not exists (
   select 1 from public.nav_links
    where menu = 'header' and path = '/allsky'
 );
