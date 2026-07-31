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

/*
 * SPA KABUĞU AYRI DOSYAYA YAZILIR — `vercel.json` bu dosyaya rewrite eder.
 *
 * Vercel'in yakala-hepsini rewrite'ı `/index.html`e düşüyordu; index.html
 * artık prerender edilmiş ANA SAYFA olduğu için bilinmeyen her adres ham
 * HTML'de ana sayfa içeriğini ve başlığını servis eder hâle geldi — botlar
 * için kopya içerik, kullanıcı için yanlış başlık. Kabuk (`app.html`) rota
 * içeriği taşımayan orijinal şablondur; sitemap'te olmayan dinamik yollar
 * (kullanıcı fotoğrafı, panel, forum konusu) ona düşer ve içeriği istemci
 * çizer — prerender öncesi davranışın aynısı.
 *
 * NOT — `vercel.json` YORUM KABUL ETMEZ. Bu gerekçe orada bir "//" anahtarı
 * olarak yazılmıştı ve Vercel yapılandırmayı katı doğruladığı için dağıtımı
 * derleme başlamadan reddetti (bilinmeyen alan). Rewrite'ın gerekçesi bu
 * yüzden burada duruyor; vercel.json şemaya birebir uygun kalmalı.
 */
writeFileSync(path.join(distDir, 'app.html'), template);

/*
 * GERÇEK 404 (QA P0-03). Prerender edilmiş NotFound sayfası `404.html`
 * olarak yazılır; Vercel, hiçbir yola ve rewrite'a uymayan istekte bu
 * dosyayı 404 durum koduyla servis eder. Sayfa `noindex` taşıyor.
 */
try {
  const notFound = await renderRoute('/__404__');
  writeFileSync(path.join(distDir, '404.html'), composePage(template, notFound));
  console.log('404.html yazıldı (prerender edilmiş NotFound sayfası)');
} catch (error) {
  console.warn(`404.html üretilemedi: ${String(error).slice(0, 160)}`);
}

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

/*
 * ══════════════════════════════════════════════════════════════════════
 * AÇIKÇA ÇIKIŞ — betik işini bitirdikten sonra Node kendiliğinden
 * kapanmıyordu.
 *
 * BELİRTİ: "Prerender tamam · 421/421" yazılıyor, 421 dosya diske
 * iniyor, sonra süreç sonsuza kadar uykuda kalıyordu. `npm run build`
 * hiç dönmediği için ondan sonraki her adım (bütçe, CSP, a11y, e2e)
 * çalışmadan bekliyordu. Derleme "başarısız" bile olmuyor, sadece
 * ASILI KALIYOR — CI'da en pahalı hata türü.
 *
 * ÖLÇÜM: `process.getActiveResourcesInfo()` çıkışta altı `Timeout` ve
 * yüzlerce `Immediate` gösteriyor — kabaca rota başına bir tane.
 * Kaynağı React'in statik `prerender` iş döngüsü: prelude akışı
 * tükendikten sonra da kendini `setImmediate` ile yeniden kuyruğa
 * atıyor ve olay döngüsü hiç boşalmıyor. jsdom penceresi (rAF sayacı
 * ölçüldü: 0 çağrı) suçlu değil.
 *
 * NEDEN `process.exit` BURADA MEŞRU: bu bir sunucu değil, tek atımlık
 * bir derleme adımı. Bütün yazma işleri `writeFileSync` ile senkron
 * yapıldı, yani diskte bekleyen bir şey yok; kalan tek şey artık
 * kimsenin sonucunu beklemediği render işleri. Çıkış kodu bilinçli
 * olarak bu satırda: yukarıdaki eşik kontrolünden SONRA geliyor, yani
 * gerçek bir başarısızlık hâlâ 1 ile düşüyor.
 */
process.exit(0);
