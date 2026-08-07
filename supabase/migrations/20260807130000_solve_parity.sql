-- ═══════════════════════════════════════════════════════════════════════
-- ALAN ÇÖZÜMÜNE PARİTE ALANI
--
-- Alan çözümü şimdiye kadar dört ölçü saklıyordu: merkez (RA/Dec),
-- dönüklük, ölçek ve alan boyutu. Katmanda çizilen şeyler (merkez artısı,
-- kuzey gülü, ölçek çubuğu) bunlarla yetiniyordu.
--
-- Katalog etiketleri (AstroBin'in açıklamalı görüntüsündeki gibi "M 42",
-- "NGC 1977" yazıları) için bu yetmiyor. Bir gök cismini kadrajda doğru
-- noktaya koymak, kadrajın AYNALI olup olmadığını bilmeyi gerektiriyor:
--
--   · Normal (aynasız) bir kadrajda kuzey yukarıdayken doğu SOLDADIR.
--   · Ayna görüntüsünde (diyagonal ile çeken bazı setup'lar, bazı
--     yazılım çıktıları) doğu SAĞDADIR.
--
-- Bilmeden etiketlemek, kadrajın yarısında nesneleri yanlış tarafa
-- yazmak demek — ve yanlış etiket, etiketsizlikten kötüdür çünkü
-- kullanıcı ona inanır.
--
-- astrometry.net bu bilgiyi `parity` alanında zaten döndürüyordu;
-- saklanmıyordu. Kolon eklendi ve yoklama fonksiyonu yazıyor.
--
-- DEĞER: astrometry.net konvansiyonunda +1 ve -1. Hangi işaretin aynalı
-- olduğu tek bir yerde (`src/domain/astronomy/plateProjection.ts`)
-- yorumlanıyor; ters çıkarsa düzeltilecek tek satır orası.
--
-- Geri alma:
--   alter table public.astro_photos drop column if exists solve_parity;
-- ═══════════════════════════════════════════════════════════════════════

alter table public.astro_photos
  add column if not exists solve_parity numeric;

comment on column public.astro_photos.solve_parity is
  'astrometry.net parite değeri (±1). Kadrajın aynalı olup olmadığını '
  'söyler; katalog etiketlerinin doğu-batı yönü buna bağlı.';
