-- Haftanin fotografi artik donemli juri yerine topluluk oylamasi ile belirlenir.
-- Eski `jury_members` ve `photo_of_week_votes.juror_id` semasi uyumluluk icin
-- korunur; uygulamada juror_id alanini "oy veren kullanici" olarak okuyoruz.

delete from public.user_roles where role::text = 'jury';

alter table public.user_roles
  drop constraint if exists user_roles_no_jury_role;

alter table public.user_roles
  add constraint user_roles_no_jury_role check (role::text <> 'jury');

update public.jury_members
   set term_end = current_date
 where term_end is null or term_end >= current_date;

drop policy if exists jury_members_own_read on public.jury_members;
drop policy if exists jury_members_admin_read on public.jury_members;
drop policy if exists jury_members_admin_write on public.jury_members;

create policy jury_members_admin_read on public.jury_members
  for select to authenticated
  using (app.is_admin());

create policy jury_members_admin_write on public.jury_members
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create or replace function app.is_active_juror(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select false;
$$;

create or replace function app.guard_photo_of_week_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_owner uuid;
  round_row record;
begin
  if new.juror_id <> (select auth.uid()) then
    raise exception 'Oy yalnizca oturumdaki kullanici adina yazilabilir.'
      using errcode = 'insufficient_privilege';
  end if;

  select r.status, r.opens_at, r.closes_at
    into round_row
    from public.photo_of_week_rounds r
   where r.id = new.round_id;

  if not found then
    raise exception 'Oylama turu bulunamadi.';
  end if;

  if round_row.status <> 'oylama' then
    raise exception 'Bu tur oylamaya acik degil.';
  end if;

  if now() < round_row.opens_at or now() >= round_row.closes_at then
    raise exception 'Bu turun oylama suresi acik degil.';
  end if;

  select p.user_id into photo_owner
    from public.astro_photos p
   where p.id = new.photo_id;

  if photo_owner is null then
    raise exception 'Fotograf bulunamadi.';
  end if;

  if not exists (
    select 1
      from public.photo_of_week_nominees n
     where n.round_id = new.round_id
       and n.photo_id = new.photo_id
  ) then
    raise exception 'Bu fotograf turun aday listesinde degil.';
  end if;

  if photo_owner = new.juror_id then
    raise exception 'Kendi fotografina oy veremezsin.';
  end if;

  return new;
end;
$$;

drop policy if exists photo_of_week_rounds_read on public.photo_of_week_rounds;
create policy photo_of_week_rounds_read on public.photo_of_week_rounds
  for select
  using (status <> 'aday_toplama' or app.is_admin());

drop policy if exists photo_of_week_nominees_read on public.photo_of_week_nominees;
create policy photo_of_week_nominees_read on public.photo_of_week_nominees
  for select
  using (
    app.is_admin() or exists (
      select 1
        from public.photo_of_week_rounds r
       where r.id = public.photo_of_week_nominees.round_id
         and r.status in ('oylama', 'sonuclandi', 'yayinda')
    )
  );

drop policy if exists photo_of_week_votes_own_read on public.photo_of_week_votes;
drop policy if exists photo_of_week_votes_own_insert on public.photo_of_week_votes;
drop policy if exists photo_of_week_votes_own_update on public.photo_of_week_votes;

create policy photo_of_week_votes_own_read on public.photo_of_week_votes
  for select to authenticated
  using (juror_id = (select auth.uid()));

create policy photo_of_week_votes_own_insert on public.photo_of_week_votes
  for insert to authenticated
  with check (juror_id = (select auth.uid()));

create policy photo_of_week_votes_own_update on public.photo_of_week_votes
  for update to authenticated
  using (juror_id = (select auth.uid()))
  with check (juror_id = (select auth.uid()));

create or replace function public.photo_of_week_results(target_round uuid)
returns table (photo_id uuid, total_score bigint, vote_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select v.photo_id, sum(v.score)::bigint, count(*)::bigint
    from public.photo_of_week_votes v
    join public.photo_of_week_rounds r on r.id = v.round_id
   where v.round_id = target_round
     and (
       r.status in ('sonuclandi', 'yayinda')
       or app.is_admin()
     )
   group by v.photo_id;
$$;

create or replace function app.photo_week_winner(target_round uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select v.photo_id
    from public.photo_of_week_votes v
    join public.astro_photos p on p.id = v.photo_id
   where v.round_id = target_round
   group by v.photo_id, p.published_at
   order by avg(v.score) desc,
            count(*) desc,
            p.published_at asc nulls last,
            v.photo_id
   limit 1;
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

  winner := app.photo_week_winner(target_round);
  if winner is null then
    raise exception 'Sonuclandirmak icin en az bir oy gerekli.';
  end if;

  update public.photo_of_week_rounds
     set winner_photo_id = winner, status = 'yayinda', closed_at = now()
   where id = target_round and status = 'oylama';

  if not found then
    raise exception 'Tur oylama durumunda degil.';
  end if;

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

create or replace function public.settle_due_photo_week_rounds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due_round record;
  winner uuid;
  winner_owner uuid;
  winner_slug text;
  winner_title text;
  changed integer := 0;
begin
  for due_round in
    select r.id
      from public.photo_of_week_rounds r
     where r.status = 'oylama'
       and r.closes_at <= now()
  loop
    winner := app.photo_week_winner(due_round.id);

    if winner is null then
      update public.photo_of_week_rounds
         set status = 'sonuclandi', closed_at = now()
       where id = due_round.id and status = 'oylama';
      changed := changed + 1;
      continue;
    end if;

    update public.photo_of_week_rounds
       set winner_photo_id = winner, status = 'yayinda', closed_at = now()
     where id = due_round.id and status = 'oylama';

    if found then
      changed := changed + 1;

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
    end if;
  end loop;

  return changed;
end;
$$;

create or replace function app.notify_photo_week_voting_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  label text;
begin
  if new.status <> 'oylama' or old.status = new.status then
    return new;
  end if;

  label := new.iso_year::text || '-' || lpad(new.iso_week::text, 2, '0');

  for recipient in
    select p.id
      from public.profiles p
     where p.account_status = 'active'
  loop
    perform app.notify(
      recipient.id,
      null,
      'announcement',
      'Haftanin Fotografi oylamasi basladi',
      label || ' turundaki aday fotograflari 10 uzerinden puanlayabilirsiniz.',
      '/haftanin-fotografi',
      'photo_week_round',
      new.id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists photo_week_voting_open_notify on public.photo_of_week_rounds;
create trigger photo_week_voting_open_notify
  after update of status on public.photo_of_week_rounds
  for each row execute function app.notify_photo_week_voting_open();

create or replace function public.profile_public_badges(target_user uuid)
returns table (
  active_juror boolean,
  former_juror boolean,
  week_wins bigint,
  verified_organizer boolean,
  club_manager boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    false,
    false,
    (select count(*) from public.photo_of_week_rounds r
      join public.astro_photos p on p.id = r.winner_photo_id
     where p.user_id = target_user and r.status in ('sonuclandi', 'yayinda')),
    exists (select 1 from public.user_roles u where u.user_id = target_user and u.role = 'verified_organizer'),
    exists (select 1 from public.user_roles u where u.user_id = target_user and u.role = 'club_manager');
$$;

revoke all on function app.photo_week_winner(uuid) from public;
revoke all on function public.settle_due_photo_week_rounds() from public;
grant execute on function public.settle_due_photo_week_rounds() to anon, authenticated;
revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;
revoke all on function public.photo_of_week_results(uuid) from public;
grant execute on function public.photo_of_week_results(uuid) to anon, authenticated;
