# Kutup Hizalaması — entegrasyon paketi

Next.js için hazır, bağımlılığı en aza indirilmiş bir içerik paketi.
15 bölümlük Türkçe teknik makale + 11 SVG görsel + 4 interaktif araç
(canlı simülatör, PHD2 grafik teşhis aracı ve iki hesaplayıcı).

**Drizzle ve SNR rehberi paketleriyle aynı tasarım sistemini kullanır** — üçü de
`.dz-root` altında, aynı CSS dosyasıyla çalışır.

---

## 1. Paket içeriği

```
content/
  kutup-hizalamasi.mdx      ← ÖNERİLEN: bileşenli sürüm (React ile tam interaktif)
  kutup-hizalamasi.md       ← saf Markdown (React gerekmez, vanilla JS ile çalışır)

components/                 ← 'use client' React bileşenleri, sıfır bağımlılık
  index.js                  ← toplu export
  PolarSimulator.jsx        ← canlı simülatör (2 canvas + PHD2 grafiği)
  GraphReader.jsx           ← PHD2 grafiği teşhis aracı (6 senaryo)
  ToleranceCalculator.jsx   ← "ne kadar hassas olmalıyım?"
  DriftCalculator.jsx       ← sürüklenme → hata çevirici
  PhdGraph.jsx              ← ortak PHD2 grafiği (SVG)
  Figure.jsx

lib/
  pa-core.js                ← tüm fizik ve benzetim; DOM kullanmaz

styles/
  astro-article.css         ← .dz-root altına scope'lanmış, dz- önekli
                              (drizzle + SNR + kutup için ORTAK dosya)

public/polar/
  polar.css                 ← aynı dosyanın kopyası (statik servis için)
  figures/fig-01..11.svg    ← infografikler ve yazılım ekranı çizimleri
  widgets/polar-widgets.js  ← React GEREKTİRMEYEN vanilla sürüm

examples/nextjs/            ← çalışan yapılandırma dosyaları
  next.config.mjs
  mdx-components.js
  jsconfig.json
  polar-layout.jsx

standalone/index.html       ← her şey gömülü tek dosya (referans / önizleme)
AI-PROMPT.md                ← entegrasyonu bir AI'ya yaptırmak için hazır prompt
```

---

## 2. Hızlı kurulum (App Router + MDX) — 6 adım

> Drizzle ya da SNR paketini zaten kurduysanız **Adım 1, 2 ve 3'ü atlayın**.
> Doğrudan Adım 4'e geçin ve 6. bölümdeki "üç makale birlikte" notunu okuyun.

### Adım 1 — bağımlılıklar

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react remark-gfm remark-frontmatter
```

> `remark-gfm` **zorunlu** — makalede 11 tablo var, GFM olmadan render edilmez.
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

### Adım 3 — `mdx-components.js` (proje kökünde, App Router için zorunlu)

```js
export function useMDXComponents(components) {
  return { ...components }
}
```

### Adım 4 — dosyaları kopyalayın

```bash
cp -r components/*                 src/components/polar/
cp    lib/pa-core.js               src/lib/
cp    styles/astro-article.css     src/styles/
cp -r public/polar                 public/
cp    content/kutup-hizalamasi.mdx app/blog/kutup-hizalamasi/page.mdx
```

Bileşenler `../lib/pa-core` yolunu kullanır. Klasör yapınız farklıysa tek komutla düzeltin:

```bash
sed -i "s#from '../lib/pa-core'#from '@/lib/pa-core'#g" \
  src/components/polar/*.jsx src/components/polar/index.js
```

### Adım 5 — sarmalayıcı layout

Makale kendi karanlık temasını `.dz-root` altında taşır. Sayfayı bununla sarın
(hazır dosya: `examples/nextjs/polar-layout.jsx`):

```jsx
// app/blog/kutup-hizalamasi/layout.jsx
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
import { PolarSimulator, GraphReader, ToleranceCalculator, DriftCalculator } from '@/components/polar'
import '@/styles/astro-article.css'
```

**Hepsi bu.**

---

## 3. Alternatif: React kullanmadan (saf Markdown)

`content/kutup-hizalamasi.md` kullanın. İnteraktif parçalar şu şekilde işaretlenmiştir:

```html
<div class="dz-root" data-dz-widget="polar-simulator"></div>
```

Sayfaya şu iki dosyayı ekleyin, gerisi otomatik:

```html
<link rel="stylesheet" href="/polar/polar.css">
<script src="/polar/widgets/polar-widgets.js" defer></script>
```

| `data-dz-widget` | Ne yapar |
| --- | --- |
| `polar-simulator` | Canlı simülatör — iki kare (guiding'li/guiding'siz) + PHD2 grafiği |
| `graph-reader` | PHD2 grafiği teşhis aracı — 6 senaryo |
| `tolerance-calculator` | Ekipmanınız için izin verilen hata sınırı |
| `drift-calculator` | Ölçülen sürüklenmeden hata + hangi eksen |

SPA yönlendirmesi kullanıyorsanız yeni içerik DOM'a girdikten sonra:

```js
window.PolarWidgets.init()
```

Vanilla sürüm makale kaynağından **programatik olarak** üretilir; React sürümüyle
davranışı birebir aynıdır.

---

## 4. Görseller

| Dosya | İçerik |
| --- | --- |
| `fig-01.svg` | Dünya'nın dönme ekseni ile montürün RA ekseni arasındaki açı (ε) |
| `fig-02.svg` | Azimut ve yükseklik hatasının gökyüzündeki karşılığı; cos(enlem) tuzağı |
| `fig-03.svg` | Saat açısına göre duyarlılık — sürüklenme ve alan dönmesi tam dik |
| `fig-04.svg` | Alan dönmesi: rehber yıldız etrafında dönme + 1/cos δ eğrisi |
| `fig-05.svg` | **PHD2 Guiding Assistant** panelinin yeniden çizimi |
| `fig-06.svg` | **PHD2 Drift Align** aracının yeniden çizimi |
| `fig-07.svg` | Polarscope retikülü, Polaris'in saati ve kolimasyon hatası |
| `fig-08.svg` | **SharpCap** ayar aşamasının yeniden çizimi |
| `fig-09.svg` | **N.I.N.A. TPPA** panelinin yeniden çizimi |
| `fig-10.svg` | **ASIAIR** kutup hizalama ekranının yeniden çizimi |
| `fig-11.svg` | Yöntem seçme karar ağacı |

> **Yazılım ekranları hakkında.** fig-05, 06, 08, 09 ve 10 gerçek ekran görüntüsü
> **değildir**; telif sorunu doğmasın diye sıfırdan çizilmiş temsilî panellerdir.
> Üzerlerindeki İngilizce etiketler ilgili programın kaynak kodundan (PHD2, TPPA)
> ya da resmî kılavuzundan (SharpCap, ASIAIR) birebir alınmıştır. Bu yüzden bunları
> kendi sitenizde çekinmeden yayımlayabilirsiniz. Gerçek ekran görüntüsü isterseniz
> her figürün altındaki bağlantı sizi resmî belgeye götürür — oradan alacağınız
> görsellerin telif durumunu kendiniz değerlendirmeniz gerekir.

Her biri kendi arka planını (`#1a1a19`, yuvarlatılmış köşe) içerir. Farklı bir yol
kullanacaksanız iki yerde değiştirin: `content/*.md` içindeki `src` değerleri ve
`styles/astro-article.css` içindeki `img[src*="/figures/"]` seçicisi.

---

## 5. Temanızla uyumlu hale getirme

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

Yalnızca widget'ları kullanmak için:

```html
<div class="dz-root dz-widget-only" data-dz-widget="polar-simulator"></div>
```

> **Uyarı:** Simülatörün iki paneli gri tonlamadır ve temadan bağımsızdır.
> `.dz-panels canvas` üzerindeki `image-rendering: auto` kuralını değiştirmeyin —
> `pixelated` yaparsanız yıldızlar kare kare görünür (kareler gerçek piksel
> ölçeğinde, 2× örneklenmiş bir tuvale çizilir).

---

## 6. Üç makaleyi birlikte kullanmak

Drizzle, SNR ve kutup hizalaması rehberleri **aynı** tasarım sistemini paylaşır.
`styles/astro-article.css` üçünün de birleşimidir; **birden fazla kopya yüklemeyin.**

Yapılacak iş:

1. Projenizde `styles/drizzle.css` varsa silin; bu paketteki `styles/astro-article.css`
   onun yerini alır (SNR paketindeki sürümün üstüne de yazın — bu sürüm daha yenidir,
   kutup hizalaması widget sınıflarını da içerir).
2. Üç MDX dosyasının da başındaki CSS import satırını `@/styles/astro-article.css` yapın.
3. `public/*/….css` kopyalarını da aynı içerikle güncelleyin (saf Markdown
   sürümlerini kullanıyorsanız).

Vanilla widget dosyaları (`drizzle-widgets.js`, `snr-widgets.js`, `polar-widgets.js`)
birbirinden bağımsızdır, ayrı global kullanır (`DrizzleWidgets` / `SnrWidgets` /
`PolarWidgets`) ve aynı sayfada yan yana yüklenebilir.

---

## 7. SEO ve erişilebilirlik

- Frontmatter `title`, `description`, `tags`, `readingTime` alanlarını içerir.
- Tüm SVG'lerde `role="img"` ve Türkçe `aria-label` vardır.
- Hesaplayıcı çıktıları `aria-live="polite"` ile duyurulur.
- Simülatör canvas tabanlıdır; sonuçlar ayrıca **metin olarak** da verilir
  (DEC sürüklenmesi, alan dönmesi, köşede iz, PHD2'nin bildireceği değer) — yani
  canvas'ı göremeyen bir kullanıcı da bütün bilgiye erişir.
- Tablolar gerçek `<table>` olarak render edilir (GFM).

---

## 8. Performans

- Bileşenlerin **hiç harici bağımlılığı yoktur**.
- Simülatör ağır hesabı yalnızca ayar değiştiğinde ve `requestAnimationFrame`
  içinde yapar; yıldız damgası (sprite) bir kez üretilip yeniden kullanılır.
- `content/kutup-hizalamasi.mdx` ≈ 65 KB, tüm SVG'ler toplam ≈ 120 KB,
  vanilla widget dosyası ≈ 45 KB (sıkıştırılmamış).
- Bileşenler `'use client'` işaretlidir; makale gövdesi server component kalır.

---

## 9. Doğruluk hakkında

Makaledeki her sayısal iddia birincil kaynaklara karşı doğrulanmıştır (24 bağlantılık
kaynakça makalenin sonundadır). Fizik ayrıca bağımsız bir katı-cisim benzetimiyle
sayısal olarak sınanmış ve Barrett'ın yayımlanmış örnekleri yeniden üretilmiştir
(Denklem 13, Örnek 8: 8.00 µm).

Bilinçli olarak korunan üç nokta — bunlar hata değildir, düzeltmeyin:

1. **`3.8197 = 12/π`** ve bunun gökyüzünü saatte 15° kabul ettiği, yıldız gününe göre
   doğru değerin 3.80929 olduğu. Fark %0.27; makale bunu açıkça söyler.
2. **Deklinasyon sürüklenmesinin hedefin deklinasyonundan bağımsız olduğu**, ve
   PHD2/Barrett'ın `1/cos δ` bölmesinin ölçüm ekvatordan uzakta yapıldığında sonucu
   şişirdiği. Bu, aracın yazarlarıyla bir görüş ayrılığıdır; makale bunu bir
   `<details>` bloğunda açıkça belirtir ve PHD2'nin kendi ipucu metnini de aktarır.
   "PHD2 hatalı" gibi tek yanlı bir ifadeye çevirmeyin.
3. **Alan dönmesindeki `1/cos δ`'nın DOĞRU olduğu.** Sürüklenmedeki cos δ yanlış,
   dönmedeki doğru — ikisi karıştırılmamalı. (Naif "görüş doğrultusundaki bileşen"
   türetimi `cos δ` verir ve yanlıştır; kameranın "yukarı" ekseni montürün
   deklinasyon doğrultusudur.)

Ayrıca: OAG'nin dönme kolunu (ψ) **büyüttüğü** — küçültmediği — ifadesi bilinçlidir.
OAG prizması ana kameranın görüş alanının dışından ışık alır.

---

## 10. Sorun giderme

| Belirti | Sebep / çözüm |
| --- | --- |
| Tablolar düz metin görünüyor | `remark-gfm` eklenmemiş |
| Sayfanın başında `---` ve YAML metni görünüyor | `remark-frontmatter` eklenmemiş |
| `Unexpected character '2' … expected a character that can start a name` | MDX `<2′` ifadesini JSX etiketi sanıyor. Bu pakette `&lt;` olarak kaçırılmıştır; elle düzenlerken aynısını yapın |
| `does not have serializable options` | Turbopack kullanıyorsunuz; remark eklentilerini **string** olarak verin |
| Widget'lar boş `<div>` olarak kalıyor | `polar-widgets.js` yüklenmemiş ya da SPA sonrası `PolarWidgets.init()` çağrılmamış |
| Etiketlerde "(MM)" yazıyor, "(µm)" değil | Temanız `text-transform: uppercase` uyguluyor. `.dz-fld label { text-transform: none }` |
| Simülatör panellerinde yıldızlar kare kare | `image-rendering: pixelated` devrede. `.dz-panels canvas { image-rendering: auto }` |
| Görseller 404 | `public/polar/` kopyalanmamış ya da `basePath` kullanıyorsunuz |
| Pill düğmeleri gri kutu gibi görünüyor | CSS yüklenmemiş; ya da tarayıcıda eski bir stil önbelleği var — sunucuyu yeniden başlatın |
| Drizzle/SNR makalelerinin stilleri bozuldu | Birden fazla CSS kopyası yüklediniz. 6. bölüme bakın — tek `astro-article.css` kalmalı |
