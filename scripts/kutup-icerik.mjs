/**
 * KUTUP HİZALAMASI REHBERİ — İÇERİK ÜRETİCİSİ.
 *
 * Kardeşleri `drizzle-icerik.mjs` ve `snr-icerik.mjs` ile aynı işi
 * yapıyor: paketin tek dosyalık referans derlemesini derleme zamanında
 * işleyip React'in basacağı parçalara çeviriyor. Markdown ayrıştırıcısını
 * çalışma zamanı bağımlılığı yapmanın karşılığı yok.
 *
 *     node scripts/kutup-icerik.mjs
 *
 * ÜRETİLEN DOSYA ELLE DÜZENLENMEZ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU PAKETTE ŞEKİLLER HAZIR — AMA KONTROL YİNE DE VAR
 *
 * SNR paketinde dört şekil çalışma zamanında JS ile çiziliyordu; script
 * atıldığı için boş kutu kalıyorlardı ve iki ayrı turda canlıda
 * yakalandılar (biri boş kutu, biri siyah panel). Bu pakette 13 SVG
 * doğrudan işaretlemede duruyor, yani teoride sorun yok.
 *
 * "Teoride" yetmiyor. Aşağıdaki iki tarama gövdenin TAMAMINA bakıyor:
 * boş kalan çizim kabı ve değeri `null`/`undefined` olan nitelik.
 * Paket bir gün şekillerden birini JS'e taşırsa bu betik DURUR — sessizce
 * boş bir şekil yayınlamaktansa.
 *
 * Canvas vekili de aynı sebeple duruyor: paketin simülatörü canvas
 * kullanıyor ve jsdom'da `getContext` yok. Vekil olmadan script ilk
 * canvas satırında patlıyor, ondan sonraki hiçbir şey çalışmıyor ve
 * gövde taraması yanlış yerden şikâyet ediyor.
 *
 * Betik kaynağa GÜVENİYOR ve bu bilinçli: `docs/kutup/standalone-kaynak.html`
 * kullanıcı girdisi değil, depoya işlenmiş sabit bir belge. Buna rağmen
 * ÇIKTIDA script etiketi, olay niteliği ve `javascript:` kalmadığı ayrıca
 * doğrulanıyor — çünkü çıktı `dangerouslySetInnerHTML` ile basılıyor.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/kutup/standalone-kaynak.html');
const OUT_DIR = path.join(root, 'src/features/knowledge/kutup');
const OUT = path.join(OUT_DIR, 'content.generated.ts');

/** Widget'lar kaynakta göründükleri sırayla bu kimlikleri alır. */
const WIDGET_IDS = ['simulator', 'tolerance', 'graph', 'drift'];

const html = readFileSync(SRC, 'utf8');

/* ── 1. paketin kendi kodunu bir kez çalıştır ───────────────────────── */

/*
  CANVAS VEKİLİ — SNR turundan kalan ders.

  Paketin script'i tek blok hâlinde akıyor; jsdom'da `getContext` olmadığı
  için simülatörün canvas satırı `TypeError` fırlatıyor ve bloğun geri
  kalanı hiç çalışmıyor. Vekil yalnızca akışın kesilmemesi için var;
  bu pakette canvas ÇIKTIYA girmiyor (simülatör tool bloğunda ve o blok
  React bileşeniyle değiştiriliyor), dolayısıyla piksel üretmesi de
  gerekmiyor — SNR'deki PNG kodlayıcısına burada ihtiyaç yok.

  Vekil ÇIKTIYA GİRMİYOR: enjeksiyon yalnızca jsdom'a verilen dizede.
*/
const CANVAS_VEKILI = `<script>
  HTMLCanvasElement.prototype.getContext = function () {
    var yut = function () { return yutucu; };
    var yutucu = new Proxy({}, {
      get: function (_t, k) {
        if (k === 'canvas') return null;
        if (k === 'createImageData') {
          return function (w, h) {
            return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
          };
        }
        if (k === 'measureText') return function () { return { width: 0 }; };
        return yut;
      },
      set: function () { return true; },
    });
    return yutucu;
  };
  HTMLCanvasElement.prototype.toDataURL = function () { return ''; };
</script>`;

const scriptAt = html.indexOf('<script');
if (scriptAt < 0) {
  console.error('Kaynakta <script> yok — paket değişmiş.');
  process.exit(1);
}
const enjekteli = html.slice(0, scriptAt) + CANVAS_VEKILI + html.slice(scriptAt);

const sessizKonsol = new VirtualConsole();
const dom = new JSDOM(enjekteli, {
  runScripts: 'dangerously',
  virtualConsole: sessizKonsol,
});
const belge = dom.window.document;

const mainEl = belge.querySelector('main');
if (!mainEl) {
  console.error('Kaynak HTML içinde <main> bulunamadı.');
  process.exit(1);
}

/* ── 2. gövde taraması: boş şekil ve bozuk nitelik ──────────────────── */

/*
  ELLE LİSTE TUTMUYORUZ — SNR turunda bir kez eksik kaldı.

  Orada hangi kapların dolması gerektiği kaynaktaki
  `getElementById('sabit-metin')` çağrılarından elle çıkarılmıştı; dört
  panel ise `getElementById(ids[k])` ile, yani DEĞİŞKENDEN çözülüyordu.
  Tarama onları görmedi, listeye girmediler ve dördü de canlıda siyah
  kutu olarak yayımlandı.

  Aşağıdaki iki kural gövdenin tamamına bakıyor ve bakım istemiyor:

    1. Boş kalan çizim kabı (`<svg>`, `<g>`) — şekil çizilmemiş demek.
    2. Değeri `null`/`undefined` olan nitelik — çizim çalışmış ama bir
       değer üretememiş demek. Panelleri asıl bu yakalardı: `href="null"`.

  Tarama TOOL BLOKLARINDAN ÖNCE çalışıyor ve `<canvas>` hariç tutuluyor:
  simülatörün iki canvas'ı zaten çıktıya girmiyor.
*/
{
  const kaplar = [...mainEl.querySelectorAll('svg, g')];
  const bos = kaplar.filter(
    (el) =>
      el.children.length === 0 &&
      el.textContent.trim() === '' &&
      !el.closest('.tool')
  );
  if (bos.length > 0) {
    console.error(
      'Boş kalan çizim kabı var — şekil çizilmemiş:\n' +
        bos
          .map(
            (el) => `  <${el.tagName.toLowerCase()} id="${el.id || '(kimliksiz)'}">`
          )
          .join('\n')
    );
    process.exit(1);
  }

  const bozukNitelik = [];
  for (const el of mainEl.querySelectorAll('*')) {
    if (el.closest('.tool')) continue;
    for (const nitelik of el.attributes) {
      if (nitelik.value === 'null' || nitelik.value === 'undefined') {
        bozukNitelik.push(
          `  <${el.tagName.toLowerCase()} ${nitelik.name}="${nitelik.value}">`
        );
      }
    }
  }
  if (bozukNitelik.length > 0) {
    console.error(
      'Değeri null/undefined olan nitelik var — çizim bir değer ' +
        'üretememiş:\n' +
        bozukNitelik.join('\n')
    );
    process.exit(1);
  }
}

/*
  ŞEKİL SAYISI SABİTLENDİ.

  Paketin belgesi 11 SVG infografik + 2 araç grafiği söylüyor. Sayı
  düşerse bir şekil sessizce kaybolmuş demektir; taramalar bunu
  görmez, çünkü olmayan bir kap "boş" da değildir.
*/
const BEKLENEN_SEKIL = 13;
{
  const sayi = mainEl.querySelectorAll('svg').length;
  if (sayi !== BEKLENEN_SEKIL) {
    console.error(
      `Beklenen ${BEKLENEN_SEKIL} SVG, bulunan ${sayi} — paket değişmiş.`
    );
    process.exit(1);
  }
}

let body = mainEl.innerHTML;

/* ── 3. tool bloklarını sök ─────────────────────────────────────────── */

/**
 * `<div class="tool"` ile başlayan bloğun kapanışını derinlik sayarak
 * bulur. Düz regex işe yaramaz: bloklar iç içe `<div>` taşıyor.
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
{
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
}

/* ── 4. hero başlığı ve spot metni çıkarılır ────────────────────────── */

/*
  Sayfa başlığı React tarafında (`PageHeader`). Kaynak belge kendi başına
  açılan bir sayfa olduğu için kendi `<h1>` ve `<p class="lead">` bloğunu
  taşıyor; ikisini de bırakırsak sayfada İKİ `h1` olur.
*/
{
  const before = segments[0].html;
  const after = before
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/, '')
    .replace(/<p class="lead">[\s\S]*?<\/p>\s*/, '');
  if (after === before) {
    console.error('Hero başlığı/spot metni bulunamadı — kaynak değişmiş.');
    process.exit(1);
  }
  segments[0].html = after;
}

/* ── 5. sınıf adlarına dz- öneki ────────────────────────────────────── */

/**
 * `dz-` öneki bu pakette de kullanılıyor: paketin kendi belgesi "drizzle
 * ve SNR paketleriyle aynı tasarım sistemini kullanır, üçü de `.dz-root`
 * altında" diyor. Ortak stil dosyası üçünü birden karşılıyor; burada yeni
 * bir önek uydurmak aynı görünümü üçüncü kez tanımlamak olurdu.
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

/* ── 6. içindekiler ─────────────────────────────────────────────────── */
const toc = [];
{
  const sidebar = html.slice(html.indexOf('<nav class="sidebar"'));
  const links = sidebar.slice(0, sidebar.indexOf('</nav>'));
  for (const m of links.matchAll(/<a href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    toc.push({
      id: m[1],
      label: m[2]
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    });
  }
  if (toc.length === 0) {
    console.error('İçindekiler boş çıktı — kenar çubuğu değişmiş.');
    process.exit(1);
  }
}

/* ── 7. güvenlik kontrolü ───────────────────────────────────────────── */
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

/* ── 8. yaz ─────────────────────────────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });

const banner = `/* ÜRETİLEN DOSYA — ELLE DÜZENLEMEYİN.
 * Kaynak: docs/kutup/standalone-kaynak.html
 * Üretici: scripts/kutup-icerik.mjs  (\`node scripts/kutup-icerik.mjs\`)
 *
 * Gövdedeki ${BEKLENEN_SEKIL} şekil doğrudan işaretlemede duruyor; çalışma
 * zamanında hiçbir çizim yapılmıyor.
 */`;

writeFileSync(
  OUT,
  `${banner}

/** Makale gövdesi; \`widget\` parçalarının yerine React bileşeni çizilir. */
export type KutupSegment =
  | { kind: 'html'; html: string }
  | { kind: 'widget'; id: KutupWidgetId };

export type KutupWidgetId = ${WIDGET_IDS.map((id) => `'${id}'`).join(' | ')};

export interface KutupTocEntry {
  id: string;
  label: string;
}

export const kutupToc: KutupTocEntry[] = ${JSON.stringify(toc, null, 2)};

export const kutupSegments: KutupSegment[] = ${JSON.stringify(segments, null, 2)};
`,
  'utf8'
);

const bytes = Buffer.byteLength(joined, 'utf8');
console.log(
  `Kutup içeriği üretildi · ${segments.length} parça · ${WIDGET_IDS.length} widget · ` +
    `${toc.length} başlık · ${(bytes / 1024).toFixed(1)} kB HTML · ` +
    `${BEKLENEN_SEKIL} şekil işaretlemede`
);
