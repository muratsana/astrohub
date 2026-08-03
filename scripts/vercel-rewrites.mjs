#!/usr/bin/env node
/**
 * `vercel.json` REWRITE LİSTESİNİ ROTA AĞACINDAN ÜRETİR.
 *
 * NEDEN — BİLİNMEYEN ADRES 200 DÖNÜYORDU
 *
 * Yapılandırmada tek bir yakala-hepsini kural vardı:
 *
 *     { "source": "/(.*)", "destination": "/app.html" }
 *
 * Bu kural her adresi karşılıyordu, dolayısıyla `dist/404.html` HİÇ
 * kullanılmıyordu: `/olmayan-sayfa` SPA kabuğunu HTTP 200 ile alıyordu.
 * Kullanıcı doğru sayfayı (NotFound) görüyordu ama arama motoru ve her
 * otomatik istemci için o adres GEÇERLİ bir sayfaydı — silinmiş bir
 * fotoğrafın adresi dizinde kalır, kırık bağlantı denetimleri hiçbir şey
 * bulmaz.
 *
 * ÖNCEKİ DENEME NEDEN GERİ ALINDI
 *
 * Elle yazılmış bir önek listesi denenmişti ve `/harita`, `/ikinci-el`
 * gibi gerçek sayfaları 404'e düşürdü. Sebep şimdi biliniyor: bunlar
 * istemci tarafı YÖNLENDİRME rotaları — sitemap'te yokturlar, bu yüzden
 * prerender de edilmezler, yani diskte bir dosyaları yoktur. Elle tutulan
 * bir listenin onları hatırlaması gerekiyordu; hatırlamadı.
 *
 * Çözüm listeyi elden almak: kaynak artık rota ağacının kendisi. Rota
 * ekleyen biri listeyi güncellemeyi unutamaz çünkü liste üretiliyor —
 * ve unutulursa `vercelRewrites.test.ts` CI'da düşer.
 *
 * SIRALAMA ÖNEMLİ DEĞİL, KAPSAM ÖNEMLİ. Vercel istekleri şu sırayla
 * çözüyor: yönlendirmeler → DOSYA SİSTEMİ → rewrite'lar. Prerender edilmiş
 * bir yol (`dist/radyo/index.html`) rewrite'lara hiç ulaşmadan servis
 * edilir; listede olması zararsız. Bu yüzden rota ağacının TAMAMI
 * yazılıyor — prerender bir rotayı üretemezse (betik %10'a kadar hataya
 * izin veriyor) o yol yine de kabuğa düşer, 404'e değil.
 *
 * KULLANIM
 *   node scripts/vercel-rewrites.mjs           # yazar
 *   node scripts/vercel-rewrites.mjs --check   # yalnızca doğrular (CI)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const routerFile = path.join(root, 'src/app/router.tsx');
const cityFile = path.join(root, 'src/features/city/routes.ts');
const cityData = path.join(root, 'src/features/location/cities.ts');
const configFile = path.join(root, 'vercel.json');

/**
 * Rota yolları `router.tsx` metninden okunuyor, modül içe aktarılarak
 * değil.
 *
 * İçe aktarmak, rota ağacının bağlı olduğu her şeyi (React, lazy
 * bileşenler, CSS) Node'da paketlemeyi gerektirirdi — bir yapılandırma
 * dosyası üretmek için fazla ağır bir zincir ve kırılacak fazla yer.
 * Metin biçimi tek tip (`path: '…'`) ve testte AYNI ağaç modül olarak
 * içe aktarılıp karşılaştırılıyor; yani bu ayrıştırma sessizce eskiyemez.
 */
function literalPaths() {
  const source = readFileSync(routerFile, 'utf8');
  const found = new Set();
  for (const match of source.matchAll(/\bpath:\s*'([^']+)'/g)) {
    found.add(match[1]);
  }
  return found;
}

/**
 * Şehir rotaları ayrı üretiliyor — `path` alanı değişkenden geliyor.
 *
 * Bu seksen bir adres SEO adresleri (§20) ve dinamik segmentle
 * yazılamıyor: şehir adı yol parçasının İÇİNDE geçiyor
 * (`/ankara-astronomi-etkinlikleri`) ve React Router'ın `:param`'ı
 * yalnızca tam bir parçayı karşılıyor.
 *
 * Tek bir kalıp rewrite'ı (`/(.*)-astronomi-etkinlikleri`) yazmak listeyi
 * kısaltırdı ama tanımsız bir şehri de kabuğa düşürürdü —
 * `/rastgele-astronomi-etkinlikleri` 200 dönerdi. Rotaların şehir
 * listesinden üretilmesinin asıl amacı buydu; rewrite tarafında bozmuyoruz.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYNAK DOSYA DESENLE OKUNUYOR — DEĞİŞİRSE BURASI DA DEĞİŞMELİ
 *
 * Bu betik Node tarafında çalışıyor ve TypeScript'i çalıştıramıyor, o
 * yüzden `cities.ts` metin olarak taranıyor. Kırılganlığı ölçülerek
 * görüldü: liste nesne literallerinden DEMET satırlarına çevrildiğinde
 * (81 il paketten 1 kB kazandırmak için) eski `id:` deseni hiçbir şey
 * bulamadı. Boş liste sessizce geçmesin diye hata fırlatılıyor ve
 * `vercelRewrites.test.ts` iki listeyi karşılaştırıyor.
 */
function cityPaths() {
  const routes = readFileSync(cityFile, 'utf8');
  const suffix = /const SUFFIX = '([^']+)'/.exec(routes)?.[1];
  if (!suffix) throw new Error('city SUFFIX okunamadı');

  /* Satır deseni: `[34, 'istanbul', 'İstanbul', 41.0082, 28.9784],` */
  const data = readFileSync(cityData, 'utf8');
  const ids = [...data.matchAll(/^\s*\[\d+,\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]);
  if (ids.length === 0) {
    throw new Error(
      'şehir listesi okunamadı — cities.ts satır biçimi değişmiş olabilir'
    );
  }

  return ids.map((id) => `${id}-${suffix}`);
}

export function rewriteSources() {
  const literals = literalPaths();
  literals.delete('*'); // NotFound — 404'e düşmesi GEREKEN yol
  literals.delete('/'); // ana sayfa prerender edilmiş dosya

  const all = [...literals, ...cityPaths()]
    .map((p) => (p.startsWith('/') ? p : `/${p}`))
    .flatMap(toVercelSources)
    .filter((p, index, list) => list.indexOf(p) === index)
    .sort();

  return all;
}

function toVercelSources(source) {
  if (!source.endsWith('/*')) return [source];
  const base = source.slice(0, -2);
  return [base, `${base}/:path*`];
}

const sources = rewriteSources();
const rewrites = sources.map((source) => ({
  source,
  destination: '/app.html',
}));

const config = JSON.parse(readFileSync(configFile, 'utf8'));
const current = JSON.stringify(config.rewrites);
const next = JSON.stringify(rewrites);

if (process.argv.includes('--check')) {
  if (current !== next) {
    console.error(
      'vercel.json rewrite listesi rota ağacıyla uyuşmuyor.\n' +
        'Düzeltmek için: node scripts/vercel-rewrites.mjs'
    );
    process.exit(1);
  }
  console.log(`vercel.json güncel · ${rewrites.length} rewrite`);
} else {
  config.rewrites = rewrites;
  /* `vercel.json` YORUM KABUL ETMEZ — gerekçeler bu dosyada durur.
     Şemaya uymayan tek bir anahtar dağıtımı derleme başlamadan
     reddettiriyor (bir kez oldu, PR #6 hiç dağıtılmadı). */
  writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n');
  console.log(`vercel.json yazıldı · ${rewrites.length} rewrite`);
}
