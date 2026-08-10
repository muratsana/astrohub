import { sanitizeText } from '@/lib/sanitize';
import type { ContentBlock } from '@/domain/content/blocks';

export interface ImportResult {
  blocks: ContentBlock[];
  warnings: string[];
}

function clean(value: string | null | undefined): string {
  return sanitizeText(value ?? '', { multiline: true });
}

/** Ham HTML hiçbir zaman render edilmez; yalnız DOM metni kapalı bloklara alınır. */
export function htmlToBlocks(html: string): ImportResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks: ContentBlock[] = [];
  const warnings: string[] = [];

  for (const node of Array.from(doc.body.children)) {
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') {
      warnings.push(`<${tag}> güvenlik nedeniyle atlandı.`);
      continue;
    }
    const value = clean(node.textContent);
    if (!value) continue;

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      blocks.push({ type: 'heading', level: tag === 'h3' ? 3 : 2, text: value.slice(0, 300) });
    } else if (tag === 'blockquote') {
      blocks.push({ type: 'quote', text: value });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(node.querySelectorAll(':scope > li')).map((item) => clean(item.textContent)).filter(Boolean);
      if (items.length) blocks.push({ type: 'list', style: tag === 'ol' ? 'ordered' : 'bullet', items });
    } else {
      if (!['p', 'div', 'section', 'article'].includes(tag)) {
        warnings.push(`<${tag}> paragraf olarak içe aktarıldı.`);
      }
      blocks.push({ type: 'paragraph', text: value });
    }
  }

  return { blocks, warnings };
}

export async function importDocx(file: File): Promise<ImportResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
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
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
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
    const medianHeight = items.map((item) => item.height).sort((a, b) => a - b)[Math.floor(items.length / 2)] ?? 12;
    for (const [, row] of ordered) {
      const value = clean(row.sort((a, b) => a.transform[4] - b.transform[4]).map((item) => item.str).join(' '));
      if (!value) continue;
      const height = Math.max(...row.map((item) => item.height));
      blocks.push(height > medianHeight * 1.35
        ? { type: 'heading', level: 2, text: value.slice(0, 300) }
        : { type: 'paragraph', text: value });
    }
  }

  return {
    blocks,
    warnings: ['PDF sunum biçimidir; başlıklar punto farkıyla tahmin edildi. Yayınlamadan önce blokları kontrol edin.'],
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
  return htmlToBlocks(await file.text());
}

export async function importContentFile(file: File): Promise<ImportResult> {
  const name = file.name.toLocaleLowerCase('tr-TR');
  if (name.endsWith('.docx')) return importDocx(file);
  if (name.endsWith('.pdf')) return importPdf(file);
  if (name.endsWith('.html') || name.endsWith('.htm')) return importHtml(file);
  throw new Error('Yalnızca .html, .docx ve .pdf dosyaları desteklenir.');
}
