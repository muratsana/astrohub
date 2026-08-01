# AstroHub — Uygulama Durumu

> **Bu dosya oturumlar arası DEVAM NOKTASIDIR.** Otomatik devam
> tetikleyicisi (`trig_01FQHAyAR3FHuwNuyDGfC24e`, saatlik) önce bu dosyayı
> okuyup ilk `NOT_STARTED` / `PARTIAL` fazdan devam eder.
>
> Ana görev belgesi:
> `/root/.claude/uploads/82eb6655-3162-599e-957e-95785e4e3696/3a328626-astrohubmasterimplementationprompt.md`
> Bağlamı korumak için belgenin TAMAMI okunmaz; yalnızca çalışılan fazın
> satır aralığı okunur (aşağıdaki tabloda yazılı).

## Durum sözlüğü

Ana talimat §1.2 gereği yalnızca şu durumlar kullanılır ve hiçbiri özet
tabloda `DONE` ile birleştirilmez:

`DONE` · `IMPLEMENTED_DISABLED` · `IMPLEMENTED_BLOCKED_EXTERNAL` ·
`PARTIAL` · `FAILED` · `NOT_STARTED`

## Faz tablosu

| Faz | Konu | Belgedeki satır | Durum |
|---|---|---|---|
| 0 | Envanter, baseline, güvenli ortam | 102–135 | DONE |
| 1 | Veri modeli, Supabase güvenliği, merkezi yapılandırma | 136–257 | PARTIAL¹ |
| 2 | Tek tasarım sistemi ve bütüncül arayüz | 258–355 | DONE |
| 3 | Ana sayfa, navbar, hero, hava durumu | 356–461 | PARTIAL |
| 4 | Ortak arama, filtreleme, sıralama, görünüm | 462–548 | PARTIAL |
| 5 | Bildirim, mesajlaşma, sosyal aktivite | 549–632 | PARTIAL² |
| 6 | Etkinlik takip ve hatırlatma | 633–682 | NOT_STARTED |
| 7 | Çalışan AstroHub Radyo | 683–832 | NOT_STARTED |
| 8 | AstroHub TV ve YouTube'a hazır altyapı | 833–922 | NOT_STARTED |
| 9 | Standart/Premium üyelik altyapısı | 923–1005 | NOT_STARTED |
| 10 | Admin panelinden kodsuz site yönetimi | 1006–1164 | NOT_STARTED |
| 11 | Zorunlu ürün modülleri | 1165–1349 | NOT_STARTED |
| 12 | Organik kullanıcı kazanımı | 1350–1419 | NOT_STARTED |
| 13 | Fotoğraf, Storage, medya mimarisi | 1420–1462 | NOT_STARTED |
| 14 | macOS, tarayıcı, responsive, erişilebilirlik | 1463–1528 | NOT_STARTED |
| 15 | Güvenlik, KVKK, telif, kötüye kullanım | 1529–1606 | NOT_STARTED |
| 16 | Performans, SEO, analitik, gözlemlenebilirlik | 1607–1690 | NOT_STARTED |
| 17 | Test stratejisi ve kabul kriterleri | 1691–… | NOT_STARTED |
| 18 | (belgenin sonu) | …–1956 | NOT_STARTED |

² **Faz 5'in çekirdeği bitti, kenarları duruyor.** Bildirim merkezi,
mesajlaşma ve sosyal graf (takip + engelleme) uçtan uca çalışıyor:
şema + RLS (`0041`–`0044`), servis katmanı, üç yeni ekran ve giriş
noktaları. Kalan iki tablo `collections` (favori/koleksiyon) ve `clubs`
(kulüp/topluluk) — ikisi de §8'in bu bölümünde değil, kendi
bölümlerinde tanımlı ve kendi turlarını hak ediyor. Ayrıntı: Faz 5
bölümü.

¹ **Faz 1'de kodla kapatılabilecek iş kalmadı.** Kalan üç madde ya dış
kaynak ya da bilinçli erteleme: ilçe tohum verisi (resmî TÜİK/NVİ
kaynağı gerekiyor — 973 ilçe adını çevrimdışı üretmek uydurma olurdu),
gerçek cihaz/tarayıcı matrisi (kum havuzunda tek Chromium) ve
`consume_rate_limit`in `app` şemasına taşınması + 129 permissive policy
birleştirmesi (ikisi de Faz 15'e atandı, açık boşluk değil düzen işi).
Otomatik devam turu buradan **Faz 3'e** geçmeli.

## Bilinen ortam kısıtları

- **Otomatik devam oturumlarında MCP araçları yok.** Tetikleyici
  oluşturulurken uyarı verildi: fırlatılan oturumlar `mcp__Supabase__*`
  taşımıyor. Migration'lar bu yüzden dosyaya yazılıp `supabase db push`
  ya da `psql` ile uygulanmalı; MCP `apply_migration` yalnızca elle
  sürülen oturumlarda kullanılabilir.
- **Canlı site karşılaştırması sınırlı.** Kum havuzunda tarayıcı dış
  çıkışı kesik (`ERR_CONNECTION_RESET`); `curl` vekilden geçiyor.
  Ekran doğrulaması için istekler Node üzerinden röle ediliyor.
- **Harici kimlik bilgisi yok:** YouTube OAuth, ödeme sağlayıcısı,
  radyo yayın sunucusu (Icecast/VPS), analitik hesabı. Bu alanlarda
  yalnızca `IMPLEMENTED_BLOCKED_EXTERNAL` seviyesine kadar gidilir.


## Faz 1 — ayrıntı

### 1.1 Merkezî konum ve idari birimler — **PARTIAL**

> **1 Ağustos turu:** tüketiciler bağlandı. Açık kalan tek madde ilçe
> tohum verisi — resmî kaynak erişimi gerektiriyor (aşağıda gerekçesi).

| Madde | Durum | Kanıt |
|---|---|---|
| 81 il veritabanında | DONE | `0040`; canlıda `count(*) = 81` ölçüldü |
| Modül bazında hardcode kaldırılması | DONE | Konum seçici, ilan formu ve profil düzenleme aynı `provinces` kaynağından; serbest metin şehir alanları kalktı |
| İl–ilçe FK | DONE | `districts.province_code → provinces.code` (restrict) |
| Plaka kodu, Türkçe ad, normalize ad, slug, aktiflik, sıra | DONE | Altı kolon da mevcut |
| Türkçe I/İ/Ş/Ğ/Ü/Ö/Ç arama ve sıralama | DONE | `app.tr_normalize` + istemci `normalizeTr`; 14 il adında birebir eşleşme testi |
| "Diğer" gibi bütünlük bozan seçenek | DONE | Yok |
| Yanlışlıkla silinememe | DONE | `provinces_no_delete` tetikleyicisi; canlıda ölçüldü (silme engellendi, pasifleştirme geçti) |
| Idempotent seed | DONE | `on conflict do update`; migration sonunda 81 doğrulaması |
| 81 il testi | DONE | Migration'ın kendi bloğu + canlı ölçüm |
| Tekrar/eksik kod testi | DONE | Migration slug tekrarında düşüyor |
| E2E: bütün dropdown'larda 81 il | DONE | Ölçüm E2E'de DEĞİL, bileşen testinde: önizleme derlemesinde veritabanı yok, orada seçici tohuma düşer ve E2E ölçütü ölçemez. `LocationPicker.test.tsx` kaynağı taklit edip 81 seçeneği sayıyor; E2E ilan formunun seçiciyi doldurduğunu doğruluyor |
| **İlçe tohum verisi** | **NOT_STARTED** | Bilinçli: 973 ilçe adını çevrimdışı üretmek uydurma riski taşıyor. Tablo+FK+RLS hazır; resmî kaynak (TÜİK/NVİ) erişiminde tek `insert` ile dolar. Arayüzde ilçe seçimi olmadığı için hiçbir akış kırık değil. |

### 1.2 Konum modu durum makinesi — **PARTIAL**

> **1 Ağustos turu:** ters kodlama adapter'ı ve çıkış temizliği kapandı.
> Açık kalan tek madde tarayıcı matrisi — kum havuzunda tek Chromium var,
> gerçek cihaz matrisi `IMPLEMENTED_BLOCKED_EXTERNAL`.

**Düzeltilen hata:** belgedeki "manuel seçimden sonra GPS yeniden
etkinleştirilemiyor". Sebep mimariydi — tek `permission` değişkeni hem
tarayıcı iznini hem kullanıcının tercihini taşıyordu; şehir seçmek onu
`dismissed` yapıyor, o da GPS yolunu kalıcı kapatıyordu.

`src/domain/location/mode.ts`: beş mod (`AUTO_GPS`, `MANUAL`, `DENIED`,
`UNAVAILABLE`, `ERROR`), izinden ayrılmış tercih, ayrı `lastGps` /
`lastManual`.

| Madde | Durum | Kanıt |
|---|---|---|
| Beş modlu durum makinesi | DONE | `mode.ts`, 14 test |
| Manuel seçim GPS'i kapatmıyor | DONE | "senaryo 4" testleri |
| Sınırsız geçiş | DONE | 10 turluk gidiş-geliş testi |
| Son manuel ve son GPS ayrı saklanıyor | DONE | `lastManual` / `lastGps` |
| DENIED'dan geri dönüş açık | DONE | `canReturnToAuto` testi |
| İzinsiz prompt tetiklenmiyor | DONE | `shouldPrompt` DENIED'da false |
| GPS düşünce site çökmüyor | DONE | UNAVAILABLE'dan manuel seçim testi |
| Context'e bağlanması | DONE | `LocationContext` durum makinesini tüketiyor; `mode`, `modeLabel`, `canReturnToAuto`, `needsPermissionHelp` dışa veriliyor |
| `setCity` izne dokunmuyor | DONE | Eski kod `permission`ı 'dismissed' yapıyordu — kilit buydu, kaldırıldı |
| GPS hataları ayrıştırıldı | DONE | PERMISSION_DENIED / POSITION_UNAVAILABLE / TIMEOUT ayrı ele alınıyor; eskiden hepsi 'denied' sayılıyordu |
| Arayüzde "Otomatik konuma dön" | DONE | `LocationPicker` moda göre metin veriyor; DENIED'da tarayıcı ayar yönergesi, UNAVAILABLE'da HTTPS notu, ERROR'da tekrar denenebilir |
| Reverse-geocoding adapter | DONE | `domain/location/geocode.ts`: `ReverseGeocoder` arayüzü + yerel çözücü (81 il, haversine). Dışarıya istek YOK — koordinat kişisel veri ve "sunucuya gönderilmez" sözü var. 250 km eşiği: sınır/VPN'de il adı uydurulmuyor (belgedeki 10. senaryo). 14 test |
| Tarayıcı matrisi (Safari/iOS/Android/Edge) | NOT_STARTED | Kum havuzunda tek Chromium var; gerçek cihaz matrisi IMPLEMENTED_BLOCKED_EXTERNAL |
| Çıkışta konum verisi temizliği | DONE | `features/location/storage.ts` + `AuthContext`; temizlik sunucu çağrısından ÖNCE ve koşulsuz — arkasına konduğunda yapılandırma yokken atlanıyordu |
### 1.3 Supabase şema ve RLS denetimi — **PARTIAL**

Tam ölçüm dökümü: **`docs/DATABASE_AND_RLS.md`**. Özet:

| Madde | Durum | Kanıt |
|---|---|---|
| Bütün kullanıcı verisi tablolarında RLS | DONE | 43 tablodan 42'sinde açık; tek istisna PostGIS'in `spatial_ref_sys`'i |
| Koşulsuz `TO authenticated` politikası | DONE | Canlı sorgu **0 satır** — hepsinde sahiplik ya da rol koşulu var |
| `UPDATE`/`ALL` politikalarında `WITH CHECK` | DONE | Canlı sorgu **0 satır** eksik |
| `anon`'a yazma veren politika | DONE | **0 politika** |
| RLS açık ama politikasız tablo | DONE | Yalnızca `edge_rate_limits`; bilinçli "herkese kapalı" — `anon`/`authenticated` `select` yetkisi de ölçüldü: false |
| `SECURITY DEFINER` fonksiyon denetimi | DONE | Bizim tek fonksiyon `consume_rate_limit`; ACL ölçüldü, istemci rollerinde execute **yok**, `search_path` sabit |
| Privileged fonksiyonun kontrollü şemada olması | NOT_STARTED | `consume_rate_limit` hâlâ `public` içinde; `app`'e taşınacak (Faz 15) — açık boşluk değil, düzen işi |
| Belgedeki alan modeliyle karşılaştırma | DONE | 18 tablo mevcut, **20 tablo eksik**; her biri kendi fazına atandı (DATABASE_AND_RLS §Şema boşluğu) |
| `spatial_ref_sys` yazma yetkisi | IMPLEMENTED_BLOCKED_EXTERNAL | `revoke` `postgres` ile sessiz no-op (4→4 ayrıcalık ölçüldü); `supabase_admin` gerekiyor |
| `multiple_permissive_policies` (129) | PARTIAL | Performans uyarısı, güvenlik açığı değil; `OR` birleştirme kapsam genişletme riski taşıdığı için tablo tablo yapılacak (Faz 15) |
| `unindexed_foreign_keys` (31) | PARTIAL | Dolu tablodakiler `0039`'da kapandı; kalanlar boş tablolarda |

Eksik 20 tablo Faz 5, 6, 7, 8, 9, 10 ve 16'nın girdisidir; o fazlarda
RLS'leriyle birlikte oluşturulacak.

---

## Faz 2 — ayrıntı

Tam döküm: **`docs/DESIGN_SYSTEM.md`**.

### 2.1 Design token sistemi — **DONE**

Sisteme token eklemek değil, token'ın etrafından dolaşmayı imkânsız
kılmak gerekiyordu. Ölçülen kaçaklar: `text-[12px]` 113 yerde,
`text-[13px]` 50, `text-[12.5px]` 41, `rounded-[2px]` 21.

| Madde | Durum | Kanıt |
|---|---|---|
| Font ailesi (en fazla bir ana aile) | DONE | Inter tek aile; mono yalnızca gösterge sayısında |
| Başlık ve gövde tipografi ölçeği | DONE | 6 rol sınıfı (`type-hero`…`type-panel`), kırılma noktası sınıfın içinde |
| Font ağırlıkları, satır yükseklikleri | DONE | Her punto token'ı kendi `--line-height`ını taşıyor |
| Renk, yüzey, arka plan seviyeleri | DONE | 3 yüzey + 3 metin kademesi, üç temada da AA |
| Spacing, container genişlikleri | DONE | `--spacing-content`, `--spacing-shell` |
| Radius ölçeği | DONE | Tek değer (2px) — bilinçli; serbest radius sayısı **0** |
| Border kuralları | DONE | `--color-border` / `--color-border-strong` |
| Shadow seviyeleri | DONE | Tek yükselti kademesi (`--shadow-overlay`), temaya göre çevriliyor; üç açılır liste üç ayrı gölge kullanıyordu |
| Breakpoint'ler | DONE | Tailwind varsayılanı — bilinçli, belgede yazılı |
| İkon boyutları | DONE | 3 kademe |
| Form alanı boyutları | DONE | 3 kademe + `--spacing-touch-min` 44px |
| Button / Badge varyantları | DONE | 4 varyant × 3 ölçü · 6 ton |
| Status renkleri | DONE | success / warning / danger |
| Skeleton, loading, empty, error | DONE | `ContentCardSkeleton`, `EmptyState`, `Alert`, `RouteFallback` |
| Modal, drawer, popover, tooltip kuralları | PARTIAL | Katman sırası ve yükselti token'landı, üç açılır liste hizalandı; **`Tooltip` bileşeni yok** — §5.4 "tooltip'e taşınmalı" sınıfı için gerekecek, Faz 11'de |
| Focus, hover, active, disabled, selected | PARTIAL | Focus halkası global, hover/disabled `Button`da, kartta `focus-visible`; `selected` durumu için ortak bir kural yok |
| Serbest punto/radius kaçağı | DONE | Sitede **0** — `designSystem.test.ts` kapıyı tutuyor |

### 2.2 Birleşik kart sistemi — **DONE**

Kart kökü **11 dosyada birebir** kopyalanmıştı; kart görselleri **6 ayrı
orandaydı**; **hiçbir kartın yükleme iskeleti yoktu.**

| Madde | Durum | Kanıt |
|---|---|---|
| Tek `ContentCard` ailesi | DONE | 11 modül geçti; kaynak taraması kopya kök bulmuyor |
| Standart görsel oranı | DONE | 6 → 3 (`standard`/`square`/`wide`), her birinin yazılı gerekçesi var |
| Aynı radius, border, shadow | DONE | Kök tek yerde (`CARD_ROOT`) |
| Ortak başlık ve metadata alanları | DONE | `ContentCardTitle` / `ContentCardMeta` |
| Ortak aksiyon bölgesi | DONE | `ContentCardActions`, `mt-auto` ile hizalı |
| Ortak hover/focus davranışı | DONE | Kökte; `focus-visible:border-primary` |
| Ortak skeleton | DONE | `ContentCardSkeleton` kartın kendi sabitlerini kullanıyor |
| Ortak boş ve kırık görsel fallback'i | DONE | `RemoteImage` üç duruma dayanıklı → `StarField` |
| Uzun başlık taşma kuralları | DONE | `lines={1\|2}`, iki satırda yer **önceden** ayrılıyor |
| Masaüstü/mobil tutarlı yükseklik | DONE | `CardGrid` `auto-rows-fr` + kart `h-full` |
| İçerik tipini gösteren tutarlı badge | DONE | `PlateFrame` rozet yuvası |
| Dağılmayı engelleyen kapı | DONE | Kaynak taraması: kopya kök + kayıt dışı oran |

### 2.3 Alan kullanımı — **DONE**

`scripts/check-viewports.mjs` 11 çözünürlüğü gerçek tarayıcıda ölçüyor.

| Madde | Durum | Kanıt |
|---|---|---|
| 11 çözünürlükte ölçüm aracı | DONE | `npm run check:viewports` |
| Yatay taşma | DONE | 320×568'de 9px taşıyordu (künye 143 + aksiyon 158 > kapsayıcı 288); kelime markası 360px altında düşüyor |
| Dokunmatik hedefler | DONE | `check:a11y` zaten ölçüyor: ikon ≥44px, diğer ≥24px |
| Gereksiz üst bilgi şeritleri | DONE | Hero dikey dolgusu alındı |
| **1280×720 / 1366×768'de fold üstü içerik** | DONE | Faz 3.1'de kapandı: içerik 779px → 583px. Kapı 2 sayfa × 11 çözünürlükte geçiyor |
| Büyük ekranda aşırı yayılma | DONE | `--spacing-content` 1520px; 2560px'te içerik sütunu 1424px'te duruyor (ölçüldü) |
| `check:viewports` kapı zincirinde | DONE | `test:all` içinde |

### 2.4 Gereksiz açıklama metinleri — **DONE**

36 başlık/açıklama çifti §5.4'ün altı sınıfına göre tek tek
değerlendirildi.

| Madde | Durum | Kanıt |
|---|---|---|
| Başlığı tekrar eden açıklamalar | DONE | 4 tanesi kaldırıldı (Astrofotoğrafçılar, Popüler Hedefler, Benzer Fotoğraflar, {katalog} Fotoğrafları) |
| Kartların gösterdiğini tekrar edenler | DONE | 4 tanesi kısaltıldı (Karanlık Gökyüzü, Son İlanlar, Yaklaşan Etkinlikler, Hesabım) |
| Astronomi terimi yardım metinleri korundu | DONE | Hesaplayıcılar, gece planı, forum, hukuki uyarılar dokunulmadı |
| "Tooltip'e taşınmalı" sınıfı | NOT_STARTED | `Tooltip` bileşeni yok; bu sınıfa giren metin de çıkmadı — gerekirse Faz 11 |

---

## Faz 3 — ayrıntı

### 3.1 Navbar üzerindeki hava durumu — **DONE**

| Madde | Durum | Kanıt |
|---|---|---|
| Tekrar eden hava şeridi kaldırıldı | DONE | `StatusBar.tsx` silindi; kabuk 88px → 56px |
| Aynı veri "Bu Gece"de | DONE | Bulut ve seeing orada, çizelgeyle birlikte |
| Gereksiz ağ isteği | DONE | `useSkyConditions` kabuktan çıktı; hava ile ilgisi olmayan sayfalar artık istek kurmuyor |
| Navigasyon hiyerarşisi | DONE | Tek yatay şerit kaldı |
| Konum erişimi korundu | DONE | Üst çubukta (≥sm) ve çekmecede (<sm) |

### 3.2 Boş fotoğraf modülü — **PARTIAL**

`ContentSelection` artık bir `status` alanı taşıyor
(`loading` / `ready` / `error`). Asıl kazanım: sorgu sonuçlanana kadar
**tohum listesi çiziliyordu**, yani kullanıcı bir an kurgu fotoğrafları
gerçek sanıp sonra hepsinin değiştiğini görüyordu.

| Belgedeki durum | Durum | Nerede çözülüyor |
|---|---|---|
| Gerçekten içerik yok | DONE | Otoriter boş sonuç → çağrılı boş durum |
| Veri yükleniyor | DONE | `status === 'loading'` → `ContentCardSkeleton`, ızgara sınıfı gerçek listeyle aynı (CLS yok) |
| İstek hata verdi | DONE | `status === 'error'` → `Alert` + "Yeniden dene"; tohum listesi ÇİZİLMİYOR |
| Görsel dosyası bulunamadı | DONE | `RemoteImage` yıldız alanına iniyor — kırık görsel ikonu hiç çıkmıyor |
| İçerik moderasyonda | DONE | Satır sorgudan zaten dönmüyor (RLS + `status` filtresi); modül için "içerik yok"tan farksız |
| Modül admin tarafından kapalı | NOT_STARTED | `home_modules` tablosu gerekiyor — Faz 10 |
| Boşsa otomatik gizlenme | IMPLEMENTED_DISABLED | `hideWhenEmpty` prop'u yazıldı ve test edildi; **varsayılan kapalı**. Belge gizlemeyi "admin panelinden yönetilebilir" bir davranış olarak tanımlıyor, yani mutlak kural değil tercih. Galeri sitenin çekirdek içeriği: boş olması ilk yükleyecek kişi için fırsat, modülü gizlemek o fırsatı da gizler. Faz 10'da admin anahtarına bağlanacak |
| E2E doğrulaması | NOT_STARTED | Durum ayrımı 10 birim testiyle ölçülüyor; E2E'de yükleme/hata durumunu üretmek ağ kesintisi taklidi gerektiriyor |

**Kendi testimin yakaladığı hata:** ilk yazımda boş-durum dalı hata
dalının ÜSTÜNDEYDİ; okuma düştüğünde kullanıcıya "henüz fotoğraf yok"
deniyordu. Yanlış bilgi, sessiz boşluktan kötü. Sıra düzeltildi.

### 3.3 Hero banner — **PARTIAL**

| Madde | Durum | Kanıt |
|---|---|---|
| Kontroller metnin üzerine gelmiyor | DONE | Ölçüldü: sol ok HER genişlikte `<h1>`e biniyordu (320px'te 36×19, 1920px'te 8×44). Metne güvenli alan verildi; kural `check:viewports`ta ve kaldırıldığında düşüyor (kanıtlandı) |
| Metin için güvenli içerik alanı | DONE | `sm:pl-16 lg:pl-20` — ok 56px'te bitiyor, metin 64px'ten başlıyor |
| Oklar kenar güvenli alanında | DONE | `left-3`/`right-3`, 44×44 |
| Mobilde swipe | DONE | 48px eşikli dokunma kaydırması, 3 test; eşik dikey kaydırmanın doğal yatay salınımını (20–30px) eliyor |
| Mobilde okların kaldırılması | DONE | `hidden sm:flex` — 320px'te iki ok metin sütununun %28'ini yiyordu |
| Klavye ile kontrol | DONE | Sol/sağ ok tuşları |
| Erişilebilir isimler | DONE | `aria-roledescription="carousel"`, göstergeler gerçek `tab` |
| `prefers-reduced-motion` | DONE | Otomatik geçiş hiç kurulmuyor; test var |
| Hover/focus sırasında pause | DONE | Ayrı `hovered` durumu |
| **Otomatik geçişi durdurma** | DONE | `aria-pressed` taşıyan düğme; kullanıcının kararı `hovered`dan AYRI tutuluyor — tek değişken olsaydı fare çekilince gösteri yeniden başlar, düğme çalışmıyormuş gibi görünürdü (test var) |
| Hero ana içeriği aşağı itmiyor | DONE | `check:viewports` 2 sayfa × 11 çözünürlükte geçiyor |
| Görsel–metin kontrast kontrolü | NOT_STARTED | Perde var ama ölçülmedi; fotoğraf değişken olduğu için statik ölçüm yetmez, örnekleme gerekiyor |
| Admin'den yayın tarihi, sıra, odak noktası, metin hizası, CTA | NOT_STARTED | Slaytlar `slides.ts` içinde sabit; `home_modules` tablosunu gerektiriyor — Faz 10 |
| Slider gerçekten gerekli mi | NOT_STARTED | Beş slaytın etkileşim verisi yok; ölçmeden tek hero'ya indirmek tahmin olur |

**Kendi eklediğim regresyon, kendi kapımla yakalandı:** durdurma düğmesi
mobilde CTA'nın altına bindi — §6.3'ün yasakladığı şeyi bu sefer ben
yaptım. Kapı görmedi çünkü seçicisi yalnızca okları kapsıyordu; metin
seçicisi de İKİ KEZ yanlıştı (`h1 ~ * p` kardeş değil,
`h1.closest('div')` yalnızca `Editable` sarmalayıcısı) ve sessizce
yarım ölçüyordu. Üçü de düzeltildi; kural artık carousel bölgesindeki
her düğmeyi ve her metni kapsıyor.

### 3.4 "Bu Gece" astronomi hava modülü — **PARTIAL**

> **1 Ağustos turu:** 18 zorunlu alanın 18'i de dolu. Kalan maddeler
> yalnızca `site_settings`/`home_modules` tablolarına (Faz 10) ve URL'ye
> yazılacak konuma bağlı.

Belgenin zorunlu tuttuğu 18 bilgi alanı tek tek karşılaştırıldı.

| # | Alan | Durum | Nerede |
|---|---|---|---|
| 1 | Seçili konum | DONE | `LocationPicker` panel içinde |
| 2 | Tarih | DONE | Gece seçici + "Bu gece" |
| 3 | Gün batımı / doğumu | DONE | `NightTimelineChart` ekseninin iki ucu |
| 4 | Astronomik alacakaranlık başlangıç/bitiş | DONE | "Karanlık penceresi" okuması |
| 5 | Ay doğuş / batış | DONE | Ay kartı ipucu |
| 6 | Ay fazı ve aydınlanma | DONE | Ay kartı + `MoonDisc` |
| 7 | Sıcaklık | DONE | **Yeni** sıcaklık kartı |
| 8 | Hissedilen sıcaklık | DONE | **Yeni** — `apparent_temperature` |
| 9 | Nem | DONE | Çiylenme kartı ipucu |
| 10 | Çiy noktası ve yoğuşma riski | DONE | Çiylenme kartı + `dewRisk` |
| 11 | Rüzgâr ve hamle | DONE | **Yeni** rüzgâr kartı — veri çekiliyordu ama panelde HİÇ görünmüyordu |
| 12 | Yağış ihtimali | DONE | **Yeni** — bulut kartı ipucunda |
| 13 | Görüş mesafesi | DONE | `layers.visibilityKm` |
| 14 | Genel bulut örtüsü | DONE | Bulut kartı, sol sütunda ana metrik |
| 15 | Alçak/orta/yüksek bulut | DONE | Bulut kartı ipucu |
| 16 | Seeing | DONE | Seeing kartı + `estimateSeeing` |
| 17 | **Transparency** | **DONE** | Önceki gerekçe doğruydu ama eksikti: AOD tahmin ucunda yok, HAVA KALİTESİ ucunda var ve o uç da anahtarsız. `features/weather/airQuality.ts` — 5 kademe + zenit kadir kaybı. Canlı uçtan ölçüldü (1 Ağustos, Ankara: AOD 0.15 → "Berrak", ~0.16 kadir). Ölçüm gelmezse `null` ve skora HİÇ girmiyor; nemden türetilmedi. CSP'ye ayrı host eklendi |
| 18 | Gözlem / astrofotoğraf uygunluk skoru | DONE | `nightScore(inputs, profil)` — gözlem `{seeing .45, konfor .15, karanlık .40}`, astrofoto `{.35, .40, .25}`. Ayrım gerçek: astrofotoda rüzgâr HAMLESİ kullanılıyor (poz birikimli), gözlemde ay cezası ağır (gözün eşiği yok, dar bant gözle çalışmaz). Öneri satırı da profile göre değişiyor. Panelde halka gözlem, altında astrofotoğraf satırı |

**Tarih kontrolleri**

| Madde | Durum |
|---|---|
| Tek sol/sağ ok — bir gün | DONE |
| Çift ok — bir hafta | DONE |
| Manuel tarih seçici | DONE — yerel `<input type="date">`, sınırlar ufuktan |
| "Bugün" kısayolu | DONE — "Bu geceye dön" |
| Klavye erişimi | DONE (düğmeler) |
| Tahmin ufku dışında sahte veri göstermeme | DONE — `FORECAST_DAYS = 16`, ötesinde açıkça "hava verisi yok" |
| Tarih değişince konumu kaybetmeme | DONE |
| URL ile paylaşılabilir tarih | DONE — `?gece=2026-08-08`; offset DEĞİL tarih yazılıyor ki bağlantı ertesi gün başka geceyi göstermesin. Tarayıcıda gidiş-dönüş doğrulandı |
| URL ile paylaşılabilir konum | NOT_STARTED — konum `LocationContext`te, URL'ye bağlı değil |
| Europe/Istanbul + seçili konum zaman dilimi | DONE — gece tarihi IANA diliminde kuruluyor |

**Sağlayıcı katmanı**

| Madde | Durum |
|---|---|
| Adapter katmanı | DONE — meteoblue + Open-Meteo, ortak `SkyConditions` |
| Hata fallback'i | DONE — meteoblue düşerse Open-Meteo |
| Veri kaynağı görünürlüğü | DONE — `source` arayüzde |
| Cache | DONE — 15 dk, `retry` önbelleği atlıyor |
| Rate limit | DONE — meteoblue vekilinde |
| Sağlayıcı seçiminin admin ayarından değişmesi | NOT_STARTED — `site_settings` tablosu gerekiyor (Faz 10) |
| Veri kaynağı ZAMANI görünürlüğü | DONE — panel başlığında "HH:MM güncellendi" olarak duruyor (`DecisionColumn`); durum kaydı bayattı, kod ölçülünce görüldü |

---

## Faz 4 — ayrıntı

**Ölçülen başlangıç durumu:** on liste sayfası, her biri kendi `useState`
filtre durumuyla. Hiçbiri URL'ye yazmıyor, hiçbirinde debounce yok,
sıralama yalnızca üçünde, aktif filtre chip'i ve "hepsini temizle"
hiçbirinde yok.

### Çekirdek — **DONE**

`src/features/explorer/query.ts` saf (React yok, URL yok) ve 31 testle
ölçülüyor; `useExplorer.ts` URL'ye bağlıyor, 7 testle.

| Yetenek | Durum | Not |
|---|---|---|
| Tam metin arama | DONE | |
| Türkçe normalize arama | DONE | `normalizeTr` tek kaynağa indi — ÜÇ kopyası vardı; kural `app.tr_normalize` ile aynı |
| Debounce | DONE | 250 ms; kutu anında, sorgu gecikmeli |
| Sonuç sayısı | DONE | `total` sayfalama öncesi |
| Arama terimini temizleme | DONE | |
| Faceted filtreler + her facet için sayı | DONE | Sayım o facet'in kendi seçimi hariç — yoksa kullanıcı seçimini değiştiremez |
| Çoklu seçim | DONE | Facetler arası VE, değerler arası VEYA |
| Aktif filtre chip'leri | DONE | Motor üretiyordu, HİÇBİR SAYFA ÇİZMİYORDU — tek tüketici testlerdi. `ActiveFilters` yazıldı ve on sayfaya bağlandı; arama terimi de chip |
| Tek tek / tümünü temizleme | DONE | "Tümünü temizle" sıralamayı KORUYOR |
| Filtrelerin URL'ye yazılması | DONE | Varsayılanlar yazılmıyor, yabancı parametre korunuyor |
| Geri/ileri tarayıcı davranışı | DONE | Durum URL'de olduğu için bedava |
| Sayfalama | DONE (istemci) | Aralık dışı sayfa son sayfaya çekiliyor |
| Türkçe alfabetik sıralama | DONE | `Intl.Collator('tr')`; yerelsiz `localeCompare` Ç'yi C'den önce koyuyor (ölçüldü) |
| Null değerlerin kontrollü konumu | DONE | Eksik sayısal değer sona; sıfır sayılmıyor |
| Loading / empty / error | DONE | `ContentSelection.status` (Faz 3.2) |

### Geçiş — **DONE · 10/10**

`adoption.test.ts` sayaç olarak başladı (borç ne saklanabilir ne
büyüyebilirdi), liste boşalınca kapıya dönüştü: kendi filtre durumunu
kuran YENİ bir sayfa artık düşer.

| Sayfa | Not |
|---|---|
| Galeri | ASCII katlama kazandı ("nevsehir" → Nevşehir) |
| Topluluklar | — |
| Saha | HİÇ filtre yoktu; arama + Bortle facet'i + dört sıralama geldi |
| Pazaryeri | Şehir filtresi geldi — ikinci elde elden teslim yaygın |
| Haberler | Kategori paylaşılabiliyor; **arama kutusu 1 Ağustos'ta geldi** — motor destekliyordu, sayfada arayüzü yoktu |
| Yazılar | Seviye + kategori paylaşılabiliyor; **arama kutusu 1 Ağustos'ta geldi** — motor destekliyordu, sayfada arayüzü yoktu |
| Ekipman | **Kısmi ve bilerek**: kategori rota yolunda (`/ekipman/montur`) ve o rotalar prerender ediliyor; sorgu parametresine taşımak verilmiş bağlantıları kırardı. Explorer kategorinin üstünde çalışıyor |
| Etkinlikler | Belgenin istediği gelecek/geçmiş süzgeci geldi; kıyas anı değil GÜNÜ alıyor |
| **Hedefler** | Alaka sıralaması motora eklendikten SONRA taşındı — naif taşıma "m31" aramasında tam eşleşmeyi ilk sıradan düşürürdü |
| **Forum** | Sabitlenmiş konular her sıralamada üstte kalacak şekilde taşındı; bu bir sıralama tercihi değil moderasyon kararı. Dört sıralamada tarayıcıda ölçüldü |

Motora geçiş sırasında eklenen iki yetenek:

| Yetenek | Sebep |
|---|---|
| Boşluk duyarsız arama | Katalog kodları hem "M 31" hem "M31" yazılıyor. Tek başına boşluksuz karşılaştırma yetmiyor — "orion bulutsu" kırılırdı; iki yol birlikte çalışıyor |
| Alaka sıralaması (`relevance`) | Yalnızca arama varken devrede; eşit alakada kullanıcının seçtiği sıralama geçerli |

> **1 Ağustos turu:** mobil çekmece kapandı, aktif filtre chip'leri
> arayüze bağlandı, Haberler ve Yazılar'a arama kutusu geldi. Kalanlar
> tablo görünümü yetenekleri, kaydedilmiş görünümler (tablo gerekiyor)
> ve sunucu tarafı arama.

### Kapsam dışı kalanlar

| Madde | Durum | Sebep |
|---|---|---|
| **Server-side arama/filtre/sayfalama** | NOT_STARTED | Kataloglar bugün tamamı belleğe inen listeler (tohum dizisi ya da birkaç yüz satır); sunucu tarafı sayfalama veri hacmi onu gerektirdiğinde açılır. `ExplorerQuery` sayfa ve sayfa boyutu taşıdığı için ŞEKLİ hazır, ama bugün çalışan şey istemci tarafı ve rapor bunu böyle söylüyor |
| İl/ilçe filtresi | PARTIAL | İl facet olarak çalışıyor; ilçe verisi yok (Faz 1.1) |
| Takip edilenler | PARTIAL | `follows` tablosu Faz 5'te geldi; explorer facet'i olarak henüz bağlanmadı |
| Favoriler | PARTIAL | `collections` Faz 5'te geldi ve "Kaydet" çalışıyor; explorer facet'i olarak henüz bağlanmadı |
| Onay/yayın durumu, premium görünürlük | NOT_STARTED | Faz 9/10 |
| Kaydedilmiş görünümler, kullanıcı varsayılanı, admin paylaşılan görünümü | NOT_STARTED | Tablo gerekiyor — Faz 10 |
| CSV dışa aktarma (yalnız admin) | NOT_STARTED | |
| Sütun SIRASI (sürükle-bırak) | NOT_STARTED | Göster/gizle geldi; sıra değiştirme ayrı bir etkileşim (sürükleme + klavye alternatifi) ve tek başına bir tur |
| Mobil filtre drawer'ı | DONE | `FilterBar`ın kendi içinde: ayrı bir bileşen "tutarsız filtre bileşeni üretme" yasağını çiğnerdi. Çocuklar TEK KEZ çiziliyor (çift `id` olmasın); prerender'da masaüstü varsayılıyor. Odak tuzağı, Escape, gövde kilidi, aktif filtre rozeti. 11 birim + 1 E2E (390px ve 1280px'te gerçek tarayıcıda) |
| Tablo görünümü (sütun göster/gizle, yoğunluk, sabit başlık, başlıktan sıralama) | DONE | `DataTable` vardı ama HİÇBİR SAYFA KULLANMIYORDU (tek eşleşme kendi dosyası). Sıralama motorun `sort` değerine yazılıyor — tablo kendi durumunu tutsaydı ızgaraya geçen kullanıcı sıralamasını kaybederdi. Sabit başlık + sabit ilk sütun, yoğunluk, sütun göster/gizle (`localStorage`), mobilde etiket-değer kartı. Pazaryerinde üçüncü görünüm olarak bağlı. 12 birim + 1 E2E |
| Harita / takvim / zaman çizelgesi görünümleri | PARTIAL | `EventMapPage` ve `EventCalendar` ayrı sayfa olarak var; explorer'ın görünüm seçeneği değiller |
| Görünüm tercihinin hesapta saklanması | PARTIAL | `localStorage`da saklanıyor (görünüm, yoğunluk, gizli sütunlar), hesapta değil — kullanıcı tercihleri tablosu Faz 10 |

---

## Faz 5 — ayrıntı

### 5.1 Sosyal graf (takip + engelleme) — **DONE**

`follows` ve `user_blocks` (`0041`). Takip açık bilgi, engelleme değil:
engellenen kişi engellendiğini tablodan öğrenemiyor. Engelleme takibi
iki yönde de koparıyor. Takipçi sayısı denormalize sayaç kolonu yerine
indeksli `count(*)` ile — sayaç kolonu, kullanıcının kendi profil
satırını güncelleyebildiği bir şemada ayrıca korunması gereken bir alan
demekti.

Arayüz: profil başlığında takip/mesaj/engelle şeridi, hesap
ayarlarında engellenenler listesi.

### 5.2 Bildirim merkezi — **DONE**

`notifications` + altı üretim tetikleyicisi (`0042`). §8.13'ün
karşılığı. `notification_preferences` 0003'ten beri duruyor ve hiçbir
şeyi yönetmiyordu; artık kategori anahtarları gerçekten bildirim
üretimini durduruyor (kontrol tetikleyicinin içinde, istemcinin insaf
ettiği yerde değil).

Arayüz: üst çubukta canlı rozetli zil (`sm` ve üstü; telefonda modül
haritasında), zilden açılan bildirim merkezi paneli (son beş bildirim +
toplu okundu + tam listeye bağlantı), `/bildirimler` sayfası (gelen/arşiv
+ altı kategori sekmesi + toplu okundu) ve aynı sayfada tercih kutusu.
Rozet üst sınırı `99+`; sayı `useUnreadCount` üstünden realtime.

**Panel neden sayfayı öldürmüyor:** §8.1 merkezin ikondan açılmasını
istiyor, panel bunu karşılıyor. Ama altı kategori sekmesini ve arşivi
320px genişliğinde bir kutuya sıkıştırmak kullanılamaz bir ekran
üretirdi — panel hızlı bakış, sayfa yönetim.

**Bilinçli eksikler:** e-posta ve anlık bildirim gönderilmiyor
(sağlayıcı kararı bekliyor — TOPARLAMA §11), sessiz saatler ve toplu
özet yok. Üçü de tercih ekranında KUTU olarak gösterilmiyor; bunun
yerine neden olmadıkları yazıyor. §8.13'ün on maddelik tercih listesi
dörde indi çünkü kalan altısını üretecek tetikleyici henüz yok
(hatırlatma Faz 6, yayın Faz 7/8).

### 5.3 Mesajlaşma — **DONE**

`conversations` + `conversation_participants` + `messages` (`0043`).
Pazaryerinde satıcıya ulaşmanın hiçbir yolu yoktu; ilan detayındaki
"Satıcıya Mesaj Gönder" düğmesi `disabled` duruyordu ve kullanıcılar
iletişimi yorum alanına taşıyordu — tam olarak engellenmek istenen şey.

Çalışanlar: birebir sohbet (tekil), gerçek zamanlı mesaj akışı, okunmamış
sayacı, okundu durumu, sohbet listesi ve sohbet içi arama, düzenleme
(15 dk pencere), yumuşak silme, sessize alma, yazıyor göstergesi
(realtime broadcast — veritabanına yazmıyor), sohbet içinden engelleme
ve raporlama, dakikada 20 mesaj sınırı.

**Okundu durumu ayrı bir tablo değil**, karşı tarafın okuma imleci:
mesajım onun `last_read_at` damgasından eskiyse okunmuş demektir. Mesaj
başına "okundu" satırı tutmak, her mesaj için katılımcı sayısı kadar
satır ve her açılışta bir yazma demekti. "Teslim edildi" diye ayrı bir
kademe YOK — mesaj veritabanına yazıldıysa teslim edilmiştir; arada
kaybolabileceği bir kuyruk yok ve üç kademeli bir gösterge, hep birlikte
gerçekleşen iki durumu ayrıymış gibi gösterirdi.

**Raporlama moderatöre yazışma açmıyor** (`0047`). İlk akla gelen çözüm
`messages` üstüne "moderatör her şeyi görür" politikası eklemekti;
eklenmedi. Tek bir cümle şikâyet edildiğinde aylarca süren özel bir
konuşmanın tamamını moderasyona açmak orantısız bir yetki olurdu. Bunun
yerine rapor eden kişi şikâyet ettiği metni rapor notunda taşıyor:
moderatör tam olarak şikâyet edilen cümleyi görüyor, bir fazlasını
değil.

**Bilinçli eksikler:** medya/ek desteği (ayrı kova + kota işi),
grup sohbeti (şema `kind = 'group'` taşıyor ama arayüzü yok — §8.2 zaten
"çalışmayan grup mesajlaşma düğmesi gösterme" diyor), çevrimiçi/son
görülme. Sonuncusu bir ölçüm sorunu: realtime "presence"
yalnızca aynı sayfayı açık tutanı görür, bunu "çevrimiçi" diye yazmak
uygulamayı kullanan ama bu sohbeti açmamış birini çevrimdışı göstermek
olurdu.

### 5.4 Koleksiyonlar (kaydedilenler) — **DONE**

`collections` + `collection_items` (`0048`). Fotoğraf detayındaki
"Kaydet" ve "Paylaş" çipleri tıklanamayan `<span>`lerdi; ikisi de artık
çalışıyor. Panelde `/panel/kaydedilenler` bölümü açıldı.

Şema adlandırılmış listeleri destekliyor, **arayüz bugün tek koleksiyon
gösteriyor**: varsayılan "Kaydedilenler". İkinci listenin arayüzü gelene
kadar kullanıcıya seçim sunulmuyor — çalışmayan bir "koleksiyona ekle"
menüsü, olmayan bir özelliği varmış gibi göstermekti. Tek tabloyla
başlayıp sonra bölmek ise kullanıcı kayıtlarını taşıyan bir göç
gerektirirdi.

"Paylaş" sunucu gerektirmiyordu ama yine de ölüydü — `navigator.share`,
yoksa panoya kopyalama. "Altyapı bekliyordu" denemez; sadece
yazılmamıştı.

### 5.5 Kalanlar — **NOT_STARTED**

| Madde | Sebep |
|---|---|
| Adlandırılmış koleksiyonlar (birden çok liste) | Şema hazır (`0048`); liste yönetimi arayüzü ayrı bir tur |
| Explorer "favoriler" facet'i | `collection_items` hazır; explorer sorgusuna bağlanması ayrı iş |
| `clubs` (kulüp/topluluk) | §8.11 kurumsal profil — kendi turu |
| Aktivite akışı ("takip ettiklerin ne yaptı") | `follows` hazır; akış sorgusu ve sayfası ayrı bir iş |
| E-posta/push teslimatı | Sağlayıcı kararı **Sen** (TOPARLAMA §11) |

### Ölçüm

Şema davranışı yerel PostgreSQL 16 üzerinde **63 kontrolle** ölçüldü:
bildirim üretimi ve tekilleştirme, tercih kontrolü, engelleme yayılımı,
RLS yalıtımı (anon + üçüncü kullanıcı), kimlik taklidi denemeleri,
düzenleme penceresi, oran sınırı, sert silme reddi, `app` yardımcılarının
yüzeyi, koleksiyon görünürlüğü. `check:rls` matrisine aynı kuralların
32'si eklendi.

**İki güvenlik açığı bu ölçümlerde bulundu ve kapatıldı**, ikisi de
"yazdım demek kapattım demek değil" kategorisinden:

· `0045` — `app.notify` ve dört kardeşi istemciye açık kalmıştı.
  `notifications` tablosunda `insert` yetkisi vermemenin tek anlamı
  "bildirim üretimi kapalı" idi; `app.notify` çağrılabilir olduğu sürece
  o karar bir kapıyı kilitleyip yanındaki pencereyi açık bırakmaktı.
  (PostgREST `app` şemasını açmadığı için sömürülebilir değildi.)
· `0046` — `0044`ün `PUBLIC`ten revoke'u yetmiyordu: Supabase `public`
  şeması için `anon`a AÇIK grant veren varsayılan ayrıcalık tanımlıyor.
  Denetçi ısrar edince `proacl` okundu ve fark göründü.

Arayüz tarafında 40 yeni birim testi (bildirim listesi, bildirim paneli
ve mesajlaşma — üçü de oturum açık hâlleriyle) ve `relativeTime` için
7 test. `test:all`
tamamı geçiyor; JS bütçesi 190.9/200 kB (bildirim paneli üst çubukta
olduğu için ana pakete giriyor — 0.6 kB).

**Migration listesi:** `0041` sosyal graf · `0042` bildirimler ·
`0043` mesajlaşma · `0044`+`0046` RPC yüzeyi · `0045` `app` yardımcıları ·
`0047` mesaj raporlama · `0048` koleksiyonlar. Sekizi de uzak projeye
uygulandı.

---

## Sonraki oturum için devam notu

**Bittiği yer:** Faz 2 kapandı. Faz 3'ün 3.1'i kapandı; 3.2, 3.3 ve
3.4'ün ölçülebilir tamamı bitti. Faz 3'te kalanlar iki kümede
toplanıyor:
  · **Faz 10'a bağlı** (tablo gerektiriyor): hero slaytlarının admin
    yönetimi, "boşsa gizle" anahtarı, hava sağlayıcı seçimi.
  · **Bağımsız, yapılabilir**: tarih kontrolleri (çift ok, manuel seçici,
    "Bugün", URL'de paylaşılabilir tarih), iki ayrı uygunluk skoru,
    `observedAt`ın arayüzde gösterilmesi.

Faz 4'ün geçişi BİTTİ (10/10). Faz 4'te kalanlar tablo ya da ürün
kararı bekliyor (kaydedilmiş görünümler, CSV, tablo görünümü, mobil
filtre drawer'ı, sunucu tarafı sayfalama).

**Faz 5'in çekirdeği kapandı** (bkz. Faz 5 bölümü): altı yeni tablo
(`follows`, `user_blocks`, `notifications`, `conversations`,
`conversation_participants`, `messages`, `collections`,
`collection_items`), sekiz migration (`0041`–`0048`), üç yeni ekran ve
panelde bir yeni bölüm. Migration numaraları `0049`dan devam ediyor.

Faz 5'te kalan tek tablo `clubs`; §8.11'in konusu ve kendi turunu hak
ediyor.

**Sıradaki iş için üç aday:**
  · **Faz 6 — etkinlik takip ve hatırlatma** (satır 633–682). `reminders`
    tablosu gerekiyor ve bildirim altyapısı artık hazır: hatırlatma
    tetikleyicisi `app.notify(…, 'event_reminder', …)` çağırmakla
    yetinecek.
  · **`collections`** — explorer'ın "favoriler" facet'ini açar ve
    fotoğraf detayındaki "kaydet" düğmesini gerçek yapar.
  · **Aktivite akışı** — `follows` hazır; "takip ettiklerin ne yaptı"
    akışı §8'in kalan parçası.

**Faz 3 için hazır bilgi:**
- `check:viewports` artık `test:all` içinde ve geçiyor; ana sayfayı
  büyüten her değişiklik kapıda düşer. 1280×720 payı: içerik 583px'de,
  eşik 600px (720 − 120).
- Hero yüksekliğini `min-h` değil İÇERİK belirliyor.
- `ContentSelection.status` (`loading`/`ready`/`error`) artık her katalog
  kancasında var. Diğer ana sayfa şeritleri (`RecentListings`,
  `UpcomingEvents`, `DarkSkyStrip`) hâlâ bu ayrımı yapmıyor — aynı
  desenle bağlanabilirler.

**Çalışma yöntemi** (bu oturumda işe yaradı):
- Master belgeyi TAMAMEN okuma; yalnızca faz satır aralığını oku
- Her veritabanı kuralını canlıda `raise exception` ile GERİ ALINAN
  işlemde ölç — iddia etme
- Arayüz iddialarını gerçek tarayıcıda `getBoundingClientRect` ile ölç;
  ölçüm aracının kendi kusurunu ürünün kusuru sanma (galeride "ilk blok
  1979px" böyle bir yanlış alarmdı)
- Her faz sonunda `npm run test:all`, sonra commit + push
- Durum belgesini her fazda güncelle

**Çalışma yöntemi** (bu oturumda işe yaradı):
- Master belgeyi TAMAMEN okuma; yalnızca faz satır aralığını oku
- Her veritabanı kuralını canlıda `raise exception` ile GERİ ALINAN
  işlemde ölç — iddia etme
- Her faz sonunda `npm run test:all`, sonra commit + push
- Durum belgesini her fazda güncelle
