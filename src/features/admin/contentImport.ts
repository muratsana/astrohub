import { sanitizeText } from '@/lib/sanitize';
import type { ContentBlock } from '@/domain/content/blocks';
import { isAllowedImageHost } from '@/domain/content/imageHosts';
import { htmlToInlineMarkdown } from './richContentFormat';

/**
 * DOSYADAN İÇERİK — NE DÜŞTÜYSE SÖYLENİR.
 *
 * ── ÖNCEKİ HALİNİN ÜÇ SESSİZ KAYBI ────────────────────────────────────
 *
 * 1. Yalnızca `body`nin DOĞRUDAN çocukları geziliyordu. Gövdesi tek bir
 *    `<div>`/`<article>` içine sarılı bir dosya — yani dışarıdan gelen
 *    HTML'in çoğu — TEK PARAGRAFA çöküyordu. Üstelik `div`/`section`/
 *    `article` "beklenen" etiket listesinde olduğu için uyarı bile
 *    üretilmiyordu. Uzun yazılarda sonuç 20.000 karakterlik paragraf
 *    sınırına takılıp kaydetmeyi tamamen bozuyordu.
 * 2. Metin `node.textContent` ile alınıyordu: kalın, eğik ve bağlantı
 *    düz metne iniyordu.
 * 3. `<img>` ve `<table>` işleyicisi yoktu. Görselin `textContent`i boş
 *    olduğu için blok hiç üretilmiyor, tablo ise hücreleri birbirine
 *    yapışmış tek paragraf oluyordu.
 *
 * ── YENİ KURAL ────────────────────────────────────────────────────────
 *
 * Ağaç ÖZYİNELEMELİ geziliyor; sarmalayıcı etiketler (`div`, `section`,
 * `article`, `main`, `header`, `footer`) açılıp içindeki bloklar tek tek
 * alınıyor. Satır içi biçim `htmlToInlineMarkdown` ile korunuyor — editör
 * yolu da aynı fonksiyonu kullanıyor, yani dosyadan gelen metinle
 * editörde yazılan metin aynı biçimleniyor.
 *
 * DÜŞEN HER ŞEY UYARIYA DÖNÜYOR. Bir blok atlanıyorsa kullanıcı bunu
 * ekranda görüyor; sessizce kaybolmuyor. Kural şu: bir düğüm ne bloğa
 * çevrilebiliyor ne de sarmalayıcıysa, ATILDIĞI SÖYLENİR.
 *
 * HAM HTML YİNE RENDER EDİLMİYOR. `DOMParser` ayrıştırıyor, çıktı kapalı
 * blok modeline giriyor; `script`/`style` en başta eleniyor.
 */

export interface ImportResult {
  blocks: ContentBlock[];
  warnings: string[];
}

function clean(value: string | null | undefined): string {
  return sanitizeText(value ?? '', { multiline: true });
}

/** İçindekiler bloğa çevrilmeden doğrudan açılan sarmalayıcılar. */
const WRAPPERS = new Set([
  'div',
  'section',
  'article',
  'main',
  'header',
  'footer',
  'aside',
  'body',
  'figure-group',
  'nav',
]);

/** Bloğa çevrilemeyen ve içeriği de anlamsız olan etiketler. */
const IGNORED = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'form',
]);

interface Ctx {
  blocks: ContentBlock[];
  warnings: string[];
  /** Aynı uyarı yüz kere tekrarlanmasın. */
  seen: Set<string>;
}

function warn(ctx: Ctx, message: string): void {
  if (ctx.seen.has(message)) return;
  ctx.seen.add(message);
  ctx.warnings.push(message);
}

/** Sarmalayıcının içinde blok üretebilecek bir çocuk var mı? */
function hasElementChild(element: Element): boolean {
  return Array.from(element.children).some(
    (child) => !IGNORED.has(child.tagName.toLowerCase())
  );
}

function walk(element: Element, ctx: Ctx): void {
  const tag = element.tagName.toLowerCase();

  if (IGNORED.has(tag)) {
    warn(ctx, `<${tag}> güvenlik nedeniyle atlandı.`);
    return;
  }

  /* Sarmalayıcı: kendisi blok değil, çocukları blok. İçinde eleman yoksa
     (yalnızca düz metin taşıyorsa) paragraf olarak alınıyor — yoksa metin
     kaybolurdu. */
  if (WRAPPERS.has(tag)) {
    if (hasElementChild(element)) {
      for (const child of Array.from(element.children)) walk(child, ctx);
      return;
    }
    const loose = clean(htmlToInlineMarkdown(element));
    if (loose) ctx.blocks.push({ type: 'paragraph', text: loose });
    return;
  }

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const text = clean(htmlToInlineMarkdown(element)).slice(0, 300);
    if (text)
      ctx.blocks.push({ type: 'heading', level: tag === 'h3' ? 3 : 2, text });
    return;
  }

  /* Blok modelinde yalnızca 2. ve 3. seviye başlık var. Daha derin
     başlıklar 3'e çekiliyor — paragrafa düşseydi belge yapısı tamamen
     kaybolurdu. */
  if (tag === 'h4' || tag === 'h5' || tag === 'h6') {
    const text = clean(htmlToInlineMarkdown(element)).slice(0, 300);
    if (!text) return;
    warn(
      ctx,
      `<${tag}> "Başlık 3" olarak alındı — blok modelinde daha derin başlık yok.`
    );
    ctx.blocks.push({ type: 'heading', level: 3, text });
    return;
  }

  if (tag === 'blockquote') {
    const text = clean(htmlToInlineMarkdown(element));
    if (text) ctx.blocks.push({ type: 'quote', text });
    return;
  }

  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(element.querySelectorAll(':scope > li'))
      .map((item) => clean(htmlToInlineMarkdown(item)))
      .filter(Boolean);
    if (!items.length) return;
    if (element.querySelector(':scope > li > ul, :scope > li > ol')) {
      warn(ctx, 'İç içe liste tek seviyeye indirildi.');
    }
    ctx.blocks.push({
      type: 'list',
      style: tag === 'ol' ? 'ordered' : 'bullet',
      items: items.slice(0, 100),
    });
    if (items.length > 100) warn(ctx, 'Liste 100 maddeyle sınırlandı.');
    return;
  }

  if (tag === 'figure' || tag === 'img') {
    const img = tag === 'img' ? element : element.querySelector('img');
    const src = img?.getAttribute('src')?.trim() ?? '';
    const alt = clean(img?.getAttribute('alt') ?? '');
    if (!src) {
      warn(ctx, 'Adressiz bir görsel atlandı.');
      return;
    }
    if (!isAllowedImageHost(src)) {
      warn(
        ctx,
        `Görsel izinli bir konaktan değil, atlandı: ${src.slice(0, 80)}`
      );
      return;
    }
    if (!alt) {
      warn(ctx, `Görselin alt metni yok, atlandı: ${src.slice(0, 80)}`);
      return;
    }
    const caption = clean(
      element.querySelector('figcaption')?.textContent ?? ''
    );
    ctx.blocks.push({
      type: 'image',
      src,
      alt: alt.slice(0, 300),
      caption: caption || undefined,
    });
    return;
  }

  if (tag === 'table') {
    const rows = Array.from(element.querySelectorAll('tr'))
      .map((row) =>
        Array.from(row.querySelectorAll('th,td')).map((cell) =>
          clean(htmlToInlineMarkdown(cell)).slice(0, 500)
        )
      )
      .filter((row) => row.some((cell) => cell.length > 0));
    const [first, ...rest] = rows;
    if (!first?.length) return;
    const hasHeader = Boolean(element.querySelector('th'));
    const caption = clean(element.querySelector('caption')?.textContent ?? '');
    ctx.blocks.push({
      type: 'table',
      caption: caption || undefined,
      header: hasHeader ? first : undefined,
      rows: hasHeader
        ? rest.length
          ? rest
          : [first.map(() => '')]
        : [first, ...rest],
    });
    return;
  }

  /* Kod bloğu: blok modelinde karşılığı yok. Metni paragraf olarak
     saklamak, atmaktan iyi — ama biçimin gittiği SÖYLENİYOR. */
  if (tag === 'pre' || tag === 'code') {
    const text = clean(element.textContent);
    if (!text) return;
    warn(
      ctx,
      'Kod bloğu düz paragraf olarak alındı — blok modelinde kod türü yok.'
    );
    ctx.blocks.push({ type: 'paragraph', text });
    return;
  }

  if (tag === 'hr') {
    warn(ctx, 'Yatay ayraç atlandı — blok modelinde ayraç türü yok.');
    return;
  }

  if (tag === 'p') {
    const text = clean(htmlToInlineMarkdown(element));
    if (text) ctx.blocks.push({ type: 'paragraph', text });
    return;
  }

  const fallback = clean(htmlToInlineMarkdown(element));
  if (!fallback) return;
  warn(ctx, `<${tag}> paragraf olarak içe aktarıldı.`);
  ctx.blocks.push({ type: 'paragraph', text: fallback });
}

/** Ham HTML hiçbir zaman render edilmez; DOM ayrıştırılıp kapalı bloklara alınır. */
export function htmlToBlocks(html: string): ImportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const ctx: Ctx = { blocks: [], warnings: [], seen: new Set() };
  for (const node of Array.from(doc.body.children)) walk(node, ctx);
  if (!ctx.blocks.length) {
    const text = clean(doc.body.textContent);
    if (text) ctx.blocks.push({ type: 'paragraph', text });
  }
  return { blocks: ctx.blocks, warnings: ctx.warnings };
}

export async function importDocx(file: File): Promise<ImportResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({
    arrayBuffer: await file.arrayBuffer(),
  });
  const converted = htmlToBlocks(result.value);
  return {
    blocks: converted.blocks,
    warnings: [
      ...result.messages.map((message) => message.message),
      ...converted.warnings,
    ],
  };
}

interface PdfTextItem {
  str: string;
  transform: number[];
  height: number;
}

export async function importPdf(file: File): Promise<ImportResult> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  const document = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  }).promise;
  const blocks: ContentBlock[] = [];

  for (let pageNo = 1; pageNo <= document.numPages; pageNo += 1) {
    const page = await document.getPage(pageNo);
    const content = await page.getTextContent();
    const items: PdfTextItem[] = content.items.flatMap((item) =>
      'str' in item && 'transform' in item && 'height' in item
        ? [{ str: item.str, transform: item.transform, height: item.height }]
        : []
    );
    const rows = new Map<number, PdfTextItem[]>();
    for (const item of items) {
      const y = Math.round(item.transform[5] / 3) * 3;
      rows.set(y, [...(rows.get(y) ?? []), item]);
    }
    const ordered = [...rows.entries()].sort((a, b) => b[0] - a[0]);
    const medianHeight =
      items.map((item) => item.height).sort((a, b) => a - b)[
        Math.floor(items.length / 2)
      ] ?? 12;
    for (const [, row] of ordered) {
      const value = clean(
        row
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map((item) => item.str)
          .join(' ')
      );
      if (!value) continue;
      const height = Math.max(...row.map((item) => item.height));
      blocks.push(
        height > medianHeight * 1.35
          ? { type: 'heading', level: 2, text: value.slice(0, 300) }
          : { type: 'paragraph', text: value }
      );
    }
  }

  return {
    blocks,
    warnings: [
      'PDF sunum biçimidir; başlıklar punto farkıyla tahmin edildi. Yayınlamadan önce blokları kontrol edin.',
    ],
  };
}

/**
 * HTML DOSYASI.
 *
 * `htmlToBlocks` en baştan beri vardı ama yalnızca Word dönüşümünün ara
 * adımı olarak çağrılıyordu; kullanıcı bir `.html` dosyası seçemiyordu.
 * Plan üç biçim istiyor (HTML → Word → PDF) ve üçünün en güvenlisi
 * buydu: dosya hiçbir zaman render edilmiyor, `DOMParser` ile ayrıştırılıp
 * yalnızca DOM METNİ kapalı bloklara alınıyor, `script`/`style` atlanıyor.
 */
export async function importHtml(file: File): Promise<ImportResult> {
  const raw = await file.text();
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const article = doc.querySelector('article.ah');
  const html = (article?.outerHTML ?? (doc.body.innerHTML || raw)).trim();
  const slug = file.name
    .replace(/\.(html?|HTML?)$/, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const scriptSrc =
    slug && /\bdata-ah-(fig|tool)=/i.test(html)
      ? `/astrohub/${slug}.js`
      : undefined;

  return {
    blocks: [
      {
        type: 'html',
        html,
        ...(scriptSrc ? { scriptSrc } : {}),
      },
    ],
    warnings: [
      'HTML kaynak olarak korundu; şekil ve etkileşimli araç yer tutucuları parçalanmadı.',
    ],
  };
}

export async function importContentFile(file: File): Promise<ImportResult> {
  const name = file.name.toLocaleLowerCase('tr-TR');
  if (name.endsWith('.docx')) return importDocx(file);
  if (name.endsWith('.pdf')) return importPdf(file);
  if (name.endsWith('.html') || name.endsWith('.htm')) return importHtml(file);
  throw new Error('Yalnızca .html, .docx ve .pdf dosyaları desteklenir.');
}
