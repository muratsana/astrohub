# Tasarım Sistemi

Ana görev belgesi Faz 2'nin çıktısı. Buradaki her sayı ya `src/index.css`
içindeki token'dan ya da gerçek tarayıcıda yapılan bir ölçümden geliyor.

Kaynak: `src/index.css` (token'lar ve rol sınıfları) ·
`src/components/ui/ContentCard.tsx` (kart ailesi) ·
`src/components/ui/cardRatios.ts` (en-boy oranı kaydı)

Kapılar: `src/features/theme/designSystem.test.ts` ·
`src/components/ui/ContentCard.test.tsx` · `scripts/check-viewports.mjs`

---

## Kimlik künyesi

| | |
|---|---|
| Palet | grafit zemin · fosfor kehribar aksan · soğuk mavi ikincil |
| Tipografi | Inter (arayüz ve okuma) + IBM Plex Mono (yalnızca gösterge sayıları) |
| Sertlik | 2px radius, yükselti gölgesi yok, hairline bölmeler |
| Tema | açık · koyu (varsayılan) · saha kırmızısı |

Yüzey ayrımı gölgeyle değil çizgiyle yapılır. Site bir yayın organı gibi
değil, bir cihaz gibi davranır.

---

## Sorun neydi

Faz 2'ye girerken token sistemi zaten yazılıydı. Ölçüm, sistemin
**kullanılmadığını** gösterdi:

| Kaçak | Sayı |
|---|---|
| `text-[12px]` (`text-meta` varken) | 113 |
| `text-[13px]` (adı olmayan punto) | 50 |
| `text-[12.5px]` (`text-caption` varken) | 41 |
| `rounded-[2px]` (`rounded-card` varken) | 21 |
| Kart kökünün birebir kopyalandığı dosya | 11 |
| `<h1>` için kullanılan farklı ölçü çifti | 5 |
| Kart görselinde kullanılan farklı en-boy oranı | 6 |
| Açılır listelerde kullanılan farklı gölge | 3 |

Token eklemek bunu çözmez. Token'ın etrafından dolaşmayı **imkânsız**
kılan bir kapı çözer. Bu yüzden her ölçek bir testle birlikte geliyor.

**Bugünkü durum: serbest punto ve serbest radius sayısı sıfır.**

---

## Tipografi

### Gövde ve altı

| Token | Ölçü | Rol |
|---|---|---|
| `text-meta` | 12px | teknik künye, rozet, birim, tarih |
| `text-caption` | 12.5px | dipnot, görsel kredisi, kaynak satırı |
| `text-body-sm` | 14px | kart gövdesi, özet, liste açıklaması |
| `text-body` | 15px | gövde metni (`body` varsayılanı) |

Alt sınır 12px bilinçli: mobilde 9–11px teknik metin okunmuyordu. "Teknik
görünüm" küçük puntoyla değil tabular rakam, ağırlık, renk ve hizalamayla
kurulur. `BortleIndicator` içindeki 10px'lik ölçek etiketi bu kurala
uydu.

### Başlık rolleri

Başlıklar token değil **sınıf** kullanır, çünkü önemli olan ölçünün
kendisi değil mobil–masaüstü **oranı**. `@theme` punto token'ı duyarlı
olamaz; kırılma noktası sınıfın içinde olunca "26 yazıp `sm:30`u
unutmak" mümkün değil.

| Sınıf | Mobil | ≥640 | ≥1024 | Rol |
|---|---|---|---|---|
| `type-hero` | 28px | 40px | 48px | ana sayfa hero'su, 404 rakamı |
| `type-page-lg` | 28px | 36px | — | uzun okuma başlığı (haber, yazı) |
| `type-page` | 26px | 30px | — | **varsayılan** sayfa başlığı |
| `type-page-sm` | 22px | 26px | — | 404, hata, yer tutucu, hukuki metin |
| `type-section` | 17px | 19px | — | bölüm başlığı (h2) |
| `type-panel` | 19px | — | — | diyalog, çekmece, panel başlığı |

Yeni bir sayfanın `<h1>`i `type-page` kullanır. `type-panel` yalnızca
sayfanın tamamı tek bir dar karttan ibaretse `<h1>` olabilir (giriş ve
kayıt sayfaları).

### Gösterge ölçeği

Enstrüman değerleri (fiyat, SQM, skor, süre, derece) başlık **değildir**:
okunacak bir cümle değil, bakılacak bir sayıdır. Ayrı ölçekte durur ki
biri diğerini bozmadan ayarlanabilsin.

| Token | Ölçü | Rol |
|---|---|---|
| `text-readout-sm` | 17px | kart içi sayı — fiyat, SQM, tekil ölçüm |
| `text-readout` | 19px | panel gösterge değeri |
| `text-readout-lg` | 23px | büyük gösterge — skor, öne çıkan ölçüm |
| `text-readout-xl` | 26px | ana gösterge — panelin baş değeri |

`.num` sınıfı göstergeyi mono aileye alır; `.tabular` gövde metnindeki
sayıyı hizalar.

---

## Ölçek token'ları

| Alan | Token'lar |
|---|---|
| İkon | `--spacing-icon-inline` 14 · `--spacing-icon-ui` 16 · `--spacing-icon-lead` 20 |
| Form/düğme | `--spacing-control-sm` 32 · `-md` 40 · `-lg` 48 |
| Dokunmatik hedef | `--spacing-touch-min` 44 |
| Radius | `--radius-card` 2px (tek değer) |
| İçerik genişliği | `--spacing-content` 1520px |
| Kabuk yüksekliği | `--spacing-shell` 92px |

**Dokunmatik hedef ayrı bir ölçü.** WCAG 2.5.8 en az 24×24 CSS piksel
istiyor, WCAG 2.5.5 (AAA) ve platform kılavuzları 44×44. Görsel
yüksekliği 32px olan bir düğme, tıklanabilir alanı 44px'e çıkaran bir
dolguyla sarılır — ölçüyü küçültmek "yer kazanma" değil, metni
küçültmenin başka bir adıdır. Bu kural `npm run check:a11y` ile gerçek
tarayıcıda ölçülüyor: ikon kontrolleri ≥44px, metin taşıyan kontroller
≥24px.

---

## Yükselti ve katmanlar

Tek yükselti kademesi var: `--shadow-overlay`.

Sitenin kuralı "yüzey ayrımı gölgeyle değil çizgiyle" ve bu her yerde
geçerli — **bir istisna dışında**: bir açılır liste altındaki içeriğin
üstünde yüzer, orada çizgi yetmez.

Ölçülen durum üç ayrı çözümdü: iki seçici Tailwind'in `shadow-lg`
varsayılanını (paletle hiçbir ilişkisi yok), biri elle ayarlanmış bir
gölgeyi kullanıyordu. Artık üçü de aynı token'ı kullanıyor ve token
temaya göre çevriliyor (koyu zeminde derin siyah, açık zeminde grafitin
şeffafı, saha modunda kızıla kayan).

`shadow-[inset_0_0_0_2px_…]` gibi **bulanıklığı sıfır** kullanımlar gölge
değil çizgidir; `border` ile yapılamazlar çünkü kutu ölçüsünü değiştirir.
Test bu ayrımı bulanıklık değerine bakarak yapıyor.

| Katman | Değer |
|---|---|
| `--z-sticky` | 30 |
| `--z-drawer` | 40 |
| `--z-modal` | 50 |
| `--z-popover` | 60 |
| `--z-toast` | 70 |

Tailwind'in `z-*` tema alanı olmadığı için kullanım
`z-[var(--z-popover)]` biçiminde.

---

## Kart ailesi

Kart kökü **on bir dosyada birebir** kopyalanmıştı:

```
group flex h-full flex-col rounded-card border border-border
bg-surface-1 transition-colors hover:border-border-strong
```

Bu bir tasarım sistemi değil, bir kopyala-yapıştır uzlaşısıdır: biri
hover rengini değiştirdiğinde diğer onu geride kalır.

### Bileşenler

| Bileşen | İşi |
|---|---|
| `ContentCard` | kök — `to` verilirse bağlantı, verilmezse `<div>`; `grid`/`list` varyantı |
| `ContentCardMedia` | görsel alanı — oran, rozet, işaret, görüş alanı yuvaları |
| `ContentCardBody` | künye gövdesi |
| `ContentCardTitle` | başlık — `lines={1|2}`, iki satırda yer **önceden ayrılır** |
| `ContentCardMeta` | künye satırı — `muted` / `cold` tonu |
| `ContentCardActions` | alt şerit, `mt-auto` ile kartın dibine yapışır |
| `ContentCardSkeleton` | yükleme iskeleti — kartın kendi sabitlerini kullanır |
| `ContentCardSkeletonGrid` | ızgara dolusu iskelet |

### En-boy oranı

Altı orandan üçe indi. Her birinin bir sebebi var:

| Oran | Değer | Nerede |
|---|---|---|
| `standard` | 4:3 | **varsayılan** — her ızgara kartı |
| `square` | 1:1 | yalnızca galeri fotoğraf karosu |
| `wide` | 16:9 | yalnızca manşet kartı |

Emekliye ayrılanlar: 16/10 (keşif), 16/7 (karanlık gökyüzü şeridi), 21/9
(gözlem noktaları). Hiçbiri ayrı bir işe yaramıyordu; yan yana gelen iki
şerit farklı yükseklikte kart üretiyordu.

Sabit oran aynı zamanda bir performans kararı: kutuyu görsel inmeden önce
ayırır, yani görsel geldiğinde altındaki içerik zıplamaz (CLS).

Dördüncü bir oran eklemeden önceki soru: **aynı ızgarada başka bir oranla
yan yana gelecek mi?** Geliyorsa satır hizası bozulur ve eklenmemeli.

### İskelet

Sitede hiçbir kartın yükleme iskeleti yoktu. `ContentCardSkeleton` kartın
kendi sabitlerini (`CARD_ROOT`, `CARD_RATIO`) kullanıyor — ayrı yazılsaydı
ilk değişiklikte ayrışırdı ve iskeletin kart gibi görünmemesi, iskelet
olmamasından beterdir.

**Katalog listelerinde iskelet yok, olmamalı da.** `useCatalog` tohum
diziyle anında boyar ve veritabanı satırları gelince değiştirir; orada
gösterilecek geçerli bir liste zaten var. Gerçek yükleme boşluğu rota
chunk'ı inerken oluşuyor ve `RouteFallback` artık orada gerçek `CardGrid`
+ gerçek kart iskeletini çiziyor. Önceki elle yazılmış yer tutucu
`rounded-lg` köşeler ve 16/10 görselle sitenin hiç kullanmadığı bir
dilde çiziyordu.

---

## Alan kullanımı

`npm run check:viewports` 11 çözünürlüğü gerçek tarayıcıda ölçer:
320×568, 375×667, 390×844, 414×896, 768×1024, 1024×768, 1280×720,
1366×768, 1440×900, 1920×1080, 2560×1440.

Ölçülen: yapışkan kabuk yüksekliği, `<h1>` alt kenarı, ondan sonraki ilk
gerçek içerik biriminin başlangıcı, fold üstünde kalan içerik ve yatay
taşma.

### Kapatılan

**320×568'de üst çubuk 9px taşırıyordu.** Kapsayıcı 288px, künye 143px,
sağ aksiyon kümesi 158px. Kelime markası artık 360px altında düşüyor;
açıklık işareti kalıyor ve `aria-label` bağlantıda durduğu için ekran
okuyucuda hiçbir şey kaybolmuyor.

### Açık

**Ana sayfada ana içerik 1366px ve altındaki çözünürlüklerde fold'un
altında başlıyor.** 1280×720'de kabuk 88px, başlık altı 348px, içerik
769px'de — yani "Bu Gece" fold'un 49px altında.

Hero'nun dikey dolgusu alındı ama ölçüm şunu gösterdi: `min-h` bağlayıcı
kısıt değilmiş, hero zaten içeriğiyle o boyu geçiyor. Kalan mesafe
hero'nun **içeriğinin** yeniden düzenlenmesini gerektiriyor ve bu Faz
3'ün konusu ("Ana sayfa, navbar, hero"). Bu yüzden `check:viewports`
henüz `test:all` zincirinde **değil** — kapı yalan söylememeli.

---

## Açıklama metinleri

Her modülün açıklaması §5.4'ün altı sınıfına göre değerlendirildi.
Sonuçlar:

**Kaldırıldı (başlığı birebir tekrar ediyordu):**

| Başlık | Kaldırılan açıklama |
|---|---|
| Astrofotoğrafçılar | "Topluluğun aktif üreticileri" |
| Popüler Hedefler | "Bu sezon en çok çalışılan gökcisimleri" |
| Benzer Fotoğraflar | "Aynı hedef veya aynı türden diğer kareler" |
| {katalog} Fotoğrafları | "Bu hedefin Astrohub topluluğundaki kareleri" |

**Kısaltıldı (altındaki kartların gösterdiğini metinle tekrar ediyordu):**
Karanlık Gökyüzü, Son İlanlar, Yaklaşan Etkinlikler, Hesabım.

**Korundu:** hesaplayıcılar, gece planı, forum, pazaryeri hukuki
uyarıları, çerez sayfası, radyo, TV, Bu Gece. Bunlar başlığın
söylemediği bir şey söylüyor — çoğu astronomi terimi açıklaması ya da
yasal bilgi ve belge bunları korumayı ayrıca istiyor.

---

## Kapılar

| Kapı | Ne yakalar |
|---|---|
| `designSystem.test.ts` | serbest punto, serbest radius, yükselti gölgesi, ölçek dışı başlık, eksik token ölçeği |
| `ContentCard.test.tsx` | kart kökünün yeniden elle yazılması, kayıt dışı en-boy oranı, iskeletin karttan ayrışması |
| `check:a11y` | dokunmatik hedef ölçüsü, adsız ikon kontrolü |
| `check:budgets` | ilk rota JS/CSS bütçesi |
| `check:viewports` | yatay taşma, fold üstü içerik *(henüz zincirde değil)* |

Bu testlerin çoğu bileşen değil **kaynak** ölçüyor. Bileşen testi
`ContentCard`ın doğru çalıştığını gösterir ama kimsenin yarın kendi
kartını yazmayacağını göstermez — sorun tam olarak buydu.
