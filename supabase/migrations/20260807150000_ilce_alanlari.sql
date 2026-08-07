-- ═══════════════════════════════════════════════════════════════════════
-- İLÇE ALANI — ilan, etkinlik ve kulüp kayıtlarına
--
-- `0040` ile 81 il ve 974 ilçe geldi, `20260802171241` ile ilçe
-- koordinatları tamamlandı. Konum seçici iki kademeli çalışıyor. Ama
-- KAYITLAR hâlâ yalnızca il taşıyor: bir kullanıcı "İstanbul" ilanlarını
-- süzdüğünde 15 milyonluk bir alanın tamamını görüyor ve teleskobu
-- Kadıköy'den mi Silivri'den mi alacağını bilemiyor.
--
-- Bu göç üç tabloya ilçe adı ekliyor.
--
-- ── NEDEN AD, KOD DEĞİL ────────────────────────────────────────────────
-- `city` sütunu zaten il ADINI metin olarak tutuyor ve `ProvinceSelect`
-- yazımı tek kaynaktan (`provinces`) veriyor. İlçeyi yabancı anahtarla
-- bağlamak iki farklı temsil üretirdi: il metin, ilçe kimlik. Aynı
-- adresin iki parçasını iki ayrı biçimde tutmak, her okuma yerinde bir
-- birleştirme (join) ve her formda iki ayrı doğrulama demekti.
--
-- Yazımın tekliği burada da korunuyor: alanı dolduran tek yol
-- `DistrictSelect` ve o da `districts` tablosundan okuyor.
--
-- ── NEDEN observing_sites YOK ─────────────────────────────────────────
-- Gözlem sahaları BİLEREK yaklaşık konum taşıyor (`approx_latitude`,
-- `approx_longitude`) — kullanıcının gözlem yerinin tam koordinatını
-- yayımlamamak §14.4'ün korumaya çalıştığı şey. İlçe eklemek konumu
-- birkaç kilometreye daraltır ve o korumayı kısmen geri alırdı. Saha
-- tarafındaki süzgeç `region` üzerinden çalışmaya devam ediyor.
--
-- ── NEDEN ZORUNLU DEĞİL ───────────────────────────────────────────────
-- Mevcut kayıtların hiçbirinde ilçe yok. Zorunlu yapmak onları
-- düzenlenemez hâle getirirdi: kullanıcı ilanını güncellemek istediğinde
-- form, hiç girmediği bir alanı isterdi.
--
-- Geri alma:
--   alter table public.listings drop column if exists district;
--   alter table public.events   drop column if exists district;
--   alter table public.clubs    drop column if exists district;
-- ═══════════════════════════════════════════════════════════════════════

alter table public.listings add column if not exists district text;
alter table public.events   add column if not exists district text;
alter table public.clubs    add column if not exists district text;

comment on column public.listings.district is
  'İlçe adı — `districts` tablosundaki kanonik yazım. İsteğe bağlı.';
comment on column public.events.district is
  'İlçe adı — `districts` tablosundaki kanonik yazım. İsteğe bağlı.';
comment on column public.clubs.district is
  'İlçe adı — `districts` tablosundaki kanonik yazım. İsteğe bağlı.';

/*
 * İndeksler KISMİ: yalnızca ilçesi dolu satırları kapsıyorlar.
 *
 * Bugün kayıtların tamamına yakınında alan boş; tam bir indeks
 * neredeyse yalnızca NULL saklardı ve hiçbir sorguya yaramazdı.
 * Süzgeç zaten "ilçesi şu olanlar" diye soruyor — yani NULL satırlar
 * sorunun dışında.
 */
create index if not exists listings_district_idx
  on public.listings (city, district) where district is not null;
create index if not exists events_district_idx
  on public.events (city, district) where district is not null;
create index if not exists clubs_district_idx
  on public.clubs (city, district) where district is not null;
