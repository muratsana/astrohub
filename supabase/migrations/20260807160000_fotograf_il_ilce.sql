-- ═══════════════════════════════════════════════════════════════════════
-- FOTOĞRAFTA KONUM: İL VE İLÇE — yapısal ve zorunlu
--
-- ── ÖNCESİ VE NEDEN ÇALIŞMIYORDU ──────────────────────────────────────
--
-- Yükleme sihirbazı konumu iki alanla soruyordu:
--
--   1. "Lokasyon (metin)" — serbest metin. "Saklıkent, Antalya",
--      "antalya", "evin balkonu", "36.6412, 30.2871" hepsi geçerliydi.
--   2. "Konum görünürlüğü" — tam / yaklaşık / il-ilçe / gizli.
--
-- İkisinin birlikte ürettiği üç sorun ölçüldü:
--
-- ŞEHİR TAHMİN EDİLİYORDU. Galeri şehir süzgeci `location_label`
-- metnini virgülden bölüp SON parçayı şehir sayıyordu
-- (`cityFromLabel`). "Saklıkent, Antalya" doğru çalışıyor;
-- "Antalya, Saklıkent" yanlış; "evin balkonu" ise "Evin Balkonu" adında
-- bir şehir üretiyordu. Süzgeç bu yüzden hiçbir zaman güvenilir
-- olmadı.
--
-- AYNI İL BİRDEN ÇOK KEZ GÖRÜNÜYORDU. Serbest metin "Muğla", "Mugla",
-- "MUĞLA" ayrımı yapmıyor — ilan ve etkinlik formlarında
-- `ProvinceSelect` ile çözülen sorunun aynısı, fotoğraf tarafında
-- duruyordu.
--
-- GÖRÜNÜRLÜK SEÇENEĞİ YANLIŞ SORUYU SORUYORDU. "Tam koordinat" seçeneği
-- kullanıcıya, aslında hiç toplamadığımız bir hassasiyeti yayımlama
-- izni veriyormuş gibi görünüyordu; alan serbest metin olduğu için
-- gerçekte olan şey, EXIF'ten okunan ham enlem-boylamın etikete
-- yazılabilmesiydi. Yani seçenek bir gizlilik denetimi değil, bir
-- gizlilik SIZINTISI kapısıydı.
--
-- ── SONRASI ───────────────────────────────────────────────────────────
--
-- Konum artık iki kolon: `city` ve `district`, ikisi de `provinces` ve
-- `districts` tablolarının kanonik yazımıyla ve ikisi de yükleme
-- formunda ZORUNLU. Görünürlük seçeneği kalktı; her fotoğrafın konumu
-- il/ilçe düzeyinde ve bu düzey zaten kullanıcının gözlem yerini
-- açığa çıkarmıyor.
--
-- `location_visibility` kolonu DURUYOR ama artık seçilmiyor: eski
-- kayıtlar kendi değerlerini taşıyor ve onları toplu olarak yeniden
-- yazmak, kullanıcının o gün verdiği kararı geriye dönük değiştirmek
-- olurdu. Yeni kayıtlar her zaman 'region'.
--
-- ── ESKİ KAYITLAR NE OLUYOR ───────────────────────────────────────────
--
-- Geriye dönük doldurma YAPILMIYOR ve bu bir karar. `location_label`
-- serbest metin; ondan il çıkarmak tam olarak yukarıda "çalışmıyor"
-- diye anlatılan tahmini bir kez daha yapmak olurdu — bu sefer kalıcı
-- bir kolona yazarak. Eski kayıtlarda `city` boş kalıyor ve arayüz
-- onlar için eski etiketi göstermeye devam ediyor.
--
-- Kolonlar bu yüzden NOT NULL DEĞİL: zorunluluk formda, şemada değil.
-- Şemada zorunlu yapmak mevcut satırları geçersiz kılardı.
--
-- Geri alma:
--   alter table public.astro_photos
--     drop column if exists city, drop column if exists district;
-- ═══════════════════════════════════════════════════════════════════════

alter table public.astro_photos
  add column if not exists city text,
  add column if not exists district text;

comment on column public.astro_photos.city is
  'İl adı — `provinces` kanonik yazımı. Yeni yüklemelerde zorunlu; '
  'eski kayıtlarda boş (bkz. 20260807160000).';

comment on column public.astro_photos.district is
  'İlçe adı — `districts` kanonik yazımı. Yeni yüklemelerde zorunlu.';

/*
 * Galeri süzgeci "şu ildeki yayımlanmış fotoğraflar" diye soruyor;
 * indeks o soruyu karşılıyor. Kısmi: ili olmayan eski kayıtlar
 * sorunun dışında ve indekste yer kaplamalarının anlamı yok.
 */
create index if not exists astro_photos_city_district_idx
  on public.astro_photos (city, district)
  where city is not null;
