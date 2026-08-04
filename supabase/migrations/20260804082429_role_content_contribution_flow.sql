-- Standart/moderatör/admin içerik akışı.
--
-- Mevcut altyapı zaten `user_roles`, `moderation_queue` ve `notifications`
-- kullanıyor. Bu göç yalnız eksik köprüyü kurar:
--   · standart kullanıcı etkinlik taslağı açabilir, yayına alamaz;
--   · saha katkısı gibi etkinlik katkısı da moderasyon kuyruğuna düşer;
--   · ilan aktif yayımlanır ama adminlere bildirim gider.

-- ══════════════════════════════════════════════════════════════════════════
-- ETKİNLİK RLS: standart kullanıcı kendi taslağını açabilir/düzenleyebilir
-- ══════════════════════════════════════════════════════════════════════════
drop policy if exists events_write on public.events;

drop policy if exists events_insert_contributor on public.events;
create policy events_insert_contributor on public.events
  for insert to authenticated
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (
        app.has_role('verified_organizer')
        or status = 'draft'
      )
    )
  );

drop policy if exists events_update_contributor on public.events;
create policy events_update_contributor on public.events
  for update to authenticated
  using (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (
        app.has_role('verified_organizer')
        or status = 'draft'
      )
    )
  )
  with check (
    app.is_admin()
    or app.has_role('content_editor')
    or (
      organizer_id = (select auth.uid())
      and (
        app.has_role('verified_organizer')
        or status = 'draft'
      )
    )
  );

drop policy if exists events_delete_contributor on public.events;
create policy events_delete_contributor on public.events
  for delete to authenticated
  using (
    app.is_admin()
    or app.has_role('content_editor')
    or (organizer_id = (select auth.uid()) and status = 'draft')
  );

-- ══════════════════════════════════════════════════════════════════════════
-- ADMIN BİLDİRİM KÖPRÜSÜ
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.notify_admins(
  title text,
  body text default null,
  url text default null,
  subject_type text default null,
  subject_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  admin_user uuid;
begin
  for admin_user in
    select user_id from public.user_roles where role = 'admin'
  loop
    perform app.notify(
      admin_user,
      null,
      'admin_direct',
      title,
      body,
      url,
      subject_type,
      subject_id
    );
  end loop;
end $$;

revoke execute on function app.notify_admins(text, text, text, text, uuid)
  from public, anon, authenticated;

-- ══════════════════════════════════════════════════════════════════════════
-- KATKI → MODERASYON KUYRUĞU
-- ══════════════════════════════════════════════════════════════════════════
create or replace function app.queue_event_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queue_id uuid;
begin
  if new.status <> 'draft'
     or new.organizer_id is null
     or app.is_admin()
     or app.has_role('content_editor')
     or app.has_role('verified_organizer') then
    return new;
  end if;

  select id into queue_id
    from public.moderation_queue
   where target_type = 'event'
     and target_id = new.id::text
     and status in ('pending', 'in_review', 'escalated')
   limit 1;

  if queue_id is null then
    insert into public.moderation_queue (
      target_type,
      target_id,
      target_path,
      reason,
      reported_by,
      note
    )
    values (
      'event',
      new.id::text,
      '/etkinlik/' || new.slug,
      'diger',
      new.organizer_id,
      'Kullanıcı etkinlik taslağı açtı; yayına alınmadan önce admin onayı gerekir.'
    )
    returning id into queue_id;
  end if;

  perform app.notify_admins(
    'Yeni etkinlik onay bekliyor',
    new.title,
    '/admin/moderation',
    'moderation',
    queue_id
  );

  return new;
end $$;

drop trigger if exists events_queue_contribution on public.events;
create trigger events_queue_contribution
  after insert on public.events
  for each row execute function app.queue_event_contribution();

create or replace function app.queue_site_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  queue_id uuid;
begin
  if new.status <> 'pending'
     or new.submitted_by is null
     or app.is_admin()
     or app.has_role('moderator')
     or app.has_role('content_editor') then
    return new;
  end if;

  select id into queue_id
    from public.moderation_queue
   where target_type = 'site'
     and target_id = new.id::text
     and status in ('pending', 'in_review', 'escalated')
   limit 1;

  if queue_id is null then
    insert into public.moderation_queue (
      target_type,
      target_id,
      target_path,
      reason,
      reported_by,
      note
    )
    values (
      'site',
      new.id::text,
      '/saha/' || new.slug,
      'yanlis-konum',
      new.submitted_by,
      'Kullanıcı gözlem noktası ekledi; yayımlanmadan önce konum ve Bortle bilgisi onaylanmalı.'
    )
    returning id into queue_id;
  end if;

  perform app.notify_admins(
    'Yeni saha noktası onay bekliyor',
    new.name,
    '/admin/moderation',
    'moderation',
    queue_id
  );

  return new;
end $$;

drop trigger if exists observing_sites_queue_contribution on public.observing_sites;
create trigger observing_sites_queue_contribution
  after insert on public.observing_sites
  for each row execute function app.queue_site_contribution();

create or replace function app.notify_listing_contribution()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.seller_id is null or app.is_admin() or app.has_role('moderator') then
    return new;
  end if;

  perform app.notify_admins(
    'Yeni ilan yayımlandı',
    new.title,
    '/ilan/' || new.slug,
    'listing',
    new.id
  );

  return new;
end $$;

drop trigger if exists listings_notify_contribution on public.listings;
create trigger listings_notify_contribution
  after insert on public.listings
  for each row execute function app.notify_listing_contribution();
