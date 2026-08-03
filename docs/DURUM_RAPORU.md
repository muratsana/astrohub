# AstroHub — Durum Raporu

> **Bu belge ne işe yarar:** ana görev belgesindeki (18 faz) her başlığın
> bugünkü karşılığını, kalan işi ve **kalma sebebini** tek yerde toplar.
> Kaynak: `docs/IMPLEMENTATION_STATUS.md` (devam noktası) + canlı ölçümler.
>
> **Tarih:** 3 Ağustos 2026 · **Dal:** `main`

---

## 1. Bir bakışta

| | |
|---|---|
| **Tamamlanan faz** | 3 (Faz 0, 2, 10) + Faz 9 `IMPLEMENTED_DISABLED` |
| **Kodla kapatılabilecek iş kalmayan faz** | Faz 1, 3, 6, 7, 8 — kalanlar dış kaynak/karar bekliyor |
| **Kısmen açık faz** | Faz 4, 5, 11, 12 |
| **Hiç başlanmayan faz** | Faz 13, 14, 15, 16, 17, 18 |

**Kritik nokta:** 18 fazın 12'si işlenmiş durumda ve kalan altısının
çoğu *doğrulama/sertleştirme* fazı (test stratejisi, güvenlik denetimi,
performans, erişilebilirlik). Yani ürün yüzeyi büyük ölçüde ayakta;
kalan iş ağırlıklı olarak **kanıtlama** ve **cilalama**.

---

## 2. Sayısal envanter (ölçüldü, tahmin değil)

| Ölçüt | Değer |
|---|---|
| Kaynak kod | ~109.800 satır (`src/`) |
| Veritabanı göçü | 71 dosya (`0001`–`0071`) |
| Canlı tablo | 84 · RLS açık: **83/84** (istisna: PostGIS `spatial_ref_sys`) |
| RLS politikası | 176 |
| Edge fonksiyonu | 6 (meteoblue, plate-solve, plate-solve-poll, radyo-durum, youtube, podcast-rss) |
| Test | **2.045 test / 167 dosya** — hepsi geçiyor |
| Rota | 81 tanım · 491 prerender edilmiş statik HTML · 161 Vercel rewrite |
| Sitemap | 484 adres (ince şehir sayfaları bilerek hariç) |
| İlk rota JS | **197.1 kB gzip** (bütçe 200) · CSS 14.7 kB (bütçe 25) |

**Kalite kapıları (hepsi CI'da):** `lint`, `typecheck`, `test`,
`check:budgets`, `check:a11y`, `check:viewports`, `check:csp`,
`check:rls`, `check:auth`, `check:rewrites`, `check:preview`, `test:e2e`.

---

## 3. Faz faz durum

### Faz 0 — Envanter ve güvenli ortam · **DONE**
Baseline çıkarıldı, bağımlılık açıkları kapatıldı, Node sürümü sabitlendi,
bozuk env'de production build'i düşüren kapı kuruldu.

---

### Faz 1 — Veri modeli, Supabase güvenliği, merkezî yapılandırma · **PARTIAL**

**Yapıldı:** 81 il tek kaynaktan (`provinces`), il–ilçe FK, Türkçe
normalize arama (`app.tr_normalize`), silme koruması, idempotent seed.
974 ilçe koordinatlarıyla canlıda (`0071`). Konum modu durum makinesi
(beş mod), ters kodlama adapteri, çıkışta konum temizliği. RLS denetimi:
koşulsuz politika **0**, `WITH CHECK` eksiği **0**, `anon`'a yazma **0**.

**Kaldı ve neden:**

| Madde | Sebep |
|---|---|
| Gerçek cihaz/tarayıcı matrisi (Safari/iOS/Android/Edge) | **Ortam** — kum havuzunda tek Chromium var. `IMPLEMENTED_BLOCKED_EXTERNAL` |
| `consume_rate_limit`'in `app` şemasına taşınması | **Düzen işi, açık boşluk değil** — Faz 15'e atandı |
| 129 permissive policy birleştirme | **Performans uyarısı, güvenlik açığı değil.** `OR` birleştirme kapsam genişletme riski taşıdığı için tablo tablo yapılacak (Faz 15) |
| `spatial_ref_sys` yazma yetkisi | **Yetki** — `revoke` `postgres` ile sessiz no-op; `supabase_admin` gerekiyor |

---

### Faz 2 — Tek tasarım sistemi · **DONE**

**Yapıldı:** Token sistemi (tipografi, renk, spacing, radius, gölge,
ikon, form, buton/badge varyantları), birleşik `ContentCard` ailesi
(11 modül geçti), 11 çözünürlükte alan ölçümü, gereksiz açıklama
temizliği. Serbest punto/radius kaçağı **sıfır** ve `designSystem.test.ts`
kapıyı tutuyor.

**Sonradan kapanan iki açık madde:**

| Madde | Durum |
|---|---|
| Modal/drawer/popover/**tooltip** kuralları | DONE — ortak `Tooltip` eklendi ve ikon/segment kontrollerinde kullanılmaya başlandı |
| Focus/hover/active/disabled/**selected** | DONE — ortak `SegmentedControl` selected-state yüzeyi eklendi; Forum, Marketplace, Articles, News, Gallery, Equipment ve Events sayfalarındaki tek seçimli kontroller buna taşındı |

---

### Faz 3 — Ana sayfa, navbar, hero, hava durumu · **PARTIAL (kod işi kalmadı)**

**Yapıldı:** Tekrar eden hava şeridi kaldırıldı (kabuk 88px → 56px),
boş modül durum ayrımı (yükleniyor/hata/boş ayrı), hero erişilebilirliği
ve kontrol çakışması, "Bu Gece" modülünün **18 zorunlu alanının 18'i**,
tarih kontrolleri, paylaşılabilir tarih ve konum, hava sağlayıcısı admin
ayarı.

**Kaldı ve neden — üçü de ÖLÇÜM işi, kod işi değil:**

| Madde | Sebep |
|---|---|
| Hero görsel–metin kontrastı | **Örnekleme gerekiyor** — fotoğraf değişken, statik ölçüm yetmez |
| "Slider gerçekten gerekli mi" | **Etkileşim verisi yok.** Ölçmeden tek hero'ya indirmek tahmin olur |
| Boş modül durumlarının E2E'si | **Ağ kesintisi taklidi gerekiyor**; durum ayrımı 10 birim testiyle ölçülüyor |

---

### Faz 4 — Ortak arama/filtre/sıralama/görünüm · **PARTIAL**

**Yapıldı:** Saf sorgu motoru (`query.ts`), URL'ye yazan React bağlaması,
**10/10 liste sayfası** motora taşındı. Tam metin + Türkçe normalize
arama, debounce, faceted filtre + sayım, çoklu seçim, aktif filtre
chip'leri, URL/geri-ileri, Türkçe sıralama, null konumu. Tablo görünümü,
mobil filtre çekmecesi, kaydedilmiş görünümler, kullanıcı varsayılanı,
admin paylaşılan görünümü, CSV dışa aktarma (formül enjeksiyonu
korumalı), görünüm tercihinin hesapta saklanması. Sayısal aralık, tarih
aralığı, "boş değerleri dahil etme". **Bu turda:** News/Gallery/Equipment
kategori şeritleri ve Events kart/takvim anahtarı ortak `SegmentedControl`
yüzeyine taşındı.

**Kaldı ve neden:**

| Madde | Sebep |
|---|---|
| **İlçe explorer facet'i** | **ŞEMA işi, süzgeç işi değil** (ölçüldü): `listings`/`events`/`clubs` yalnızca serbest metin `city` taşıyor, `observing_sites` onu bile taşımıyor. Hiçbir kayıtta ilçe alanı yok → göç + üç form + geri doldurma kararı gerekiyor |
| Sayfa boyutu seçimi | **Hiçbir sayfa sayfalamıyor.** Yazılmıştı, geri alındı: sayfalanmayan listede boyut seçtirmek çalışmayan bir kontrol olurdu |
| Sunucu tarafı arama/sayfalama | **Veri hacmi gerektirmiyor** (bilinçli). Sorgu durumunun şekli hazır |
| Sütun sırası (sürükle-bırak) | **Ayrı bir etkileşim** (sürükleme + klavye alternatifi), tek başına bir tur |
| Harita/takvim görünümlerinin explorer'a girmesi | Ayrı sayfa olarak varlar; explorer görünüm seçeneği değiller |

---

### Faz 5 — Bildirim, mesajlaşma, sosyal aktivite · **PARTIAL**

**Yapıldı:** Sosyal graf (`follows`, `user_blocks`), bildirim şeması ve
üretim tetikleyicileri, mesajlaşma (`conversations`/`participants`/
`messages`), bildirim merkezi arayüzü, sohbet arayüzü, takip/engelleme
arayüzü, raporlama. `/akis` kişisel aktivite akışı eklendi; takip edilen
kullanıcıların yeni fotoğraf, ilan ve forum konu hareketleri tek listede
gösteriliyor. Sekiz göç (`0041`–`0048`).

**Kaldı:** Kod işi yok; e-posta/web push gibi teslimat kanalları Faz 6 kararına bağlı.

---

### Faz 6 — Etkinlik takip ve hatırlatma · **PARTIAL (kod işi kalmadı)**

**Yapıldı:** `event_follows`, `reminders`, `event_changes`, `app_settings`;
beş dakikada bir çalışan cron; etkinlik sayfasında takip/hatırlatma/
takvime ekleme; yönetici tarafının **yedi maddesinin hepsi**.

**Kaldı ve neden:**

| Madde | Sebep |
|---|---|
| E-posta teslimi | **ÜRÜN KARARI (Sen)** — sağlayıcı seçilmedi |
| Web push | **Belgenin kendisi "ileride" diyor**; tablo boş duruyor |
| Queue → Edge Function ayağı | Site içi teslimat için **gereksiz** (gerekçesi `0049` başında); e-posta kararına bağlı |

---

### Faz 7 — AstroHub Radyo · **PARTIAL (kod işi kalmadı)**

**Yapıldı:** 11 tablo (`0051`–`0053`), AzuraCast adapteri, sağlık
yoklaması, dağıtım paketi (`deploy/radyo/`), program takvimi, kullanıcı
sayfaları (program/yayıncı/podcast/bölüm), dinleme ilerlemesi, panel
Radyo sekmesi, admin mp3 kasası. **Bu turda:** podcast RSS feed'i
(`podcast-rss` edge fonksiyonu, canlıda uçtan uca ölçüldü) ve public
radyo yüzeyi gerçek radyo modeline çekildi: dinleyicide parça adı,
sanatçı, Spotify embed'i ve ileri/parça seçme kontrolleri yok; yalnızca
`Canlı yayın` başlat/duraklat görünür. Resume, canlı stream'de yeniden
bağlanır; MP3 kasası fallback'inde yayın saatine göre pozisyon alır.

**Kaldı ve neden:**

| Madde | Sebep |
|---|---|
| Canlı yayın aktivasyonu | **DIŞ VPS gerekiyor.** On iki adımlık kurulum listesi `deploy/radyo/README.md`de |
| Media Session, yeniden bağlanma, kalite seçimi | **Çalışan bir yayın akışı olmadan doğrulanamaz.** Yazılabilirdi ama test edilemeyen kod, çalıştığı *varsayılan* koddur |

---

### Faz 8 — AstroHub TV · **PARTIAL (kod işi kalmadı)**

**Yapıldı:** Yedi tablo (`0055`–`0056`), YouTube OAuth adapteri (35 test),
kota izleme, video arşivi ve seri sayfaları, yayın takibi, panel TV
sekmesi.

**Kaldı:** **Canlı kanal bağlantısı** — gerçek Google OAuth kimliği
gerekiyor. `IMPLEMENTED_BLOCKED_EXTERNAL`.

---

### Faz 9 — Üyelik altyapısı · **IMPLEMENTED_DISABLED**

**Yapıldı:** Kademeler, kota/hak tanımları, yarış durumuna kapalı
fotoğraf kotası, depolama sayacı, test entitlement'ı, `/uyelik` sayfası.

**Kaldı ve neden:** **Ödeme sağlayıcısı KULLANICI KARARIYLA
kurulmuyor.** Satın alma yüzeyi hiç yok — devre dışı düğme bile.
Sağlayıcı seçilince yazılacak tek şey webhook; kademe/kota/yetki mantığı
yerinde duruyor.

---

### Faz 10 — Admin panelinden kodsuz yönetim · **DONE**

**Yapıldı:** Beş tablo (`home_modules`, `hero_slides`, `nav_links`,
`feature_flags`, `site_settings`), değişiklik geçmişi + geri alma,
taslak/önizleme/yayın akışı, panelin **Site** sekmesi. Ana sayfa düzeni,
hero slaytları, menü/footer, yedi bayrak, bakım modu, site duyurusu —
hepsi hem panelden yazılıyor hem ziyaretçi tarafında okunuyor.

> Fazın tekrar eden hatası dört turda kapatıldı: **panel yazıyor,
> ziyaretçi okumuyor** (`home_modules`, `feature_flags`, `nav_links`,
> `hero_slides` — dördü de).

**İki madde bilerek kapsam dışı:** çoklu admin rolü **kurulmayacak**
(ürün kararı), tek ekran dashboard `PARTIAL` (sekmeler var, birleşik
özet ekranı yok).

---

### Faz 11 — Zorunlu ürün modülleri · **PARTIAL**

**Yapıldı:** Dokuz alt bölümün envanteri çıkarıldı; yedisi mevcut
modüllerle karşılanıyor. Gerçek boşluklar kapatıldı: gözlem günlüğü
(§14.6, `0064`), bilgi merkezi sözlük/SSS (§14.9, `0065`), kulüp dizini
veritabanına taşındı (§14.7, `0067`), astrofotoğraf hesaplayıcıları
(§14.2: `capturePlan`, `filterPlan`, `calibration`, `planShare`).
**Bu turda:** meteor yağmurları takvimi (§14.3).

**Kaldı ve neden:**

| Madde | Sebep |
|---|---|
| §14.7 kulübün etkinlik yayımlaması | **ÜRÜN KARARI** — `events` tarafında sahiplik ve moderasyon kararı gerekiyor |
| §14.3 **tutulmalar** | **Besselian elemanları ya da kanon tablosu gerekiyor.** Düşük hassasiyetli efemerisle güvenilir tutulma dakikası üretilemez; yanlış dakika insanları yanlış yere götürür |
| §14.3 **ISS geçişleri** | **Her gün değişen yörünge verisi (TLE)** — gerçekten dış kaynak |
| §14.1 interaktif gökyüzü haritası | **Dış veri lisansı/servis gerekiyor.** Adapter + feature flag ile hazırlanacak, placeholder GÖSTERİLMEYECEK |

---

### Faz 12 — Organik kullanıcı kazanımı · **PARTIAL**

**Yapıldı (bu turda §15.3):** `sitemap.xml` gerçekten üretiliyor (**hiç
üretilmiyordu**; üretici yazılmış, beş testi var, çağıran yoktu ve
`robots.txt` onu ilan ediyordu) + ince şehir sayfaları `noindex, follow`
ve sitemap dışında.

Fazın §15.1/§15.2 maddelerinin çoğu önceki fazlarda kapanmış: takip
sistemi, favori/koleksiyon, editörün seçimi, teknik künye, OG görseli,
canonical, paylaşılabilir gözlem planı, atıf ve telif.

**Kaldı ve neden — hiçbiri engelli değil, hepsi kendi turunu hak ediyor:**

| Madde | Not |
|---|---|
| Challenge/tema altyapısı ve katılım | Şema + moderasyon + değerlendirme kriterleri |
| Aylık astrofotoğraf seçkisi | Editör akışı gerekiyor |
| Haftalık kişiselleştirilmiş özet | E-posta kararına bağlı (Faz 6 ile aynı blokaj) |
| Davet ve referral altyapısı | Kötüye kullanım önleme tasarımı gerekiyor |
| Watermark tercihi, indirme izinleri | Fotoğraf boru hattına dokunuyor (Faz 13 ile birlikte mantıklı) |
| Kullanıcı portfolyo URL'si | DONE — `/profil/:username` artık gerçek `profiles` kaydını okur; fotoğraf yoksa da profil ve portfolyo bağlantısı görünür |

---

### Faz 13 — Fotoğraf, Storage, medya mimarisi · **NOT_STARTED**

> **Not:** Bu fazın birçok maddesi Faz 1.2'de fiilen yapıldı — yeniden
> boyutlama merdiveni, EXIF ayrıştırma (GPS hariç), kota, imzalı
> orijinal bucket, plate solve, işleme sürümleri. Faz açıldığında ilk iş
> **envanter** olmalı; sıfırdan bir boru hattı yazmak tekrar olurdu.

---

### Faz 14 — macOS/tarayıcı/responsive/erişilebilirlik · **NOT_STARTED**

> **Not:** `check:a11y` (5 rota, dokunma hedefi ≥44/24px) ve
> `check:viewports` (11 çözünürlük) zaten kapı zincirinde. Bu faz
> **gerçek cihaz matrisi** gerektiriyor ve o kısım ortam kısıtına takılı.

---

### Faz 15 — Güvenlik, KVKK, telif · **NOT_STARTED**

> **Not:** RLS matrisi, CSP enforce, auth sertleştirme, KVKK onay
> kutuları ve `audit_logs` zaten yapıldı. Bu faza atanmış iki teknik
> borç var: `consume_rate_limit`'in şema taşınması ve 129 permissive
> policy birleştirmesi.

---

### Faz 16 — Performans, SEO, analitik · **NOT_STARTED**

> **Not:** Bütçe kapısı, prerender, canonical, structured data, sitemap
> ve `noindex` kuralı yapıldı. **Analitik hesabı yok** — o kısım dış
> kimlik bekliyor.

---

### Faz 17 — Test stratejisi ve kabul kriterleri · **NOT_STARTED**

> **Not:** 2.042 test ve 12 kapı mevcut. Bu faz **kabul kriterlerinin
> tek tek doğrulanması** demek; yeni test yazmaktan çok var olanı
> belgenin listesiyle eşleştirme işi.

---

### Faz 18 — Deployment ve nihai rapor · **NOT_STARTED**

---

## 4. Kalanların sınıflandırması — "neden kaldı"

Kalan bütün maddeler **dört sebepten birine** giriyor:

### A) Dış kaynak / kimlik bekliyor — bizim elimizde değil
- Radyo canlı yayın (**VPS**)
- TV kanal bağlantısı (**Google OAuth kimliği**)
- Ödeme sağlayıcısı (**kullanıcı kararı + hesap**)
- E-posta sağlayıcısı (**karar + hesap**)
- Analitik hesabı
- ISS geçişleri (**TLE servisi**), interaktif gökyüzü haritası (**veri lisansı**)
- Gerçek cihaz/tarayıcı matrisi
- Vercel eski dağıtım temizliği (**`VERCEL_TOKEN`**)

### B) Ürün kararı bekliyor — Sen
- Kulüplerin etkinlik yayımlama yetkisi (sahiplik + moderasyon modeli)
- Challenge/yarışma değerlendirme kriterleri
- Davet/referral fayda modeli

### C) Ölçüm/veri bekliyor — kod yazmak yanlış cevap üretir
- Hero kontrastı (örnekleme)
- "Slider gerekli mi" (etkileşim verisi)
- Sunucu tarafı sayfalama (veri hacmi)
- Tutulma hesabı (kanon tablosu)

### D) Engelsiz, sırada bekleyen kod işi
- İlçe explorer facet'i (**önce göç + form**)
- Challenge altyapısı, aylık seçki
- Sütun sırası sürükle-bırak
- Harita/takvimin explorer görünümü olması
- Watermark
- Faz 13/14/15/16/17 envanterleri

---

## 5. UI yeniden tasarımı için mevcut durum

> Yeni tasarım belgesini hazırlarken bilmen gereken **kısıtlar ve
> hazır zemin**.

### Zemin — hazır olan
- **Token sistemi eksiksiz** ve kaçak sıfır: serbest punto/radius
  kullanımı `designSystem.test.ts` ile yasak. Yeni tasarım token
  ekleyerek yapılır, sınıf yazarak değil.
- **Tek kart ailesi** (`ContentCard` + `PhotoTile` + `PhotoCard`),
  üç görsel oranı, ortak iskelet/boş/hata durumları.
- **Ortak filtre yüzeyi** (`FilterBar`, `FilterCell`, `FilterToggle`,
  `ActiveFilters`, `RangeFilter`) ve tek sorgu motoru — on liste sayfası
  aynı motoru kullanıyor.
- **Ortak durum bileşenleri**: `LoadingState`, `ErrorState`,
  `OfflineState`, `AuthRequiredState`, `EmptyState`.
- Üç tema, üçünde de AA kontrast.

### Kısıtlar — tasarımı doğrudan sınırlayan
| Kısıt | Değer | Anlamı |
|---|---|---|
| **İlk rota JS bütçesi** | 198.8 / 200 kB gzip | **1,2 kB nefes payı.** Ana sayfada görünen her yeni bileşen bu bütçeden yer alır; lazy rotalar almaz |
| `check:viewports` | 11 çözünürlük × 2 sayfa | Yatay taşma ve fold üstü içerik kapıda ölçülüyor |
| `check:a11y` | ikon ≥44px, diğer ≥24px | Dokunma hedefi küçültülemez |
| Prerender | 490 rota | Sayfa yapısı SSR'da çalışmak zorunda |

### Eksik olan — yeni tasarımın doldurması gerekenler
- **Tek ekran admin dashboard yok** (sekmeler var, birleşik özet yok).
- **Haftalık kişiselleştirilmiş özet/öneri yok** — `/akis` takip hareketlerini
  gösteriyor; e-posta özeti ve öneri mantığı Faz 12'de ayrı tasarlanacak.
- **Challenge/yarışma yüzeyi yok.**

### Bu oturumda düzeltilen UI hataları (tekrarlamamak için)
1. Ana sayfa galeri şeridi **gerçek fotoğrafı çizmiyordu** — `PhotoTile`
   doğrudan çağrılıp `imageUrl` verilmiyordu.
2. Kullanıcı **kendi fotoğrafını silemiyordu** — RLS izin veriyordu,
   arayüzde çağıran yoktu.
3. "Bu Gece" gezinme düğmeleri **yerinden oynuyordu**; tarih etiketi
   `.num` (mono) taşıdığı için Türkçe harflerde iki aileli çiziliyordu.

---

## 6. Ürün kararları — belgeden bilinçli sapmalar

| Karar | Gerekçe |
|---|---|
| **Ödeme sağlayıcısı kurulmayacak** (sen söyleyene kadar) | Kullanıcı talimatı. Üyelik altyapısı hazır, tetikleyici eksik |
| **Sitede TEK admin** | Çoklu admin rolü/kademesi kurulmayacak. `moderator` ayrı bir görev, duruyor |
| **Radyo ÜÇ işi birden yapıyor** | mp3 döngüsü + canlı yayın + podcast. Hiçbiri silinmedi |
| **Her faz bitince canlıya alınacak** | Vercel eski dağıtım temizliği `VERCEL_TOKEN` bekliyor |

---

## 7. Tekrar eden hata deseni — dikkat edilecek

Bu projede **aynı hata yedi kez** çıktı ve her seferinde farklı bir
yüzeydeydi: **bir taraf yazıyor, öteki okumuyor.**

1. `home_modules` — panel yazıyor, ana sayfa okumuyor
2. `feature_flags` — aynısı
3. `nav_links` — tablo boş, menü koddaki yedekten çiziliyor
4. `hero_slides` — aynısı
5. `collections`/`follows` — veri var, galeri süzemiyor
6. **`astro_photos_delete_own`** — RLS izin veriyor, arayüzde düğme yok
7. **`buildSitemapXml`** — üretici yazılmış, beş testi var, **çağıran yok**

> Yedincisi en sinsisiydi: **testlerin geçiyor olması durumu
> gizliyordu.** Yeni bir şey yazarken sorulacak soru "çalışıyor mu"
> değil, **"çağrılıyor mu"**.

---

## 8. Sıradaki tur için öneri

Yeni UI belgesi geldiğinde önerilen sıra:

1. **Faz 2'nin iki `PARTIAL` maddesini kapat** (`Tooltip`, `selected`) —
   yeni tasarımın zaten ihtiyaç duyacağı iki temel parça.
2. **Bütçe payı aç.** 1,2 kB ile kapsamlı bir UI turu yapılamaz; ilk
   rotadan çıkarılabilecek modüller ölçülmeli.
3. Yeni tasarımı **token ve ortak bileşen üzerinden** uygula — sayfa
   sayfa sınıf yazmak `designSystem.test.ts` kapısına takılır ve zaten
   Faz 2'nin çözdüğü dağınıklığı geri getirir.

---

## 9. 2 Ağustos 2026 audit ve patch başlangıcı

Kaynak karşılaştırması: dış rapor `DURUM_RAPORU_GUNCEL(2).md` ile
`main` dalındaki güncel repo karşılaştırıldı. Genel mimari ve envanter
uyumlu: React/Vite, Supabase `0001`-`0071` göçleri, ortak Explorer
motoru, admin yüzeyleri, fotoğraf/ilan/radyo/üyelik servisleri repoda
mevcut. Ancak rapordaki kullanıcı doğrulaması sonrası açılan bazı işler
gerçek koda göre hâlâ açıktı.

### Bu audit'te doğrulanan açıklar

| Madde | Repo durumu | Yeni durum |
|---|---|---|
| Navbar şehir seçimi kaldırılacak | `Topbar` hâlâ `LocationPicker variant="compact"` çiziyordu | DONE — üst çubuktan kaldırıldı; tek ürün kontrolü `Bu Gece`/çekmece hattında kalacak |
| Navbar `Ekipman` kaldırılacak | `primaryNav` ve `0062` tohumu `/ekipman` taşıyordu | DONE — üst menüden çıkarıldı; route ve modül haritası korunuyor |
| Canlı `nav_links` hizası | Eski canlı/tohum satırı production'da kalabilirdi | DONE — `20260802203529_remove_equipment_from_header_nav.sql` canlı Astrohub Supabase projesine uygulandı; `/ekipman` header'da `enabled=false`, kalan header sırası 1-8 |
| Ana sayfa `Son İlanlar` thumbnail | `RecentListings` statik seed + `StarField` çiziyordu; `listing_photos` hiç okunmuyordu | DONE — liste sorgusu kapak fotoğrafını okuyor ve ana sayfa `RemoteImage` kullanıyor |
| İlan liste kartları thumbnail | Marketplace grid kartı `Listing.imageUrl` geldiği halde `StarField` çiziyordu | DONE — `MarketplacePage` grid kartı da ilan kapak görselini tüketiyor; görsel yoksa ortak fallback'e düşüyor |
| Ana sayfa galeri thumbnail | Repo `RecentRecords -> PhotoCard` zinciriyle `imageUrl` tüketiyor | PARTIAL — kod zinciri doğru görünüyor; kullanıcı canlıda görmediği için gerçek preview/canlı veriyle tekrar doğrulanacak |
| `Tooltip` ve ortak `selected` state | Bileşen düzeyinde hâlâ eksik | DONE — `Tooltip` ve `SegmentedControl` eklendi; Forum/Marketplace/Articles/News/Gallery/Equipment/Events kategori, yoğunluk ve görünüm kontrolleri buna taşındı |
| Yazı seviye yüzeyleri | `Başlangıç / Orta / İleri` filtre ve kart rozeti ürün arayüzünde görünüyordu | DONE — veri modeli korunarak UI filtresi, chip'i ve kart rozeti kaldırıldı |
| Ortak Explorer Toolbar görsel standardı | Motor var; sayfa yüzeyleri hâlâ farklı yoğunlukta | PARTIAL — Articles görünüm şeridi `ToolBar`a taşındı; Events mode switch ve News/Gallery/Equipment kategori segmentleri ortak yüzeye geçti; select-heavy Explorer sayfalarında kalan toolbar yoğunluğu ayrıca sadeleşecek |
| `Bu Gece` konum/tarih kontrolü | Konum seçici, ileri/geri okları ve tarih kutusu modül üstünde dağınık görünüyordu | DONE — konum ve 7 günlük gece seçimi panel içine alındı; hafta çizgisi tıklanabilir, eski ok/date input yüzeyi kaldırıldı |
| `Bu Gece` veri/tekrar metni | Open-Meteo/efemeris künyesi ve `Astrofotoğraf: 34 · zayıf gece` satırı karar metnini tekrarlıyordu | DONE — public UI'dan kaldırıldı; konum + tarih bağlamı karar altında kaldı |
| Koşul kartı yoğunluğu ve hedef tablo tutarlılığı | Bulut/seeing/çiylenme gibi kartların ikinci satırları paneli kalabalıklaştırıyordu; hedef başlıkları sıralanamıyordu | DONE — koşul kartlarında yalnızca ana veri satırı kaldı; `Zirve` ve `Yükseklik` başlıkları hizalı ve tıklanabilir sıralama kontrolü |
| Hero ve footer görsel geri bildirimi | Hero büyük harf aralığı fazla genişti; footer üst menüyü tekrar ediyordu | DONE — hero letter-spacing sıfırlandı; footer’da modül tekrarı kaldırıldı, aynı alana `Hakkında/KVKK/Kullanım Koşulları` taşındı |
| Karanlık grafiği | Segmentler sert bloklar gibi görünüyordu | DONE — segment geçişleri maskeli bindirme ve üst ışık katmanı ile yumuşatıldı |

### Bu patch'te değişen dosyalar

- `src/components/shell/Topbar.tsx` — üst çubuktaki ikinci şehir seçici kaldırıldı.
- `src/app/navigation.ts` — `Ekipman` ana navigasyondan çıkarıldı.
- `supabase/migrations/0062_nav_links_tohumu.sql` — yeni kurulum tohumu sekiz header bağlantısıyla hizalandı.
- `supabase/migrations/20260802203529_remove_equipment_from_header_nav.sql` — mevcut canlı header menüsünde `/ekipman` satırını kapatan göç eklendi.
- `supabase/migrations/20260802202412_remove_equipment_from_header_nav.sql` — önceki Supabase Preview branch sürümüyle drift oluşmaması için aynı idempotent göç korundu.
- `src/services/content/listings.ts` — `listing_photos` ilişkisi okunup kapak görseli `Listing.imageUrl` alanına taşındı.
- `src/services/marketplace/photoUrl.ts` — ilan fotoğraf URL üretimi hafif ortak yardımcıya ayrıldı.
- `src/features/home/sections/RecentListings.tsx` — ana sayfa ilan kartları gerçek kapak görselini kullanır; yoksa ortak fallback'e düşer.
- `src/services/content/recentListings.ts` — ana sayfa için hafif ilan sorgusu eklendi; ilk JS bütçesi aşılmadan kapak fotoğrafı okunur.
- `src/features/home/sections/TonightPanel.tsx` — 1280×720'de konum izni satırı sarılıp `Bu Gece` karar kartını fold altına itmesin diye gizlilik ibaresi kısaltıldı.
- `src/features/admin/ForumCategories.tsx`, `src/features/admin/forumCategoryData.ts` — macOS'ta gizlenen ama TypeScript build'i bozan büyük/küçük harf çakışması temizlendi.
- `src/test/setup.ts`, `src/entry-prerender.tsx` — yerel test/prerender ortamında eksik `localStorage` API'si için güvenli bellek yedeği eklendi.
- `src/features/weather/openMeteo.test.ts` — Open-Meteo `timezone=auto` saatlerinin yerel saat olarak parse edilmesi testle hizalandı.
- `src/components/ui/Tooltip.tsx`, `src/components/ui/SegmentedControl.tsx` — ortak açıklama ve tek seçimli selected-state yüzeyi eklendi.
- `src/components/ui/ViewToggle.tsx` — ikon görünüm anahtarları `title` yerine ortak tooltip kullanır.
- `src/features/forum/ForumPage.tsx`, `src/features/marketplace/MarketplacePage.tsx`, `src/features/articles/ArticlesPage.tsx` — kategori/yoğunluk/görünüm yüzeyleri ortak bileşenlere taşındı.
- `src/features/articles/articlesSpec.ts` — yazı seviye facet'i ürün arayüzünden çıkarıldı.
- `scripts/e2e.mjs` — tablo başlığı sıralama senaryosu DOM `querySelector` yerine Playwright locator auto-wait kullanır; CI'daki geç render yarışını kapatır.
- `src/features/radio/RadioContext.tsx`, `src/features/radio/RadioDock.tsx`, `src/features/radio/RadioToggle.tsx`, `src/features/radio/RadioPage.tsx` — public radyo playlist görünümü kaldırıldı; kullanıcı tarafında yalnızca canlı yayın başlat/duraklat kaldı, resume akışı güncel yayına eşlenir.
- `src/features/radio/handover.ts`, `src/features/radio/handover.test.ts`, `src/features/radio/RadioPage.test.tsx` — yayın saatine göre kasa pozisyonu ve public radyo kontrol sınırı testlendi.
- `src/features/news/NewsPage.tsx`, `src/features/photos/GalleryPage.tsx`, `src/features/equipment/EquipmentPage.tsx`, `src/features/events/EventsPage.tsx` — kalan Explorer kategori/görünüm segmentleri ortak `SegmentedControl` bileşenine taşındı.
- `src/features/home/sections/TonightPanel.tsx`, `src/features/home/sections/tonight/nightOffset.ts` — `Bu Gece` konum ve gece seçimi panel içi 7 günlük timeline kontrolüne taşındı.
- `src/features/home/sections/tonight/DecisionColumn.tsx`, `src/features/home/sections/tonight/useTonight.ts` — tekrar eden astrofotoğraf skoru ve kullanıcıya görünen hava servisi künyesi kaldırıldı.
- `src/features/home/sections/tonight/TimelineColumn.tsx`, `src/features/home/sections/tonight/NightTimelineChart.tsx` — koşul kartlarındaki ikinci satırlar kaldırıldı; bulunulan an çizelgede sade dikey imleç oldu.
- `src/features/home/sections/tonight/TargetsColumn.tsx` — `Zirve` ve `Yükseklik` başlıkları hizalı, tıklanabilir sıralama kontrollerine çevrildi.
- `src/domain/astronomy/nightScore.ts`, `src/features/home/sections/tonight/DecisionColumn.tsx` — skor kırılımı bulut örtüsü ve ay aydınlığını da görünür kılar; çubuklar gerçek hesap yönüne göre çizilir.
- `src/features/home/sections/tonight/TimelineColumn.tsx` — ay kartı faz adını gösterir; grafik kolonunun altında tek satırlık ay evresi özeti eklendi.
- `src/features/location/LocationContext.tsx`, `src/features/home/sections/TonightPanel.tsx` — paneldeki ikinci `Konumumu kullan` düğmesi kaldırıldı; Chrome/macOS izin değişimi ve konum alma retry akışı düzeltildi.
- `src/components/shell/AppShell.tsx`, `scripts/e2e.mjs` — alt radyo barı kaldırıldı; e2e artık üst bar radyo kontrolünün rota değişiminde kaldığını doğrular.
- `src/features/static/ContactPage.tsx`, `src/components/shell/Footer.tsx`, `src/app/router.tsx`, `src/app/sitemap.ts` — footer'a iletişim bağlantısı ve doğrudan e-posta akışı olan `/iletisim` sayfası eklendi.
- `src/features/home/sections/NewsStrip.tsx`, `src/features/home/sections/UpcomingEvents.tsx`, `src/features/home/sections/RecentListings.tsx` — haber hover rengi beyaz yapıldı, etkinlik tarih bloğu takvim ikonuyla güçlendirildi, son ilan açıklaması kaldırıldı.
- `src/components/shell/Logo.tsx` — üst bardaki Astrohub markasının yanına gri tonlu `(Beta test yayını)` etiketi eklendi.
- `src/features/targets/TargetDetailPage.tsx`, `src/domain/targets/derive.ts`, `src/features/targets/TargetsPage.tsx`, `src/lib/commons.ts` — hedef detaylarında gerçek fotoğraf URL'leri ve hedef görseli fallback'i kullanılır, RA/DEC kopyalanabilir astronomik gösterime alındı, görünür zorluk rozeti/filtresi kaldırıldı ve önerilen odak açıklaması eklendi.
- `src/features/home/sections/TonightPanel.test.tsx`, `src/features/home/sections/tonight/DecisionColumn.test.tsx`, `src/features/home/sections/tonight/TimelineColumn.test.tsx` — yeni gece seçici, servis künyesi temizliği, hedef sıralama ve koşul kartı yoğunluğu testlendi.
- `src/index.css` — hero başlığındaki geniş harf aralığı kaldırıldı.
- `src/components/shell/Footer.tsx`, `src/app/navigation.ts`, `src/app/navigation.test.ts`, `src/features/site/navLinks.ts` — footer tekrar eden modül nav yerine kurumsal bağlantıları gösteriyor.
- `src/features/home/sections/tonight/TimelineColumn.tsx`, `src/features/home/sections/tonight/NightTimelineChart.tsx`, `src/features/home/sections/tonight/TargetsColumn.tsx`, `src/features/home/sections/tonight/DecisionColumn.tsx` — Bu Gece modülünde formül metni kaldırıldı, `Aysız Pencere` etiketi eklendi, zaman metrikleri çakışmayacak grid'e alındı, grafik yükseltildi, hedef türü filtresi kaldırıldı ve hedef listesi 10 objeye çıkarıldı.
- `src/domain/astronomy/nightScore.ts` — gece skoru 4 denetlenebilir girdiye sadeleştirildi: `Bulut örtüsü`, `Seeing`, `Karanlık/Ay`, `Rüzgâr/Çiy`; ayrı `Açıklık`, `Şeffaflık` ve `Ay aydınlığı` satırları kaldırıldı.
- `src/domain/astronomy/nightScore.ts` — karar gerekçesindeki ay satırı `Aysız pencere` metriğine çevrildi; astronomik karanlığın yarısından fazlaysa artı, azsa eksi olarak gösteriliyor.
- `src/components/shell/Logo.tsx`, `src/components/shell/Footer.tsx` — üst bar ve footer logosuna gri `(Beta test yayını)` etiketi eklendi; footer altındaki tekrar eden veri notu kaldırıldı ve telif satırı ana footer satırına taşındı.
- `src/components/shell/Topbar.tsx`, `src/components/ui/EditorialList.tsx` — üst bar yüksekliği yaklaşık %15 artırıldı; haber/yazı liste başlıklarının hover rengi beyaza eşitlendi.
- `src/services/content/activity.ts`, `src/features/activity/ActivityPage.tsx`, `src/app/router.tsx`, `src/features/discover/DiscoverPage.tsx` — takip edilen kullanıcıların fotoğraf/ilan/forum hareketlerinden oluşan `/akis` kişisel aktivite sayfası eklendi; Keşfet'ten erişilir.
- `src/features/profile/ProfilePage.tsx`, `src/features/profile/ProfilePage.test.tsx` — public profil sayfası gerçek `profiles` kaydını okur; fotoğrafı olmayan kullanıcı için profil ve portfolyo bağlantısı görünür.

### Doğrulama

Bu audit/patch diliminden sonra çalışan kapılar:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run check:budgets
npm run build:preview
npm run check:rewrites
npm run check:preview
npm run check:csp
npm run check:a11y
npm run check:viewports
npm run test:e2e
```

Sonuçlar:

- TypeScript ve lint geçti.
- Unit/integration test: **164 dosya / 2041 test geçti.**
- Production build geçti; prerender **490/490 rota** üretti.
- Budget geçti: ilk rota JS **197.2 kB gzip** / bütçe 200 kB, CSS **14.5 kB gzip** / bütçe 25 kB.
- Preview, CSP, erişilebilirlik ve viewport kapıları geçti.
- Viewport kontrolü son ölçümde geçti; 1280×720'de fold üstü içerik **184px**.
- E2E: **28 senaryo geçti**, sayfa hatası yok; ekran görüntüleri `dist-preview/screens/` altında üretildi.
- Radyo public yüzey testi eklendi: kullanıcı tarafında `Sonraki parça` ve Spotify yüzeyi görünmüyor, tek kontrol `Canlı yayın` başlat/duraklat.
- `check:rewrites` geçti: `vercel.json` **159 rewrite** ile güncel.
- Canlı Supabase migration uygulandı ve `nav_links` doğrulandı.
- İlk deploy commit'i `e4d658e` Vercel'de başarıyla deploy edildi; GitHub E2E'de görülen tablo başlığı yarış durumu ikinci patch'te düzeltildi.

Çalışmayan/harici doğrulama isteyen kapılar:

- `npm run check:rls` ve `npm run check:auth` yerel ortamda `DATABASE_URL` olmadığı için çalışmadı. Bunlar üretim/veri tabanı bağlantısıyla ayrıca koşulmalı.
- `npm run build` sırasında sitemap üretimi `VITE_SITE_URL` tanımsız olduğu için yerelde atlandı; Vercel production ortamında bu değişken tanımlı olmalı.
- Yerel Node `v25.9.0`; proje `node: 22.x` istiyor. Bu koşudaki sonuçlar geçerli, ama CI/Vercel Node 22 ile nihai kapı kabul edilmeli.

### Sonraki blokajsız sıra

1. Select-heavy Explorer filtrelerini ve toolbar yoğunluğunu sayfa sayfa sadeleştir.
2. Etkinlik/Haber kart-liste-thumbnail görünümünü aynı sisteme taşı.
3. Galeri ve ilan thumbnail davranışını gerçek canlı veriyle ekran görüntülü doğrula.
4. Canlı hava verisiyle `Bu Gece` bulut/katman yüzdesini prod üzerinde tekrar ekran görüntülü doğrula.
5. `DATABASE_URL` sağlanınca `check:rls` ve `check:auth` kapılarını production DB'ye karşı çalıştır.

### Blokaj veya dış kaynak isteyenler

Radyo gerçek stream, PDF/Word import güvenliği, astronomik survey
thumbnail, Türkiye saha veri araştırması, Vercel production deploy,
gerçek Safari/iOS/Android matrisi ve ödeme/e-posta/analitik gibi
entegrasyonlar ayrı kimlik, servis, veri veya cihaz erişimi gerektirir.
Bu alanlarda kod yazılsa bile gerçek uçtan uca doğrulama olmadan `DONE`
raporlanmayacak.
