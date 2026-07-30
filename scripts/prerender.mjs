/**
 * PRERENDER — sitemap rotalarını statik HTML'e çevirir (T-301).
 *
 * `vite build` sonrası çalışır: `dist-ssr/` altındaki SSR paketinden
 * `renderRoute` alınır, her sitemap yolu tam çözülmüş HTML'e çevrilir ve
 * `dist/<yol>/index.html` olarak yazılır. Vercel dosya sistemini
 * rewrite'lardan ÖNCE kontrol ettiği için bu dosyalar doğrudan servis
 * edilir; listede olmayan yollar (kullanıcı içeriği, panel) eskisi gibi
 * SPA kabuğuna düşer.
 *
 * JSDOM GLOBALLERİ: uygulama tarayıcı için yazıldı; tema/konum/önizleme
 * sağlayıcıları render sırasında localStorage ve document'a dokunuyor.
 * Altmış sayfayı "SSR-güvenli" olacak şekilde elden geçirmek yerine Node
 * tarafına tarayıcı globalleri kurulur — davranış birebir, bakım maliyeti
 * sıfır. Efektler statik render'da çalışmadığı için ağ isteği atılmaz;
 * sayfalar tohum/varsayılan veriyle yazılır, canlı veri istemcide gelir.
 */

import { JSDOM } from 'jsdom';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composePage, outputFileFor } from './prerender-lib.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

/* ── Tarayıcı globalleri ─────────────────────────────────────────── */

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://astrohub.com.tr/',
  pretendToBeVisual: true,
});

const { window } = dom;
for (const key of [
  'document',
  'localStorage',
  'sessionStorage',
  'HTMLElement',
  'Element',
  'Node',
  'CustomEvent',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]) {
  if (!(key in globalThis) && window[key] !== undefined) {
    globalThis[key] = window[key];
  }
}
globalThis.window = window;

// jsdom matchMedia vermez; tema/hareket sorguları "eşleşmedi" ile döner.
window.matchMedia ??= () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
globalThis.matchMedia = window.matchMedia;

/* ── Render ──────────────────────────────────────────────────────── */

const { renderRoute, prerenderPaths } = await import(
  path.join(root, 'dist-ssr', 'entry-prerender.js')
);

const template = readFileSync(path.join(distDir, 'index.html'), 'utf8');
const paths = prerenderPaths();

const failures = [];
let written = 0;

/** Sınırlı eşzamanlılık: bellek dostu, 400+ rota için yeterince hızlı. */
const POOL = 8;
let cursor = 0;

async function worker() {
  for (;;) {
    const index = cursor++;
    if (index >= paths.length) return;
    const routePath = paths[index];
    try {
      const rendered = await renderRoute(routePath);
      const outFile = path.join(distDir, outputFileFor(routePath));
      mkdirSync(path.dirname(outFile), { recursive: true });
      writeFileSync(outFile, composePage(template, rendered));
      written++;
    } catch (error) {
      // Tek rotanın kırılması dağıtımı durdurmaz: o yol SPA kabuğuyla
      // yaşamaya devam eder. Ama sessiz de kalınmaz — liste aşağıda.
      failures.push({ path: routePath, message: String(error).slice(0, 200) });
    }
  }
}

await Promise.all(Array.from({ length: POOL }, worker));

if (failures.length > 0) {
  console.warn(`\nPrerender edilemeyen ${failures.length} rota (SPA kabuğunda kaldı):`);
  for (const f of failures) console.warn(`  ${f.path} — ${f.message}`);
}

console.log(`Prerender tamam · ${written}/${paths.length} rota statik HTML oldu`);

/*
 * Ana sayfa ya da rotaların önemli bir bölümü yazılamadıysa bu bir
 * gerileme demektir; sessizce kabuk yayınlamak yerine derleme kırılır.
 */
const homeFailed = failures.some((f) => f.path === '/');
if (homeFailed || failures.length > paths.length * 0.1) {
  console.error('Prerender başarısız sayıldı — eşik aşıldı.');
  process.exit(1);
}
