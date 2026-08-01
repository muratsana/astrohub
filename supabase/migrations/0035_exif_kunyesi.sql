-- 0035_exif_kunyesi.sql
-- Dosyadan okunan EXIF künyesi fotoğraf satırına yazılıyor (Faz 1.2).
--
-- ══════════════════════════════════════════════════════════════════════
-- KAPANAN BOŞLUK
--
-- EXIF ayrıştırıcısı (`domain/photography/exif.ts`) baştan beri vardı ve
-- yükleme sihirbazında boş künye alanlarını dolduruyordu. Ama okunan
-- değerlerin HİÇBİRİ SAKLANMIYORDU: kullanıcı formu gönderdiği anda
-- ayrıştırılmış veri çöpe gidiyor, geriye yalnızca kullanıcının elle
-- bıraktığı ya da düzelttiği alanlar kalıyordu.
--
-- Sonuç, fotoğraf sayfasında görünen boşluktu: ISO, diyafram, odak ve
-- poz süresi hiçbir yerde yazmıyordu — dosyada dururken.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN JSONB DEĞİL, AYRI KOLONLAR
--
-- `setup_text` zaten serbest biçimli bir jsonb ve EXIF'i oraya atmak
-- kolaydı. İki sebeple yapılmadı:
--
-- 1. Bu alanlar SORGULANACAK. "ISO 1600 ve üzeri çekimler", "200 mm'den
--    uzun odak" gibi galeri süzgeçleri planlı (§7.2). jsonb üzerinde
--    bunlar indekslenemeyen metin karşılaştırmasına dönerdi.
-- 2. `setup_text` KULLANICININ yazdığı künye; buradakiler DOSYADAN
--    okunan ölçüm. İkisini aynı torbaya koymak, plate solve tarafında
--    özenle ayırdığımız "iddia / ölçüm" ayrımını burada bozardı.
--
-- ══════════════════════════════════════════════════════════════════════
-- GPS SAKLANMIYOR — VARLIĞI SAKLANIYOR
--
-- §15.3 gereği koordinat varsayılan olarak gizli. Ayrıştırıcı GPS'i
-- okuyor ama buraya yalnızca `exif_gps_present` bayrağı yazılıyor.
--
-- Bayrak neden var: kullanıcı dosyasında konum verisi olduğunu BİLMELİ.
-- Bilmediği bir veri için "yayımlama" kararı veremez. Bayrak sayesinde
-- fotoğraf sayfası sahibine "bu dosyada GPS vardı, yayımlamadık"
-- diyebiliyor. Koordinatın kendisi hiçbir zaman veritabanına girmiyor;
-- kullanıcı konumu paylaşmak isterse `location_label` alanına kendi
-- yazıyor ve görünürlük seviyesini kendi seçiyor.

alter table public.astro_photos
  add column if not exists exif_camera           text,
  add column if not exists exif_lens             text,
  add column if not exists exif_iso              integer,
  -- Odak uzaklığı MİLİMETRE — birim adın içinde (0032'deki aynı gerekçe).
  add column if not exists exif_focal_mm         double precision,
  -- Diyafram f sayısı (f/2.8 → 2.8).
  add column if not exists exif_aperture_f       double precision,
  -- Tek karenin poz süresi, SANİYE. Toplam entegrasyon ayrı
  -- (`photo_exposures`) — bu, dosyadaki tek karenin değeri.
  add column if not exists exif_exposure_seconds double precision,
  add column if not exists exif_gps_present      boolean not null default false;

comment on column public.astro_photos.exif_camera is
  'Dosyadan okunan kamera (üretici + model, tekrarsız). Kullanıcının yazdığı künye ayrı: setup_text->>''camera'' (0035).';
comment on column public.astro_photos.exif_exposure_seconds is
  'Dosyadaki TEK KARENİN poz süresi, saniye. Toplam entegrasyon photo_exposures tablosunda.';
comment on column public.astro_photos.exif_gps_present is
  'Dosyada GPS vardı mı. Koordinatın kendisi SAKLANMIYOR (§15.3); bayrak yalnızca kullanıcıyı bilgilendirmek için (0035).';

-- ══════════════════════════════════════════════════════════════════════
-- DEĞER ARALIKLARI
--
-- Bu kolonlara yazan taraf istemci ve istemciye güvenilmez. Ayrıştırıcı
-- bozuk bir dosyada saçma sayılar üretebilir (bölen sıfır, işaretli
-- okuma hatası) ve künyede "ISO 4294967295" görmek, hiç görmemekten
-- kötü. Sınırlar gerçek ekipmanın çok üstünde tutuldu: amaç makul
-- değerleri elemek değil, imkânsız olanları durdurmak.
-- ══════════════════════════════════════════════════════════════════════
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'astro_photos_exif_makul'
  ) then
    alter table public.astro_photos
      add constraint astro_photos_exif_makul check (
        (exif_iso is null or (exif_iso > 0 and exif_iso <= 4000000))
        and (exif_focal_mm is null or (exif_focal_mm > 0 and exif_focal_mm <= 100000))
        and (exif_aperture_f is null or (exif_aperture_f > 0 and exif_aperture_f <= 1000))
        and (exif_exposure_seconds is null
             or (exif_exposure_seconds > 0 and exif_exposure_seconds <= 86400))
      );
  end if;
end $$;
