-- MCP ile canlıda tamamlanan forum görsel migration'ının yerel karşılığı.
-- İlk migration kolonları ekler; bu dosya tipi/constraint/bucket/policy
-- tarafını idempotent şekilde tamamlar.

alter table public.forum_posts
  alter column image_height type integer using nullif(image_height::text, '')::integer;

alter table public.forum_threads
  drop constraint if exists forum_threads_image_shape,
  add constraint forum_threads_image_shape check (
    (image_path is null and image_width is null and image_height is null)
    or (
      image_path is not null
      and image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/thread\.jpg$'
      and image_width between 1 and 8000
      and image_height between 1 and 8000
    )
  );

alter table public.forum_posts
  drop constraint if exists forum_posts_image_shape,
  add constraint forum_posts_image_shape check (
    (image_path is null and image_width is null and image_height is null)
    or (
      image_path is not null
      and image_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/post\.jpg$'
      and image_width between 1 and 8000
      and image_height between 1 and 8000
    )
  );

comment on column public.forum_threads.image_path is
  'forum-images bucket içindeki optimize edilmiş tek konu görseli yolu.';
comment on column public.forum_posts.image_path is
  'forum-images bucket içindeki optimize edilmiş tek yanıt görseli yolu.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'forum-images',
  'forum-images',
  true,
  5242880,
  array['image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists forum_images_public_read on storage.objects;
create policy forum_images_public_read on storage.objects
  for select using (bucket_id = 'forum-images');

drop policy if exists forum_images_insert_own_folder on storage.objects;
create policy forum_images_insert_own_folder on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists forum_images_update_own_folder on storage.objects;
create policy forum_images_update_own_folder on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'forum-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists forum_images_delete_own_folder on storage.objects;
create policy forum_images_delete_own_folder on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'forum-images'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or app.is_admin()
      or app.has_role('moderator')
    )
  );
