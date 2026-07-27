-- 0006_advisor_hardening.sql
-- Supabase güvenlik denetçisi (database linter) bulgularının kapatılması.
--
-- Kapatılan bulgu:
--   0025 public_bucket_allows_listing → radyo bucket'ı
--
-- Kapatılamayan ve NEDEN kapatılamadığı aşağıda yazılı olan bulgular:
--   0013 rls_disabled_in_public (public.spatial_ref_sys)
--   0014 extension_in_public (postgis, citext, pg_trgm)
--   0028/0029 *_security_definer_function_executable (PostGIS st_estimatedextent)

-- ══════════════════════════════════════════════════════════════════════════
-- RADYO BUCKET'I: LİSTELEME KAPATILIYOR
--
-- Bucket herkese açık (public) olduğu için parçalar
-- `/storage/v1/object/public/radio/<yol>` adresinden RLS'e uğramadan
-- servis edilir — yani <audio> çalmaya devam eder.
--
-- `storage.objects` üzerindeki geniş SELECT politikası ise ayrı bir şeydi:
-- nesneleri LİSTELEMEYE izin veriyordu. Yayınlanmamış ya da taslak bir
-- parçanın yolu, listeleme ile keşfedilebilir hâle geliyordu. Çalmak için
-- gerekli olmayan bu yetki editörlere daraltılıyor.
-- ══════════════════════════════════════════════════════════════════════════
drop policy if exists radio_objects_read on storage.objects;

create policy radio_objects_list_editors on storage.objects
  for select to authenticated
  using (
    bucket_id = 'radio'
    and (app.is_admin() or app.has_role('content_editor'))
  );

-- NOT: bu politikaya `comment on policy` eklenemiyor — `storage.objects`
-- tablosunun sahibi migration rolü değil ve COMMENT sahiplik istiyor.
-- Politikanın gerekçesi bu yüzden yalnızca burada, dosyada yazılı.

/*
 * ══════════════════════════════════════════════════════════════════════════
 * KAPATILAMAYAN BULGULAR VE GEREKÇELERİ
 * ══════════════════════════════════════════════════════════════════════════
 *
 * 1. public.spatial_ref_sys üzerinde RLS yok (0013, ERROR).
 *    Tablo PostGIS uzantısına aittir; sahibi biz değiliz ve `alter table
 *    ... enable row level security` yetkisi yok. Zaten koordinat sistemi
 *    referans kataloğudur: EPSG tanımları kamuya açık veridir, kişisel veri
 *    içermez. 0003 migration'ında anon/authenticated yetkileri salt okura
 *    indirildi; yazma yolu kapalı. Kalan risk yok, denetçi uyarısı
 *    kapatılamıyor.
 *
 * 2. Uzantılar public şemasında (0014, WARN).
 *    postgis, citext ve pg_trgm Supabase tarafından public şemaya kurulur.
 *    Taşımak (`alter extension ... set schema`) mevcut tüm tip ve operatör
 *    referanslarını kırar; PostGIS için resmî olarak desteklenmez. Kazanç
 *    isim alanı hijyeni, bedel ise çalışmayan bir veritabanı olurdu.
 *
 * 3. st_estimatedextent anon/authenticated tarafından çağrılabiliyor
 *    (0028/0029, WARN).
 *    Yetkiyi geri almayı denedik; ETKİSİ OLMADI ve bunun sebebi önemli:
 *    PostgreSQL'de `revoke`, YALNIZCA çağıran rolün verdiği yetkileri
 *    kaldırır. Bu yetkiyi `supabase_admin` verdi (proacl: `anon=X/supabase_admin`),
 *    dolayısıyla migration rolünün revoke'u sessizce hiçbir şey yapmıyor —
 *    hata da vermiyor. "Uyguladık, kapandı" demek burada yanlış olurdu.
 *
 *    Kalan risk sınırlı: fonksiyon yalnızca pg_statistic üzerinden kapsam
 *    tahmini döndürür; veri satırı vermez, yazma yapmaz. En kötü ihtimalle
 *    bir tablo/kolon adının varlığı yoklanabilir — şema adları zaten
 *    PostgREST üzerinden görünür durumda.
 *
 *    Gerçekten kapatmak için Supabase destek/dashboard üzerinden
 *    `supabase_admin` rolüyle revoke gerekir. Yayın öncesi kontrol
 *    listesine alındı (bkz. SITE-AUDIT-2026-07.md §4.4).
 */
