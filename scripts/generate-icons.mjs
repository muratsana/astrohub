/**
 * PWA VE UYGULAMA İKONLARINI ÜRETİR.
 *
 * Kaynak tek bir dosyadır: `public/favicon.svg`. İşaret değiştiğinde bu
 * betik yeniden çalıştırılır ve tüm boyutlar yeniden üretilir — ikonlar
 * elle güncellenmediği için birbirinden ayrı düşemez.
 *
 * Üretilenler:
 *   icon-192.png           Android ana ekran
 *   icon-512.png           mağaza/yükleme istemi
 *   icon-512-maskable.png  Android adaptif kırpma (güvenli alan payıyla)
 *   apple-touch-icon.png   iOS ana ekran (180×180)
 *
 * Maskable sürümde işaret %78'e küçültülür: Android ikonu daireye ya da
 * squircle'a kırpar; tam boy çizilirse çerçevenin köşeleri kesilir.
 *
 * Kullanım: node scripts/generate-icons.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Ortamda hazır kurulu Chromium varsa onu kullan (bkz. check-preview.mjs). */
function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!root || !existsSync(root)) return undefined;
  for (const dir of readdirSync(root)) {
    const candidate = path.join(root, dir, 'chrome-linux', 'chrome');
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

// Yorumlar çıkarılır — setContent'e giren SVG olabildiğince yalın olsun.
const mark = readFileSync('public/favicon.svg', 'utf8').replace(
  /<!--[\s\S]*?-->/g,
  ''
);

const targets = [
  { file: 'public/icon-192.png', size: 192, scale: 1 },
  { file: 'public/icon-512.png', size: 512, scale: 1 },
  { file: 'public/icon-512-maskable.png', size: 512, scale: 0.78 },
  { file: 'public/apple-touch-icon.png', size: 180, scale: 1 },
];

const executablePath = findChromium();
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

for (const { file, size, scale } of targets) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0}
       .wrap{width:${size}px;height:${size}px;display:grid;place-items:center;background:#07090b}
       svg{width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px}
     </style><div class="wrap">${mark}</div>`
  );
  await page.waitForTimeout(150);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`${file} · ${size}×${size}${scale < 1 ? ' (maskable)' : ''}`);
}

await browser.close();
