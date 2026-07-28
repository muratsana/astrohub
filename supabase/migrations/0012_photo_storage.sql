-- 0012_photo_storage.sql
-- Fotoğraf deposu: iki bucket + `astro_photos` üzerinde yol kolonları.
--
-- İKİ BUCKET, TEK DEĞİL
--
--   `photo-originals`  — GİZLİ. Kullanıcının yüklediği tam çözünürlüklü
--                        dosya. Yalnızca sahibi ve yönetici okuyabilir.
--   `photos`           — HERKESE AÇIK. Tarayıcıda gösterilecek küçültülmüş
--                        kopyalar (görüntüleme boyu + küçük resim).
--
-- Tek bucket'la yapılamazdı: Supabase'de "genel okuma" bucket seviyesinde
-- bir bayrak, satır bazlı bir izin değil. Orijinali de aynı bucket'a
-- koysaydık ya hepsi genel olurdu (§10.6'ya aykırı: orijinal public olmaz)
-- ya da her görsel için imzalı URL üretmek gerekirdi — bu da her galeri
-- kartı için fazladan bir tur ve önbelleklenemeyen bir adres demek.
--
-- KÜÇÜLTME İSTEMCİDE YAPILIR
-- Sunucu tarafı görüntü işleme (edge function + sharp) kurmadık. Tarayıcı
-- canvas ile küçültüp iki kopyayı da yüklüyor. Bedeli: kullanıcının
-- cihazı işi yapıyor ve çok büyük dosyalarda yavaş. Kazancı: yükleme
-- anında hazır, kuyruk yok, "işleniyor" durumu yok ve orijinali sunucuda
-- yeniden işleme ihtiyacı doğmuyor.

-- ══════════════════════════════════════════════════════════════════════════
-- BUCKET'LAR
-- ══════════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photo-originals',
  'photo-originals',
  false,
  104857600,                                 -- 100 MB; 16-bit TIFF'ler büyük
  array['image/jpeg', 'image/png', 'image/tiff', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  true,
  10485760,                                  -- 10 MB; küçültülmüş kopya bunu geçmemeli
  array['image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ══════════════════════════════════════════════════════════════════════════
-- NESNE POLİTİKALARI
--
-- Yol deseni: <user_id>/<dosya>. Sahiplik yolun ilk parçasından okunur;
-- `storage.foldername(name)[1]` o parçayı verir. Böylece bir kullanıcı
-- başkasının klasörüne yazamaz — bucket'a yazma yetkisi olması, her yere
-- yazabilmesi anlamına gelmemeli.
-- ══════════════════════════════════════════════════════════════════════════

/* ── Genel kopyalar: herkes okur, sahibi yazar ── */
drop policy if exists photos_objects_read on storage.objects;
create policy photos_objects_read on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists photos_objects_insert on storage.objects;
create policy photos_objects_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photos_objects_update on storage.objects;
create policy photos_objects_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or app.is_admin())
  );

drop policy if exists photos_objects_delete on storage.objects;
create policy photos_objects_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photos'
    and ((storage.foldername(name))[1] = auth.uid()::text or app.is_admin())
  );

/* ── Orijinaller: yalnızca sahibi ve yönetici ── */
drop policy if exists photo_originals_read on storage.objects;
create policy photo_originals_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photo-originals'
    and ((storage.foldername(name))[1] = auth.uid()::text or app.is_admin())
  );

drop policy if exists photo_originals_insert on storage.objects;
create policy photo_originals_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photo-originals'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists photo_originals_delete on storage.objects;
create policy photo_originals_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'photo-originals'
    and ((storage.foldername(name))[1] = auth.uid()::text or app.is_admin())
  );

-- ══════════════════════════════════════════════════════════════════════════
-- FOTOĞRAF SATIRINDA YOL KOLONLARI
--
-- Tam URL değil, **yol** saklanır: proje adresi ya da CDN önü değiştiğinde
-- tüm satırları güncellemek gerekmesin (aynı karar radyo tarafında da
-- verilmişti, bkz. 0004).
-- ══════════════════════════════════════════════════════════════════════════
alter table public.astro_photos
  add column if not exists display_path  text,
  add column if not exists thumb_path    text,
  add column if not exists original_path text,
  add column if not exists width         integer,
  add column if not exists height        integer,
  add column if not exists bytes         integer;

comment on column public.astro_photos.display_path is
  'photos bucket''ındaki görüntüleme kopyasının yolu. Tam URL değil (§10.6).';
comment on column public.astro_photos.original_path is
  'photo-originals bucket''ındaki orijinal. Yalnızca sahibi ve yönetici erişir.';

do $mig$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'astro_photos_publish_needs_image'
  ) then
    /*
     * Yayımlanan kayıt görüntülenebilir bir kopya taşımak zorunda.
     * Görselsiz yayımlanmış bir fotoğraf, galeride boş bir kart demek —
     * ve o boşluğu kullanıcı değil, bizim şemamız üretmiş olurdu.
     */
    alter table public.astro_photos
      add constraint astro_photos_publish_needs_image
      check (status <> 'published' or display_path is not null);
  end if;
end;
$mig$;

/*
 * Boyut kolonları ölçüdür, tercih değil: sıfır ya da negatif bir kenar
 * anlamsız. Kısıt olmadan bir hata bu alanlara 0 yazsa, en/boy oranından
 * hesaplanan her yerde sıfıra bölme çıkardı.
 */
do $mig$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'astro_photos_dimensions_positive'
  ) then
    alter table public.astro_photos
      add constraint astro_photos_dimensions_positive
      check (
        (width is null or width > 0) and
        (height is null or height > 0) and
        (bytes is null or bytes > 0)
      );
  end if;
end;
$mig$;
