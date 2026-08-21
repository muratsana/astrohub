-- Türkiye ışık kirliliği ölçüm noktaları.
--
-- `site_measurements` mevcut gözlem sahasına bağlı tarihçe tutuyor. Bu tablo
-- ayrı: kullanıcı haritaya nokta atışı tıklar ve ölçümün kendi koordinatı
-- saklanır. Böylece bir saha kaydı açmadan yol üstü, yayla, kamp alanı veya
-- şehir içi SQM ölçümü toplanabilir.

create table if not exists public.light_pollution_measurements (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  site_id           uuid references public.observing_sites (id) on delete set null,
  latitude          numeric(9,6) not null,
  longitude         numeric(9,6) not null,
  measured_at       timestamptz not null,
  sqm               numeric(5,2),
  bortle            smallint,
  method            text not null default '',
  equipment_type    text not null default '',
  equipment_name    text not null default '',
  sky_condition     text not null default '',
  transparency      text not null default '',
  moon_phase        text not null default '',
  moon_illumination numeric(5,4),
  note              text not null default '',
  status            app.content_status not null default 'yayinda',
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint light_pollution_measurements_lat_range
    check (latitude between -90 and 90),
  constraint light_pollution_measurements_lon_range
    check (longitude between -180 and 180),
  constraint light_pollution_measurements_has_value
    check (sqm is not null or bortle is not null),
  constraint light_pollution_measurements_sqm_range
    check (sqm is null or sqm between 15 and 23),
  constraint light_pollution_measurements_bortle_range
    check (bortle is null or bortle between 1 and 9),
  constraint light_pollution_measurements_moon_range
    check (moon_illumination is null or moon_illumination between 0 and 1)
);

comment on table public.light_pollution_measurements is
  'Kullanıcıların haritadan nokta seçerek girdiği bağımsız SQM/Bortle ölçümleri.';
comment on column public.light_pollution_measurements.latitude is
  'Ölçümün nokta atışı enlemi. Saha koordinatından bağımsızdır.';
comment on column public.light_pollution_measurements.longitude is
  'Ölçümün nokta atışı boylamı. Saha koordinatından bağımsızdır.';
comment on column public.light_pollution_measurements.moon_illumination is
  '0-1 arası Ay aydınlanma oranı; istemci ölçüm tarihinden hesaplar.';

create index if not exists light_pollution_measurements_location_idx
  on public.light_pollution_measurements (latitude, longitude);
create index if not exists light_pollution_measurements_measured_at_idx
  on public.light_pollution_measurements (measured_at desc);
create index if not exists light_pollution_measurements_user_idx
  on public.light_pollution_measurements (user_id, measured_at desc);
create index if not exists light_pollution_measurements_status_idx
  on public.light_pollution_measurements (status, measured_at desc)
  where deleted_at is null;

drop trigger if exists light_pollution_measurements_set_updated_at
  on public.light_pollution_measurements;
create trigger light_pollution_measurements_set_updated_at
  before update on public.light_pollution_measurements
  for each row execute function app.set_updated_at();

alter table public.light_pollution_measurements enable row level security;

drop policy if exists light_pollution_measurements_read
  on public.light_pollution_measurements;
create policy light_pollution_measurements_read
  on public.light_pollution_measurements
  for select using (
    app.icerik_gorunur(status::text, deleted_at)
    or (select auth.uid()) = user_id
    or app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  );

drop policy if exists light_pollution_measurements_insert_own
  on public.light_pollution_measurements;
create policy light_pollution_measurements_insert_own
  on public.light_pollution_measurements
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and deleted_at is null
    and status in ('yayinda', 'incelemede')
  );

drop policy if exists light_pollution_measurements_update_own
  on public.light_pollution_measurements;
create policy light_pollution_measurements_update_own
  on public.light_pollution_measurements
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists light_pollution_measurements_admin
  on public.light_pollution_measurements;
create policy light_pollution_measurements_admin
  on public.light_pollution_measurements
  for all to authenticated
  using (
    app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  )
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or app.has_role('moderator')
  );

grant select on public.light_pollution_measurements to anon, authenticated;
grant insert, update, delete on public.light_pollution_measurements to authenticated;
