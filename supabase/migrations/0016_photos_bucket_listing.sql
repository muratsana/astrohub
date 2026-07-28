-- 0016 — `photos` bucket'ında listelemeyi kapat.
--
-- BULGU (Supabase güvenlik denetçisi, "Public Bucket Allows Listing")
-- `photos_objects_read` politikası `storage.objects` üzerinde herkese
-- SELECT veriyordu. Genel bir bucket'ta bu, dosyayı okumak için gerekli
-- DEĞİL — genel URL (`/storage/v1/object/public/photos/…`) RLS'e
-- bakmadan servis ediliyor. Politikanın verdiği tek fazladan yetki
-- **listeleme**: herkes bucket'taki bütün dosyaları sayabiliyor,
-- kullanıcı klasörlerini gezebiliyor ve henüz yayımlanmamış bir
-- fotoğrafın kopyasına adıyla ulaşabiliyordu.
--
-- Yayımlanmamış fotoğraf `astro_photos` tarafında RLS ile gizli; ama
-- dosyanın kendisi bucket'ta duruyor. Listeleme açıkken taslak bir
-- çekimin yolu tahmin edilmeden bulunabiliyordu.
--
-- Aynı projedeki `radio` bucket'ı zaten doğru desende: genel, ama SELECT
-- yalnızca editörlerde. Yayın oradan sorunsuz çalıyor — genel URL'in
-- politikaya ihtiyaç duymadığının kanıtı.
--
-- YENİ DURUM
--   · Görsel okuma      → genel URL, herkese açık (değişmedi)
--   · Listeleme/imzalama → yalnızca dosyanın sahibi ve yönetici
--
-- Yükleme, güncelleme ve silme politikaları zaten sahip bazlıydı;
-- onlara dokunulmuyor.

begin;

drop policy if exists photos_objects_read on storage.objects;

create policy photos_objects_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or app.is_admin()
    )
  );

commit;

-- ── PostGIS tahmin fonksiyonunun API'den kapatılması ──
--
-- `st_estimatedextent` PostGIS ile birlikte geliyor, SECURITY DEFINER ve
-- varsayılan olarak `/rest/v1/rpc/` üzerinden herkese çağrılabilir. Bir
-- tablo/kolon adı verildiğinde o geometrinin kapsayan kutusunu döndürüyor
-- — yani gözlem noktalarının coğrafi dağılımı hakkında, RLS'ten geçmeden
-- bilgi sızdırabilir.
--
-- Uygulama bu fonksiyonu hiç çağırmıyor. Kullanmadığımız bir yeteneği
-- açık bırakmanın bir faydası yok.

begin;

revoke execute on function public.st_estimatedextent(text, text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from anon, authenticated;

commit;
