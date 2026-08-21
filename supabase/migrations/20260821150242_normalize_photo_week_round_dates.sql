-- Eski manuel tur kayitlarinda iso_year/iso_week ile opens_at/closes_at
-- ayrismis satirlar olabilir. Tarih araligi daima ISO hafta numarasindan
-- turetilsin; aksi halde 2026-01 gibi bir tur 34. haftanin tarihleriyle
-- gorunebiliyor.

create or replace function app.photo_week_bounds_for_iso(
  target_iso_year smallint,
  target_iso_week smallint
)
returns table (
  opens_at timestamptz,
  closes_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with local_week as (
    select to_date(
      target_iso_year::text || lpad(target_iso_week::text, 2, '0') || '1',
      'IYYYIWID'
    )::timestamp as start_local
  )
  select
    start_local at time zone 'Europe/Istanbul' as opens_at,
    (start_local + interval '6 days 23 hours 59 minutes') at time zone 'Europe/Istanbul' as closes_at
  from local_week;
$$;

with expected_bounds as (
  select
    r.id,
    b.opens_at,
    b.closes_at
  from public.photo_of_week_rounds r
  cross join lateral app.photo_week_bounds_for_iso(r.iso_year, r.iso_week) b
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

revoke all on function app.photo_week_bounds_for_iso(smallint, smallint) from public;
