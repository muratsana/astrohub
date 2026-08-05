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
