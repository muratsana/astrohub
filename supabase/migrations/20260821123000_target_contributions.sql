alter table public.celestial_objects
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists approved boolean not null default true;

create index if not exists celestial_objects_pending_idx
  on public.celestial_objects (approved, created_at desc)
  where not approved;

create index if not exists celestial_objects_submitted_by_idx
  on public.celestial_objects (submitted_by);

drop policy if exists celestial_objects_read on public.celestial_objects;
create policy celestial_objects_read on public.celestial_objects
  for select
  using (
    approved
    or auth.uid() = submitted_by
    or app.is_admin()
    or app.has_role('content_editor')
  );

drop policy if exists celestial_objects_contribute on public.celestial_objects;
create policy celestial_objects_contribute on public.celestial_objects
  for insert
  to authenticated
  with check (
    (auth.uid() = submitted_by and approved = false)
    or app.is_admin()
    or app.has_role('content_editor')
  );

drop policy if exists celestial_objects_edit_own_pending on public.celestial_objects;
create policy celestial_objects_edit_own_pending on public.celestial_objects
  for update
  to authenticated
  using (auth.uid() = submitted_by and approved = false)
  with check (auth.uid() = submitted_by and approved = false);

drop policy if exists celestial_objects_delete_own_pending on public.celestial_objects;
create policy celestial_objects_delete_own_pending on public.celestial_objects
  for delete
  to authenticated
  using (auth.uid() = submitted_by and approved = false);

drop policy if exists celestial_objects_editor_write on public.celestial_objects;
create policy celestial_objects_editor_write on public.celestial_objects
  for all
  to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));

drop policy if exists catalog_identifiers_read on public.catalog_identifiers;
create policy catalog_identifiers_read on public.catalog_identifiers
  for select
  using (
    exists (
      select 1
      from public.celestial_objects co
      where co.id = catalog_identifiers.object_id
        and (
          co.approved
          or auth.uid() = co.submitted_by
          or app.is_admin()
          or app.has_role('content_editor')
        )
    )
  );

drop policy if exists catalog_identifiers_contribute on public.catalog_identifiers;
create policy catalog_identifiers_contribute on public.catalog_identifiers
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.celestial_objects co
      where co.id = catalog_identifiers.object_id
        and auth.uid() = co.submitted_by
        and co.approved = false
    )
    or app.is_admin()
    or app.has_role('content_editor')
  );

drop policy if exists catalog_identifiers_edit_own_pending on public.catalog_identifiers;
create policy catalog_identifiers_edit_own_pending on public.catalog_identifiers
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.celestial_objects co
      where co.id = catalog_identifiers.object_id
        and auth.uid() = co.submitted_by
        and co.approved = false
    )
  )
  with check (
    exists (
      select 1
      from public.celestial_objects co
      where co.id = catalog_identifiers.object_id
        and auth.uid() = co.submitted_by
        and co.approved = false
    )
  );

drop policy if exists catalog_identifiers_delete_own_pending on public.catalog_identifiers;
create policy catalog_identifiers_delete_own_pending on public.catalog_identifiers
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.celestial_objects co
      where co.id = catalog_identifiers.object_id
        and auth.uid() = co.submitted_by
        and co.approved = false
    )
  );

drop policy if exists catalog_identifiers_editor_write on public.catalog_identifiers;
create policy catalog_identifiers_editor_write on public.catalog_identifiers
  for all
  to authenticated
  using (app.is_admin() or app.has_role('content_editor'))
  with check (app.is_admin() or app.has_role('content_editor'));
