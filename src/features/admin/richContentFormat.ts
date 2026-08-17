import { type ContentBlock } from '@/domain/content/blocks';
import { isAllowedImageHost } from '@/domain/content/imageHosts';
import { parseInline } from '@/domain/content/inline';
import { youtubeIdFromInput } from '@/features/tv/types';
import { safeUrl } from '@/lib/url';

/**
 * BLOK MODELİ ⇄ EDİTÖR HTML'İ — KAYIPSIZ GİDİŞ-DÖNÜŞ.
 *
 * Bu dosyanın tek görevi var: `blocksToEditorHtml` ile editöre verileni
 * `editorHtmlToBlocks` geri okuduğunda AYNI bloklar çıkmalı. Bir yazıyı
 * açıp hiçbir şey değiştirmeden kaydetmek içeriği değiştirmemeli.
 *
 * Bu kural üç yerde kırılmıştı:
 *
 *   1. `callout` editöre `<blockquote>` olarak veriliyordu, geri okurken
 *      `quote` oluyordu — her kaydetmede `tone` ve `title` siliniyordu.
 *      Artık `<aside data-callout>` ile taşınıyor.
 *   2. Tablo hücreleri `escapeHtml` ile yazılıp `textContent` ile
 *      okunuyordu: hücre içindeki kalın/bağlantı kaydedince kayboluyordu.
 *      Artık hücreler de satır içi işaretlemeden geçiyor.
 *   3. Editörde "Altı çizili" düğmesi vardı ama depolama karşılığı yoktu.
 *      Karşılığı `domain/content/inline.ts` içinde açıldı (`__metin__`).
 *
 * `richContentFormat.test.ts` bu üçünü de gidiş-dönüş olarak doğruluyor.
 */

export function blocksToEditorHtml(blocks: ContentBlock[]): string {
  return blocks.map(blockToHtml).join('');
}

function blockToHtml(block: ContentBlock): string {
  if (block.type === 'heading') {
    return `<h${block.level}>${inlineToHtml(block.text)}</h${block.level}>`;
  }
  if (block.type === 'quote') {
    return `<blockquote>${inlineToHtml(block.text)}</blockquote>`;
  }
  /*
   * CALLOUT ≠ ALINTI. Ayrı bir etikette taşınıyor çünkü `tone` ve
   * `title` alanlarının gidecek başka yeri yok; `<blockquote>` bu iki
   * alanı düşürüyordu. `<aside>` seçildi: BlockRenderer da callout'u
   * `<aside>` çiziyor, yani editördeki görüntü yayındakine yakın.
   */
  if (block.type === 'callout') {
    const title = block.title
      ? ` data-title="${escapeAttr(block.title)}"`
      : '';
    return `<aside data-callout data-tone="${block.tone}"${title}><p>${inlineToHtml(block.text)}</p></aside>`;
  }
  if (block.type === 'list') {
    const tag = block.style === 'ordered' ? 'ol' : 'ul';
    return `<${tag}>${block.items.map((item) => `<li>${inlineToHtml(item)}</li>`).join('')}</${tag}>`;
  }
  if (block.type === 'image') {
    const image = `<img src="${escapeAttr(block.src)}" alt="${escapeAttr(block.alt)}">`;
    const caption = block.caption
      ? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
      : '';
    return `<figure>${image}${caption}</figure>`;
  }
  if (block.type === 'table') {
    const header = block.header
      ? `<thead><tr>${block.header.map((cell) => `<th>${inlineToHtml(cell)}</th>`).join('')}</tr></thead>`
      : '';
    const rows = block.rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${inlineToHtml(cell)}</td>`).join('')}</tr>`
      )
      .join('');
    const caption = block.caption
      ? `<caption>${escapeHtml(block.caption)}</caption>`
      : '';
    return `<table>${caption}${header}<tbody>${rows}</tbody></table>`;
  }
  if (block.type === 'embed') {
    return `<p>${escapeHtml(block.title)} — https://www.youtube.com/watch?v=${escapeAttr(block.videoId)}</p>`;
  }
  return `<p>${inlineToHtml(block.text)}</p>`;
}

export function editorHtmlToBlocks(html: string): ContentBlock[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const blocks = Array.from(doc.body.children).flatMap(elementToBlocks);
  if (blocks.length > 0) return blocks;
  const text = doc.body.textContent?.trim();
  return text ? [{ type: 'paragraph', text }] : [];
}

function elementToBlocks(element: Element): ContentBlock[] {
  const tag = element.tagName.toLowerCase();

  if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
    const text = htmlToInlineMarkdown(element).slice(0, 300).trim();
    return text ? [{ type: 'heading', level: tag === 'h3' ? 3 : 2, text }] : [];
  }
  /* `<aside data-callout>` alıntıdan ÖNCE bakılıyor: iç içe geçme
     ihtimali yok ama sıra niyeti belgeliyor — callout kendi türüdür. */
  if (tag === 'aside' && element.hasAttribute('data-callout')) {
    const text = htmlToInlineMarkdown(element).trim();
    if (!text) return [];
    const tone = element.getAttribute('data-tone') === 'warning' ? 'warning' : 'info';
    const title = element.getAttribute('data-title')?.trim();
    return [{ type: 'callout', tone, text, ...(title ? { title } : {}) }];
  }
  if (tag === 'blockquote') {
    const text = htmlToInlineMarkdown(element).trim();
    return text ? [{ type: 'quote', text }] : [];
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(element.querySelectorAll(':scope > li'))
      .map((item) => htmlToInlineMarkdown(item).trim())
      .filter(Boolean);
    return items.length
      ? [{ type: 'list', style: tag === 'ol' ? 'ordered' : 'bullet', items }]
      : [];
  }
  if (tag === 'figure' || tag === 'img') {
    const img = tag === 'img' ? element : element.querySelector('img');
    const src = img?.getAttribute('src')?.trim() ?? '';
    const alt = img?.getAttribute('alt')?.trim() ?? '';
    if (!isAllowedImageHost(src) || !alt) return [];
    const caption = element.querySelector('figcaption')?.textContent?.trim();
    return [{ type: 'image', src, alt, caption: caption || undefined }];
  }
  if (tag === 'table') {
    const rows = Array.from(element.querySelectorAll('tr')).map((row) =>
      Array.from(row.querySelectorAll('th,td')).map((cell) =>
        htmlToInlineMarkdown(cell).trim()
      )
    );
    const [first = [], ...rest] = rows.filter((row) =>
      row.some((cell) => cell.length > 0)
    );
    if (first.length === 0) return [];
    const hasHeader = Boolean(element.querySelector('th'));
    return [
      {
        type: 'table',
        caption: element.querySelector('caption')?.textContent?.trim() || undefined,
        header: hasHeader ? first : undefined,
        rows: hasHeader
          ? rest.length
            ? rest
            : [first.map(() => '')]
          : [first, ...rest],
      },
    ];
  }

  const iframe = element.querySelector('iframe');
  const videoId = youtubeIdFromInput(iframe?.getAttribute('src') ?? '');
  if (videoId) {
    return [
      {
        type: 'embed',
        provider: 'youtube',
        videoId,
        title: iframe?.getAttribute('title')?.trim() || 'YouTube videosu',
      },
    ];
  }

  const text = htmlToInlineMarkdown(element).trim();
  return text ? [{ type: 'paragraph', text }] : [];
}

function inlineToHtml(text: string): string {
  return parseInline(text)
    .map((span) => {
      if (span.kind === 'strong') return `<strong>${escapeHtml(span.text)}</strong>`;
      if (span.kind === 'em') return `<em>${escapeHtml(span.text)}</em>`;
      if (span.kind === 'underline') return `<u>${escapeHtml(span.text)}</u>`;
      if (span.kind === 'link') {
        return `<a href="${escapeAttr(span.href)}">${escapeHtml(span.text)}</a>`;
      }
      return escapeHtml(span.text);
    })
    .join('');
}

/**
 * DOM ağacını satır içi işaretlemeye çevirir (`**kalın**`, `__altı__`,
 * `*eğik*`, `[metin](adres)`).
 *
 * İçe aktarma yolu da (`contentImport.ts`) bunu kullanıyor: iki yerde iki
 * ayrı ayrıştırıcı olsaydı, editörden geçen metin ile dosyadan gelen
 * metin farklı biçimlenirdi.
 */
export function htmlToInlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';

  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  const text = Array.from(node.childNodes).map(htmlToInlineMarkdown).join('');
  if (!text.trim()) return text;
  if (tag === 'strong' || tag === 'b') return `**${text}**`;
  if (tag === 'em' || tag === 'i') return `*${text}*`;
  if (tag === 'u') return `__${text}__`;
  if (tag === 'a') {
    const href = cleanHref(node.getAttribute('href') ?? '');
    return href ? `[${text}](${href})` : text;
  }
  return text;
}

function cleanHref(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return safeUrl(trimmed);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;');
}
