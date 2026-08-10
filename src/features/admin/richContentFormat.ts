import { type ContentBlock } from '@/domain/content/blocks';
import { isAllowedImageHost } from '@/domain/content/imageHosts';
import { parseInline } from '@/domain/content/inline';
import { youtubeIdFromInput } from '@/features/tv/types';
import { safeUrl } from '@/lib/url';

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
  if (block.type === 'callout') {
    return `<blockquote>${inlineToHtml(block.text)}</blockquote>`;
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
      ? `<thead><tr>${block.header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
      : '';
    const rows = block.rows
      .map(
        (row) =>
          `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
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
    const text = inlineToMarkdown(element).slice(0, 300).trim();
    return text ? [{ type: 'heading', level: tag === 'h3' ? 3 : 2, text }] : [];
  }
  if (tag === 'blockquote') {
    const text = inlineToMarkdown(element).trim();
    return text ? [{ type: 'quote', text }] : [];
  }
  if (tag === 'ul' || tag === 'ol') {
    const items = Array.from(element.querySelectorAll(':scope > li'))
      .map((item) => inlineToMarkdown(item).trim())
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
        (cell.textContent ?? '').trim()
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

  const text = inlineToMarkdown(element).trim();
  return text ? [{ type: 'paragraph', text }] : [];
}

function inlineToHtml(text: string): string {
  return parseInline(text)
    .map((span) => {
      if (span.kind === 'strong') return `<strong>${escapeHtml(span.text)}</strong>`;
      if (span.kind === 'em') return `<em>${escapeHtml(span.text)}</em>`;
      if (span.kind === 'link') {
        return `<a href="${escapeAttr(span.href)}">${escapeHtml(span.text)}</a>`;
      }
      return escapeHtml(span.text);
    })
    .join('');
}

function inlineToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (!(node instanceof Element)) return '';

  const tag = node.tagName.toLowerCase();
  if (tag === 'br') return '\n';
  const text = Array.from(node.childNodes).map(inlineToMarkdown).join('');
  if (!text.trim()) return text;
  if (tag === 'strong' || tag === 'b') return `**${text}**`;
  if (tag === 'em' || tag === 'i') return `*${text}*`;
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
