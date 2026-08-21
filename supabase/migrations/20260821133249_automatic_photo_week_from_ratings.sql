-- Haftanin Fotografi manuel tur yonetiminden cikar.
-- Haftalik pencere Istanbul saatine gore otomatik olusur; adaylar o hafta
-- yayina alinan fotograflardir. Kazanan once ortalama puan, esitlikte
-- degerlendirme sayisi, sonra yayin zamani ile secilir.

create or replace function app.photo_week_bounds(reference_time timestamptz)
returns table (opens_at timestamptz, closes_at timestamptz, iso_year smallint, iso_week smallint)
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
      (start_local + interval '7 days') at time zone 'Europe/Istanbul' as closes_at
    from local_week
  )
  select
    opens_at,
    closes_at,
    extract(isoyear from timezone('Europe/Istanbul', opens_at))::smallint,
    extract(week from timezone('Europe/Istanbul', opens_at))::smallint
  from bounds;
$$;

create or replace function app.photo_week_for_time(reference_time timestamptz)
returns table (iso_year smallint, iso_week smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    extract(isoyear from timezone('Europe/Istanbul', reference_time))::smallint,
    extract(week from timezone('Europe/Istanbul', reference_time))::smallint;
$$;

create or replace function app.photo_week_sync_nominees(target_round uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  round_row record;
  inserted integer := 0;
begin
  select r.id, r.iso_year, r.iso_week, r.opens_at, r.closes_at
    into round_row
    from public.photo_of_week_rounds r
   where r.id = target_round;

  if not found then
    return 0;
  end if;

  insert into public.photo_of_week_nominees (round_id, photo_id, nominated_by)
  select round_row.id, p.id, null
    from public.astro_photos p
   where p.status::text = 'yayinda'
     and p.deleted_at is null
     and p.published_at >= round_row.opens_at
     and p.published_at < round_row.closes_at
  on conflict (round_id, photo_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

create or replace function app.photo_week_winner(target_round uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
    from public.photo_of_week_rounds r
    join public.astro_photos p
      on p.published_at >= r.opens_at
     and p.published_at < r.closes_at
   where r.id = target_round
     and p.status::text = 'yayinda'
     and p.deleted_at is null
     and p.rating_count > 0
   order by (p.rating_sum::numeric / nullif(p.rating_count, 0)) desc,
            p.rating_count desc,
            p.published_at asc nulls last,
            p.id
   limit 1;
$$;

create or replace function public.photo_of_week_results(target_round uuid)
returns table (photo_id uuid, total_score bigint, vote_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.rating_sum::bigint, p.rating_count::bigint
    from public.photo_of_week_rounds r
    join public.astro_photos p
      on p.published_at >= r.opens_at
     and p.published_at < r.closes_at
   where r.id = target_round
     and p.status::text = 'yayinda'
     and p.deleted_at is null
     and p.rating_count > 0
     and (
       r.status in ('oylama', 'sonuclandi', 'yayinda')
       or app.is_admin()
     )
   order by (p.rating_sum::numeric / nullif(p.rating_count, 0)) desc,
            p.rating_count desc,
            p.published_at asc nulls last,
            p.id;
$$;

create or replace function public.sync_photo_week_rounds(reference_time timestamptz default now())
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

create or replace function public.settle_due_photo_week_rounds()
returns integer
language sql
security definer
set search_path = ''
as $$
  select public.sync_photo_week_rounds(now());
$$;

create or replace function public.close_photo_of_week(target_round uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  winner uuid;
  winner_owner uuid;
  winner_slug text;
  winner_title text;
begin
  if not app.is_admin() then
    raise exception 'Yonetici yetkisi gerekli.' using errcode = 'insufficient_privilege';
  end if;

  perform app.photo_week_sync_nominees(target_round);
  winner := app.photo_week_winner(target_round);

  if winner is null then
    update public.photo_of_week_rounds
       set status = 'sonuclandi', closed_at = now()
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

create or replace function app.auto_photo_week_on_photo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  week_row record;
  round_id uuid;
begin
  if new.status::text <> 'yayinda' or new.deleted_at is not null or new.published_at is null then
    return new;
  end if;

  select * into week_row from app.photo_week_bounds(new.published_at);

  insert into public.photo_of_week_rounds (
    iso_year, iso_week, status, opens_at, closes_at, created_by
  )
  values (week_row.iso_year, week_row.iso_week, 'oylama', week_row.opens_at, week_row.closes_at, null)
  on conflict (iso_year, iso_week) do update
     set opens_at = excluded.opens_at,
         closes_at = excluded.closes_at,
         status = case
           when public.photo_of_week_rounds.status in ('aday_toplama', 'oylama') then 'oylama'
           else public.photo_of_week_rounds.status
         end
  returning id into round_id;

  insert into public.photo_of_week_nominees (round_id, photo_id, nominated_by)
  values (round_id, new.id, null)
  on conflict (round_id, photo_id) do nothing;

  return new;
end;
$$;

drop trigger if exists astro_photos_auto_photo_week on public.astro_photos;
create trigger astro_photos_auto_photo_week
  after insert or update of status, published_at, deleted_at on public.astro_photos
  for each row execute function app.auto_photo_week_on_photo_change();

create or replace function app.auto_photo_week_on_rating_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.sync_photo_week_rounds(now());
  return null;
end;
$$;

drop trigger if exists photo_ratings_auto_photo_week on public.photo_ratings;
create trigger photo_ratings_auto_photo_week
  after insert or update or delete on public.photo_ratings
  for each row execute function app.auto_photo_week_on_rating_change();

revoke all on function app.photo_week_bounds(timestamptz) from public;
revoke all on function app.photo_week_for_time(timestamptz) from public;
revoke all on function app.photo_week_sync_nominees(uuid) from public;
revoke all on function app.photo_week_winner(uuid) from public;
revoke all on function app.auto_photo_week_on_photo_change() from public;
revoke all on function app.auto_photo_week_on_rating_change() from public;
revoke all on function public.sync_photo_week_rounds(timestamptz) from public;
grant execute on function public.sync_photo_week_rounds(timestamptz) to anon, authenticated;
revoke all on function public.settle_due_photo_week_rounds() from public;
grant execute on function public.settle_due_photo_week_rounds() to anon, authenticated;
revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;
revoke all on function public.photo_of_week_results(uuid) from public;
grant execute on function public.photo_of_week_results(uuid) to anon, authenticated;
