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
    /*
     * MİZANPAJ `data-*` İLE TAŞINIYOR — callout'un `data-tone`u ile aynı
     * desen. Öznitelik yazılmasaydı editörde bir kez kaydedilen görsel
     * hizasını kaybederdi: HTML'e inen bilgi geri okunmadığında sessizce
     * kayboluyor ve yazar sebebini anlamıyor.
     */
    const align = block.align ? ` data-align="${escapeAttr(block.align)}"` : '';
    const width = block.width ? ` data-width="${escapeAttr(block.width)}"` : '';
    return `<figure${align}${width}>${image}${caption}</figure>`;
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
  /*
   * GALERİ VE İKİ SÜTUN, editörün HTML gövdesinde DÜZ karşılıklarına
   * iniyor: zengin editör `contenteditable` üstünde çalışıyor ve orada
   * ızgara kurmak, kullanıcının imleçle bozabileceği bir yapı üretirdi.
   * Blok modeli yapıyı koruyor; editör onu düzenlenebilir bir metin
   * olarak gösteriyor.
   */
  /*
   * GALERİ VE İKİ SÜTUN — yapıları KORUNARAK gidip geliyor.
   *
   * İlk yazımda ikisi de düz paragraflara iniyordu ve bu, editörde bir
   * kez kaydedilen galerinin tek tek görsellere dağılması demekti: yazar
   * bir virgül düzeltip kaydettiğinde ızgarasını kaybediyordu. Sessiz
   * veri kaybı, eksik özellikten kötü.
   *
   * Desen `aside[data-callout]` ile aynı: yapı gerçek HTML, kimlik
   * `data-*` özniteliğinde. `contenteditable` içinde kullanıcı bunu
   * bozabilir — callout için de geçerli olan ve kabul edilmiş bir risk;
   * bozulduğunda blok kendi türünü kaybediyor ama İÇERİK duruyor.
   */
  if (block.type === 'gallery') {
    const items = block.items
      .map((item) => {
        const caption = item.caption
          ? `<figcaption>${escapeHtml(item.caption)}</figcaption>`
          : '';
        return `<figure><img src="${escapeAttr(item.src)}" alt="${escapeAttr(item.alt)}">${caption}</figure>`;
      })
      .join('');
    const caption = block.caption
      ? `<figcaption>${escapeHtml(block.caption)}</figcaption>`
      : '';
    const cols = block.columns ? ` data-cols="${block.columns}"` : '';
    return `<figure data-gallery="1"${cols}>${items}${caption}</figure>`;
  }
  if (block.type === 'columns') {
    const side = (
      title: string | undefined,
      body: string,
      name: 'left' | 'right'
    ) => {
      const heading = title ? `<h3>${escapeHtml(title)}</h3>` : '';
      return `<section data-side="${name}">${heading}<p>${inlineToHtml(body)}</p></section>`;
    };
    return `<div data-columns="1">${side(block.leftTitle, block.left, 'left')}${side(block.rightTitle, block.right, 'right')}</div>`;
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
  /*
   * GALERİ, DÜZ GÖRSELDEN ÖNCE bakılıyor: galeri de bir `<figure>` ve
   * sıra ters olsaydı ilk görselini alıp gerisini atardı.
   */
  if (tag === 'figure' && element.hasAttribute('data-gallery')) {
    const items = Array.from(element.querySelectorAll(':scope > figure'))
      .map((item) => {
        const img = item.querySelector('img');
        return {
          src: img?.getAttribute('src')?.trim() ?? '',
          alt: img?.getAttribute('alt')?.trim() ?? '',
          caption: item.querySelector('figcaption')?.textContent?.trim() || undefined,
        };
      })
      .filter((item) => isAllowedImageHost(item.src) && item.alt);

    /* İki görselin altına düşen galeri, galeri değil: şema da bunu
       reddediyor. Tek görsel kalırsa onu düz görsel bloğu olarak
       kurtarıyoruz — atmak, yazarın yüklediği kareyi silmek olurdu. */
    if (items.length === 1) {
      return [{ type: 'image', src: items[0].src, alt: items[0].alt }];
    }
    if (items.length === 0) return [];

    const cols = element.getAttribute('data-cols');
    return [
      {
        type: 'gallery',
        items,
        caption:
          element.querySelector(':scope > figcaption')?.textContent?.trim() ||
          undefined,
        ...(cols === '2' || cols === '3' ? { columns: Number(cols) as 2 | 3 } : {}),
      },
    ];
  }

  if (tag === 'div' && element.hasAttribute('data-columns')) {
    const side = (name: 'left' | 'right') => {
      const node = element.querySelector(`:scope > section[data-side="${name}"]`);
      if (!node) return { title: undefined, body: '' };
      const heading = node.querySelector('h3');
      const title = heading?.textContent?.trim() || undefined;
      heading?.remove();
      return { title, body: htmlToInlineMarkdown(node).trim() };
    };
    const left = side('left');
    const right = side('right');
    /* Bir taraf boşsa iki sütun anlamsız; kalan taraf paragrafa
       düşüyor ve metin kaybolmuyor. */
    if (!left.body && !right.body) return [];
    if (!left.body || !right.body) {
      return [{ type: 'paragraph', text: left.body || right.body }];
    }
    return [
      {
        type: 'columns',
        left: left.body,
        right: right.body,
        ...(left.title ? { leftTitle: left.title } : {}),
        ...(right.title ? { rightTitle: right.title } : {}),
      },
    ];
  }

  if (tag === 'figure' || tag === 'img') {
    const img = tag === 'img' ? element : element.querySelector('img');
    const src = img?.getAttribute('src')?.trim() ?? '';
    const alt = img?.getAttribute('alt')?.trim() ?? '';
    if (!isAllowedImageHost(src) || !alt) return [];
    const caption = element.querySelector('figcaption')?.textContent?.trim();
    const align = element.getAttribute('data-align');
    const width = element.getAttribute('data-width');
    return [
      {
        type: 'image',
        src,
        alt,
        caption: caption || undefined,
        /* Tanımsız değer YAZILMIYOR: elle düzenlenmiş bir HTML'den gelen
           `data-align="justify"` şemayı düşürür ve tek bir bozuk
           öznitelik yüzünden yazının tamamı kaydedilemez olurdu. */
        ...(align === 'left' || align === 'center' || align === 'right'
          ? { align }
          : {}),
        ...(width === 'full' || width === 'half' || width === 'third'
          ? { width }
          : {}),
      },
    ];
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
