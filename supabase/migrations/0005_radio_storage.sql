-- 0005_radio_storage.sql
-- Radyo ses deposu (Supabase Storage bucket + nesne politikaları).
--
-- Bucket herkese açık okunur: parçalar tarayıcıda <audio> ile çalınacak ve
-- her parça değişiminde imzalı URL üretmek fazladan bir tur demek olurdu.
-- Yazma yetkisi ise yalnızca içerik editörlerinde — herkesin ses
-- yükleyebildiği bir bucket, depolama kotasını bitirmenin en kısa yolu.
--
-- NOT: Bu dosya `storage` şemasına dokunur. Yerel `supabase db reset`
-- akışında storage şeması Supabase servisleri tarafından oluşturulur;
-- dosya bu yüzden `if not exists`/`on conflict` ile tekrar-güvenlidir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'radio',
  'radio',
  true,
  20971520,                                  -- 20 MB; 256 kbps'de ~10 dakika
  array['audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/aac']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Okuma: herkes.
drop policy if exists radio_objects_read on storage.objects;
create policy radio_objects_read on storage.objects
  for select using (bucket_id = 'radio');

-- Yazma/güncelleme/silme: admin veya content_editor.
drop policy if exists radio_objects_write on storage.objects;
create policy radio_objects_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'radio'
    and (app.is_admin() or app.has_role('content_editor'))
  );

drop policy if exists radio_objects_update on storage.objects;
create policy radio_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'radio'
    and (app.is_admin() or app.has_role('content_editor'))
  );

drop policy if exists radio_objects_delete on storage.objects;
create policy radio_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'radio'
    and (app.is_admin() or app.has_role('content_editor'))
  );
