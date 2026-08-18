-- ═══════════════════════════════════════════════════════════════════════
-- A12 — /saha CANLI HTTP 400
--
-- Gözlem noktası listesi canlıda hiç yüklenmiyordu. PostgREST'in verdiği
-- cevap tek cümleydi ve doğruydu:
--
--   {"code":"42703","message":"column observing_sites.image_url does not exist"}
--
-- Sorgu dört kolon istiyordu — `image_url`, `image_credit`,
-- `image_licence`, `source_urls` — ve dördü de tabloda yoktu. Bir
-- PostgREST seçiminde tek bir olmayan kolon, sorgunun TAMAMINI 400'e
-- düşürüyor; yani listenin geri kalan yirmi kolonu da gelmiyordu.
--
-- Sonucu ekranda görünmüyordu ve asıl sinsi kısmı bu: katalog katmanı
-- hata durumunda tohum veriye düşüyor, sayfa dolu görünüyor. Yani
-- veritabanındaki DÖRT yayınlanmış saha kaydı — kullanıcıların
-- gönderdikleri de dâhil — aylardır hiç kimseye gösterilmiyordu ve
-- ortada bir hata mesajı da yoktu.
--
-- ══════════════════════════════════════════════════════════════════════
-- NEDEN KOLONLARI EKLİYORUZ, SORGUDAN ÇIKARMIYORUZ
--
-- Dördünü sorgudan silmek 400'ü de kaldırırdı ve daha küçük bir
-- değişiklik olurdu. Ama saha detay sayfası bu alanları GERÇEKTEN
-- gösteriyor: kapak fotoğrafı, fotoğrafın telif künyesi ve "kaynaklar"
-- listesi. Tohum verideki sahalarda hepsi dolu.
--
-- Sorgudan silseydik veritabanı kaynaklı hiçbir saha kapak fotoğrafı ya
-- da kaynak taşıyamazdı — topluluğun eklediği her yeni saha, tohum
-- sahaların yanında kalıcı olarak eksik görünürdü. Hata sorguda değil,
-- tablodaydı.
--
-- `source_urls` JSONB: [{"label": "...", "url": "..."}] dizisi.
-- Ayrı bir tablo, üç alanlı ve yalnızca gösterim amaçlı bir liste için
-- fazlaydı; sorgulanmıyor, yalnızca okunup basılıyor.
-- ═══════════════════════════════════════════════════════════════════════

alter table public.observing_sites
  add column if not exists image_url text,
  add column if not exists image_credit text,
  add column if not exists image_licence text,
  add column if not exists source_urls jsonb;

comment on column public.observing_sites.image_url is
  'Kapak fotoğrafı adresi. Telif künyesi olmadan gösterilmiyor: image_credit boşsa arayüz fotoğrafı hiç basmıyor.';
comment on column public.observing_sites.source_urls is
  'Gösterim amaçlı kaynak listesi: [{"label": "...", "url": "..."}]. Sorgulanmıyor, okunup basılıyor.';

/*
 * ŞEKİL KONTROLÜ. Kolon serbest JSONB olsaydı bir gün oraya nesne ya da
 * düz metin yazılır, arayüzdeki `Array.isArray` kontrolü sessizce
 * `undefined` döner ve kaynaklar hiç görünmezdi — tam olarak bu maddede
 * düzelttiğimiz sessiz kayıp türü.
 */
alter table public.observing_sites
  drop constraint if exists observing_sites_source_urls_dizi;
alter table public.observing_sites
  add constraint observing_sites_source_urls_dizi
  check (source_urls is null or jsonb_typeof(source_urls) = 'array');
