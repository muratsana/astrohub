/**
 * ═══════════════════════════════════════════════════════════════════════
 * ALAN KULLANIMI DENETİMİ — 11 çözünürlükte ölçülen (Faz 2.3)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Ana görev belgesi §5.3 üç somut kural koyuyor:
 *
 *   · Header + navbar + hero toplamı düşük çözünürlükte BÜTÜN ilk ekranı
 *     kaplamamalıdır.
 *   · 1366×768 ve 1280×720'de ana içeriğin ANLAMLI bir bölümü fold
 *     üzerinde görünmelidir.
 *   · Büyük ekranlarda içerik aşırı yayılmamalıdır.
 *
 * NEDEN GÖZLE DEĞİL
 *
 * "Hero çok yer kaplıyor" bir izlenim; hangi çözünürlükte, ne kadar
 * kaplıyor ve fold'un altında ne kalıyor — bunlar sayı. Kabuk yüksekliği
 * yapışkan konumlandırmadan, hero yüksekliği içerikten ve kırılma
 * noktasından geliyor; ikisinin toplamı hiçbir dosyada yazmıyor. Ölçüm
 * `getBoundingClientRect` ile yapılıyor.
 *
 * DOKUNMATİK HEDEFLER BURADA DEĞİL: onları `check:a11y` zaten gerçek
 * tarayıcıda ölçüyor (WCAG 2.5.5 ikon kontrolleri için 44×44, 2.5.8 her
 * kontrol için 24×24). İki yerde ölçmek, iki eşiğin bir gün ayrışması
 * demek.
 *
 * Kullanım:  npm run build:preview && node scripts/check-viewports.mjs
 */
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { launchBrowser } from './browser.mjs';

const FILE = path.resolve('dist-preview/index.html');
if (!existsSync(FILE)) {
  console.error('dist-preview/index.html yok — önce `npm run build:preview`.');
  process.exit(1);
}
const BASE = pathToFileURL(FILE).href;

/* Belgedeki matrisin tamamı. Sıra dar → geniş: bir kural kırıldığında
   hangi kırılma noktasında kırıldığı okunabilsin. */
const VIEWPORTS = [
  { w: 320, h: 568, ad: 'iPhone SE (1.nesil)' },
  { w: 375, h: 667, ad: 'iPhone 8' },
  { w: 390, h: 844, ad: 'iPhone 14' },
  { w: 414, h: 896, ad: 'iPhone 11 Pro Max' },
  { w: 768, h: 1024, ad: 'iPad dikey' },
  { w: 1024, h: 768, ad: 'iPad yatay' },
  { w: 1280, h: 720, ad: 'HD dizüstü' },
  { w: 1366, h: 768, ad: 'yaygın dizüstü' },
  { w: 1440, h: 900, ad: 'MacBook' },
  { w: 1920, h: 1080, ad: 'Full HD' },
  { w: 2560, h: 1440, ad: 'QHD' },
];

/*
 * Ana sayfa hero taşıyan tek sayfa ve §5.3'ün asıl hedefi. Galeri, ilk
 * ekranı sayfa başlığı + araç çubuğu + kart ızgarası olan tipik liste
 * sayfası — hero'suz durumun karşılığı.
 */
const SAYFALAR = [
  { ad: 'Ana sayfa', hash: '#/' },
  { ad: 'Galeri', hash: '#/galeri' },
];

/*
 * EŞİKLER.
 *
 * `MIN_FOLD_ICERIK` — belgede özel olarak anılan iki dizüstü
 * çözünürlüğünde "anlamlı bölüm" sayısallaştırıldı: 120px. Bir kart
 * satırının üst şeridi ve başlığı bu yükseklikte okunuyor; 40–50px
 * yalnızca bir kenar çizgisi gösterir ve "anlamlı" sayılmaz.
 */
const MIN_FOLD_ICERIK = 120;

/*
 * `MAX_BASLIK_ORANI` — kabuk + hero, ilk ekranın en fazla %70'ini
 * kaplayabilir. Kalan %30, altındaki bloğun başlığının görünmesine ve
 * kullanıcının sayfanın devam ettiğini anlamasına yetiyor.
 */
const MAX_BASLIK_ORANI = 0.7;
const ODAK_GENISLIKLER = [1280, 1366];

const browser = await launchBrowser();
const hatalar = [];
const satirlar = [];

for (const sayfa of SAYFALAR) {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
    });
    const page = await context.newPage();
    await page.goto(`${BASE}${sayfa.hash}`, { waitUntil: 'load' });
    await page.waitForSelector('main', { timeout: 15_000 });
    /* Yazı tipleri ve ilk boyama otursun; hero yüksekliği font
       yüklenmeden ölçülürse gerçek değerden sapar. */
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(180);

    const o = await page.evaluate(() => {
      const main = document.querySelector('main');

      /* Yapışkan kabuk: `position: sticky|fixed` taşıyan, sayfanın
         tepesinde duran ve neredeyse tam genişlik kaplayan ilk eleman.
         Sınıf adına değil hesaplanan stile bakılıyor. */
      const kabukEl = [...document.querySelectorAll('body *')].find((el) => {
        const s = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return (
          (s.position === 'sticky' || s.position === 'fixed') &&
          r.top <= 1 &&
          r.height > 0 &&
          r.width > window.innerWidth * 0.9
        );
      });
      const kabuk = kabukEl ? kabukEl.getBoundingClientRect().height : 0;

      /*
       * BAŞLIK BLOĞU = sayfanın `<h1>`i. Hero taşıyan sayfada hero
       * başlığı, taşımayanda sayfa başlığı. `main`in ilk çocuğuna
       * bakmak YANLIŞ sonuç veriyordu: galeri gibi sayfalarda o çocuk
       * bütün sayfayı saran bir kap ve yüksekliği 1900px çıkıyordu.
       */
      const h1 = main?.querySelector('h1');
      const baslikAlt = h1 ? h1.getBoundingClientRect().bottom : kabuk;

      /*
       * İÇERİK = başlıktan SONRA başlayan ilk gerçek içerik birimi:
       * bir kart (`li`) ya da bir bölüm başlığı (`h2`). Filtre çubuğu ve
       * açıklama metni sayılmıyor — belge "ana içeriğin anlamlı bir
       * bölümü" diyor, araç çubuğu ana içerik değil.
       */
      const adaylar = [...(main?.querySelectorAll('li, h2') ?? [])];
      const icerikEl = adaylar.find((el) => {
        const r = el.getBoundingClientRect();
        return r.height > 24 && r.top >= baslikAlt - 1;
      });
      const icerikUst = icerikEl
        ? icerikEl.getBoundingClientRect().top
        : window.innerHeight;

      /*
       * CAROUSEL KONTROLLERİ METNİN ÜSTÜNE BİNİYOR MU (§6.3).
       *
       * Ölçüm gerekliydi: oklar `absolute` konumlu ve metin sütununun
       * dolgusuyla ilişkileri hiçbir dosyada yazmıyor. İlk ölçümde HER
       * genişlikte örtüşme çıktı — 320px'te 36×19px, 1920px'te bile
       * 8×44px.
       */
      /*
       * CAROUSEL'İN BÜTÜN KONTROLLERİ — yalnızca oklar değil.
       *
       * İlk yazımda seçici `button[aria-label$="slayt"]`di, yani sadece
       * okları buluyordu. Sonra carousel'e bir "otomatik geçişi durdur"
       * düğmesi ekledim ve o düğme mobilde CTA'nın altına bindi — kapı
       * fark etmedi, ekran görüntüsü fark etti. Kural artık carousel
       * bölgesindeki HER düğmeyi kapsıyor.
       */
      const carousel = document.querySelector('[aria-roledescription="carousel"]');
      const oklar = [...(carousel?.querySelectorAll('button') ?? [])]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);
      /*
       * Carousel'deki BÜTÜN metin: başlık, alt metin ve CTA.
       *
       * İKİ KEZ YANLIŞ SEÇTİM, ikisi de kuralı sessizce yarım bıraktı:
       *   1. `h1 ~ * p` kardeş seçicisi — alt metin h1'in kardeşi değil.
       *   2. `h1.closest('div')` — o div, h1'i saran `Editable`
       *      sarmalayıcısı; içinde h1'den başka bir şey yok.
       * İkisinde de sonuç "yalnızca h1" oldu ve CTA hiç ölçülmedi.
       *
       * Artık carousel bölgesinin kendisinden iniliyor. Düğmelerin
       * İÇİNDEKİ metin dışarıda: bir düğmenin kendi etiketiyle
       * "örtüşmesi" anlamsız.
       */
      const metinler = [...(carousel?.querySelectorAll('h1, p, a') ?? [])]
        .filter((el) => !el.closest('button'))
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.width > 0 && r.height > 0);

      let okOrtusmesi = 0;
      for (const ok of oklar) {
        for (const m of metinler) {
          const x = Math.min(ok.right, m.right) - Math.max(ok.left, m.left);
          const y = Math.min(ok.bottom, m.bottom) - Math.max(ok.top, m.top);
          if (x > 0 && y > 0) okOrtusmesi = Math.max(okOrtusmesi, Math.round(x * y));
        }
      }

      return {
        okOrtusmesi,
        kabuk: Math.round(kabuk),
        baslikAlt: Math.round(baslikAlt),
        icerikUst: Math.round(icerikUst),
        /* Fold üstünde görünen içerik yüksekliği. */
        foldIcerik: Math.round(Math.max(0, window.innerHeight - icerikUst)),
        /* Yatay taşma: responsive kırılmanın en sert belirtisi.
           1px pay yuvarlama için. */
        yatayTasma: Math.max(
          0,
          document.documentElement.scrollWidth - window.innerWidth - 1
        ),
      };
    });

    const oran = o.foldIcerik / vp.h;
    satirlar.push(
      `${sayfa.ad.padEnd(10)} ${String(vp.w).padStart(4)}×${String(vp.h).padEnd(5)} ` +
        `kabuk ${String(o.kabuk).padStart(3)}  başlık altı ${String(o.baslikAlt).padStart(4)}  ` +
        `içerik başlangıcı ${String(o.icerikUst).padStart(4)}  ` +
        `fold üstü içerik ${String(o.foldIcerik).padStart(4)}px (%${Math.round(oran * 100)})` +
        (o.yatayTasma ? `  ⚠ yatay taşma ${o.yatayTasma}px` : '')
    );

    const yer = `${sayfa.ad} · ${vp.w}×${vp.h}`;

    if (o.yatayTasma > 0) {
      hatalar.push(`${yer}: yatay taşma ${o.yatayTasma}px — sayfa yana kayıyor`);
    }

    /*
     * KURAL D — belge: "Mevcut sağ/sol kontroller içerik ve yazıların
     * üzerine gelmemelidir." Sıfır tolerans: 1px örtüşme bile okun
     * metnin üstünde durduğu anlamına gelir.
     */
    if (o.okOrtusmesi > 0) {
      hatalar.push(
        `${yer}: carousel kontrolü metnin üstüne biniyor (${o.okOrtusmesi}px² örtüşme)`
      );
    }
    /*
     * KURAL B — belge: "Header + navbar + hero toplamı düşük çözünürlükte
     * BÜTÜN ilk ekranı kaplamamalıdır." Her genişlikte geçerli.
     */
    if (o.baslikAlt > vp.h * MAX_BASLIK_ORANI) {
      hatalar.push(
        `${yer}: kabuk + hero ilk ekranın %${Math.round((o.baslikAlt / vp.h) * 100)}'ini ` +
          `kaplıyor (üst sınır %${Math.round(MAX_BASLIK_ORANI * 100)})`
      );
    }

    /*
     * KURAL C — belge YALNIZCA iki dizüstü çözünürlüğünü adıyla anıyor:
     * "1366×768 ve 1280×720'de ana içeriğin anlamlı bir bölümü fold
     * üzerinde görünmelidir."
     *
     * Bu kuralı bütün genişliklere yaymak, belgenin istemediği bir şeyi
     * istemek olurdu — telefonda hero'nun altında modülün başlaması
     * beklenmiyor, ilk ekranı kaplamaması bekleniyor (Kural B). Ölçüm
     * yine de her genişlikte raporlanıyor; kapı yalnızca burada iniyor.
     */
    if (ODAK_GENISLIKLER.includes(vp.w) && o.foldIcerik < MIN_FOLD_ICERIK) {
      hatalar.push(
        `${yer}: fold üstünde yalnızca ${o.foldIcerik}px içerik var ` +
          `(içerik ${o.icerikUst}px'de başlıyor, gereken ≥${MIN_FOLD_ICERIK}px)`
      );
    }

    await context.close();
  }
}

await browser.close();

console.log(satirlar.join('\n'));
console.log('');

if (hatalar.length) {
  console.error(`Alan kullanımı kapısı DÜŞTÜ · ${hatalar.length} bulgu:`);
  for (const h of hatalar) console.error(`  ✗ ${h}`);
  process.exit(1);
}

console.log(
  `Alan kullanımı kapısı geçildi · ${SAYFALAR.length} sayfa × ${VIEWPORTS.length} çözünürlük`
);
