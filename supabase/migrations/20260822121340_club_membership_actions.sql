do $$
begin
  if to_regclass('public.venues') is not null
     or to_regclass('public.studio_profiles') is not null then
    raise exception
      'YANLIŞ PROJE: venue_events/studio_profiles görüldü — burası StageHub. Göç durduruldu.';
  end if;
end $$;

create or replace function app.kulup_yoneticisi(p_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.clubs c
    where c.slug = p_slug
      and c.deleted_at is null
      and (
        c.manager_user_id = (select auth.uid())
        or c.submitted_by = (select auth.uid())
        or app.is_admin()
      )
  );
$$;

create or replace function app.kulup_yonetim_alanlari()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if current_setting('app.club_manager_assignment', true) = 'on' then
    return new;
  end if;

  if auth.uid() is null or app.is_admin() or app.has_role('moderator') then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.listed is distinct from old.listed
     or new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.rejection_reason is distinct from old.rejection_reason
     or new.manager_user_id is distinct from old.manager_user_id then
    raise exception
      'Topluluğun onay ve görünürlük alanları yalnızca yönetim tarafından değiştirilebilir.'
      using errcode = 'insufficient_privilege',
            hint = 'İçerik alanlarını düzenleyebilirsiniz; yayın kararı yönetimde.';
  end if;

  return new;
end;
$$;

drop policy if exists clubs_manager_update on public.clubs;
create policy clubs_manager_update on public.clubs
  for update to authenticated
  using (
    manager_user_id = (select auth.uid())
    or submitted_by = (select auth.uid())
  )
  with check (
    manager_user_id = (select auth.uid())
    or submitted_by = (select auth.uid())
  );

drop policy if exists club_membership_requests_delete_own
  on public.club_membership_requests;

create policy club_membership_requests_delete_own
  on public.club_membership_requests
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or app.kulup_yoneticisi(club_slug)
    or app.is_admin()
  );

create or replace function public.topluluk_yoneticisi_ata(
  p_slug text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Giriş yapmanız gerekir.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1
    from public.clubs c
    where c.slug = p_slug
      and c.deleted_at is null
      and (
        c.manager_user_id = (select auth.uid())
        or c.submitted_by = (select auth.uid())
        or app.is_admin()
      )
  ) then
    raise exception 'Bu topluluğun yöneticisini değiştirme yetkiniz yok.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1
    from public.club_membership_requests m
    where m.club_slug = p_slug
      and m.user_id = p_user_id
      and m.status = 'approved'
  ) then
    raise exception 'Yönetici yapılacak kullanıcı önce topluluğa onaylı üye olmalı.';
  end if;

  perform set_config('app.club_manager_assignment', 'on', true);

  update public.clubs
     set manager_user_id = p_user_id,
         updated_at = now()
   where slug = p_slug
     and deleted_at is null;

  if not found then
    raise exception 'Topluluk bulunamadı.';
  end if;
end;
$$;

revoke all on function public.topluluk_yoneticisi_ata(text, uuid) from public;
grant execute on function public.topluluk_yoneticisi_ata(text, uuid)
  to authenticated;
