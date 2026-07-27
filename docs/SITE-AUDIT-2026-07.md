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
| Bildirimler (e-posta/push) | §8.13, §14.6 | E-posta sağlayıcısı |
| Global aramanın sunucuya taşınması | §11.4 | Postgres FTS; `searchAll` imzası korunacak şekilde tasarlandı |

### 4.2 Harita ve dış veri bağımlı

| İş | Şartname | Engel |
| --- | --- | --- |
| Tam ekran etkileşimli harita (Leaflet) | §7.7 | Tile sağlayıcı lisansı |
| Işık kirliliği katmanı + kaynak atfı | §14.1 | Veri lisansı |
| "Bu Gece Gökyüzünde", Ay/karanlık takvimi | §7.9, §14.2 | Efemeris servisi |
| Hava servisi entegrasyonu | §14.3 | Servis hesabı |
| Canlı SQM / All-Sky ağı | §8.7 | Faz 3 |

### 4.3 Ürün geliştirmesi (bağımlılıksız, sıradaki iş)

| İş | Şartname | Not |
| --- | --- | --- |
| Etkinlik takvim ve harita görünümü | §19.3 | Liste görünümü var; takvim eksik |
| Fotoğraf sürümleri ve karşılaştırma | §8.1 | Kota kuralı yazıldı, UI yok |
| Setup oluşturucu + uyumluluk kontrolü | §7.12 | FOV hesaplayıcı hazır, temeli var |
| Mosaic planlayıcı | §7.12 | Optik matematiği domain'de mevcut |
| Ekipman model detay sayfaları | §7.11 | Route açık, içerik yok |
| Eğitim içerik detayı + işleme laboratuvarı | §7.14 | Route açık |
| İlan detayı ve platform içi iletişim | §7.13 | Route açık |
| Kulüp/topluluk kurumsal profilleri | §8.11 | Faz 2 |
| Şehir bazlı SEO sayfaları | §20 | `/ankara-astronomi-etkinlikleri` vb. |
| Çerez tercih yönetimi arayüzü | §15.7 | Politika metni yazıldı, UI yok |
| E2E testler (Playwright) | §17.1 | Şu an yalnızca unit + integration |
| Görsel regresyon testleri | §17.2 | — |

### 4.4 Yayın öncesi zorunlu

1. **`VITE_SITE_URL` ayarlanmalı** — yoksa canonical/OG etiketleri basılmaz ve
   sitemap üretilmez.
2. **Hukuki metinler hukuk danışmanı incelemesinden geçmeli** — veri sorumlusu
   kimliği, başvuru kanalı, uyuşmazlık maddeleri eksik.
3. `robots.txt` içindeki `Sitemap:` satırı mutlak URL'e çevrilmeli.
4. PWA ikonları — manifest şu an yalnızca SVG favicon'a işaret ediyor;
   192/512 px PNG maskable ikonlar eklenmeli.

---

## 5. Denetim sonrası durum

| Kontrol | Sonuç |
| --- | --- |
| `npm run typecheck` | ✅ hatasız (artık önizleme config'i de dahil) |
| `npm run lint` | ✅ hatasız |
| `npm test` | ✅ 65 test (46 → 65) |
| `npm run build` | ✅ uyarısız, 40+ chunk, ilk yükleme %45 daha hafif |
| Ölü bağlantı | ✅ yok (testle kilitli) |
