/**
 * YERLEŞİM ÖLÇÜM ARACI.
 *
 * "Kartlar eşit değil" ve "navbar okunmuyor" gibi şikâyetler iki kez gözle
 * doğrulanmaya çalışıldı ve iki kez kaçtı. Sebep basit: kart yüksekliği
 * içerikten geliyor, tarayıcıda 15px'lik fark göze çarpmıyor ama sayfadan
 * sayfaya geçince "bir şey tutmuyor" hissi veriyor. Bu araç göz yerine
 * `getBoundingClientRect` kullanır.
 *
 * Kullanım:
 *   npm run build
 *   npx vite preview --port 4173 --host 127.0.0.1 &
 *   node scripts/measure-layout.mjs           # kart ızgaraları
 *   node scripts/measure-layout.mjs --nav     # üst çubuk / taşma
 *
 * CSS Grid aynı satırdaki karoları zaten eşitler; bu yüzden rapor satır
 * satık değil, SAYFA BAŞINA TEK YÜKSEKLİK bekler. Birden fazla değer
 * çıkması `auto-rows-fr` ya da `h-full` zincirinde bir kopukluk demektir.
 */
import { chromium } from 'playwright';
import { findChromium } from './browser.mjs';

const origin = process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:4173';
const navMode = process.argv.includes('--nav');

/* Aynı ızgara ailesini kullanan sayfalar bir arada — beklenen şey, bir
   ailenin bütün sayfalarının aynı genişlik ve yüksekliği vermesi. */
const cardPages = [
  { ad: 'Haberler', yol: '/haberler', aile: 'editöryel' },
  { ad: 'Etkinlikler', yol: '/etkinlikler', aile: 'editöryel' },
  { ad: 'Yazılar', yol: '/yazilar', aile: 'editöryel' },
  { ad: 'Galeri', yol: '/galeri', aile: 'katalog' },
  { ad: 'İlanlar', yol: '/ilanlar', aile: 'katalog' },
  { ad: 'Ekipman', yol: '/ekipman', aile: 'katalog' },
  { ad: 'Hedefler', yol: '/hedefler', aile: 'katalog' },
  { ad: 'Topluluklar', yol: '/topluluklar', aile: 'katalog' },
  { ad: 'Saha', yol: '/saha', aile: 'katalog' },
];

const browser = await chromium.launch({ executablePath: findChromium() });

if (navMode) {
  console.log('genişlik  nav    giriş punto   şerit  taşma');
  for (const w of [1920, 1440, 1280, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Ana navigasyon"]');
      const linkler = nav ? [...nav.querySelectorAll('a')] : [];
      const cs = linkler[0] ? getComputedStyle(linkler[0]) : null;
      const de = document.documentElement;
      return {
        acik: nav ? getComputedStyle(nav).display !== 'none' : false,
        sayi: linkler.length,
        punto: cs?.fontSize ?? '-',
        serit: nav ? Math.round(nav.getBoundingClientRect().width) : 0,
        tasma: Math.round(de.scrollWidth - de.clientWidth),
      };
    });
    console.log(
      `${String(w).padEnd(9)} ${(r.acik ? 'açık' : 'gizli').padEnd(6)} ` +
        `${String(r.sayi).padEnd(5)} ${r.punto.padEnd(7)} ` +
        `${String(r.serit).padEnd(6)} ${r.tasma}px`
    );
    await page.close();
  }
} else {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  let aile = '';
  for (const { ad, yol, aile: a } of cardPages) {
    if (a !== aile) {
      aile = a;
      console.log(`\n── ${aile.toUpperCase()} AİLESİ ──`);
    }
    await page.goto(`${origin}${yol}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);

    const r = await page.evaluate(() => {
      const ul = [...document.querySelectorAll('ul')].find(
        (u) =>
          u.className.includes('grid') &&
          u.querySelectorAll(':scope > li').length >= 3
      );
      if (!ul) return null;
      const kartlar = [...ul.querySelectorAll(':scope > li')]
        .map((li) => li.firstElementChild?.getBoundingClientRect())
        .filter(Boolean);
      return {
        sayi: kartlar.length,
        genislikler: [...new Set(kartlar.map((r) => Math.round(r.width)))],
        yukseklikler: [...new Set(kartlar.map((r) => Math.round(r.height)))].sort(
          (x, y) => x - y
        ),
      };
    });

    if (!r) {
      console.log(`  ${ad.padEnd(13)} ızgara bulunamadı`);
      continue;
    }
    const esit = r.yukseklikler.length === 1 ? '✓' : '✗ FARKLI';
    console.log(
      `  ${ad.padEnd(13)} karo=${String(r.sayi).padEnd(4)} ` +
        `genişlik=${r.genislikler.join('/').padEnd(8)} ` +
        `yükseklik=${r.yukseklikler.join('/').padEnd(12)} ${esit}`
    );
  }
  await page.close();
}

await browser.close();
