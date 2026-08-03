-- Haftanın Fotoğrafı ve dönemli jüri.
-- Jüri bir uygulama rolü değildir: dönemli üyelik hem geçmişi hem de
-- kamuya açık profil rozetini tek kaynaktan üretir.

alter table public.astro_photos
  add column if not exists editors_pick boolean not null default false;

insert into public.home_modules (
  key, title, subtitle, enabled, position, item_limit, layout,
  hide_when_empty, show_mobile, show_desktop
)
select
  'weekly_photo', null, null, true,
  coalesce(max(position), 0) + 1, 1, 'grid', true, true, true
from public.home_modules
on conflict (key) do nothing;

create table if not exists public.jury_members (
  user_id uuid not null references public.profiles(id) on delete cascade,
  term_start date not null,
  term_end date,
  appointed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  primary key (user_id, term_start),
  constraint jury_members_term_order check (term_end is null or term_end >= term_start)
);

create index if not exists jury_members_active_idx
  on public.jury_members (user_id, term_start, term_end);

create table if not exists public.photo_of_week_rounds (
  id uuid primary key default gen_random_uuid(),
  iso_year smallint not null check (iso_year between 2020 and 2200),
  iso_week smallint not null check (iso_week between 1 and 53),
  status text not null default 'aday_toplama'
    check (status in ('aday_toplama', 'oylama', 'sonuclandi', 'yayinda')),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  winner_photo_id uuid references public.astro_photos(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (iso_year, iso_week),
  constraint photo_of_week_round_time check (closes_at > opens_at),
  constraint photo_of_week_winner_state check (
    winner_photo_id is null or status in ('sonuclandi', 'yayinda')
  )
);

create index if not exists photo_of_week_rounds_status_idx
  on public.photo_of_week_rounds (status, closes_at desc);
create index if not exists photo_of_week_rounds_winner_idx
  on public.photo_of_week_rounds (winner_photo_id)
  where winner_photo_id is not null;

create table if not exists public.photo_of_week_nominees (
  round_id uuid not null references public.photo_of_week_rounds(id) on delete cascade,
  photo_id uuid not null references public.astro_photos(id) on delete cascade,
  nominated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (round_id, photo_id)
);

create index if not exists photo_of_week_nominees_photo_idx
  on public.photo_of_week_nominees (photo_id);

create table if not exists public.photo_of_week_votes (
  round_id uuid not null,
  photo_id uuid not null,
  juror_id uuid not null references public.profiles(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (round_id, juror_id, photo_id),
  foreign key (round_id, photo_id)
    references public.photo_of_week_nominees(round_id, photo_id)
    on delete cascade
);

create index if not exists photo_of_week_votes_photo_idx
  on public.photo_of_week_votes (photo_id);
create index if not exists photo_of_week_votes_juror_idx
  on public.photo_of_week_votes (juror_id, round_id);

drop trigger if exists photo_of_week_votes_set_updated_at on public.photo_of_week_votes;
create trigger photo_of_week_votes_set_updated_at
  before update on public.photo_of_week_votes
  for each row execute function app.set_updated_at();

create or replace function app.is_active_juror(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.jury_members j
     where j.user_id = target_user
       and j.term_start <= current_date
       and (j.term_end is null or j.term_end >= current_date)
  );
$$;

create or replace function app.guard_photo_of_week_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_owner uuid;
  round_status text;
begin
  if new.juror_id <> auth.uid() then
    raise exception 'Oy yalnızca oturumdaki jüri üyesi adına yazılabilir.';
  end if;
  if not app.is_active_juror(new.juror_id) then
    raise exception 'Aktif jüri üyeliği gerekli.';
  end if;

  select r.status into round_status
    from public.photo_of_week_rounds r where r.id = new.round_id;
  if round_status <> 'oylama' then
    raise exception 'Bu tur oylamaya açık değil.';
  end if;

  select p.user_id into photo_owner
    from public.astro_photos p where p.id = new.photo_id;
  if photo_owner = new.juror_id then
    raise exception 'Jüri üyesi kendi fotoğrafına oy veremez.';
  end if;
  return new;
end;
$$;

drop trigger if exists photo_of_week_votes_guard on public.photo_of_week_votes;
create trigger photo_of_week_votes_guard
  before insert or update on public.photo_of_week_votes
  for each row execute function app.guard_photo_of_week_vote();

-- Sonuçlar tur kapanana kadar yalnız toplam olarak bile açılmaz.
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
     and r.status in ('sonuclandi', 'yayinda')
   group by v.photo_id;
$$;

-- Kamu profili yalnız rozet için gereken özetleri görür; user_roles
-- tablosunun geri kalanı ve jüri dönem notları açılmaz.
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
    exists (
      select 1 from public.jury_members j
       where j.user_id = target_user and j.term_start <= current_date
         and (j.term_end is null or j.term_end >= current_date)
    ),
    exists (
      select 1 from public.jury_members j
       where j.user_id = target_user and j.term_end < current_date
    ),
    (select count(*) from public.photo_of_week_rounds r
      join public.astro_photos p on p.id = r.winner_photo_id
     where p.user_id = target_user and r.status in ('sonuclandi', 'yayinda')),
    exists (select 1 from public.user_roles u where u.user_id = target_user and u.role = 'verified_organizer'),
    exists (select 1 from public.user_roles u where u.user_id = target_user and u.role = 'club_manager');
$$;

-- Beraberlik: toplam puan, oy veren jüri sayısı, erken yayın, UUID.
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
  if not app.is_admin() then raise exception 'Yönetici yetkisi gerekli.'; end if;

  select v.photo_id into winner
    from public.photo_of_week_votes v
    join public.astro_photos p on p.id = v.photo_id
   where v.round_id = target_round
   group by v.photo_id, p.published_at
   order by sum(v.score) desc, count(*) desc, p.published_at asc nulls last, v.photo_id
   limit 1;

  if winner is null then raise exception 'Sonuçlandırmak için en az bir oy gerekli.'; end if;

  update public.photo_of_week_rounds
     set winner_photo_id = winner, status = 'sonuclandi', closed_at = now()
   where id = target_round and status = 'oylama';
  if not found then raise exception 'Tur oylama durumunda değil.'; end if;

  select user_id, slug, title into winner_owner, winner_slug, winner_title
    from public.astro_photos where id = winner;
  perform app.notify(
    winner_owner, null, 'photo_featured', 'Fotoğrafın Haftanın Fotoğrafı seçildi',
    winner_title, '/fotograf/' || winner_slug, 'photo', winner
  );
  return winner;
end;
$$;

alter table public.jury_members enable row level security;
alter table public.photo_of_week_rounds enable row level security;
alter table public.photo_of_week_nominees enable row level security;
alter table public.photo_of_week_votes enable row level security;

create policy jury_members_own_read on public.jury_members for select to authenticated
  using (user_id = auth.uid());
create policy jury_members_admin_read on public.jury_members for select to authenticated
  using (app.is_admin());
create policy jury_members_admin_write on public.jury_members for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy photo_of_week_rounds_read on public.photo_of_week_rounds for select using (
  status <> 'aday_toplama' or app.is_active_juror() or app.is_admin()
);
create policy photo_of_week_rounds_admin_write on public.photo_of_week_rounds for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy photo_of_week_nominees_read on public.photo_of_week_nominees for select using (
  app.is_active_juror() or app.is_admin() or exists (
    select 1 from public.photo_of_week_rounds r
     where r.id = round_id and r.status in ('sonuclandi', 'yayinda')
  )
);
create policy photo_of_week_nominees_admin_write on public.photo_of_week_nominees for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

create policy photo_of_week_votes_own_read on public.photo_of_week_votes for select to authenticated
  using (juror_id = auth.uid());
create policy photo_of_week_votes_own_insert on public.photo_of_week_votes for insert to authenticated
  with check (juror_id = auth.uid());
create policy photo_of_week_votes_own_update on public.photo_of_week_votes for update to authenticated
  using (juror_id = auth.uid()) with check (juror_id = auth.uid());

revoke all on public.jury_members, public.photo_of_week_rounds,
  public.photo_of_week_nominees, public.photo_of_week_votes from anon, authenticated;
grant select on public.photo_of_week_rounds,
  public.photo_of_week_nominees to anon, authenticated;
grant select on public.jury_members to authenticated;
grant insert, update, delete on public.jury_members, public.photo_of_week_rounds,
  public.photo_of_week_nominees to authenticated;
grant select, insert, update on public.photo_of_week_votes to authenticated;

revoke all on function app.is_active_juror(uuid) from public;
grant execute on function app.is_active_juror(uuid) to anon, authenticated;
revoke all on function public.photo_of_week_results(uuid) from public;
grant execute on function public.photo_of_week_results(uuid) to anon, authenticated;
revoke all on function public.profile_public_badges(uuid) from public;
grant execute on function public.profile_public_badges(uuid) to anon, authenticated;
revoke all on function public.close_photo_of_week(uuid) from public, anon;
grant execute on function public.close_photo_of_week(uuid) to authenticated;
