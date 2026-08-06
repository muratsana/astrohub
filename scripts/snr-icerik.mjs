/**
 * SNR REHBERİ — İÇERİK ÜRETİCİSİ.
 *
 * Kardeşi `drizzle-icerik.mjs` ile aynı işi yapıyor ve aynı gerekçelerle
 * var: kaynak, içerik paketinin tek dosyalık referans derlemesi; metin,
 * tablolar ve infografikler orada işlenmiş hâlde duruyor ve markdown
 * ayrıştırıcısını çalışma zamanı bağımlılığı yapmanın karşılığı yok.
 *
 *     node scripts/snr-icerik.mjs
 *
 * ÜRETİLEN DOSYA ELLE DÜZENLENMEZ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DRIZZLE'DAN FARKI: DÖRT ŞEKİL JS İLE ÇİZİLİYOR
 *
 * Drizzle paketinde tek bir şekil (`#rchart`) çalışma zamanında
 * çiziliyordu ve script atıldığı için boş kutu olarak kalmıştı — kullanıcı
 * bildirdi, elle porte edilerek düzeltildi. Bu pakette AYNI DURUMDAKİ
 * DÖRT hedef var:
 *
 *     #sqrtchart   SNR–süre eğrisi (kendi `<svg>`i)
 *     #bortlebars  Bortle karşılaştırma çubukları (`<g>`)
 *     #sbscale     yüzey parlaklığı skalası (`<g>`)
 *     #filterfig   dar bant filtre paneli (`<g>`)
 *
 * Dördünü elle porte etmek dört ayrı hata fırsatı demekti. Bunun yerine
 * paketin KENDİ çizim kodu jsdom içinde bir kez çalıştırılıyor ve sonuç
 * DOM'u serileştiriliyor. Fizik `snr-core.js`ten geliyor, biz hiçbir
 * formülü yeniden yazmıyoruz — dolayısıyla porte hatası da olamıyor.
 *
 * Betik kaynağa GÜVENİYOR ve bu bilinçli: `docs/snr/standalone-kaynak.html`
 * kullanıcı girdisi değil, depoya işlenmiş sabit bir belge. Buna rağmen
 * ÇIKTIDA script etiketi, olay niteliği ve `javascript:` kalmadığı ayrıca
 * doğrulanıyor (aşağıda) — çünkü çıktı `dangerouslySetInnerHTML` ile
 * basılıyor.
 *
 * Dört hedeften biri boş kalırsa betik HATA VERİP DURUYOR. Sessizce boş
 * kutu üretmek tam olarak düzeltmeye çalıştığımız şey.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'docs/snr/standalone-kaynak.html');
const OUT_DIR = path.join(root, 'src/features/knowledge/snr');
const OUT = path.join(OUT_DIR, 'content.generated.ts');

/** Widget'lar kaynakta göründükleri sırayla bu kimlikleri alır. */
const WIDGET_IDS = ['simulator', 'objects', 'subexposure', 'planner'];

/** Gövdede JS ile doldurulan hedefler — hepsi dolmak ZORUNDA. */
const CIZILEN = ['sqrtchart', 'bortlebars', 'sbscale', 'filterfig'];

const html = readFileSync(SRC, 'utf8');

/* ── 1. paketin kendi çizim kodunu bir kez çalıştır ─────────────────── */

/*
  CANVAS ÇALIŞIR HÂLDE ENJEKTE EDİLİYOR — ÖLÇÜLDÜ, ŞART.

  Paketin tamamı TEK bir `<script>` bloğu. jsdom'da
  `HTMLCanvasElement.getContext` yok; simülatörün canvas satırı
  `TypeError` fırlatıyor ve tek blok olduğu için ondan SONRAKİ her şey —
  şekillerin çizimi de — hiç çalışmıyor. İlk denemede hepsi boş kaldı ve
  betik (doğru biçimde) durdu.

  İLK ÇÖZÜM YETERSİZDİ ve canlıda yakalandı. `createImageData` ile
  `putImageData` sahteydi, `toDataURL` hiç yoktu. Şekil 2'nin dört foton
  paneli tam olarak `toDataURL()` çıktısını `<image href>` niteliğine
  yazıyor; sahte bağlamda o çağrı `null` döndü ve dört panel canlıda
  SİYAH KUTU olarak yayınlandı (kullanıcı bildirdi). Ders: "script sonuna
  kadar aksın" yetmiyor, üretilen piksellerin de doğru olması gerekiyor.

  Şimdi vekil gerçek bir 2B bağlam: piksel tamponunu saklıyor ve
  `toDataURL` çağrıldığında onu PNG'ye kodlayıp `data:` adresi
  döndürüyor. `canvas` npm paketi yine kurulmadı — yerel derleme
  gerektiren ağır bir bağımlılık ve ihtiyacımız olan tek şey RGBA
  tamponunu PNG'ye çevirmek; `node:zlib` bunu zaten yapabiliyor.

  Vekil ÇIKTIYA GİRMİYOR: enjeksiyon yalnızca jsdom'a verilen dizede,
  serileştirilen `<main>` gövdesinde değil.
*/

/** CRC-32 (PNG parçaları için). Tablo bir kez kuruluyor. */
const CRC_TABLO = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLO[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngParca(tip, veri) {
  const uzunluk = Buffer.alloc(4);
  uzunluk.writeUInt32BE(veri.length, 0);
  const govde = Buffer.concat([Buffer.from(tip, 'latin1'), veri]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(govde), 0);
  return Buffer.concat([uzunluk, govde, crc]);
}

/** RGBA tamponunu 8 bit renkli PNG `data:` adresine çevirir. */
function pngDataUrl(width, height, rgba) {
  const satirBayt = width * 4;
  const ham = Buffer.alloc((satirBayt + 1) * height);
  for (let y = 0; y < height; y++) {
    ham[y * (satirBayt + 1)] = 0; /* filtre: yok */
    Buffer.from(rgba.buffer, rgba.byteOffset + y * satirBayt, satirBayt).copy(
      ham,
      y * (satirBayt + 1) + 1
    );
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; /* bit derinliği */
  ihdr[9] = 6; /* renk tipi: RGBA */
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngParca('IHDR', ihdr),
    pngParca('IDAT', zlib.deflateSync(ham, { level: 9 })),
    pngParca('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

/* Vekil, jsdom'un içinden çağrılacak; PNG kodlayıcı Node tarafında
   kalıyor ve pencereye tek bir köprü fonksiyonu olarak veriliyor. */
const CANVAS_VEKILI = `<script>
  HTMLCanvasElement.prototype.getContext = function () {
    var tuval = this;
    return {
      canvas: tuval,
      createImageData: function (w, h) {
        return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
      },
      putImageData: function (im) { tuval.__piksel = im; },
    };
  };
  HTMLCanvasElement.prototype.toDataURL = function () {
    var im = this.__piksel;
    if (!im) return '';
    return window.__pngKodla(im.width, im.height, im.data);
  };
</script>`;

const scriptAt = html.indexOf('<script');
if (scriptAt < 0) {
  console.error('Kaynakta <script> yok — çizim kodu kaybolmuş.');
  process.exit(1);
}
const enjekteli =
  html.slice(0, scriptAt) + CANVAS_VEKILI + html.slice(scriptAt);

/* Sanal konsol susturuluyor: vekile rağmen kalan uyarılar (ör. jsdom'un
   desteklemediği başka bir API) çıktıyı kirletmesin. Asıl güvence
   aşağıdaki "dört hedef doldu mu" kontrolü. */
const sessizKonsol = new VirtualConsole();
const dom = new JSDOM(enjekteli, {
  runScripts: 'dangerously',
  virtualConsole: sessizKonsol,
  beforeParse(pencere) {
    /* Köprü: sayfa içindeki vekil buradan PNG istiyor. Kodlayıcı Node
       tarafında kalıyor — jsdom'un içine zlib taşımak gereksiz. */
    pencere.__pngKodla = (w, h, veri) =>
      pngDataUrl(w, h, veri instanceof Uint8ClampedArray ? veri : new Uint8ClampedArray(veri));
  },
});
const belge = dom.window.document;

for (const id of CIZILEN) {
  const el = belge.getElementById(id);
  if (!el) {
    console.error(`Kaynakta \`#${id}\` yok — paket değişmiş.`);
    process.exit(1);
  }
  if (el.children.length === 0) {
    console.error(
      `\`#${id}\` boş kaldı: paketin çizim kodu çalışmamış. ` +
        'Sessizce boş bir şekil yayınlamaktansa duruyoruz.'
    );
    process.exit(1);
  }
}

const mainEl = belge.querySelector('main');
if (!mainEl) {
  console.error('Kaynak HTML içinde <main> bulunamadı.');
  process.exit(1);
}

/* ── 1b. ELLE LİSTE YETMİYOR: gövdenin tamamı taranıyor ─────────────── */

/*
  YUKARIDAKİ `CIZILEN` LİSTESİ BİR KEZ EKSİK KALDI.

  Liste, kaynaktaki `getElementById('sabit-metin')` çağrılarından elle
  çıkarılmıştı. Şekil 2'nin dört paneli ise `getElementById(ids[k])` ile,
  yani DEĞİŞKENDEN çözülüyor — tarama onları görmedi, listeye girmediler,
  kontrol edilmediler ve dördü de canlıda siyah kutu olarak yayınlandı.

  Ders: hangi kapların dolması gerektiğini elle saymak, bir gün eksik
  sayılacak bir liste tutmaktır. Aşağıdaki iki kural gövdenin TAMAMINA
  bakıyor ve elle bakım istemiyor:

    1. Boş kalan çizim kabı (`<svg>`, `<g>`, `<canvas>`) — bir şeklin
       çizilmediğinin doğrudan işareti.
    2. Değeri `null`/`undefined` olan nitelik — çizim ÇALIŞTI ama bir
       değer üretemedi demek. Panelleri asıl bu yakalardı:
       `href="null"`.

  `photonpanels` istisnası: kaynakta duruyor ama paketin kendi kodu da
  ona hiçbir şey yazmıyor (ölü işaretleme). Boş bir `<g>` hiçbir şey
  çizmediği için zararsız; kaldırmak kaynaktan sapmak olurdu.
*/
{
  const IZINLI_BOS = new Set(['photonpanels']);
  const kaplar = [...mainEl.querySelectorAll('svg, g, canvas')];
  const bos = kaplar.filter(
    (el) =>
      el.children.length === 0 &&
      el.textContent.trim() === '' &&
      el.tagName.toLowerCase() !== 'canvas' &&
      !IZINLI_BOS.has(el.id)
  );
  if (bos.length > 0) {
    console.error(
      'Boş kalan çizim kabı var — şekil çizilmemiş:\n' +
        bos
          .map((el) => `  <${el.tagName.toLowerCase()} id="${el.id || '(kimliksiz)'}">`)
          .join('\n')
    );
    process.exit(1);
  }

  const bozukNitelik = [];
  for (const el of mainEl.querySelectorAll('*')) {
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

let body = mainEl.innerHTML;

/* ── 2. tool bloklarını sök ─────────────────────────────────────────── */

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

/* ── 3. hero başlığı ve spot metni çıkarılır ────────────────────────── */

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

/* ── 4. sınıf adlarına dz- öneki ────────────────────────────────────── */

/**
 * `dz-` öneki SNR paketinde de kullanılıyor: paketin kendi belgesi
 * "drizzle rehberiyle aynı tasarım sistemini kullanır, ikisi de
 * `.dz-root` altında" diyor. Yani ortak stil dosyası ikisini birden
 * karşılıyor ve burada yeni bir önek uydurmak, aynı görünümü ikinci kez
 * tanımlamak olurdu.
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

/* ── 5. içindekiler ─────────────────────────────────────────────────── */
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

/* ── 6. güvenlik kontrolü ───────────────────────────────────────────── */
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

/* ── 7. yaz ─────────────────────────────────────────────────────────── */
mkdirSync(OUT_DIR, { recursive: true });

const banner = `/* ÜRETİLEN DOSYA — ELLE DÜZENLEMEYİN.
 * Kaynak: docs/snr/standalone-kaynak.html
 * Üretici: scripts/snr-icerik.mjs  (\`node scripts/snr-icerik.mjs\`)
 *
 * Gövdedeki dört şekil (#sqrtchart, #bortlebars, #sbscale, #filterfig)
 * paketin kendi çizim koduyla derleme zamanında dolduruldu; çalışma
 * zamanında hiçbir çizim yapılmıyor.
 */`;

writeFileSync(
  OUT,
  `${banner}

/** Makale gövdesi; \`widget\` parçalarının yerine React bileşeni çizilir. */
export type SnrSegment =
  | { kind: 'html'; html: string }
  | { kind: 'widget'; id: SnrWidgetId };

export type SnrWidgetId = ${WIDGET_IDS.map((id) => `'${id}'`).join(' | ')};

export interface SnrTocEntry {
  id: string;
  label: string;
}

export const snrToc: SnrTocEntry[] = ${JSON.stringify(toc, null, 2)};

export const snrSegments: SnrSegment[] = ${JSON.stringify(segments, null, 2)};
`,
  'utf8'
);

const bytes = Buffer.byteLength(joined, 'utf8');
console.log(
  `SNR içeriği üretildi · ${segments.length} parça · ${WIDGET_IDS.length} widget · ` +
    `${toc.length} başlık · ${(bytes / 1024).toFixed(1)} kB HTML · ` +
    `${CIZILEN.length} şekil derleme zamanında çizildi`
);
