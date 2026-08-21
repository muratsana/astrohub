-- Fotoğraf yayına alınırken haftanın fotoğrafı adaylığı otomatik ekleniyor.
-- Önceki fonksiyonda PL/pgSQL değişkeni `round_id`, conflict hedefindeki
-- `round_id` kolonu ile aynı isimdeydi ve yayın adımında:
--   column reference "round_id" is ambiguous
-- hatasına yol açıyordu. Değişken adını netleştiriyoruz.

create or replace function app.auto_photo_week_on_photo_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  week_row record;
  active_round_id uuid;
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
  returning id into active_round_id;

  insert into public.photo_of_week_nominees (round_id, photo_id, nominated_by)
  values (active_round_id, new.id, null)
  on conflict (round_id, photo_id) do nothing;

  return new;
end;
$$;

revoke all on function app.auto_photo_week_on_photo_change() from public;
