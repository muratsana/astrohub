/**
 * DRIZZLE REHBERİ — İÇERİK ÜRETİCİSİ.
 *
 * Kaynak `docs/drizzle/standalone-kaynak.html`: içerik paketinin kendi
 * tek dosyalık referans derlemesi. Makale metni, 16 tablo, 7 akordiyon ve
 * 11 infografik ORADA ZATEN İŞLENMİŞ hâlde duruyor — Markdown'dan yeniden
 * üretmek bir markdown ayrıştırıcısını çalışma zamanı bağımlılığı yapardı
 * ve ilk rota JS bütçesi (200 kB gzip) buna yer bırakmıyor.
 *
 * Bu script derleme öncesi BİR KEZ çalışır ve çıktısı depoya işlenir:
 *
 *     node scripts/drizzle-icerik.mjs
 *
 * ÜRETİLEN DOSYA ELLE DÜZENLENMEZ. Metinde değişiklik gerekiyorsa kaynak
 * HTML düzeltilir ve script yeniden çalıştırılır.
 *
 * ─────────────────────────────────────────────────────────────────────
 * NE YAPIYOR
 *
 *  1. `<main>` gövdesini alır (üst bar, kenar çubuğu ve paketin kendi
 *     script'i DIŞARIDA kalır — onların karşılığı React tarafında var).
 *  2. Dört `<div class="tool">` bloğunu söker. Bunlar paketin vanilla JS
 *     ile sürdüğü hesaplayıcılar; sitede React bileşeni olarak çiziliyorlar
 *     (`widgets/`). Yerlerine bir işaretçi konur, sayfa parçaları arasında
 *     bileşen basılır.
 *  3. Kalan her sınıf adına `dz-` öneki ekler. Paket kendi stil dosyasında
 *     bu öneki kullanıyor; standalone derlemesi kullanmıyordu ve
 *     `body`/`t`/`v`/`c` gibi adlar sitenin küresel stilleriyle çakışabilir.
 *  4. Başlıklardan içindekiler listesi çıkarır.
 *
 * GÜVENLİK: çıktı `dangerouslySetInnerHTML` ile basılıyor. Kaynak HTML
 * kullanıcı girdisi değil, depoya işlenmiş sabit bir belge; script etiketi
 * kalmadığı ayrıca burada doğrulanıyor (aşağıdaki kontrol).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/drizzle/standalone-kaynak.html');
const OUT_DIR = path.join(root, 'src/features/knowledge/drizzle');
const OUT = path.join(OUT_DIR, 'content.generated.ts');

/** Widget'lar kaynakta göründükleri sırayla bu kimlikleri alır. */
const WIDGET_IDS = ['sampling', 'simulator', 'pixfrac', 'dither'];

const html = readFileSync(SRC, 'utf8');

/* ── 1. main gövdesi ────────────────────────────────────────────────── */
const mainStart = html.indexOf('<main>');
const mainEnd = html.lastIndexOf('</main>');
if (mainStart < 0 || mainEnd < 0) {
  console.error('Kaynak HTML içinde <main> bulunamadı.');
  process.exit(1);
}
let body = html.slice(mainStart + '<main>'.length, mainEnd);

/* ── 2. tool bloklarını sök ─────────────────────────────────────────── */

/**
 * `<div class="tool"` ile başlayan bloğun kapanışını derinlik sayarak bulur.
 * Düz bir regex işe yaramaz: bloklar iç içe `<div>` taşıyor.
 */
function sliceBalancedDiv(source, openIndex) {
  const tag = /<\/?div\b[^>]*>/g;
  tag.lastIndex = openIndex;
  let depth = 0;
  let m;
  while ((m = tag.exec(source))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tag.lastIndex;
  }
  return -1;
}

const segments = [];
let cursor = 0;
let widgetIndex = 0;

for (;;) {
  const at = body.indexOf('<div class="tool"', cursor);
  if (at < 0) break;
  const end = sliceBalancedDiv(body, at);
  if (end < 0) {
    console.error('Kapanmayan <div class="tool"> bloğu var.');
    process.exit(1);
  }
  segments.push({ kind: 'html', html: body.slice(cursor, at) });
  const id = WIDGET_IDS[widgetIndex++];
  if (!id) {
    console.error(`Beklenenden fazla tool bloğu (${widgetIndex}).`);
    process.exit(1);
  }
  segments.push({ kind: 'widget', id });
  cursor = end;
}
segments.push({ kind: 'html', html: body.slice(cursor) });

if (widgetIndex !== WIDGET_IDS.length) {
  console.error(
    `Beklenen ${WIDGET_IDS.length} tool bloğu, bulunan ${widgetIndex}.`
  );
  process.exit(1);
}

/* ── 2b. hero'nun başlığı ve spot metni çıkarılır ───────────────────── */

/**
 * SAYFA BAŞLIĞI REACT TARAFINDA (`PageHeader`): kırıntı yolu, `h1` ve
 * açıklama orada duruyor. Kaynak belge kendi başına açılan bir sayfa
 * olduğu için kendi `<h1>` ve `<p class="lead">` bloğunu taşıyor —
 * ikisini de bırakırsak sayfada İKİ `h1` olur (Temmuz denetiminde
 * kapatılan hata) ve spot metin birebir tekrar eder.
 *
 * Künye rozetleri (`meta`/`chip`) ve üst etiket (`kicker`) KALIYOR:
 * onların React tarafında karşılığı yok ve okuyucuya "ne kadar sürer,
 * içinde ne var" bilgisini veriyorlar.
 */
{
  const before = segments[0].html;
  const after = before
    .replace(/<h1>[\s\S]*?<\/h1>\s*/, '')
    .replace(/<p class="lead">[\s\S]*?<\/p>\s*/, '');
  if (after === before) {
    console.error('Hero başlığı/spot metni bulunamadı — kaynak değişmiş.');
    process.exit(1);
  }
  segments[0].html = after;
}

/* ── 3. sınıf adlarına dz- öneki ────────────────────────────────────── */

/**
 * SVG'lerin İÇİNDEKİ sınıflar da öneklenmiş oluyor; bu zararsız, çünkü
 * infografiklerin kendi stilleri `style` niteliğinde satır içi duruyor
 * (paket bunu bilerek böyle üretiyor: dosyalar bağımsız açılabilsin diye).
 */
function prefixClasses(fragment) {
  return fragment.replace(/\sclass="([^"]+)"/g, (_all, value) => {
    const prefixed = value
      .trim()
      .split(/\s+/)
      .map((name) => (name.startsWith('dz-') ? name : `dz-${name}`))
      .join(' ');
    return ` class="${prefixed}"`;
  });
}

for (const segment of segments) {
  if (segment.kind === 'html') segment.html = prefixClasses(segment.html);
}

/* ── 3b. R grafiği: boş SVG'yi DERLEME ZAMANINDA doldur ─────────────── */

/**
 * KAYNAKTA BU ŞEKİL BOŞ GELİYOR.
 *
 * `<svg id="rchart">` paketin standalone sürümünde `<script>` ile
 * çiziliyor. Betik script etiketlerini attığı için şekil bizde boş bir
 * kutu olarak kalıyordu: başlık, açıklama ve renk anahtarı görünüyor ama
 * eğrilerin yeri bomboş (kullanıcı bildirdi).
 *
 * Çalışma zamanında çizmek yerine BURADA çiziliyor. Sebep: grafiğin hiç
 * girdisi yok — tamamen `R(r)` fonksiyonundan çıkan sabit bir şekil.
 * Sabit bir şekli tarayıcıya her açılışta yeniden hesaplatmak hem
 * gereksiz JS hem de JS kapalıyken boş kutu demekti. Diğer 10 infografik
 * de kaynakta zaten statik SVG.
 *
 * Çizim mantığı kaynaktaki fonksiyonun bire bir karşılığı; renkler ve
 * ölçek değerleri paketten aynen alındı (seri renkleri paketin bilinçli
 * seçimi, `drizzle.css` başlığında da yazılı).
 */
function rGrafigi() {
  const W = 720, H = 330, L = 54, Rp = 132, T = 18, B = 44;
  const x0 = L, x1 = W - Rp, y0 = H - B, y1 = T;
  const xmin = 0.05, xmax = 1.0, ymin = 1.0, ymax = 3.6;
  const X = (v) => x0 + ((v - xmin) / (xmax - xmin)) * (x1 - x0);
  const Y = (v) => y0 - ((Math.min(v, ymax) - ymin) / (ymax - ymin)) * (y0 - y1);
  /* `core.ts` içindeki `noiseCorrelation` ile aynı bağıntı. */
  const Rfac = (r) => (r >= 1 ? r / (1 - 1 / (3 * r)) : 1 / (1 - r / 3));

  const p = [];
  const yazi = (x, y, metin, renk, boyut, ek = '') =>
    `<text x="${x}" y="${y}" fill="${renk}" font-size="${boyut}" font-family="system-ui"${ek}>${metin}</text>`;

  for (const v of [1.0, 1.5, 2.0, 2.5, 3.0, 3.5]) {
    p.push(
      `<line x1="${x0}" y1="${Y(v)}" x2="${x1}" y2="${Y(v)}" stroke="#2c2c2a" stroke-width="1"/>`,
      yazi(x0 - 10, Y(v) + 4, v.toFixed(1), '#898781', 11.5, ' text-anchor="end"')
    );
  }
  p.push(
    `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" stroke="#383835" stroke-width="1.2"/>`
  );
  for (const v of [0.2, 0.4, 0.6, 0.8, 1.0]) {
    p.push(
      yazi(X(v), y0 + 20, v.toFixed(1), '#898781', 11.5, ' text-anchor="middle"')
    );
  }
  p.push(
    yazi((x0 + x1) / 2, y0 + 40, 'pixfrac (damla boyutu)', '#898781', 12.5, ' text-anchor="middle"'),
    yazi(16, (y0 + y1) / 2, 'R — gürültü korelasyon faktörü', '#898781', 12.5,
      ` text-anchor="middle" transform="rotate(-90 16 ${(y0 + y1) / 2})"`)
  );

  for (const se of [
    { s: 1, c: '#3987e5', n: '1×' },
    { s: 2, c: '#d95926', n: '2×' },
    { s: 3, c: '#199e70', n: '3×' },
  ]) {
    let d = '';
    let ilk = true;
    for (let v = xmin; v <= 1.0001; v += 0.01) {
      const R = Rfac(v * se.s);
      /* Eğri tavanı aşınca kalem kaldırılıyor; aksi hâlde grafiğin
         dışından geçen düz bir çizgi çizilirdi. */
      if (R > ymax + 0.4) { ilk = true; continue; }
      d += `${ilk ? 'M' : 'L'}${X(v).toFixed(1)},${Y(R).toFixed(1)} `;
      ilk = false;
    }
    p.push(`<path d="${d.trim()}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round"/>`);

    const po = 1 / se.s;
    if (po <= 1.0) {
      p.push(`<circle cx="${X(po).toFixed(1)}" cy="${Y(1.5).toFixed(1)}" r="5.5" fill="#1a1a19" stroke="${se.c}" stroke-width="2"/>`);
    }
    const Re = Rfac(1.0 * se.s);
    const ty = Re > ymax ? Y(ymax) + (se.s === 3 ? 14 : 0) : Y(Re);
    p.push(yazi(x1 + 12, ty + 4, `${se.n} → R ${Re.toFixed(2)}`, se.c, 12.5, ' font-weight="700"'));
  }

  p.push(
    `<line x1="${x0}" y1="${Y(1.5)}" x2="${x1}" y2="${Y(1.5)}" stroke="#4ed24e" stroke-width="1.2" opacity="0.45"/>`,
    yazi(x0 + 8, Y(1.72), '○ = r 1 · denge noktası', '#4ed24e', 11.5, ' font-weight="600"'),
    yazi(x0 + 8, Y(1.72) + 16, 'damla tam bir çıktı pikseli boyutunda', '#898781', 11,
      ' stroke="#1a1a19" stroke-width="3.5" paint-order="stroke"')
  );

  return `<g>${p.join('')}</g>`;
}

{
  const bosSvg = /(<svg[^>]*id="rchart"[^>]*>)\s*(<\/svg>)/;
  let dolduruldu = false;
  for (const segment of segments) {
    if (segment.kind !== 'html' || !bosSvg.test(segment.html)) continue;
    segment.html = segment.html.replace(bosSvg, (_a, ac, kapa) => `${ac}${rGrafigi()}${kapa}`);
    dolduruldu = true;
  }
  if (!dolduruldu) {
    console.error('R grafiği için boş `#rchart` bulunamadı — kaynak değişmiş.');
    process.exit(1);
  }
}

/* ── 4. içindekiler ─────────────────────────────────────────────────── */
const toc = [];
{
  const sidebar = html.slice(html.indexOf('<nav class="sidebar"'));
  const links = sidebar.slice(0, sidebar.indexOf('</nav>'));
  for (const m of links.matchAll(/<a href="#([^"]+)">([^<]+)<\/a>/g)) {
    toc.push({
      id: m[1],
      label: m[2].replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '),
    });
  }
}

/* ── 5. güvenlik kontrolü ───────────────────────────────────────────── */
const joined = segments
  .filter((s) => s.kind === 'html')
  .map((s) => s.html)
  .join('');
for (const forbidden of [/<script\b/i, /\son\w+\s*=/i, /javascript:/i]) {
  if (forbidden.test(joined)) {
    console.error(`Çıktıda izin verilmeyen desen: ${forbidden}`);
    process.exit(1);
  }
}

/* ── 6. yaz ─────────────────────────────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });

const banner = `/* ÜRETİLEN DOSYA — ELLE DÜZENLEMEYİN.
 * Kaynak: docs/drizzle/standalone-kaynak.html
 * Üretici: scripts/drizzle-icerik.mjs  (\`node scripts/drizzle-icerik.mjs\`)
 *
 * İçerik paketin kendi doğrulanmış metni; §8 "Doğruluk hakkında" başlığı
 * altında bilerek korunan iki ifade var (R'nin r ile artması ve PixInsight
 * tablosundaki "kaynaklar çelişiyor" satırları) — düzeltilmemeli.
 */`;

writeFileSync(
  OUT,
  `${banner}

/** Makale gövdesi; \`widget\` parçalarının yerine React bileşeni çizilir. */
export type DrizzleSegment =
  | { kind: 'html'; html: string }
  | { kind: 'widget'; id: DrizzleWidgetId };

export type DrizzleWidgetId = ${WIDGET_IDS.map((id) => `'${id}'`).join(' | ')};

export interface DrizzleTocEntry {
  id: string;
  label: string;
}

export const drizzleToc: DrizzleTocEntry[] = ${JSON.stringify(toc, null, 2)};

export const drizzleSegments: DrizzleSegment[] = ${JSON.stringify(segments, null, 2)};
`,
  'utf8'
);

const bytes = Buffer.byteLength(joined, 'utf8');
console.log(
  `Drizzle içeriği üretildi · ${segments.length} parça · ${WIDGET_IDS.length} widget · ` +
    `${toc.length} başlık · ${(bytes / 1024).toFixed(1)} kB HTML`
);
