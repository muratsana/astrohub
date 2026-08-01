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
| 1 | Veri modeli, Supabase güvenliği, merkezi yapılandırma | 136–257 | PARTIAL |
| 2 | Tek tasarım sistemi ve bütüncül arayüz | 258–355 | PARTIAL |
| 3 | Ana sayfa, navbar, hero, hava durumu | 356–461 | NOT_STARTED |
| 4 | Ortak arama, filtreleme, sıralama, görünüm | 462–548 | NOT_STARTED |
| 5 | Bildirim, mesajlaşma, sosyal aktivite | 549–632 | NOT_STARTED |
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

| Madde | Durum | Kanıt |
|---|---|---|
| 81 il veritabanında | DONE | `0040`; canlıda `count(*) = 81` ölçüldü |
| Modül bazında hardcode kaldırılması | PARTIAL | `provinces` servisi kuruldu; tüketici modüller Faz 2'de bağlanacak |
| İl–ilçe FK | DONE | `districts.province_code → provinces.code` (restrict) |
| Plaka kodu, Türkçe ad, normalize ad, slug, aktiflik, sıra | DONE | Altı kolon da mevcut |
| Türkçe I/İ/Ş/Ğ/Ü/Ö/Ç arama ve sıralama | DONE | `app.tr_normalize` + istemci `normalizeTr`; 14 il adında birebir eşleşme testi |
| "Diğer" gibi bütünlük bozan seçenek | DONE | Yok |
| Yanlışlıkla silinememe | DONE | `provinces_no_delete` tetikleyicisi; canlıda ölçüldü (silme engellendi, pasifleştirme geçti) |
| Idempotent seed | DONE | `on conflict do update`; migration sonunda 81 doğrulaması |
| 81 il testi | DONE | Migration'ın kendi bloğu + canlı ölçüm |
| Tekrar/eksik kod testi | DONE | Migration slug tekrarında düşüyor |
| E2E: bütün dropdown'larda 81 il | NOT_STARTED | Tüketici modüller bağlanmadan ölçülemez (Faz 2) |
| **İlçe tohum verisi** | **NOT_STARTED** | Bilinçli: 973 ilçe adını çevrimdışı üretmek uydurma riski taşıyor. Tablo+FK+RLS hazır; resmî kaynak (TÜİK/NVİ) erişiminde tek `insert` ile dolar. Arayüzde ilçe seçimi olmadığı için hiçbir akış kırık değil. |

### 1.2 Konum modu durum makinesi — **PARTIAL**

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
| Reverse-geocoding adapter | NOT_STARTED | — |
| Tarayıcı matrisi (Safari/iOS/Android/Edge) | NOT_STARTED | Kum havuzunda tek Chromium var; gerçek cihaz matrisi IMPLEMENTED_BLOCKED_EXTERNAL |
| Çıkışta konum verisi temizliği | NOT_STARTED | — |
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

### 2.3 Alan kullanımı — **PARTIAL**

`scripts/check-viewports.mjs` 11 çözünürlüğü gerçek tarayıcıda ölçüyor.

| Madde | Durum | Kanıt |
|---|---|---|
| 11 çözünürlükte ölçüm aracı | DONE | `npm run check:viewports` |
| Yatay taşma | DONE | 320×568'de 9px taşıyordu (künye 143 + aksiyon 158 > kapsayıcı 288); kelime markası 360px altında düşüyor |
| Dokunmatik hedefler | DONE | `check:a11y` zaten ölçüyor: ikon ≥44px, diğer ≥24px |
| Gereksiz üst bilgi şeritleri | DONE | Hero dikey dolgusu alındı |
| **1280×720 / 1366×768'de fold üstü içerik** | **NOT_STARTED** | Ölçüldü: içerik 769px'de başlıyor, fold 720/768. Hero'nun `min-h`i bağlayıcı kısıt değilmiş — içeriğinin yeniden düzenlenmesi gerekiyor ve bu **Faz 3**'ün konusu |
| Büyük ekranda aşırı yayılma | NOT_STARTED | Ölçüm eklendi ama eşik konmadı |
| `check:viewports` kapı zincirinde | NOT_STARTED | Bilinçli: yukarıdaki madde açıkken zincire eklemek kapıyı yalancı yapardı |

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

## Sonraki oturum için devam notu

**Bittiği yer:** Faz 2'nin 2.1, 2.2 ve 2.4'ü kapandı; 2.3 ölçüldü ve
yarısı kapandı. Sıradaki iş **Faz 3 — ana sayfa, navbar, hero, hava
durumu** (belge satır 356–461).

**Faz 3'e devredilen ölçülmüş iş** (yeniden keşfetmeye gerek yok):
- Ana sayfada içerik 1366px ve altında fold'un altında başlıyor.
  1280×720 ölçümü: kabuk 88 · başlık altı 348 · içerik 769 · ekran 720.
- Hero yüksekliğini `min-h` belirlemiyor, İÇERİK belirliyor: üç satırlık
  48px başlık + açıklama + düğme. Küçültmek için başlık ölçeği ya da
  carousel yapısı değişmeli.
- Ana sayfada hero'nun hemen altında bir konum izni şeridi ve bir konum
  çubuğu var; ikisi birlikte ~85px. Fold hesabına dahil.
- Faz 3 bitince `check:viewports` `test:all` zincirine eklenmeli.

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
