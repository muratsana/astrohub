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
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`konsol: ${m.text()}`);
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

await browser.close();

const all = [...problems, ...failures];
if (all.length > 0) {
  console.error('ÖNİZLEME BOZUK:\n  ' + all.join('\n  '));
  process.exit(1);
}

console.log(
  `önizleme sağlam · h1 "${h1}" · ${textLength} karakter · ${routes.length} modül gezildi`
);
