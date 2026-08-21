-- Haftanin fotografi hafta bitmeden secilmez.
-- Kapanis: Europe/Istanbul saatine gore Pazar 23:59. O ana kadar sistem
-- yalnizca aday/puan siralamasi gosterir; winner_photo_id ancak kapanistan
-- sonra yazilir.

create or replace function app.photo_week_bounds(reference_time timestamptz)
returns table (
  opens_at timestamptz,
  closes_at timestamptz,
  iso_year smallint,
  iso_week smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with local_week as (
    select date_trunc('week', timezone('Europe/Istanbul', reference_time)) as start_local
  ),
  bounds as (
    select
      start_local at time zone 'Europe/Istanbul' as opens_at,
      (start_local + interval '6 days 23 hours 59 minutes') at time zone 'Europe/Istanbul' as closes_at
    from local_week
  )
  select
    opens_at,
    closes_at,
    extract(isoyear from timezone('Europe/Istanbul', opens_at))::smallint,
    extract(week from timezone('Europe/Istanbul', opens_at))::smallint
  from bounds;
$$;

create or replace function public.sync_photo_week_rounds(
  reference_time timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_week record;
  due_round record;
  active_round_id uuid;
  winner uuid;
  winner_owner uuid;
  winner_slug text;
  winner_title text;
  changed integer := 0;
begin
  select * into current_week
    from app.photo_week_bounds(reference_time);

  insert into public.photo_of_week_rounds (
    iso_year, iso_week, status, opens_at, closes_at, created_by
  )
  values (
    current_week.iso_year,
    current_week.iso_week,
    'oylama',
    current_week.opens_at,
    current_week.closes_at,
    null
  )
  on conflict (iso_year, iso_week) do update
     set status = case
           when public.photo_of_week_rounds.status in ('aday_toplama', 'oylama') then 'oylama'
           else public.photo_of_week_rounds.status
         end,
         opens_at = excluded.opens_at,
         closes_at = excluded.closes_at
  returning id into active_round_id;

  changed := changed + app.photo_week_sync_nominees(active_round_id);

  for due_round in
    select r.id
      from public.photo_of_week_rounds r
     where r.status in ('aday_toplama', 'oylama')
       and r.closes_at <= reference_time
     order by r.opens_at
  loop
    perform app.photo_week_sync_nominees(due_round.id);
    winner := app.photo_week_winner(due_round.id);

    if winner is null then
      update public.photo_of_week_rounds
         set status = 'sonuclandi', closed_at = now()
       where id = due_round.id
         and status in ('aday_toplama', 'oylama');
      changed := changed + 1;
      continue;
    end if;

    update public.photo_of_week_rounds
       set winner_photo_id = winner, status = 'yayinda', closed_at = now()
     where id = due_round.id
       and status in ('aday_toplama', 'oylama');

    if found then
      changed := changed + 1;

      select p.user_id, p.slug, p.title
        into winner_owner, winner_slug, winner_title
        from public.astro_photos p
       where p.id = winner;

      perform app.notify(
        winner_owner,
        null,
        'photo_featured',
        'Fotografin Haftanin Fotografi secildi',
        winner_title,
        '/fotograf/' || winner_slug,
        'photo',
        winner
      );
    end if;
  end loop;

  return changed;
end;
$$;

create or replace function public.close_photo_of_week(target_round uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  round_row record;
  winner uuid;
  winner_owner uuid;
  winner_slug text;
  winner_title text;
begin
  if not app.is_admin() then
    raise exception 'Yonetici yetkisi gerekli.' using errcode = 'insufficient_privilege';
  end if;

  select r.id, r.closes_at
    into round_row
    from public.photo_of_week_rounds r
   where r.id = target_round;

  if not found then
    raise exception 'Haftanin fotografi haftasi bulunamadi.';
  end if;

  if now() < round_row.closes_at then
    raise exception 'Haftanin fotografi Pazar 23:59 kapanmadan secilemez.';
  end if;

  perform app.photo_week_sync_nominees(target_round);
  winner := app.photo_week_winner(target_round);

  if winner is null then
    update public.photo_of_week_rounds
       set status = 'sonuclandi', winner_photo_id = null, closed_at = now()
     where id = target_round
       and status in ('aday_toplama', 'oylama', 'sonuclandi');
    return null;
  end if;

  update public.photo_of_week_rounds
     set winner_photo_id = winner, status = 'yayinda', closed_at = now()
   where id = target_round;

  select user_id, slug, title into winner_owner, winner_slug, winner_title
    from public.astro_photos
   where id = winner;

  perform app.notify(
    winner_owner,
    null,
    'photo_featured',
    'Fotografin Haftanin Fotografi secildi',
    winner_title,
    '/fotograf/' || winner_slug,
    'photo',
    winner
  );

  return winner;
end;
$$;

-- Daha once otomasyonla erken kapanmis aktif/gelecek hafta varsa geri ac.
with expected_bounds as (
  select
    r.id,
    b.opens_at,
    b.closes_at
  from public.photo_of_week_rounds r
  cross join lateral app.photo_week_bounds(r.opens_at) b
)
update public.photo_of_week_rounds r
   set opens_at = e.opens_at,
       closes_at = e.closes_at,
       status = case
         when e.closes_at > now() and r.status in ('sonuclandi', 'yayinda') then 'oylama'
         else r.status
       end,
       winner_photo_id = case
         when e.closes_at > now() then null
         else r.winner_photo_id
       end,
       closed_at = case
         when e.closes_at > now() then null
         else r.closed_at
       end
  from expected_bounds e
 where r.id = e.id
   and (
     r.opens_at is distinct from e.opens_at
     or r.closes_at is distinct from e.closes_at
     or (e.closes_at > now() and (r.status in ('sonuclandi', 'yayinda') or r.winner_photo_id is not null))
   );

-- Pazar 23:59 Istanbul = 20:59 UTC. pg_cron zaman ifadesini UTC kabul eder.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'haftanin-fotografi-kapat') then
      perform cron.unschedule('haftanin-fotografi-kapat');
    end if;

    perform cron.schedule(
      'haftanin-fotografi-kapat',
      '59 20 * * 0',
      $job$ select public.sync_photo_week_rounds(now()); $job$
    );
  end if;
end $$;

revoke all on function app.photo_week_bounds(timestamptz) from public;
revoke all on function public.sync_photo_week_rounds(timestamptz) from public;
grant execute on function public.sync_photo_week_rounds(timestamptz) to anon, authenticated;
revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;
