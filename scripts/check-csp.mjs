#!/usr/bin/env node
/**
 * CSP'Yİ GERÇEK TARAYICIDA SINAR (T-507).
 *
 * NEDEN ÖLÇÜLMEK ZORUNDA: yanlış yazılmış bir CSP siteyi SESSİZCE kırar.
 * Eksik bir `img-src` girdisi görselleri kaybettirir, eksik bir
 * `connect-src` veriyi; ikisi de sunucuda hata üretmez, günlüğe düşmez,
 * yalnızca kullanıcının tarayıcı konsolunda görünür. Politikayı okuyup
 * "doğru görünüyor" demek bu sınıfı yakalamıyor.
 *
 * Bu betik `dist`i CSP başlığıyla servis edip sayfaları gerçekten
 * açıyor ve `securitypolicyviolation` olaylarını topluyor. Bir ihlal
 * varsa derleme düşüyor.
 *
 * NE YAKALAMAZ: yalnızca gezilen rotalarda, yalnızca tetiklenen
 * etkileşimlerde oluşan istekleri görür. YouTube gömme ancak tıklandığında
 * kuruluyor (TvPage bilinçli olarak öyle yazıldı), bu yüzden `frame-src`
 * bu denetimle doğrulanmıyor — politikaya kod okunarak yazıldı.
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './browser.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const policy = config.headers
  .find((h) => h.source === '/(.*)')
  ?.headers.find((h) => h.key === 'Content-Security-Policy')?.value;

if (!policy) {
  console.error('vercel.json içinde CSP yok — önce `node scripts/csp.mjs`.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

/*
 * Sunucu Vercel'in yönlendirme sırasını taklit ediyor: önce dosya
 * sistemi, sonra rewrite listesi, kalanı 404. Kabuğu her isteğe
 * döndüren bir sunucu, CSP'yi gerçek sayfalarda değil kabukta ölçerdi.
 */
const rewrites = new Set(config.rewrites.map((r) => r.source));

function resolveFile(pathname) {
  const candidates = [
    path.join(distDir, pathname),
    path.join(distDir, pathname, 'index.html'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  if (rewrites.has(pathname)) return path.join(distDir, 'app.html');
  return path.join(distDir, '404.html');
}

const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const file = resolveFile(pathname === '/' ? '/index.html' : pathname);

  response.setHeader('Content-Security-Policy', policy);
  response.setHeader('Content-Type', TYPES[path.extname(file)] ?? 'application/octet-stream');

  try {
    response.end(readFileSync(file));
  } catch {
    response.statusCode = 404;
    response.end('yok');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

/* Temsili rotalar: kabuk, liste, detay, araç, harita (karo katmanı),
   radyo (ses) ve prerender edilmemiş bir yol. */
const ROUTES = [
  '/',
  '/galeri',
  '/hedefler',
  '/araclar/fov',
  '/araclar/isik-kirliligi',
  '/radyo',
  '/etkinlikler',
];

const browser = await launchBrowser({ direct: true });
const context = await browser.newContext();
const page = await context.newPage();

const violations = [];

await page.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (event) => {
    window.__cspViolations.push({
      directive: event.effectiveDirective,
      blocked: event.blockedURI,
    });
  });
});

for (const route of ROUTES) {
  await page.goto(`${base}${route}`, { waitUntil: 'load' });
  /* Rota kodu ve ilk istekleri tamamlansın: ihlaller ilk boyamada değil,
     lazy yüklenen parçalar geldiğinde çıkıyor. */
  await page.waitForTimeout(1500);

  const found = await page.evaluate(() => window.__cspViolations ?? []);
  for (const violation of found) {
    violations.push({ route, ...violation });
  }
}

await browser.close();
server.close();

if (violations.length > 0) {
  console.error(`\nCSP ihlali (${violations.length}):`);
  for (const v of violations) {
    console.error(`  ${v.route} · ${v.directive} · ${v.blocked}`);
  }
  console.error(
    '\nPolitikayı `scripts/csp.mjs` içinde düzeltin — engellenen kaynak meşruysa' +
      ' ilgili yönergeye ekleyin, değilse kaynağı koddan kaldırın.'
  );
  process.exit(1);
}

console.log(`CSP temiz · ${ROUTES.length} rota, sıfır ihlal`);
