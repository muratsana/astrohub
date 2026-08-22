do $$
begin
  if to_regclass('public.venues') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end $$;

alter table public.clubs
  drop constraint if exists clubs_photo_paths_limit;

alter table public.clubs
  drop constraint if exists clubs_photo_limit;

alter table public.clubs
  add constraint clubs_photo_limit
  check (cardinality(photo_paths) <= 20);

drop policy if exists club_membership_requests_read
  on public.club_membership_requests;

create policy club_membership_requests_read
  on public.club_membership_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app.kulup_yoneticisi(club_slug)
    or status = 'approved'
  );
