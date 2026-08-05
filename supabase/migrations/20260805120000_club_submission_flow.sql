-- KULÜP/TOPLULUK GÖNDERİM AKIŞI
--
-- Normal kullanıcı kayıt önerir: `pending` + `listed=false`.
-- Admin paneli kaydı doğrudan yayımlayabilir ya da öneriyi onaylayabilir.
-- Fotoğraflar ayrı tabloda değil, en fazla üç storage yolu olarak tutulur:
-- topluluk profilinde galeri kadar ilişki sorgusuna gerek yok.

alter table public.clubs
  add column if not exists status text not null default 'published',
  add column if not exists topics text[] not null default '{}',
  add column if not exists founded_on date,
  add column if not exists place text,
  add column if not exists social_url text,
  add column if not exists whatsapp_url text,
  add column if not exists photo_paths text[] not null default '{}',
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clubs_status_check'
  ) then
    alter table public.clubs
      add constraint clubs_status_check
      check (status in ('pending', 'published', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_topics_check'
  ) then
    alter table public.clubs
      add constraint clubs_topics_check
      check (
        topics <@ array[
          'amator-astronomi',
          'astrofotografcilik',
          'gozlem-etkinlikleri',
          'egitim-atolye',
          'bilimsel-calisma',
          'radyo-astronomi',
          'astro-kampcilik',
          'gencler-cocuklar'
        ]::text[]
      );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_founded_on_check'
  ) then
    alter table public.clubs
      add constraint clubs_founded_on_check
      check (founded_on is null or founded_on <= current_date);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_place_len'
  ) then
    alter table public.clubs
      add constraint clubs_place_len
      check (place is null or char_length(place) between 2 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_social_url_check'
  ) then
    alter table public.clubs
      add constraint clubs_social_url_check
      check (social_url is null or social_url ~ '^https://[A-Za-z0-9.-]+(/[^\s]*)?$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_whatsapp_url_check'
  ) then
    alter table public.clubs
      add constraint clubs_whatsapp_url_check
      check (whatsapp_url is null or whatsapp_url ~ '^https://(chat\.whatsapp\.com|wa\.me)/[^\s]+$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'clubs_photo_limit'
  ) then
    alter table public.clubs
      add constraint clubs_photo_limit
      check (cardinality(photo_paths) <= 3);
  end if;
end $$;

update public.clubs
   set status = 'published'
 where status is null;

create index if not exists clubs_status_idx on public.clubs (status, listed, name);
create index if not exists clubs_submitted_by_idx on public.clubs (submitted_by, status);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'club-photos',
  'club-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists club_photos_read on storage.objects;
create policy club_photos_read on storage.objects
  for select using (bucket_id = 'club-photos');

drop policy if exists club_photos_insert_own on storage.objects;
create policy club_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'club-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or app.is_admin()
    )
  );

drop policy if exists club_photos_delete_own on storage.objects;
create policy club_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'club-photos'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or app.is_admin()
    )
  );

drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs
  for select using (
    (listed and status = 'published')
    or app.is_admin()
    or submitted_by = (select auth.uid())
  );

drop policy if exists clubs_write on public.clubs;
create policy clubs_write on public.clubs
  for all to authenticated
  using (app.is_admin()) with check (app.is_admin());

drop policy if exists clubs_submit_pending on public.clubs;
create policy clubs_submit_pending on public.clubs
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'pending'
    and listed = false
    and verified_at is null
    and verified_by is null
    and reviewed_at is null
    and reviewed_by is null
    and not exists (
      select 1
        from unnest(photo_paths) as p(path)
       where split_part(p.path, '/', 1) <> (select auth.uid())::text
    )
  );

grant select on public.clubs to anon, authenticated;
grant insert, update, delete on public.clubs to authenticated;
