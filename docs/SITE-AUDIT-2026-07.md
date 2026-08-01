# Astrohub — Site Denetimi (Temmuz 2026)

Bu belge, `claude/site-audit-improvements-fmysk3` dalında yapılan tam kapsamlı
denetimin bulgularını, uygulanan düzeltmeleri ve kalan işleri kaydeder.
Referans: [Ürün/UI/Teknik Şartname](./ASTROHUB_PRODUCT_UI_TECHNICAL_SPEC.md).

Denetim kapsamı: bilgi mimarisi (§5), tasarım sistemi (§6), sayfa şartnamesi
(§7), güvenlik/KVKK (§15), arama/SEO/PWA/erişilebilirlik/performans (§16),
test (§17), URL yapısı (§20) ve kabul kriterleri (§19).

---

## 1. Denetim öncesi durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 46 test |
| `npm run build` | ⚠️ tek parça 740 kB JS (uyarı veriyordu) |

Kod kalitesi iyi durumdaydı; bulguların çoğu **eksik iş**, hatalı iş değil.

---

## 2. Bulgular

Önem sırasına göre. Durum sütunu: ✅ bu dalda düzeltildi · ⏭️ yol haritasında
(backend/3. parti bağımlılığı var).

### 2.1 Kritik — kullanıcıyı doğrudan etkileyen

| # | Bulgu | Kanıt | Durum |
| --- | --- | --- | --- |
| K1 | **Footer'daki üç hukuki bağlantı 404'e düşüyordu.** `/kvkk`, `/kullanim-kosullari`, `/hakkinda` footer'da vardı ama router'da yoktu. KVKK aydınlatma metni Türkiye'de yasal zorunluluk (§15.7). | `Footer.tsx` ↔ `router.tsx` | ✅ |
| K2 | **Üst bardaki arama butonu ölüydü** — `onClick` yok. Şartname §16.1 dokuz içerik türünü tarayan tek arama kutusu istiyor. | `Topbar.tsx` | ✅ |
| K3 | **Tema butonu ölüydü** — §19.7 "koyu varsayılan, açık opsiyonel" diyor; açık tema hiç yoktu. | `Topbar.tsx`, `index.css` | ✅ |
| K4 | **§5.2 menü grupları erişilemiyordu.** Keşfet/Harita/Araçlar altındaki 17 alt sayfanın çoğuna üst menüden ulaşılamıyordu. | `navigation.ts` | ✅ |
| K5 | **Hata sınırı yoktu.** Router'da `errorElement` tanımlı değildi; herhangi bir render hatası tüm uygulamayı boş ekrana düşürürdü. | `router.tsx` | ✅ |

### 2.2 Yüksek — SEO ve performans

| # | Bulgu | Kanıt | Durum |
| --- | --- | --- | --- |
| Y1 | **Route başına `<title>`/meta yoktu.** SPA gezinmesinde başlık hiç değişmiyordu; her sayfa aynı başlık ve açıklamayla indekslenirdi. §16.2'nin tamamı eksikti. | tüm sayfalar | ✅ |
| Y2 | **Yapılandırılmış veri (JSON-LD) yoktu.** §16.2 Event, Article, ImageObject, Place, BreadcrumbList, Organization istiyor. | — | ✅ |
| Y3 | **Rota bazlı kod bölme yoktu.** §16.4 açıkça istiyor; derleme tek parça 740 kB JS üretiyordu. | build çıktısı | ✅ |
| Y4 | **Supabase SDK'sı ilk yüklemeye giriyordu** (~245 kB). Giriş yapmamış ziyaretçi ana sayfa için indiriyordu. | `client.ts` | ✅ |
| Y5 | **`robots.txt` ve `sitemap.xml` yoktu.** Panel/admin/auth sayfaları indekslemeye açıktı. | `public/` | ✅ |
| Y6 | **PWA manifesti yoktu** — README yığında PWA diyor, `public/` yalnızca favicon içeriyordu (§16.3). | `public/` | ✅ |
| Y7 | **Canonical/OG etiketleri yoktu** — paylaşım önizlemeleri ve kopya içerik riski. | — | ✅ |

### 2.3 Orta — erişilebilirlik ve navigasyon

| # | Bulgu | Kanıt | Durum |
| --- | --- | --- | --- |
| O1 | **"İçeriğe atla" bağlantısı yoktu.** `<main id="icerik">` vardı ama hedefleyen bağlantı yoktu; klavye kullanıcısı her sayfada tüm menüyü geçmek zorundaydı (§6.7). | `AppShell.tsx` | ✅ |
| O2 | **Mobilde "+" yükleme aksiyonu ve "Daha Fazla" çekmecesi yoktu** (§5.3). Alt navigasyona sığmayan tüm modüller mobilde erişilemezdi. | `MobileNav.tsx` | ✅ |
| O3 | **Mobil "Profil" sekmesinde mezuniyet şapkası ikonu** kullanılıyordu — anlamsız eşleşme. | `MobileNav.tsx` | ✅ |
| O4 | **404 sayfası genel placeholder'dı** — kullanıcıyı çıkmazda bırakıyordu, `noindex` yoktu. | `router.tsx` | ✅ |
| O5 | **`/araclar` boş placeholder'dı** — araç listesine giriş noktası yoktu. | `router.tsx` | ✅ |

### 2.4 Düşük — yapı ve bakım

| # | Bulgu | Durum |
| --- | --- | --- |
| D1 | Eğitim ve pazaryeri verisi sayfa dosyalarının içine gömülüydü; diğer modüllerin `data.ts` deseniyle tutarsızdı ve arama indeksine alınamıyordu. | ✅ |
| D2 | `vite.preview.config.ts` hiçbir tsconfig projesine dahil değildi — typecheck'ten tamamen kaçıyordu. | ✅ |
| D3 | §20'deki 6 URL deseni router'da yoktu: `/ekipman/:brand/:slug`, `/setup/:id`, `/panel/*` alt sayfaları, `/admin`, `/tesisler`, `/araclar/*` alt araçları. | ✅ |
| D4 | Navigasyon bağlantılarının route'larla tutarlılığını koruyan bir test yoktu (K1'in kök nedeni). | ✅ |

### 2.5 Düzeltme sırasında ortaya çıkan hata

**Katalog kodu araması boşluk duyarlıydı.** Arama testleri yazılırken bulundu:
hedef verisinde katalog kodları `"M 31"` biçiminde tutuluyor, kullanıcı ise
`M31` yazıyor — hiçbir sonuç dönmüyordu. Arama artık her alanın boşluksuz bir
kopyasını da tutuyor; iki yazım da aynı sonucu veriyor (tam yazım sıralamada
önde kalır). Regresyon testiyle kilitlendi.

---

## 3. Uygulanan geliştirmeler

### 3.1 Global arama (§16.1) — yeni

`src/features/search/`

- Dokuz kategoriyi tarayan tek indeks: fotoğraf, hedef, kullanıcı, ekipman,
  etkinlik, gözlem noktası, eğitim içeriği, ilan.
- **Türkçe duyarlı normalizasyon:** `İSTANBUL`, `istanbul`, `Istanbul` aynı
  anahtara iner; `ışık` ≡ `isik`. Klavye düzeni farkı sonucu değiştirmez.
- **Boşluksuz katalog eşleşmesi:** `M31` ≡ `M 31`, `NGC7000` ≡ `NGC 7000`.
- Alaka sıralaması: başlık başlangıcı > başlık içi > yan alanlar.
  Çok kelimeli sorguda tüm terimler eşleşmeli (AND).
- Sonuçlar kategori başlıklarıyla gruplanır; kategori sırası sabittir.
- **⌘K / Ctrl+K** kısayolu, ↑↓ gezinme, ↵ açma, Esc kapatma;
  `role="listbox"` + `aria-activedescendant` ile ekran okuyucu desteği.
- Katman **tembel yüklenir** — indeks tüm modüllerin verisini içerdiği için
  ilk yüklemeye girmez.

### 3.2 SEO altyapısı (§16.2)

- `PageMeta` bileşeni — React 19 belge metadata'sını kullanır, ek bağımlılık
  yok. Her sayfaya başlık, açıklama, canonical ve OG etiketleri.
- **JSON-LD:** Organization (ana sayfa), ImageObject (fotoğraf detayı),
  Event (etkinlik detayı), Place (gözlem noktası), BreadcrumbList (tüm detay
  ve liste sayfaları).
- `robots.txt` — panel, admin, auth ve yükleme akışı indekslemeye kapalı.
- `sitemap.xml` — derleme sırasında üretilir, 58 URL.
- Panel, yükleme sihirbazı, auth sayfaları ve 404 `noindex` alır.

> **Not:** Canonical/OG ve sitemap üretimi `VITE_SITE_URL` ortam değişkenine
> bağlıdır. Değişken tanımlı değilse mutlak URL **hiç basılmaz** ve sitemap
> üretilmez — yanlış alan adı yayımlamak, etiketi atlamaktan daha zararlıdır.

### 3.3 Performans (§16.4)

Rota bazlı kod bölme + satıcı chunk'ları + Supabase SDK'sının tembel yüklenmesi.

| | Önce | Sonra |
| --- | --- | --- |
| İlk yükleme JS (ham) | 740 kB | 367 kB |
| İlk yükleme JS (gzip) | 213 kB | ~117 kB |
| Uygulama kabuğu chunk'ı | — (tek parça) | 50 kB |
| Chunk sayısı | 1 | 40+ (talep üzerine) |

Supabase SDK'sı (215 kB) artık yalnızca kimlik doğrulama gerçekten
kullanıldığında indirilir. Satıcı chunk'ları ayrı tutulduğu için uygulama
kodu değiştiğinde kullanıcı React/router'ı yeniden indirmez.

`ObjectStorageAdapter.getPublicUrl` bu nedenle asenkron imzaya geçti.

### 3.4 Navigasyon (§5.1–5.3)

- **Masaüstü açılır menüler:** Keşfet, Harita, Araçlar grupları açıklamalı alt
  menülerle. Yayında olmayan bölümler "Yakında" rozetiyle işaretli — kullanıcı
  tıklamadan önce ne bulacağını biliyor. Hover + tıklama + Esc + dışarı tıklama.
- **Mobil:** ortada belirgin "+" yükleme aksiyonu ve tüm modülleri içeren
  "Daha Fazla" çekmecesi (arama girişi ve Profil/Üye Paneli üstte).
- **Bilinçli sapma:** Şartname §5.3 mobil çubukta beş giriş öneriyor; buna "+"
  ve çekmece tetikleyicisi eklenince 360 px genişlikte yedi hücre etiketleri
  kırpıyordu. Çubukta dört ana giriş + "+" + "Daha Fazla" tutuldu; Profil,
  çekmecenin en üstünde birincil satır olarak sunuluyor.

### 3.5 Yeni sayfalar

| Sayfa | İçerik |
| --- | --- |
| `/kvkk` | KVKK aydınlatma metni — işlenen veriler, konum/EXIF davranışı, işleme amaçları, çerezler, saklama süreleri, aktarım, ilgili kişi hakları (§15.7) |
| `/kullanim-kosullari` | Üyelik hakları, kota, ödemesiz süre, telif/lisans, AI beyanı, topluluk kuralları (§4, §15.4–15.6) |
| `/hakkinda` | Ürün vizyonu, ilkeler, kapsam ve geliştirme durumu (§3) |
| `/araclar` | Araç listesi — menü yapılandırmasından beslenir, çift bakım yok |
| 404 | Ana modüllere yönlendiren, `noindex` alan gerçek 404 |
| Hata ekranı | Router `errorElement` — yenileme ve ana sayfa çıkışı |

Hukuki metinlerdeki sayısal sınırlar (50 fotoğraf, 10 taslak, 14 gün ödemesiz
süre) domain katmanından okunur — kural tek yerde değişir, metin otomatik
güncel kalır.

> **Uyarı:** KVKK ve Kullanım Koşulları metinleri şartnamedeki veri işleme
> kararlarını yansıtan **taslaklardır**. Ticari yayın öncesi hukuk danışmanı
> incelemesi gerekir; sayfalarda bu uyarı görünür biçimde yer alıyor.

### 3.6 Erişilebilirlik (§6.7)

- "İçeriğe atla" bağlantısı (yalnızca odakta görünür).
- Arama katmanı tam klavye desteği + doğru ARIA rolleri.
- Açılır menüler `aria-expanded` / `aria-haspopup`.
- Tema butonu `aria-pressed` ve duruma göre değişen etiket.
- Kod bölünmüş rotalarda `aria-live` ile yükleme duyurusu; iskelet yüksekliği
  sabit tutulduğu için düzen kaymıyor (CLS — §16.5).

### 3.7 Tema (§19.7)

Açık tema, tüm renk token'larının WCAG AA hedefine göre yeniden atanmasıyla
eklendi (amber vurgu açık zeminde koyultuldu). Seçim `localStorage`'da
saklanır; seçim yoksa işletim sistemi tercihi canlı takip edilir.
`index.html`'deki küçük satır içi betik temayı React yüklenmeden uygular —
açık tema seçen kullanıcı ilk boyamada koyu ekran "flash"ı görmez.

### 3.8 Test (§17.1)

46 → **65 test**. Yeni kapsam:

- `search.test.ts` (14) — normalizasyon, gruplama, sıralama, AND semantiği,
  Türkçe karakter denkliği, boşluksuz katalog eşleşmesi, indeks bütünlüğü.
- `navigation.test.ts` (5) — **her menü/footer/çekmece bağlantısının router'da
  karşılığı olduğunu doğrular.** K1 bulgusunun bir daha oluşmasını engeller.
  Ayrıca §5.1 menü sırası, §5.2 grup yapısı ve §5.3 mobil hücre sayısı.

---

## 4. Kalan işler

Bunlar bu dalda kapatılamaz — üçüncü parti hesap, veri lisansı veya backend
gerektiriyor.

### 4.1 Hesap ve backend bağımlı

| İş | Şartname | Engel |
| --- | --- | --- |
| Kimlik doğrulama, profil, oturum | §4, §7.15 | Supabase projesi (kod hazır, ortam değişkeni bekliyor) |
| Fotoğraf yükleme pipeline'ı: EXIF okuma, türev üretimi, imzalı URL | §10 | Object storage + Edge Function |
| Üyelik ve ödeme, webhook idempotency | §4, §14.5 | Ödeme sağlayıcısı |
| Kota zorlaması (DB fonksiyonu + RLS) | §4.2, §15.1 | Migration 3+ |
| Admin paneli ve moderasyon kuyrukları | §13, §19.6 | Rol tablosu + RLS |
| Bildirimler (e-posta/push) | §8.13, §14.6 | E-posta sağlayıcısı — **site içi bildirim merkezi Faz 5'te açıldı**; eksik olan yalnızca teslimat kanalı |
| Global aramanın sunucuya taşınması | §11.4 | Postgres FTS; `searchAll` imzası korunacak şekilde tasarlandı |

### 4.2 Harita ve dış veri bağımlı

| İş | Şartname | Engel |
| --- | --- | --- |
| Tam ekran etkileşimli harita (Leaflet) | §7.7 | Tile sağlayıcı lisansı |
| Işık kirliliği katmanı + kaynak atfı | §14.1 | Veri lisansı |
| "Bu Gece Gökyüzünde", Ay/karanlık takvimi | §7.9, §14.2 | Efemeris servisi |
| Hava servisi entegrasyonu | §14.3 | Servis hesabı |
| Canlı SQM / All-Sky ağı | §8.7 | Faz 3 |

### 4.3 Ürün geliştirmesi (bağımlılıksız)

Bu başlıktaki işlerin çoğu **27 Temmuz gecesi tamamlandı** (bkz. §6). Kalanlar:

| İş | Şartname | Not |
| --- | --- | --- |
| Kulüp/topluluk kurumsal profilleri | §8.11 | Faz 2 |
| İşleme laboratuvarı / FITS analizi | §7.14 | Faz 3 |
| Teknik sorun teşhis merkezi | §8.12 | Faz 3 |
| Astrotrip rota planlayıcı | §8.10 | Faz 3 |
| Piksel bazlı görsel regresyon | §17.2 | CI ortamı sabitlenmeden referans görüntü commit'lemek sürekli kırmızı yanan bir teste dönüşür; şimdilik ekran görüntüsü kaydı + sayısal düzen denetimi var |

### 4.4 Yayın öncesi zorunlu

1. **`VITE_SITE_URL` ayarlanmalı** — yoksa canonical/OG etiketleri basılmaz ve
   sitemap üretilmez.
2. **Hukuki metinler hukuk danışmanı incelemesinden geçmeli** — veri sorumlusu
   kimliği, başvuru kanalı, uyuşmazlık maddeleri eksik.
3. ~~`robots.txt` içindeki `Sitemap:` satırı~~ — mutlak URL yazılı (tamam).
4. ~~PWA ikonları~~ — 192/512 px PNG + 512 maskable + apple-touch-icon
   mevcut ve manifest'e bağlı (tamam). Service worker de eklendi (§6.8).
5. **`st_estimatedextent` yetkisi** — PostGIS fonksiyonu `anon`/`authenticated`
   rollerine açık ve yetkiyi `supabase_admin` verdiği için migration rolünün
   `revoke`'u etkisiz kalıyor (PostgreSQL'de revoke yalnızca çağıran rolün
   verdiği yetkiyi kaldırır). Supabase dashboard/destek üzerinden
   `supabase_admin` rolüyle geri alınmalı. Kalan risk sınırlı: fonksiyon
   yalnızca istatistikten kapsam tahmini döndürür, veri satırı vermez.

---

## 5. Denetim sonrası durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız (artık önizleme config'i de dahil) |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 65 test (46 → 65) |
| `npm run build` | ✅ uyarısız, 40+ chunk, ilk yükleme %45 daha hafif |
| Ölü bağlantı | ✅ yok (testle kilitli) |

---

## 6. İkinci tur — 27 Temmuz gecesi

Denetimin "kalan işler" listesindeki bağımlılıksız maddeler kapatıldı.

### 6.1 Yeni araçlar (§7.12, §7.9–7.10)

| Araç | Adres | Ne yapar |
| --- | --- | --- |
| Mozaik planlayıcı | `/araclar/mosaic` | Panel sayısı, adım aralığı, kapsanan alan, süre ve gece sayısı; kadraj yönünü otomatik seçer |
| Setup uyumluluk | `/araclar/setup-uyumluluk` | Montür yükü (%60 görüntüleme payı), backfocus (filtre = kalınlık/3), seeing'e bağlı örnekleme, guide ölçeği |
| Karanlık takvimi | `/araclar/takvim` | Aylık **aysız karanlık süre** ızgarası, gece kalite puanı, ayın en iyi üç gecesi |
| Bu gece | `/bu-gece` | Hedefler zirve yüksekliğine değil, 30° üstünde kaldıkları süreye göre sıralı; yükseklik eğrileri |
| Gece planlayıcı | `/planlayici` | "En erken biten önce" ile çakışmasız program; plana giremeyenler gerekçesiyle listelenir |

FOV hesaplayıcı bu üç araçla aynı yerleşime taşındı ve **kadraj önizlemesi**
kazandı: hedefin kadraja sığıp sığmadığı bir bakışta görülüyor.

### 6.2 Yeni sayfalar

| Sayfa | Not |
| --- | --- |
| `/etkinlikler` takvim görünümü | Çok günlü etkinlikler her gününde görünür; takvim ilk etkinliğin ayında açılır |
| `/etkinlikler/harita` | Tile sağlayıcısı yok; şematik dağılım + kuş uçuşu mesafeye göre sıralı liste ("harita" iddiası taşımıyor) |
| `/ekipman/:brand/:slug` | Model künyesi, bu ekipmanla çekilen fotoğraflar, ikinci el ilanları, aynı sınıftaki alternatifler |
| `/ilan/:slug` | Fiyat bağlamı (kategori medyanı), satıcı geçmişi, güvenlik uyarıları; doğrudan iletişim ve "güvenli ödeme" iddiası bilinçli olarak yok |
| `/cerezler` | Tarayıcıda gerçekten saklanan verilerin listesi ve tek tıkla silme |
| `/{sehir}-astronomi-etkinlikleri` | On beş şehir için üretilmiş SEO sayfaları; tanımsız şehir 404 alır |

### 6.3 Fotoğraf sürümleri (§8.1)

Sürüm geçmişi, öncesi/sonrası sürgüsü (klavyeyle de çalışır) ve aynı hedefin
iki kaydı arasında teknik fark tablosu. Kota kuralı domain katmanında:
sürümler 50'lik kotada ayrı fotoğraf sayılmaz.

### 6.4 Dayanıklılık ve güvenlik

- **lazyWithRetry** — yeni sürüm yayına alındığında silinen chunk'lar
  yüzünden açık sekmede oluşan hata ekranı; bir kez yeniden dener, sonra
  sayfayı **bir kez** yeniler (sonsuz döngüye karşı bayrak).
- **ErrorBoundary** — radyo rıhtımı router'ın dışında yaşıyor ve oradaki bir
  hata `errorElement`'e uğramadan köke çıkıp uygulamayı beyaz ekrana
  düşürüyordu. Rıhtım, komut paleti ve önizleme paneli izole edildi.
- **safeUrl / ExternalLink** — yalnızca `http(s)`; `javascript:` ve
  boşluk/kontrol karakteriyle gizlenmiş şemalar reddediliyor. Güvensiz adres
  bağlantıya dönüşmüyor, düz metin kalıyor. `rel="noopener noreferrer nofollow"`.
- **sanitize** — HTML etiketleri, görünmez karakterler (kullanıcı adı
  taklidi) ve aşırı satır sonu temizliği; forum formunda canlı önizleme.
- **Veritabanı** — radyo bucket'ının geniş listeleme politikası editörlere
  daraltıldı (Supabase denetçisi 0025).

### 6.5 Test

| Katman | Önce | Sonra |
| --- | --- | --- |
| Birim + entegrasyon | 156 | **320** |
| E2E senaryosu | 0 | **19** |
| Önizleme duman testi | 7 modül | 7 modül + 4 genişlikte taşma denetimi |

E2E gerçek tarayıcıda, gerçek derlemeyle çalışır ve birim testlerinin
göremediği sınıfı kapsar: yönlendirme, kod bölme, kalıcı durum, düzen.
Üç genişlikte ekran görüntüsü `dist-preview/screens/` altına yazılır.

### 6.6 Yönetim, kulüpler ve setup'lar

| Modül | Adres | Not |
| --- | --- | --- |
| Kulüpler ve topluluklar | `/topluluklar`, `/topluluk/:slug` | Etkinlik takvimi profilin omurgası; Organization JSON-LD |
| Rasathane/planetaryum | `/tesisler` | Mesafeye göre sıralı; ziyaret koşulu (randevulu/serbest) rozet |
| Kayıtlı setup'lar | `/setup/:id`, `/panel/setuplar` | Yerel kayıt + bağlantıya gömülü paylaşım yükü |
| Yönetim paneli | `/admin` | Moderasyon kuyruğu; yetki RLS'te, arayüzdeki kontrol yalnızca nezaket |

Moderasyon şeması (`0007_moderation_and_audit.sql`):

- **Tek kuyruk, polimorfik hedef.** Moderatör "sırada ne var" diye bakar,
  "sırada hangi fotoğraf var" diye değil. Bedeli hedefe FK konamaması;
  karşılığı dört ayrı ekran yerine tek kuyruk.
- **Raporlayan kendi raporunu göremez.** Kuyruğu izleyebilmek, hedef
  kullanıcının kimin şikâyet ettiğini çıkarmasına ve misillemeye kapı açar.
- **Çözülen kayıt kimin çözdüğünü taşımak zorunda** (CHECK kısıtı): "kim
  karar verdi" sorusunun cevapsız kaldığı bir moderasyon günlüğü işe yaramaz.
- **`audit_logs` için yazma politikası yok.** İstemci kendi izini
  uyduramamalı; kayıtlar sunucu tarafındaki SECURITY DEFINER fonksiyonlardan
  atılacak. RLS varsayılanı zaten reddediyor.

### 6.8 Üçüncü tur — kalan engelleri kaldırma

| İş | Sonuç |
| --- | --- |
| Service worker / çevrimdışı (§16.3) | Kabuk önbelleği + üç ayrı strateji; kayıt yalnızca üretimde |
| Işık kirliliği (§14.1) | Harita yerine **karşılaştırma**: kendi SQM/Bortle kayıtlarımızdan hesaplanan fon parlaklığı oranı ve süre kazancı |
| EXIF okuma (§10.3) | Bağımlılıksız JPEG/TIFF ayrıştırıcı; GPS okunur ama **asla otomatik yayımlanmaz** (§15.3) |
| PWA ikonları, robots Sitemap | Kontrol edildi — zaten tamamdı |
| İçerik bildirme (§13) | Fotoğraf ve ilan sayfalarında "Bildir"; kayıt doğrudan moderasyon kuyruğuna, RLS `reported_by = auth.uid()` şartıyla. Faz 5'te özel mesaj da eklendi (`0047`) — moderatöre yazışma açmadan, şikâyet edilen metin rapor notunda taşınarak |

Bildirim gönderildikten sonra **canlı kuyruk takibi gösterilmiyor**:
raporlayanın kuyruğu izleyebilmesi, bildirilen kullanıcının kimin şikâyet
ettiğini çıkarmasına kapı açar. Arayüz "iletildi" der ve orada durur —
sahte bir takip ekranı göstermek, gizliliği koruyormuş gibi yapıp
korumamak olurdu.

**Faz 5 güncellemesi:** rapor SONUÇLANDIĞINDA artık raporlayana bildirim
gidiyor (`moderation_queue` üstündeki tetikleyici, `0042`). Bu, kuyruğu
izlemekten farklı: kullanıcı ne zaman ve neyle sonuçlandığını öğreniyor,
kimin baktığını değil. Bildirimin `actor_id`'si bilerek boş — kararı veren
moderatörün kimliği raporlayana açılmıyor, çünkü bu bir kurum kararı,
kişisel bir cevap değil.

**Tek kalan placeholder:** `/saha/istasyonlar` (canlı SQM / all-sky ağı).
Donanım ve veri toplama altyapısı gerektiriyor; Faz 3. Sayfa artık neyin
eksik olduğunu ve o zamana kadar hangi verinin kullanıldığını açıkça yazıyor.

**Işık kirliliği kararı.** Lisanslı küresel veri seti olmadan harita
yayımlamak yerine, kullanıcının asıl sorusuna cevap veriyoruz: "şehirden şu
sahaya gitmek neyi değiştirir?" Kadir ölçeği logaritmik olduğu için
Bortle 8'den Bortle 3'e geçiş "biraz daha karanlık" değil, fon parlaklığında
on kat mertebesinde bir sıçramadır — sayfa bunu ölçümlerden hesaplayıp
gösteriyor. Süre kazancının bir **üst sınır** olduğu (okuma gürültüsü ve dar
bant hesaba katılmıyor) ekranda yazılı.

**EXIF kararı.** Hazır kütüphaneler 20–60 kB ve kullanmayacağımız onlarca
üretici bloğunu ayrıştırıyor; bizim ihtiyacımız sekiz alan. Kendi
ayrıştırıcımız ilk yüklemeye hiçbir şey eklemiyor. GPS ayrıştırılıyor ama
forma yazılmıyor: kullanıcı dosyasında konum olduğunu bilmeli (bilmediği bir
veriyi paylaşmama kararı veremez), ama varsayılan her zaman gizlemek.

### 6.7 İkinci tur sonrası durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 377 test |
| `npm run build` | ✅ uyarısız |
| `npm run check:preview` | ✅ sağlam, yatay taşma yok |
| `node scripts/e2e.mjs` | ✅ 19/19 senaryo |

### 6.9 Dördüncü tur — veritabanı şeması (§4, §9.2, §9.3, §15.3)

Bu tura kadar arayüz bitmişti ama arkasında tablo yoktu: fotoğraf, hedef,
ekipman, etkinlik, gözlem noktası ve ilan sayfalarının tamamı `data.ts`
tohum dizilerinden besleniyordu. Üç migration bu boşluğu kapatıyor.

**`0008_equipment_and_targets.sql` — referans veri.** Ekipman kategorileri,
markalar, modeller ve gök cismi kataloğu. İki katmanlı spec (§9.2): listede
**filtrelenen** alan (odak, açıklık, piksel) typed kolon, kategoriye özgü
ayrıntı JSONB. Sınır keyfî değil — JSONB'deki alan indekssiz kalır, her
kategoriye kolon açmak ise tablo genişliğinin çoğunu boşa çıkarır.

Katalog kimlikleri ayrı tabloda: bir cismin M 31, NGC 224 ve UGC 454 gibi
birden çok kodu var ve kullanıcının hangisini yazacağı belli değil. Diziye
koymak "NGC224" aramasını indeksten mahrum bırakırdı. `normalized`
generated kolonu boşluk ve tireyi atıp küçük harfe indiriyor — §2.5'te
arayüz seviyesinde bir kez hataya yol açan eşleşme, artık veritabanında.

**`0009_photos_and_capture.sql` — fotoğraf, sürüm, pozlama.** Üç kural
veritabanına indi:

1. **50 aktif fotoğraf kotası (§4.2)** `app.enforce_photo_quota()`
   tetikleyicisiyle. Alan katmanındaki kontrolün sunucu yarısı; istemci
   doğrulaması kullanıcıya hızlı geri bildirim için, kotayı **tutan** bu.
2. **Sürümler kotaya girmez.** Ayrı `photo_versions` tablosunda oldukları
   için sayım sorgusu onları zaten görmüyor — kuralı ayrıca yazmak
   gerekmiyor, şema onu ifade ediyor.
3. **Tam koordinat ayrı tabloda (§15.3).** RLS satır bazlıdır; aynı satırda
   "bu kolonu gizle" denemez. `photo_exact_locations` yalnızca sahibine ve
   yöneticiye açık — moderatör bilinçli olarak dışarıda.

**`0010_events_sites_marketplace.sql` — etkinlik, saha, ilan.** Üçü tek
dosyada çünkü üçü de yer bildiriyor ve §15.3 her birinde farklı sonuç
veriyor:

| İçerik | Koordinat | Gerekçe |
| --- | --- | --- |
| Etkinlik | tam, herkese açık | ilan edilmiş adres zaten duyurulmuştur |
| Gözlem noktası | yalnızca yaklaşık | kullanıcı katkısı; nokta da katkı veren de korunmalı |
| İlan | yok, sadece şehir | satıcının evi bir adrestir |

Yan kararlar: kontenjan `app.enforce_event_capacity()` ile sunucuda tutuluyor
(istemcinin "kaydı ekle, sayacı artır" göndermesi, kopan bağlantıda kontenjanı
kalıcı olarak yanlışa düşürürdü); katılımcı listesi yalnızca kişinin kendisine
ve organizatöre açık; gözlem noktası katkısı `pending` başlamak zorunda —
WITH CHECK bunu zorluyor, yani kullanıcı kendi kaydını yayına alamıyor.

İlan metninde e-posta **veritabanı kısıtıyla** reddediliyor: iletişimin
platform dışına çıkması moderasyonu ve anlaşmazlıkta kaydı devre dışı
bırakır (§7.13). Telefon aranmıyor — seri numarası, odak uzunluğu ve model
kodu ("ASI 2600 MC") rakam dizileriyle dolu; orada otomatik yakalama yanlış
pozitif üretir. Kısıt yalnızca kesin olanı reddediyor, gerisi moderasyonun
işi.

**Şema doğrulaması.** Migration'lar uygulandıktan sonra sekiz kural canlı
veritabanında sınandı (blok bilerek `raise` ile bitirilip geri alındı, test
satırı kalmadı): yarım koordinat reddi, `location` türetimi, kayıt sayacı,
kontenjan reddi, puan ortalaması tetikleyicisi, e-posta içeren ilanın reddi,
rakam yoğun temiz metnin kabulü, kota fonksiyonunun çalışması — 8/8 geçti.

**Not:** Sayfalar hâlâ tohum verisinden okuyor; tablolar hazır ama veri
taşıma ve sorgu katmanı ayrı bir adım. Şemayı önce kurmak bilinçli — veri
taşıma sırasında şema değiştirmek, iki kez taşımak demek.

### 6.10 Dördüncü tur sonrası durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 377 test |
| `npm run build` | ✅ uyarısız |
| `npm run check:preview` | ✅ sağlam, yatay taşma yok |
| `node scripts/e2e.mjs` | ✅ 19/19 senaryo |
| Şema kuralları (canlı DB) | ✅ 8/8 |

### 6.11 Beşinci tur — okuma katmanı ve tohum taşıma

Şema kurulduktan sonra sayfalar hâlâ `data.ts` dizilerinden okuyordu.
Bu tur o bağı veritabanına çeviriyor — ama tohum diziyi **atmadan**.

**Tohum taşıma.** `node scripts/seed.mjs`, tohum dizilerinden SQL üretir
ve çıktı `supabase/seed/0001_reference_data.sql` olarak repoda durur.
Elle SQL yazmak yerine üretmenin sebebi: tohum dizisi değişince SQL'i
yeniden üretmek bir komut, elle yazılmış üç yüz satırı senkron tutmak
sürekli bir borç. Spec metinlerini typed kolona çeviren ayrıştırma alan
katmanında (`domain/equipment/specs.ts`) ve tersi de aynı dosyada:
gidiş-dönüş testi tohum kataloğunun tamamında anahtar/değer kümesinin
korunduğunu her koşuda doğruluyor.

Fotoğraf ve ilan **tohumlanmadı**: ikisi de `auth.users`'a NOT NULL bağlı,
tohumlamak sahte hesap açmayı gerektirirdi. Puan ortalaması ve kayıt
sayısı da yazılmadı — onlar tetikleyicilerin türettiği değerler; demo
sayıyı gerçek kayda çevirmek olmayan 128 değerlendirmeyi var göstermek
olurdu.

Canlı veritabanı: 13 ekipman modeli, 7 marka, 8 gök cismi, 15 katalog
kodu, 4 gözlem noktası + ölçümleri, 15 etkinlik, 42 oturum.

**Okuma deseni.** `useCatalog` tek desen kuruyor: tohum diziyle anında
boya, veritabanı satırları gelince değiştir. Yükleniyor durumu yok —
gösterilecek geçerli bir liste zaten var ve iskelet ekran boş kare
göstermekten başka bir şey yapmaz. Yapılandırma yoksa sorgu hiç kurulmaz
ve Supabase SDK'sı indirilmez; tek dosya önizleme ile çevrimdışı kabuk
hiçbir değişiklik olmadan çalışmaya devam ediyor.

Seçim kuralı `selectContent` içinde ve testli:

| Durum | Gösterilen | Not |
| --- | --- | --- |
| Satır geldi | veritabanı | otorite odur |
| Tablo boş | tohum | boş tablo "içerik yok" değil, "henüz taşınmadı" |
| Okuma hatası | tohum | `degraded` bayrağı kalkar, sayfa not basar |
| Yapılandırma yok | tohum | arıza değil, tasarlanmış çalışma biçimi |

Sessizce yerel veriye düşmek daha kolaydı ama kullanıcı gördüğü listenin
güncel olmayabileceğini bilmeden karar veriyor olurdu. `CatalogSourceNote`
yalnızca **bozulma** hâlinde tek satır basar; yapılandırma yokken hiç
çıkmaz.

Bağlanan modüller: ekipman (liste + detay), etkinlik (liste, detay,
harita, ana sayfa şeridi, şehir sayfası), gözlem noktası (liste, detay,
ışık kirliliği, ana sayfa şeridi, şehir sayfası). Hedef kataloğu bu turda
bağlanmadı: RA/Dec veritabanında derece, arayüzde `'00h 42m 44s'` biçiminde
ve ters çevirme kendi testlerini hak eden ayrı bir iş.

**Üst çubuk regresyonu.** Dar bir görünüm alanında (gömülü önizleme paneli)
üst çubukta gezinme girişi kalmadığı bildirildi. Düz menü `xl` altında
gizleniyor, "Modüller" düğmesi ise yalnızca lg–xl arasında görünüyordu;
altındaki genişliklerde gezinme yalnızca `fixed` alt çubuktaydı ve o bağlamda
görüş dışındaydı. Düğme artık `xl` altında her genişlikte duruyor. Bunun
390px'te 10px taşma ürettiğini `check-preview` yakaladı; telefonda iki metin
düğmesi yerine tek "Hesap" girişi bırakıldı. Yeni E2E senaryosu beş
genişlikte üst çubukta gezinme girişi olduğunu doğruluyor.

### 6.12 Beşinci tur sonrası durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 416 test |
| `npm run build` | ✅ uyarısız |
| `npm run check:preview` | ✅ sağlam, yatay taşma yok |
| `node scripts/e2e.mjs` | ✅ 20/20 senaryo |
| Şema kuralları (canlı DB) | ✅ 8/8 |
| `anon` yetki denetimi (canlı DB) | ✅ okur, yazamaz, gizli tabloları göremez |

---

## 7. Genel denetim — 28 Temmuz 2026

Bu bölüm kod tabanının ve canlı veritabanının o günkü ölçülmüş durumudur.
Sayılar tahmin değil: dosya sayımı, test koşusu, `pg_stat_user_tables` ve
Supabase güvenlik denetçisinden alınmıştır.

### 7.1 Ölçülen durum

| Ölçü | Değer |
| --- | --- |
| Kaynak dosya | 277 (`.ts` / `.tsx`) |
| Kod satırı | 47 652 |
| Rota | 63 |
| Birim testi | 640 (54 dosya) |
| E2E senaryosu | 24 |
| Migration | 14 (`0001` → `0014`) |
| Veritabanı tablosu | 36 |
| Storage bucket | 3 (`photos`, `photo-originals`, `radio`) |

Doğrulama zinciri: `tsc` hatasız · `eslint` uyarısız · 640 test geçti ·
`build` uyarısız · `check:preview` yatay taşma yok · 24/24 E2E.

### 7.2 Tamamlananlar

**Kabuk ve tasarım sistemi.** Dokuz modüllü üst menü, modül haritası
çekmecesi, komut paleti (⌘K), hata sınırı, "içeriğe atla", 63 rota,
kod bölme, PWA kabuğu, üç kademeli tema (açık · koyu · saha).

**Gökyüzü hesapları.** Efemeris tümüyle kendi kodumuzda: astronomik
karanlık, ay evresi ve doğuş/batış, hedef zirve yüksekliği, karanlık
takvimi, yükseklik grafiği. Dış servis yok, API anahtarı yok. Hava ve
seeing Open-Meteo'dan; servis düşerse hücreler "—" gösterir, uydurma
değer üretilmez.

**Hedef kataloğu.** 182 gök cismi, 321 katalog kodu. En iyi aylar,
zorluk, önerilen odak ve filtre ölçülen RA/Dec/kadir/boyuttan
**türetiliyor** — elle yazılmıyor, dolayısıyla katalog büyüdükçe
tutarlılık bozulmuyor.

**Ekipman modülü ve setup planlayıcı.** 14 kategori, 43 marka, 129 model.
Merkezî uyumluluk motoru (`domain/setup/engine.ts`) yük, örnekleme, FOV,
backfocus zinciri, vinyetleme, filtre, reducer, fiziksel bağlantı ve
guiding kontrollerini yapıyor; her sonuç formül, girdi, birim ve güven
taşıyor. Veri yoksa kontrol yapılmıyor ve "veri yetersiz" deniyor.

**Yönetim paneli.** Katalog senkronizasyonu (asla silmez), eksik veri
raporu ve satır içi düzenleme, moderasyon kuyruğu, yayın kontrolü,
kullanıcı katkısı onayı.

**Veritabanı.** 14 migration, RLS her tabloda, rol tabanlı yetki,
kota/entitlement, denetim günlüğü, KVKK için hesap silme/dışa aktarma
tabloları. `anon` okur, yazamaz.

**Güvenlik ve gizlilik.** `safeUrl`, HTML temizleme, çerez envanteri ve
toplu silme, konum yalnızca tarayıcıda, KVKK sayfaları.

### 7.3 İstenen işler — istek istek durum

Bu tablo tek tek **istenmiş** işleri izler. Kaynak: proje boyunca verilen
talimatlar ve "Ekipman Kataloğu, Setup Builder ve Uyumluluk Simülatörü"
şartnamesi. Durum: ✅ bitti · ⚠️ kısmen · ⛔ yapılmadı.

#### Fotoğraf yükleme ve hedef kataloğu

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| A1 | Yükleme ekranında önce obje tipi, sonra katalog, sonra ilgili obje girişi | ✅ | `TargetPicker` — iki adımlı, aranabilir |
| A2 | "Olabilecek tüm objeleri ekle, veritabanlarından araştır" | ⚠️ | 182 obje (Messier 110 + NGC/IC 52 + güneş sistemi 19). Tam NGC/IC ~13 000 kayıt; şu anki katalog fotoğrafı çekilen cisimleri kapsıyor, tamamını değil |
| A3 | Orijinal EXIF/FITS/XISF metadata'sına dokunulmaması | ✅ | Setup bilgisi yalnızca Astrohub alanlarına yazılıyor |

#### Ortak ekipman veritabanı

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| B1 | Filtre, lens, teleskop, montür, reducer, barlow, optik tüp… **ortak** veritabanı | ✅ | 14 kategori · 43 marka · 129 model; dört ayrı elle tutulan liste kaldırıldı |
| B2 | Şartnamedeki ~50 kategori | ⚠️ | **14 kategori var** — oküler, prizma, dedew, güç, filtre çekmecesi, dome gibi kategoriler açılmadı |
| B3 | Şartnamedeki büyük üretici listesi | ⚠️ | 43 marka; listedeki bazı üreticiler (özellikle niş ve Uzak Doğu markaları) girilmedi |
| B4 | Ekipman görselleri — "hepsinin webden görüntüleri" | ⛔ | **0 görsel.** Üretici görselleri telif nedeniyle kopyalanmadı; izinli kaynak ya da yönetilebilir medya sistemi kurulmadı. `image` alanı ve 14 kategori simgesi hazır, içerik yok |
| B5 | Teknik özelliklerle **karşılaştırma** ekranı | ✅ | Katalog sekmesinde, seçim adres çubuğunda taşınıyor |

#### Admin panelden veri güncelleme

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| C1 | Veritabanı belli dönemlerde **panelden tetiklenerek** güncellensin | ⚠️ | Panelde senkronizasyon düğmesi var ve çalışıyor — ama kaynağı **uygulamanın içindeki tohum dizi**, dış dünya değil |
| C2 | "Kendin güncelleyebilsin" — dış kaynaktan veri çekme | ⛔ | **Yok.** Üretici sitesinden / dış veritabanından otomatik veri çekme hiç yazılmadı. Yeni ürün ancak koda eklenip yayınlanınca panele düşüyor |
| C3 | Eksik veri raporu ve elle düzeltme | ✅ | Panel hangi kaydın hangi alanının eksik olduğunu listeliyor, satır içi düzenleniyor |

#### Setup Builder ve uyumluluk simülatörü (21 bölümlük şartname)

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| G1 | Dört sekme, varsayılan "Setup Oluştur" | ✅ | |
| G2 | Kategori → marka → model, aranabilir, uzun liste dökmeyen seçim | ✅ | E2E "katalog sekmesi listeyi tek seferde dökmez" bunu koruyor |
| G3 | Solda bileşenler, sağda yapışkan canlı analiz | ✅ | |
| G4 | Altı durum seviyeli uyumluluk motoru, her sonuç kriter + kullanılan değer + beklenen aralık + açıklama + çözüm taşısın | ✅ | `domain/setup/engine.ts` |
| G5 | Yük, örnekleme, FOV, backfocus zinciri, vinyetleme, filtre, reducer, fiziksel bağlantı, guiding kontrolleri | ✅ | |
| G6 | Setup özeti, önem sırasına göre uyarılar | ✅ | |
| G7 | Setup kaydetme (ad, açıklama, amaç, görünürlük, varsayılan, kopyalama) | ⚠️ | Çalışıyor ama **localStorage'da** — cihaz değişince kayboluyor. `user_setups` tablosu ve RLS hazır, bağlanmadı |
| G8 | Setup paylaşma | ⚠️ | `/setup/:id` rotası var; kayıt kalıcı olmadığı için paylaşılan bağlantı karşı tarafta açılmıyor |
| G9 | Fotoğraf yüklemede kayıtlı setup'tan künye doldurma | ✅ | |
| G10 | Ekipman verisi gömülü statik JSON olmasın | ⚠️ | Veritabanı yetkili kaynak, ama tohum dizi hâlâ uygulamanın içinde (veritabanı yoksa site ayakta kalsın diye — bilinçli) |
| G11 | Ürün detayında üretim durumu | ✅ | 129 modelin 91'inde dolu |
| G12 | Ürün detayında **belgeler** (kılavuz, teknik çizim) | ⛔ | Alan bile yok |
| G13 | Ürün detayında **kaynaklar** | ⛔ | Alan var (`sources`), **0 kayıtta dolu** |
| G14 | Sunucu taraflı arama / filtreleme / sayfalama; tüm veritabanı tarayıcıya inmesin | ⛔ | Şu an tamamen istemcide. 129 modelde sorun çıkarmıyor ama şartnamenin açık maddesi |
| G15 | Öneri motoru (§17) | ⛔ | Hiç yazılmadı |
| G16 | Admin veri yönetim paneli | ✅ | |
| G17 | Mock değerle "tamamlandı" izlenimi verilmesin, eksikler açıkça işaretlensin | ✅ | Veri yoksa motor "veri yetersiz" diyor; panel eksikleri sayıyla listeliyor |
| G18 | Koyu tema korunsun, kompakt metrik kartları, tooltip, mobil | ✅ | |

#### Haritalar, saha ve araçlar

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| H1 | Araç ikon seti | ⛔ | `ToolsIndexPage`'de hiç ikon yok |
| H2 | Işık kirliliği **haritası** | ⛔ | Sayfa var ama nokta ölçümü listesi; harita katmanı yok |
| H3 | Bulut / yağış (uydu) haritası | ⛔ | |
| H4 | Astrocamping veritabanı + ücretsiz harita servisi | ⛔ | Saha modülünde 4 kayıt, kamp veritabanı yok. Projede harita kütüphanesi kurulu değil |

#### Hesap, içerik ve yönetim

| # | İstenen | Durum | Not |
| --- | --- | --- | --- |
| L1 | Üyelik sistemi | ⛔ | Tablolar ve iş kuralları hazır, ödeme sağlayıcısı yok; panelde "Yakında" |
| L2 | Profil yönetimi | ⛔ | Profil sayfası tohum fotoğraflardan türetiliyor; hesapla bağı yok, düzenleme yok |
| L3 | Admin dashboard | ✅ | Dört kontrol: katalog, ekipman verisi, moderasyon, yayın |
| L4 | İçerik zenginleştirme (yazı gövdeleri) | ⛔ | Yazılar hâlâ 3–4 paragraf |
| L5 | Word / PDF içe aktarma (yönetici içerik girişi) | ⛔ | |
| L6 | Faz 3 yazma akışları — forum konusu/yanıt, ilan oluşturma, etkinlik kaydı, beğeni/yorum, saha katkısı | ⛔ | Şema ve RLS hazır, istemci tarafı yok. Forumda "Gönder" düğmesi `disabled` |

#### Arayüz düzeltmeleri (bu oturum)

| # | İstenen | Durum |
| --- | --- | --- |
| U1 | Nav Bar'a Ekipman modülü | ✅ |
| U2 | Ana sayfa modül sıralaması (hero → bu gece → galeri → haber/yazı → etkinlik → ilan) | ✅ |
| U3 | "Bu Gece" kartlarına görsel — boş duruyordu | ✅ |
| U4 | Haber ve yazıların yanına mini görsel kartları | ✅ |
| U5 | Giriş'in yanındaki "Saha" yazısını kaldır | ✅ |
| U6 | Üç kademeli tema (açık · koyu · kırmızı), her birinde ayrı simge | ✅ |

### 7.4 Denetimde çıkan ek bulgular

Bunlar istenmiş işler değil; kodu ve veritabanını tararken çıkanlar.

#### E1 · Yüklenen fotoğraf galeride görünmüyor  (en kritik)

`services/photos/upload.ts` `astro_photos` tablosuna yazıyor ve dosyayı
`photos` bucket'ına koyuyor; ama `GalleryPage` hâlâ `features/photos/data`
tohum dizisini okuyor. Okuma katmanı (`usePhotoCatalog`) yok. Yani yükleme
akışı çalışıyor, sonucu hiçbir yerde görünmüyor. Tablo şu an **0 satır**.

Gereken: `services/content/photos.ts` — diğer beş katalogla aynı desen
(`selectContent`), görsel türevleri ve `photo_exposures` birleşimi.

#### E2 · Yazma akışlarının çoğu yok

Yazan modüller: fotoğraf yükleme, yönetim paneli (dört kontrol), ekipman
katkısı. Yazmayan ama arayüzü hazır olanlar:

| Akış | Durum | Tablo hazır mı |
| --- | --- | --- |
| Forum konusu / yanıt | Form var, **Gönder düğmesi `disabled`** | ✅ `forum_threads`, `forum_posts` |
| İlan oluşturma | Sayfa yok | ✅ `listings` (0 satır) |
| Etkinlik kaydı | Buton yok | ✅ `event_registrations` |
| Beğeni / yorum | Yok | ✅ `photo_likes`, `photo_comments` |
| Saha katkısı / yorum | Yok | ✅ `site_reviews` |
| Profil düzenleme | Profil tohum fotoğraftan türetiliyor | ✅ `profiles` (0 satır) |

Şema ve RLS tarafı bitmiş; eksik olan yalnızca istemci tarafı.

#### E3 · İçeriğin yarısı hâlâ tohum dizide

| Modül | Kaynak | Kayıt |
| --- | --- | --- |
| Ekipman · Hedef · Etkinlik · Saha · Yayın | ✅ veritabanı | 129 · 182 · 15 · 4 · 0 |
| Fotoğraf | ⛔ tohum | 9 |
| Haber | ⛔ tohum | 20 |
| Yazı | ⛔ tohum | 6 |
| Forum | ⛔ tohum | 7 |
| İlan | ⛔ tohum | 4 |
| Kulüp / tesis | ⛔ tohum | 11 |

Haber, yazı, kulüp ve tesis için **tablo bile yok** — şema kararı
verilmemiş.

#### E4 · Ekipman kanıt alanları boş

129 modelin:

- 98'i setup motorunun istediği alanları eksiksiz taşıyor, **31'i eksik**
  (en çok: optik tüp 10, astro kamera 7, guide 6, filtre 4, lens 4)
- 79'unda bağlantı standardı, 73'ünde optik ölçü var
- 91'inde üretim durumu ve veri güveni var
- **0'ında kaynak (`sources`) var** — şartname her teknik değerin
  kaynağını istiyordu
- **0'ında doğrulama tarihi (`verifiedAt`) var**
- **0'ında ürün görseli var** — telif nedeniyle bilinçli; izinli kaynak
  ya da yönetilebilir medya sistemi kurulmadı

Uydurma veri girilmedi (kural buydu), ama "kaynağı yazılmış veri" hedefine
henüz ulaşılmadı.

#### E5 · Harita katmanı yok

Projede harita kütüphanesi yok (Leaflet kurulu değil). Etkinlik ve saha
haritaları kendi çizdiğimiz basit koordinat düzlemleri. Eksik olanlar:

- Işık kirliliği haritası (şu an yalnızca nokta ölçümleri)
- Bulut / yağış (uydu) haritası
- Astrocamping veritabanı ve harita üzerinde saha keşfi

#### E6 · Üyelik ve ödeme

`memberships`, `billing_transactions` tabloları var, 0 satır. Panelde
"Üyelik ve Ödeme", "Planlarım", "İlanlarım" **Yakında** etiketli. Kota ve
entitlement iş kuralları (`domain/membership`) yazılmış ve test edilmiş —
bağlanacak ödeme sağlayıcısı yok.

#### E7 · Setup ve envanter kalıcılığı localStorage'da

`user_setups` ve `user_equipment` tabloları ve RLS'leri **hazır** (0014),
ama `features/setups/store.ts` hâlâ tarayıcıya yazıyor. Kullanıcı cihaz
değiştirince setup'ları kayboluyor.

#### E8 · İçerik derinliği

Yazılar 3–4 paragraf; şartname uzun rehber öngörüyordu. Yönetici için
Word/PDF içe aktarma yok. Haber gövdeleri iyi durumda.

#### E9 · Güvenlik denetçisi bulguları

| Seviye | Bulgu | Değerlendirme |
| --- | --- | --- |
| ERROR | `spatial_ref_sys` tablosunda RLS yok | PostGIS'in kendi sistem tablosu; bizim verimiz değil, salt okunur referans |
| WARN | `photos` bucket'ında geniş SELECT politikası dosya listelemeye izin veriyor | **Gerçek bulgu** — herkese açık URL erişimi için gerekmiyor, daraltılmalı |
| WARN | `citext`, `pg_trgm`, `postgis` `public` şemasında | Supabase varsayılanı; ayrı şemaya taşınabilir |
| WARN | PostGIS `st_estimatedextent` fonksiyonları `anon`'a açık | PostGIS'ten geliyor; `EXECUTE` geri alınabilir |

Kendi tablolarımızda RLS eksiği **yok**.

### 7.5 Önerilen sıra

İstenmiş ama yapılmamış işler önce; denetimde çıkan bulgular aralarına
önem sırasına göre yerleştirildi.

1. **E1 · Fotoğraf okuma katmanı** — yükleme `astro_photos`'a yazıyor ama
   galeri tohum diziyi okuyor. Tek başına en büyük fark: yükleme akışının
   sonucu görünür hâle gelir.
2. **L6 · Yazma akışları** — forum konusu/yanıt, beğeni/yorum, etkinlik
   kaydı, ilan oluşturma. Şema ve RLS hazır; iş neredeyse tamamen
   istemcide.
3. **G7 + G8 · Setup kalıcılığı ve paylaşım** — `user_setups` tablosu
   hazır. Küçük iş; cihazlar arası kayıp ve ölü paylaşım bağlantısı biter.
4. **E9 · `photos` bucket politikasını daralt** — tek satırlık düzeltme.
5. **C2 · Dış kaynaktan ekipman verisi çekme** — "panelden kendin
   güncelleyebilsin" isteğinin karşılanmayan yarısı. Üretici sayfası ya da
   dış veritabanından çekim + onay kuyruğu.
6. **G13 + B4 · Kaynak/belge alanları ve ürün görselleri** — panel zaten
   hangi kaydın neyi eksik olduğunu listeliyor; eksik olan içerik ve
   izinli medya kaynağı.
7. **B2 + B3 · Kategori ve marka kapsamını genişlet** — 14 → ~50 kategori.
8. **H1–H4 · Harita katmanı ve araç ikonları** — harita kütüphanesi
   kararı (ücretsiz servis) bu adımın önkoşulu.
9. **E3 · Haber/yazı/kulüp şeması** — bu dört modül için tablo bile yok.
10. **G14 · Sunucu taraflı arama/sayfalama** — 129 modelde acil değil,
    katalog büyüyünce zorunlu.
11. **G15 · Öneri motoru**.
12. **L1 + L2 · Üyelik, ödeme ve profil yönetimi**.
13. **L4 + L5 · İçerik derinleştirme ve Word/PDF içe aktarma**.
