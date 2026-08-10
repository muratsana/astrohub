do $$
begin
  if to_regclass('public.venue_events') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end $$;

alter table public.profiles
  add column if not exists display_name_visible boolean not null default true;

comment on column public.profiles.display_name_visible is
  'Gerçek ad soyad public profilde görünsün mü. false ise public profil kullanıcı adını gösterir.';

create table if not exists public.profile_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone_number text,
  phone_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_contacts_phone_len check (
    phone_number is null or char_length(phone_number) between 7 and 32
  ),
  constraint profile_contacts_phone_public_requires_value check (
    not phone_visible or phone_number is not null
  )
);

comment on table public.profile_contacts is
  'Profil iletişim alanları. Telefon profiles içinde değil: varsayılan gizli veri public profil SELECTinden sızmamalı.';

drop trigger if exists profile_contacts_set_updated_at on public.profile_contacts;
create trigger profile_contacts_set_updated_at
  before update on public.profile_contacts
  for each row execute function app.set_updated_at();

alter table public.profile_contacts enable row level security;

drop policy if exists profile_contacts_read on public.profile_contacts;
create policy profile_contacts_read on public.profile_contacts
  for select using (
    phone_visible
    or user_id = (select auth.uid())
    or app.is_admin()
  );

drop policy if exists profile_contacts_insert_own on public.profile_contacts;
create policy profile_contacts_insert_own on public.profile_contacts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists profile_contacts_update_own on public.profile_contacts;
create policy profile_contacts_update_own on public.profile_contacts
  for update to authenticated
  using (user_id = (select auth.uid()) or app.is_admin())
  with check (user_id = (select auth.uid()) or app.is_admin());

drop policy if exists profile_contacts_delete_own on public.profile_contacts;
create policy profile_contacts_delete_own on public.profile_contacts
  for delete to authenticated
  using (user_id = (select auth.uid()) or app.is_admin());

grant select on public.profile_contacts to anon, authenticated;
grant insert, update, delete on public.profile_contacts to authenticated;

create table if not exists public.club_membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_slug text not null references public.clubs(slug) on delete cascade,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  updated_at timestamptz not null default now(),
  constraint club_membership_requests_status_check
    check (status in ('pending', 'approved', 'rejected')),
  constraint club_membership_requests_unique unique (user_id, club_slug)
);

comment on table public.club_membership_requests is
  'Kullanıcının profilinde göstermek istediği topluluk üyelikleri. Onay kulüp yöneticisi veya admin tarafından verilir.';

create index if not exists club_membership_requests_user_idx
  on public.club_membership_requests (user_id, status, requested_at desc);

create index if not exists club_membership_requests_club_idx
  on public.club_membership_requests (club_slug, status, requested_at desc);

drop trigger if exists club_membership_requests_set_updated_at
  on public.club_membership_requests;
create trigger club_membership_requests_set_updated_at
  before update on public.club_membership_requests
  for each row execute function app.set_updated_at();

alter table public.club_membership_requests enable row level security;

drop policy if exists club_membership_requests_read on public.club_membership_requests;
create policy club_membership_requests_read on public.club_membership_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app.is_admin()
    or exists (
      select 1
        from public.clubs c
       where c.slug = club_slug
         and c.manager_user_id = (select auth.uid())
    )
  );

drop policy if exists club_membership_requests_insert_own
  on public.club_membership_requests;
create policy club_membership_requests_insert_own on public.club_membership_requests
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );

drop policy if exists club_membership_requests_review
  on public.club_membership_requests;
create policy club_membership_requests_review on public.club_membership_requests
  for update to authenticated
  using (
    app.is_admin()
    or exists (
      select 1
        from public.clubs c
       where c.slug = club_slug
         and c.manager_user_id = (select auth.uid())
    )
  )
  with check (
    app.is_admin()
    or exists (
      select 1
        from public.clubs c
       where c.slug = club_slug
         and c.manager_user_id = (select auth.uid())
    )
  );

drop policy if exists club_membership_requests_delete_own
  on public.club_membership_requests;
create policy club_membership_requests_delete_own on public.club_membership_requests
  for delete to authenticated
  using (
    (user_id = (select auth.uid()) and status = 'pending')
    or app.is_admin()
  );

grant select, insert, update, delete on public.club_membership_requests to authenticated;
