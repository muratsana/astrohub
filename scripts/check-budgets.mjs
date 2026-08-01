/**
 * PERFORMANS BÜTÇE KAPISI (QA §7.3 / T-307).
 *
 * İlk rotanın indirdiği JS ve CSS'in gzip toplamını ölçer ve bütçeyi
 * aşarsa derlemeyi kırar. Lighthouse yerine dosya boyutu ölçümü bilinçli:
 * boyut deterministiktir — CI'da kararsız skor yerine her ortamda aynı
 * sonucu veren bir kapı. (Gerçek LCP/INP alan ölçümü RUM ile gelecek;
 * bkz. plan T-604.)
 *
 * Bütçeler QA hedefinin kendisi (JS ≤ 200 kB gzip): ölçülen mevcut durum
 * 189,7 kB — kapı bugünü aklamıyor, ~10 kB'lık payla sessiz büyümeyi
 * durduruyor. Bütçeye takılan değişiklik ya kırpılır ya lazy edilir;
 * bütçe yükseltmek bilinçli ve gerekçeli bir commit olmalı.
 */

import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

/** kB (gzip) cinsinden bütçeler. */
const BUDGETS = {
  js: 200,
  css: 25,
};

const html = readFileSync(path.join(distDir, 'index.html'), 'utf8');

/* İlk rotada inen dosyalar: giriş script'i + modulepreload'lar + CSS.
   Lazy chunk'lar bilerek dışarıda — onlar ancak ziyaret edilince iner. */
const jsFiles = [
  ...html.matchAll(/<script[^>]*src="\/(assets\/[^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*href="\/(assets\/[^"]+\.js)"/g),
].map((m) => m[1]);

const cssFiles = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="\/(assets\/[^"]+\.css)"/g)]
  .map((m) => m[1]);

function gzipKb(files) {
  let total = 0;
  for (const file of new Set(files)) {
    const raw = readFileSync(path.join(distDir, file));
    const kb = gzipSync(raw).length / 1024;
    console.log(`  ${file.padEnd(48)} ${kb.toFixed(1).padStart(7)} kB gzip`);
    total += kb;
  }
  return total;
}

console.log('İlk rota JS:');
const jsTotal = gzipKb(jsFiles);
console.log('İlk rota CSS:');
const cssTotal = gzipKb(cssFiles);

console.log(
  `\nToplam · JS ${jsTotal.toFixed(1)} kB (bütçe ${BUDGETS.js}) · ` +
    `CSS ${cssTotal.toFixed(1)} kB (bütçe ${BUDGETS.css})`
);

/*
 * ══════════════════════════════════════════════════════════════════════
 * AĞIR TOHUM VERİSİ İLK ROTAYA SIZMASIN
 *
 * Toplam bütçe bir gerilemeyi YAKALIYOR ama SEBEBİNİ söylemiyor: "JS 201
 * kB" diyen bir hata, hangi modülün sızdığını aramak için yarım saat
 * demek.
 *
 * Bu denetim tam olarak bir kez gerçekleşmiş bir hatayı adıyla kapatıyor:
 * ana sayfadaki "Son ilanlar" şeridi, on satırlık bir etiket haritası
 * için 80 kB'lık ürün kataloğunu ilk rota paketine çekiyordu (kategori
 * etiketleri kataloğun kendisiyle aynı modüldeydi; taxonomy.ts ayrımı
 * bunu çözdü). Katalog ana sayfada hiç kullanılmıyordu.
 *
 * İMZA MARKA ADI, dosya adı değil: paketleyici chunk adlarını hash'liyor
 * ve modül sınırlarını birleştirebiliyor, ama katalog içeriği pakete
 * girdiyse markaların adı da girer.
 * ══════════════════════════════════════════════════════════════════════
 */
const KATALOG_IMZALARI = [
  { imza: 'Esprit 100ED', ne: 'ekipman kataloğu (features/equipment/data)' },
];

const sizinti = [];
for (const file of new Set(jsFiles)) {
  const text = readFileSync(path.join(distDir, file), 'utf8');
  for (const { imza, ne } of KATALOG_IMZALARI) {
    if (text.includes(imza)) sizinti.push(`${ne} → ${file}`);
  }
}

const errors = [];
for (const yer of sizinti) {
  errors.push(
    `İlk rota paketine ağır tohum verisi sızdı: ${yer}\n` +
      '  Taksonomi için `@/features/equipment/taxonomy` içe aktarılmalı, ' +
      '`data` değil.'
  );
}

if (jsTotal > BUDGETS.js)
  errors.push(`İlk rota JS bütçeyi aştı: ${jsTotal.toFixed(1)} > ${BUDGETS.js} kB gzip`);
if (cssTotal > BUDGETS.css)
  errors.push(`İlk rota CSS bütçeyi aştı: ${cssTotal.toFixed(1)} > ${BUDGETS.css} kB gzip`);

if (errors.length > 0) {
  console.error('\n' + errors.join('\n'));
  process.exit(1);
}
console.log('Bütçe kapısı geçildi.');
