-- ═══════════════════════════════════════════════════════════════════════
-- POSTGIS KATALOĞUNA YAZMA YETKİSİ GERİ ALINIYOR
--
-- Bulgu (docs/DISCOVERY_REPORT.md §3.3): `public.spatial_ref_sys` üzerinde
-- RLS kapalı VE `anon` rolüne INSERT/UPDATE/DELETE/TRUNCATE verilmiş.
-- Yani kimliksiz bir istemci PostgREST üzerinden bu tabloyu değiştirebilir
-- ya da boşaltabilir.
--
-- Tablo PostGIS'in koordinat referans sistemi kataloğudur: `observing_sites`
-- ve `events` konum sorguları, mesafe hesapları ve tüm coğrafi dönüşümler
-- buradaki satırlara bakar. Boşalırsa uygulama bir hata vermez — yanlış
-- sonuç verir, ki bu daha kötüdür.
--
-- RLS AÇMIYORUZ, YETKİYİ GERİ ALIYORUZ. `spatial_ref_sys` eklentinin
-- (`postgis`) sahip olduğu bir sistem tablosu; üzerinde RLS açmak eklenti
-- güncellemelerinde çakışır ve Supabase'in kendi uyarı listesi de bu tablo
-- için istisna tanır. Asıl mesele yazma yetkisiydi; onu alıyoruz.
--
-- SELECT KORUNUYOR: PostGIS fonksiyonları (ST_Transform vb.) katalogdan
-- okumak zorunda ve bu okuma zararsız — içerik açık standart (EPSG).
--
-- Geri alma:
--   grant insert, update, delete, truncate
--     on public.spatial_ref_sys to anon, authenticated;
-- ═══════════════════════════════════════════════════════════════════════

revoke insert, update, delete, truncate, references, trigger
  on public.spatial_ref_sys
  from anon, authenticated;
