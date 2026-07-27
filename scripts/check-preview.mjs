/**
 * ÖNİZLEME DUMAN TESTİ.
 *
 * `dist-preview/index.html` tek dosya derlemesini gerçek bir tarayıcıda açar
 * ve uygulamanın gerçekten boyandığını doğrular.
 *
 * Neden gerekli: birim testleri bileşenleri jsdom'da ayrı ayrı render eder
 * ve paketleme adımını hiç görmez. Tek dosya derlemesine özgü bir hata
 * (ör. çözümlenmemiş `__VITE_PRELOAD__` yer tutucusu) tüm testler yeşilken
 * önizlemeyi tamamen boş ekrana düşürebilir — bir kez düşürdü de.
 *
 * Kontroller:
 *   1. Konsolda ve sayfada hiçbir hata olmamalı
 *   2. #root boş kalmamalı
 *   3. Sayfada anlamlı miktarda metin bulunmalı
 *   4. İlk hero başlığı görünmeli
 *   5. Ana modüllerin tamamı gezilebilmeli
 */
import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const FILE = path.resolve('dist-preview/index.html');
if (!existsSync(FILE)) {
  console.error('dist-preview/index.html yok — önce `npm run build:preview`.');
  process.exit(1);
}

/**
 * Ortamda hazır kurulu bir Chromium varsa onu kullan. Playwright'ın kendi
 * indirdiği sürüm bulunmadığında (kurumsal/sandbox ortamlar) kurulum
 * beklemek yerine mevcut ikiliye düşülür.
 */
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;

  for (const dir of readdirSync(root)) {
    for (const candidate of [
      path.join(root, dir, 'chrome-linux', 'chrome'),
      path.join(root, dir, 'chrome-linux', 'headless_shell'),
    ]) {
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

const executablePath = findChromium();
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const problems = [];

/**
 * Dış servise ulaşamamak uygulama hatası değildir.
 *
 * Önizleme `file://` üzerinden açılıyor ve hava servisi (Open-Meteo) çağrısı
 * ağı olmayan/kısıtlı ortamlarda başarısız oluyor. Beklenen davranış zaten
 * bu: değerler "—" gösterilir ve sayfa çalışmaya devam eder. Bu satırları
 * hata saymak, testi ortamın ağına bağımlı hâle getirir.
 *
 * Uygulamanın KENDİ hataları (React, render, çözümlenmemiş değişken)
 * `pageerror` olarak gelir ve hiçbir biçimde göz ardı edilmez.
 */
const NETWORK_NOISE = /ERR_TUNNEL_CONNECTION_FAILED|ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|Failed to fetch|net::ERR_/;

page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const text = m.text();
  if (NETWORK_NOISE.test(text)) return;
  problems.push(`konsol: ${text}`);
});
page.on('pageerror', (e) => problems.push(`sayfa hatası: ${e.message}`));

const base = pathToFileURL(FILE).href;
await page.goto(base, { waitUntil: 'load' });
await page.waitForTimeout(2000);

const failures = [];

const rootChildren = await page
  .$eval('#root', (el) => el.children.length)
  .catch(() => 0);
if (rootChildren === 0) failures.push('#root boş — uygulama boyanmadı');

const textLength = await page.evaluate(() => document.body.innerText.length);
if (textLength < 500) failures.push(`sayfada yalnızca ${textLength} karakter metin var`);

const h1 = await page.$eval('h1', (el) => el.textContent?.trim()).catch(() => null);
if (!h1) failures.push('h1 bulunamadı');

/**
 * Türkçe duyarlı karşılaştırma. JS'in varsayılan `toLowerCase()` metodu
 * "İ" harfini "i" değil "i̇" (i + birleşen nokta) yapar; bu yüzden
 * "İlanlar" başlığı naif bir `/ilan/i` testiyle eşleşmez.
 */
function includesTr(haystack, needle) {
  return haystack.toLocaleLowerCase('tr-TR').includes(needle);
}

// Her ana modül gezilebilmeli (hash router).
const routes = [
  ['/galeri', 'galeri'],
  ['/etkinlikler', 'etkinlik'],
  ['/haberler', 'haber'],
  ['/yazilar', 'yazı'],
  ['/araclar', 'araç'],
  ['/ilanlar', 'ilan'],
  ['/saha', 'gözlem'],
];

for (const [route, expected] of routes) {
  await page.evaluate((r) => {
    location.hash = `#${r}`;
  }, route);
  await page.waitForTimeout(600);
  const heading = await page
    .$eval('h1', (el) => el.textContent ?? '')
    .catch(() => '');
  if (!includesTr(heading, expected)) {
    failures.push(
      `${route}: başlıkta "${expected}" yok (bulunan: "${heading.trim()}")`
    );
  }
}

/**
 * YATAY TAŞMA DENETİMİ.
 *
 * Sayfa gövdesi hiçbir genişlikte yana kaymamalı. Tek bir `whitespace-nowrap`
 * ya da sabit genişlikli öğe bunu sessizce bozuyor ve birim testleri
 * yakalamıyor — jsdom düzen hesaplamıyor. 390px'te gerçek bir hata bulundu
 * (üst çubuğun sağ kümesi 21px taşıyordu), bu yüzden kalıcı kontrol.
 *
 * Yalnızca ÖNİZLEME derlemesinde var olan editör paneli hariç tutulur:
 * kapalıyken `translate-x-full` ile ekran dışında park eder ve üretim
 * paketine hiç girmez.
 */
const widths = [390, 768, 1024, 1440];
for (const width of widths) {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ['/', '/galeri', '/forum', '/radyo', '/etkinlikler']) {
    await page.evaluate((r) => {
      location.hash = `#${r}`;
    }, route);
    await page.waitForTimeout(350);

    const offenders = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth;
      const inPreviewEditor = (el) => el.closest('[aria-label="Önizleme editörü"]') !== null;
      const clipped = (el) => {
        for (let p = el.parentElement; p; p = p.parentElement) {
          const x = getComputedStyle(p).overflowX;
          if (x === 'auto' || x === 'scroll' || x === 'hidden') return true;
        }
        return false;
      };
      const out = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right <= limit + 1) continue;
        if (clipped(el) || inPreviewEditor(el)) continue;
        out.push(
          `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> ${Math.round(r.right - limit)}px`
        );
      }
      return out.slice(0, 3);
    });

    if (offenders.length > 0) {
      failures.push(`${width}px ${route}: yatay taşma — ${offenders.join(' | ')}`);
    }
  }
}
await page.setViewportSize({ width: 1440, height: 950 });

await browser.close();

const all = [...problems, ...failures];
if (all.length > 0) {
  console.error('ÖNİZLEME BOZUK:\n  ' + all.join('\n  '));
  process.exit(1);
}

console.log(
  `önizleme sağlam · h1 "${h1}" · ${textLength} karakter · ${routes.length} modül gezildi`
);
