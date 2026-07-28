/**
 * IŞIK KİRLİLİĞİ HARİTASI EKRAN GÖRÜNTÜSÜ.
 *
 * Tek dosya önizleme derlemesi katı CSP altında çalışıyor ve dış kökene
 * hiç istek yapamıyor — harita orada asla yüklenmez. Haritanın gerçekten
 * çalıştığını görmenin tek yolu gerçek derlemeyi bir sunucudan açmak.
 *
 * Kullanım:
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/shot-map.mjs dist-preview/screens/isik-kirliligi.png
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { findChromium } from './browser.mjs';

const out = process.argv[2] ?? 'dist-preview/screens/isik-kirliligi.png';
const origin = process.env.PREVIEW_ORIGIN ?? 'http://localhost:4173';

mkdirSync(path.dirname(out), { recursive: true });

/*
 * `browser.mjs`'teki ortak başlatıcı vekil kullanmıyor: E2E ve önizleme
 * denetimi bilinçli olarak ağsız çalışıyor. Burada tam tersi gerekiyor —
 * amaç haritanın gerçekten yüklendiğini görmek. Vekil adresi ortamdan
 * geliyor; tanımlı değilse doğrudan çıkış denenir.
 */
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
const executablePath = findChromium();

const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    ...(proxy
      ? [
          `--proxy-server=${proxy}`,
          /* Yerel sunucu vekilden geçmemeli; geçerse istek kendi
             kendine döner ve sayfa hiç açılmaz. */
          '--proxy-bypass-list=localhost;127.0.0.1',
        ]
      : []),
  ],
  ignoreHTTPSErrors: true,
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
const page = await context.newPage();

const problems = [];
page.on('requestfailed', (request) => {
  if (request.url().includes('lightpollutionmap')) {
    problems.push(`${request.url()} → ${request.failure()?.errorText}`);
  }
});

await page.goto(`${origin}/araclar/isik-kirliligi`, {
  waitUntil: 'domcontentloaded',
  timeout: 60_000,
});

/* Üçüncü taraf çerçevesi onayla yükleniyor; ekran görüntüsü için onayı
   veriyoruz. Onay düğmesi yoksa tercih zaten saklanmış demektir. */
const consent = await page.$('button:has-text("Haritayı yükle")');
if (consent) {
  await consent.click();
}

await page.waitForTimeout(12_000);
await page.screenshot({ path: out });

const frames = page
  .frames()
  .map((f) => f.url())
  .filter((url) => url.includes('lightpollutionmap'));

console.log(`ekran görüntüsü · ${out}`);
console.log(`harita çerçevesi · ${frames.length > 0 ? frames[0] : 'YÜKLENMEDİ'}`);
if (problems.length > 0) console.log('istek hataları:', problems.join(' · '));

await browser.close();
