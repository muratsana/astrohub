# Astrofotoğrafta SNR — entegrasyon paketi

Next.js için hazır, bağımlılığı en aza indirilmiş bir içerik paketi.
15 bölümlük Türkçe teknik makale + 7 SVG infografik + 4 interaktif araç.

**Drizzle rehberi paketiyle aynı tasarım sistemini kullanır** — ikisi de `.dz-root`
altında, aynı CSS dosyasıyla çalışır. İkinci makaleyi kurarken tema işini
tekrar yapmanız gerekmez.

---

## 1. Paket içeriği

```
content/
  snr-rehberi.mdx           ← ÖNERİLEN: bileşenli sürüm (React ile tam interaktif)
  snr-rehberi.md            ← saf Markdown (React gerekmez, vanilla JS ile çalışır)

components/                 ← 'use client' React bileşenleri, sıfır bağımlılık
  index.js                  ← toplu export
  Figure.jsx
  SnrSimulator.jsx          ← canlı SNR simülatörü (3 canvas + gürültü bütçesi)
  ObjectComparison.jsx      ← Hesaplayıcı 1 — iki objeyi karşılaştır
  SubExposureCalculator.jsx ← Hesaplayıcı 2 — poz süresi alt sınırı
  IntegrationPlanner.jsx    ← Hesaplayıcı 3 — entegrasyon planlayıcı

lib/
  snr-core.js               ← tüm fizik ve simülasyon; DOM kullanmaz

styles/
  astro-article.css         ← .dz-root altına scope'lanmış, dz- önekli
                              (drizzle.css'in genelleştirilmiş hâli — ikisi için de)

public/snr/
  snr.css                   ← aynı dosyanın kopyası (statik servis için)
  figures/fig-01..07.svg    ← infografikler (bağımsız, arka planı gömülü)
  widgets/snr-widgets.js    ← React GEREKTİRMEYEN vanilla sürüm

examples/nextjs/            ← çalışan yapılandırma dosyaları
  next.config.mjs
  mdx-components.js
  jsconfig.json
  snr-layout.jsx

standalone/index.html       ← her şey gömülü tek dosya (referans / önizleme)
AI-PROMPT.md                ← entegrasyonu bir AI'ya yaptırmak için hazır prompt
```

---

## 2. Hızlı kurulum (App Router + MDX) — 6 adım

> Drizzle paketini zaten kurduysanız **Adım 1, 2 ve 3'ü atlayın** — o iş bir kez yapılır.
> Doğrudan Adım 4'e geçin ve 6. bölümdeki "iki makale birlikte" notunu okuyun.

### Adım 1 — bağımlılıklar

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react remark-gfm remark-frontmatter
```

> `remark-gfm` **zorunlu** — makalede 15 tablo var, GFM olmadan render edilmez.
> `remark-frontmatter` MDX'in dosya başındaki YAML bloğunu metin sanmasını engeller.

### Adım 2 — `next.config.mjs`

```js
import createMDX from '@next/mdx'

// Turbopack (Next 15/16 varsayılanı) remark eklentilerini STRING olarak ister.
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-frontmatter'], ['remark-gfm']],
    rehypePlugins: [],
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = { pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'] }
export default withMDX(nextConfig)
```

> Webpack kullanıyorsanız (`next build --no-turbopack`) eklentileri normal şekilde
> import edip fonksiyon olarak verebilirsiniz: `remarkPlugins: [remarkFrontmatter, remarkGfm]`

### Adım 3 — `mdx-components.js` (proje kökünde, App Router için zorunlu)

```js
export function useMDXComponents(components) {
  return { ...components }
}
```

### Adım 4 — dosyaları kopyalayın

```bash
cp -r components/*             src/components/snr/
cp    lib/snr-core.js          src/lib/
cp    styles/astro-article.css src/styles/
cp -r public/snr               public/
cp    content/snr-rehberi.mdx  app/blog/snr/page.mdx
```

Bileşenler `../lib/snr-core` yolunu kullanır. Klasör yapınız farklıysa tek
komutla düzeltin:

```bash
sed -i "s#from '../lib/snr-core'#from '@/lib/snr-core'#g" \
  src/components/snr/*.jsx src/components/snr/index.js
```

### Adım 5 — sarmalayıcı layout

Makale kendi karanlık temasını `.dz-root` altında taşır. Sayfayı bununla sarın
(hazır dosya: `examples/nextjs/snr-layout.jsx`):

```jsx
// app/blog/snr/layout.jsx
export default function ArticleLayout({ children }) {
  return (
    <article className="dz-root" style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 120px' }}>
      {children}
    </article>
  )
}
```

### Adım 6 — import yolları

MDX dosyasının başındaki iki blok projenize göre olmalı:

```js
import { SnrSimulator, ObjectComparison, SubExposureCalculator, IntegrationPlanner } from '@/components/snr'
import '@/styles/astro-article.css'
```

`@/` alias'ı yoksa `jsconfig.json`'a ekleyin (örnek dosya `examples/nextjs/` içinde),
ya da göreli yola çevirin.

**Hepsi bu.**

---

## 3. Alternatif: React kullanmadan (saf Markdown)

Makaleyi kendi Markdown boru hattınızdan geçiriyorsanız `content/snr-rehberi.md`
kullanın. İnteraktif parçalar şu şekilde işaretlenmiştir:

```html
<div class="dz-root" data-dz-widget="snr-simulator"></div>
```

Sayfaya şu iki dosyayı ekleyin, gerisi otomatik:

```html
<link rel="stylesheet" href="/snr/snr.css">
<script src="/snr/widgets/snr-widgets.js" defer></script>
```

Kullanılabilir widget adları:

| `data-dz-widget` | Ne yapar |
| --- | --- |
| `snr-simulator` | Canlı SNR simülatörü — 3 panel + gürültü bütçesi |
| `object-comparison` | Hesaplayıcı 1 — iki objenin süre karşılaştırması |
| `subexposure-calculator` | Hesaplayıcı 2 — poz süresi alt sınırı |
| `integration-planner` | Hesaplayıcı 3 — hedef SNR için gereken toplam süre |

SPA yönlendirmesi kullanıyorsanız yeni içerik DOM'a girdikten sonra:

```js
window.SnrWidgets.init()
```

Markdown'ınız ham HTML'e izin vermiyorsa (`rehype-raw` yoksa), `<div>` yerine
kendi shortcode'unuzu koyup aynı `data-dz-widget` niteliğini üretin.

Vanilla sürüm makale kaynağından **programatik olarak** üretilmiştir; React
sürümüyle davranışı birebir aynıdır.

---

## 4. Görseller

7 infografik `public/snr/figures/` altında bağımsız `.svg` dosyalarıdır.
Her biri kendi arka planını (`#1a1a19`, yuvarlatılmış köşe) içerir, yani açık temada
da okunur. Markdown'da normal görsel olarak referans verilir:

```md
![Şekil 1 — …](/snr/figures/fig-01.svg)
```

| Dosya | İçerik |
| --- | --- |
| `fig-01.svg` | Piksel kovası benzetmesi: parlak vs. sönük objede foton sayısı ve dalgalanma |
| `fig-02.svg` | Foton sayısı arttıkça SNR'ın karekök olarak artması |
| `fig-03.svg` | Toplam entegrasyon süresine göre SNR eğrisi (azalan getiri) |
| `fig-04.svg` | Bortle sınıfları → gökyüzü parlaklığı ve göreli foton akısı |
| `fig-05.svg` | Gerçek objelerin yüzey parlaklığı skalası, gökyüzü seviyeleriyle birlikte |
| `fig-06.svg` | CCD ve CMOS okuma mimarilerinin karşılaştırması |
| `fig-07.svg` | Dar bant filtrenin gökyüzü ışığını kesmesi |

Farklı bir yol kullanacaksanız iki yerde değiştirin: `content/*.md` içindeki `src`
değerleri ve `styles/astro-article.css` içindeki `img[src*="/figures/"]` seçicisi.

---

## 5. Temanızla uyumlu hale getirme

### Renkler

Tüm renkler `.dz-root` üzerindeki CSS değişkenlerinden gelir:

```css
.dz-root {
  --dz-bg: #ffffff;
  --dz-surface: #f6f6f4;
  --dz-ink: #111111;
  --dz-ink-2: #3a3a38;
  --dz-ink-3: #6b6b66;
  --dz-line: #e2e2dd;
  --dz-rule: #cfcfc9;
}
```

> **Uyarı:** Grafiklerdeki seri renkleri (mavi/turuncu/yeşil/amber) renk körlüğü
> ayrımı için doğrulanmış bir palettir. Değiştirirseniz komşu renkler arasındaki
> ayrımı yeniden kontrol edin. Simülatörün üç paneli gri tonlamadır ve temadan
> bağımsızdır.

### Sadece widget'ları kullanmak

```html
<div class="dz-root dz-widget-only" data-dz-widget="snr-simulator"></div>
```

React bileşenleri bunu zaten kendileri yapar.

### Çakışma riski

Tüm sınıflar `dz-` öneklidir ve tüm eleman seçicileri (`h2`, `p`, `table`…)
`.dz-root` altına scope'lanmıştır. Global stil sızıntısı yoktur.

---

## 6. Drizzle paketiyle birlikte kullanmak

İki makale **aynı** tasarım sistemini paylaşır. Tek fark şudur:

| | drizzle paketi | bu paket |
| --- | --- | --- |
| CSS dosyası | `styles/drizzle.css` | `styles/astro-article.css` |
| Figür seçicisi | `img[src*="/drizzle/figures/"]` | `img[src*="/figures/"]` |

`astro-article.css`, `drizzle.css`'in genelleştirilmiş hâlidir; **ikisini birden
yüklemeyin**. Yapılacak iş:

1. `styles/drizzle.css` dosyasını `styles/astro-article.css` ile değiştirin.
2. Drizzle MDX'inin başındaki `import '@/styles/drizzle.css'` satırını
   `import '@/styles/astro-article.css'` yapın.
3. `public/drizzle/drizzle.css` dosyasını da aynı içerikle güncelleyin
   (saf Markdown sürümünü kullanıyorsanız).

Vanilla widget dosyaları (`drizzle-widgets.js` ve `snr-widgets.js`) birbirinden
bağımsızdır, ayrı global (`DrizzleWidgets` / `SnrWidgets`) kullanır ve aynı sayfada
yan yana yüklenebilir.

Layout, `.dz-root` sarmalayıcısı ve `mdx-components.js` ikisi için ortaktır.

---

## 7. SEO ve erişilebilirlik notları

- Frontmatter `title`, `description`, `tags`, `readingTime` alanlarını içerir;
  kendi meta üreticinize besleyin.
- Tüm SVG'lerde `role="img"` ve Türkçe `aria-label` vardır.
- Hesaplayıcı çıktıları `aria-live="polite"` ile duyurulur.
- Simülatör canvas tabanlıdır; görme engelli kullanıcılar için sonuçlar ayrıca
  metin olarak (`.dz-verdict` ve sayısal kutular) verilir — SNR değeri, toplam süre,
  obje/gökyüzü oranı ve gürültü bütçesi yüzdeleri hep metin olarak da vardır.
- `prefers-reduced-motion` desteklenir.
- Tablolar gerçek `<table>` olarak render edilir (GFM); ekran okuyucular okur.

---

## 8. Performans

- Bileşenlerin **hiç harici bağımlılığı yoktur** (grafik kütüphanesi, ikon paketi yok).
- Simülatör ağır hesabı yalnızca ayar değiştiğinde ve `requestAnimationFrame` içinde
  yapar; obje şekil haritası önbelleklenir.
- Üç panel 116×116 piksel çizer — 240 karelik yığında bile tek kare bütçesinin içinde kalır.
- `content/snr-rehberi.mdx` ≈ 54 KB, tüm SVG'ler toplam ≈ 90 KB,
  vanilla widget dosyası ≈ 42 KB (sıkıştırılmamış).
- Bileşenler `'use client'` işaretlidir; makale gövdesi server component olarak
  kalır, yalnızca araçlar hidrasyon gerektirir.

---

## 9. Doğruluk hakkında

Makaledeki her sayısal iddia birincil kaynaklara karşı doğrulanmıştır (kaynakça
makalenin sonundadır, 20 bağlantı). Bilinçli olarak korunan üç nokta:

1. **Bortle → mag/arcsec² eşlemesi resmî değildir.** Bortle ölçeği çıplak gözle
   görülebilen sınır kadire dayanır; yüzey parlaklığı karşılıkları farklı
   kaynaklarda **±0.5 kadire** kadar ayrışır. Makale bunu açıkça söyler; "düzeltilmiş"
   tek bir tablo hâline getirmeyin.
2. **Hesaplamalar V bandına göredir.** Filtresiz gerçek bir kamera daha geniş bir
   aralık toplar, yani gerçek süreler bu değerlerden **daha kısadır**. Makale bunu
   belirtir ve tahminlerin güvenli tarafta olduğunu söyler.
3. **Yüzey parlaklıkları mag/arcsec² cinsindendir.** mag/arcmin² veren kaynaklarla
   karşılaştırırken **+8.89** fark vardır. Tablodaki değerler dönüştürülmüştür.

Ayrıca: SNR formülünde okuma gürültüsü terimi `n · RN²` şeklindedir (kare sayısıyla
çarpılır, süreyle değil). Bu, `snrOf()` fonksiyonunda böyledir ve doğrudur.

---

## 10. Sorun giderme

| Belirti | Sebep / çözüm |
| --- | --- |
| Tablolar düz metin görünüyor | `remark-gfm` eklenmemiş |
| Sayfanın başında `---` ve YAML metni görünüyor | `remark-frontmatter` eklenmemiş |
| `Expected a closing tag for <br>` | MDX yalnızca `<br />` kabul eder — bu pakette zaten öyledir, elle düzenlerken dikkat |
| `does not have serializable options` | Turbopack kullanıyorsunuz; remark eklentilerini **string** olarak verin |
| Widget'lar boş `<div>` olarak kalıyor | `snr-widgets.js` yüklenmemiş ya da SPA sonrası `SnrWidgets.init()` çağrılmamış |
| Etiketlerde "(MM)" yazıyor, "(µm)" değil | Temanız `text-transform: uppercase` uyguluyor; mikro işareti büyük harfte Yunan Mu'ya döner. `.dz-fld label { text-transform: none }` |
| Görseller 404 | `public/snr/` kopyalanmamış ya da `basePath` kullanıyorsunuz — yolları güncelleyin |
| Simülatör panelleri bembeyaz | `canvas` üzerinde bir `filter`/`invert` kuralı var; `.dz-panels canvas` seçicisini kontrol edin |
| Simülatör panelleri siyah | Tarayıcıda canvas 2D bağlamı engellenmiş; ayrıca `canvas { aspect-ratio: 1/1 }` kuralının ezilmediğinden emin olun |
| Drizzle makalesinin figürleri kayboldu | İki CSS dosyasını birden yüklediniz. 6. bölüme bakın — sadece `astro-article.css` kalmalı |
