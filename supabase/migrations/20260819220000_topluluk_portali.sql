-- Topluluk dizinini kullanıcı üretimi akışına çevirir ve kulüp portalı
-- için gereken küçük yönetim tablolarını ekler.

alter table public.clubs
  add column if not exists body_blocks jsonb not null default '[]'::jsonb,
  add column if not exists telegram_url text;

alter table public.clubs
  drop constraint if exists clubs_body_blocks_array;

alter table public.clubs
  add constraint clubs_body_blocks_array
  check (jsonb_typeof(body_blocks) = 'array');

comment on column public.clubs.body_blocks is
  'Kulübün zengin içerik editöründen gelen blokları. summary düz metin yedeğidir.';

alter table public.clubs
  drop constraint if exists clubs_kind_check;

alter table public.clubs
  add constraint clubs_kind_check
  check (kind in ('dernek', 'universite', 'gozlem-grubu', 'topluluk'));

alter table public.clubs
  drop constraint if exists clubs_telegram_url_check;

alter table public.clubs
  add constraint clubs_telegram_url_check
  check (telegram_url is null or telegram_url ~ '^https://(t\.me|telegram\.me)/[^\s]+$');

alter table public.clubs
  drop constraint if exists clubs_photo_limit;

alter table public.clubs
  add constraint clubs_photo_limit
  check (cardinality(photo_paths) <= 5);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-photos',
  'club-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Kullanıcı isteği: sitede eklenmiş mevcut topluluklar public dizinden kalksın;
-- yeni topluluklar manuel form + onay akışından gelsin.
update public.clubs
set
  listed = false,
  deleted_at = coalesce(deleted_at, now())
where deleted_at is null;

create table if not exists public.club_invites (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null references public.clubs(slug) on delete cascade,
  email text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint club_invites_email_check
    check (email ~* '^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$'),
  constraint club_invites_status_check
    check (status in ('pending', 'accepted', 'revoked')),
  constraint club_invites_unique unique (club_slug, email)
);

create index if not exists club_invites_club_idx
  on public.club_invites (club_slug, status, created_at desc);

alter table public.club_invites enable row level security;

create table if not exists public.club_posts (
  id uuid primary key default gen_random_uuid(),
  club_slug text not null references public.clubs(slug) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  kind text not null,
  audience text not null default 'members',
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz,
  constraint club_posts_kind_check check (kind in ('duyuru', 'haber')),
  constraint club_posts_audience_check check (audience in ('members', 'public')),
  constraint club_posts_title_check check (char_length(btrim(title)) between 4 and 160),
  constraint club_posts_body_check check (char_length(btrim(body)) between 10 and 6000),
  constraint club_posts_duyuru_members_check
    check (kind <> 'duyuru' or audience = 'members')
);

create index if not exists club_posts_club_idx
  on public.club_posts (club_slug, audience, created_at desc)
  where deleted_at is null;

drop trigger if exists club_posts_set_updated_at on public.club_posts;
create trigger club_posts_set_updated_at
  before update on public.club_posts
  for each row execute function app.set_updated_at();

alter table public.club_posts enable row level security;

create or replace function app.kulup_yoneticisi(p_slug text)
returns boolean
language sql
stable
security invoker
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.clubs c
    where c.slug = p_slug
      and c.deleted_at is null
      and (
        c.manager_user_id = (select auth.uid())
        or (c.manager_user_id is null and c.submitted_by = (select auth.uid()))
        or app.is_admin()
        or app.has_role('moderator')
      )
  );
$$;

comment on function app.kulup_yoneticisi(text) is
  'Kulüp portalı sahiplik ölçütü: atanmış yönetici, yoksa kaydı gönderen, ayrıca admin/moderatör.';

drop policy if exists club_invites_manage on public.club_invites;
create policy club_invites_manage on public.club_invites
  for all to authenticated
  using (app.kulup_yoneticisi(club_slug))
  with check (
    app.kulup_yoneticisi(club_slug)
    and invited_by = (select auth.uid())
  );

drop policy if exists club_posts_read on public.club_posts;
create policy club_posts_read on public.club_posts
  for select to anon, authenticated
  using (
    deleted_at is null
    and published_at is not null
    and (
      audience = 'public'
      or app.kulup_yoneticisi(club_slug)
      or exists (
        select 1
        from public.club_membership_requests m
        where m.club_slug = club_posts.club_slug
          and m.user_id = (select auth.uid())
          and m.status = 'approved'
      )
    )
  );

drop policy if exists club_posts_manage on public.club_posts;
create policy club_posts_manage on public.club_posts
  for all to authenticated
  using (app.kulup_yoneticisi(club_slug))
  with check (
    app.kulup_yoneticisi(club_slug)
    and author_id = (select auth.uid())
  );

-- Üyelik istekleri kulüp sahipliğiyle aynı ölçütü kullanmalı. Önceki policy
-- sadece manager_user_id atanmış kayıtları kapsıyordu.
drop policy if exists club_membership_requests_read on public.club_membership_requests;
create policy club_membership_requests_read on public.club_membership_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app.kulup_yoneticisi(club_slug)
  );

drop policy if exists club_membership_requests_review on public.club_membership_requests;
create policy club_membership_requests_review on public.club_membership_requests
  for update to authenticated
  using (app.kulup_yoneticisi(club_slug))
  with check (app.kulup_yoneticisi(club_slug));

grant select, insert, update, delete on public.club_invites to authenticated;
grant select on public.club_posts to anon, authenticated;
grant insert, update, delete on public.club_posts to authenticated;
