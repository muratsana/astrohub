import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { type ContentBlock } from '@/domain/content/blocks';
import { isAllowedImageHost } from '@/domain/content/imageHosts';
import { cn } from '@/lib/cn';
import { blocksToEditorHtml, editorHtmlToBlocks } from './richContentFormat';

interface RichContentEditorProps {
  blocks: ContentBlock[];
  onChange: (blocks: ContentBlock[]) => void;
  placeholder?: string;
}

const FigureImage = Node.create({
  name: 'figureImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: '' },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          const img = node.querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') ?? '',
            caption: node.querySelector('figcaption')?.textContent?.trim() || null,
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false;
          return {
            src: node.getAttribute('src'),
            alt: node.getAttribute('alt') ?? '',
            caption: null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const caption = HTMLAttributes.caption
      ? ['figcaption', {}, HTMLAttributes.caption]
      : null;
    return [
      'figure',
      {},
      [
        'img',
        mergeAttributes({
          src: HTMLAttributes.src,
          alt: HTMLAttributes.alt ?? '',
        }),
      ],
      ...(caption ? [caption] : []),
    ];
  },
});

/**
 * BİLGİ / UYARI KUTUSU.
 *
 * Blok modelinde `callout` zaten vardı (`tone` + isteğe bağlı `title`) ama
 * editöre `<blockquote>` olarak veriliyordu; geri okunurken `quote`'a
 * düşüyor ve her kaydetmede iki alan siliniyordu. Kendi düğümü olmadan
 * TipTap `<aside>` etiketini tanımaz ve büsbütün atardı.
 *
 * `content: 'paragraph+'` — gövde düz metin değil, normal paragraf: içine
 * kalın/bağlantı yazılabiliyor ve satır içi işaretleme gidiş-dönüşte
 * korunuyor. Başlık ise ÖZNİTELİK: gövdeye ikinci bir paragraf olarak
 * konsaydı, başlıksız kutularda boş satır olarak görünürdü.
 */
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'paragraph+',
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: 'info',
        parseHTML: (element) =>
          element.getAttribute('data-tone') === 'warning' ? 'warning' : 'info',
      },
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title') || null,
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-callout]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs: Record<string, string> = {
      'data-callout': '',
      'data-tone': (HTMLAttributes.tone as string) ?? 'info',
    };
    if (HTMLAttributes.title) attrs['data-title'] = HTMLAttributes.title as string;
    return ['aside', mergeAttributes(attrs), 0];
  },
});

export function RichContentEditor({
  blocks,
  onChange,
  placeholder,
}: RichContentEditorProps) {
  const lastHtml = useRef('');
  const [initialHtml] = useState(() => blocksToEditorHtml(blocks));

  function imageUrlFromDataTransfer(
    dataTransfer: DataTransfer | null
  ): string | null {
    if (!dataTransfer) return null;
    const uri = dataTransfer.getData('text/uri-list').trim();
    if (uri) return uri.split('\n').find((line) => !line.startsWith('#')) ?? uri;
    const plain = dataTransfer.getData('text/plain').trim();
    if (plain.startsWith('http://') || plain.startsWith('https://')) return plain;
    const html = dataTransfer.getData('text/html');
    return html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
  }

  function insertImageFromUrl(src: string): boolean {
    if (!editor) return false;
    if (!isAllowedImageHost(src)) {
      window.alert('Bu görsel adresi izinli bir konaktan değil.');
      return true;
    }
    const alt = window.prompt('Görsel açıklaması (alt metin)', 'İçerik görseli');
    if (!alt?.trim()) {
      window.alert('Yazı içi görsel için açıklama zorunlu.');
      return true;
    }
    const caption = window.prompt('Alt yazı (isteğe bağlı)')?.trim() || null;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'figureImage',
        attrs: { src, alt: alt.trim(), caption },
      })
      .run();
    return true;
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
        emptyEditorClass: 'is-editor-empty',
      }),
      Image.configure({ inline: false, allowBase64: false }),
      FigureImage,
      Callout,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        'data-placeholder': placeholder ?? '',
        class: cn(
          'min-h-[65dvh] w-full max-w-none bg-background px-4 py-3 pb-28 text-body-sm leading-relaxed text-foreground outline-none',
          '[&_a]:text-primary [&_a]:underline',
          '[&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-faint [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
          '[&_aside]:my-3 [&_aside]:rounded-card [&_aside]:border [&_aside]:px-3 [&_aside]:py-2.5',
          '[&_aside[data-tone=info]]:border-cold/40 [&_aside[data-tone=info]]:bg-cold/5',
          '[&_aside[data-tone=warning]]:border-warning/45 [&_aside[data-tone=warning]]:bg-warning/5',
          '[&_aside[data-title]]:before:mb-1 [&_aside[data-title]]:before:block [&_aside[data-title]]:before:text-meta [&_aside[data-title]]:before:font-semibold [&_aside[data-title]]:before:uppercase [&_aside[data-title]]:before:tracking-wide [&_aside[data-title]]:before:content-[attr(data-title)]',
          '[&_figcaption]:mt-1 [&_figcaption]:text-meta [&_figcaption]:text-muted-foreground',
          '[&_figure]:my-4 [&_img]:max-h-96 [&_img]:rounded-card [&_img]:border [&_img]:border-border',
          '[&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold',
          '[&_h3]:mt-4 [&_h3]:font-semibold',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1'
        ),
      },
    },
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      lastHtml.current = html;
      onChange(editorHtmlToBlocks(html));
    },
  });

  useEffect(() => {
    if (!editor) return;
    const html = blocksToEditorHtml(blocks);
    if (html === lastHtml.current || html === editor.getHTML()) return;
    lastHtml.current = html;
    editor.commands.setContent(html, { emitUpdate: false });
  }, [blocks, editor]);

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Bağlantı adresi', previous ?? '');
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  /**
   * Kutuyu açar/kapatır. Zaten o tondaysa kutudan çıkarıyor; farklı
   * tondaysa yalnızca tonu değiştiriyor (kullanıcı iki kere tıklayıp
   * kutuyu kaybetmesin). Başlık isteğe bağlı: boş bırakılırsa öznitelik
   * hiç yazılmıyor, böylece başlıksız kutu boş satır göstermiyor.
   */
  function toggleCallout(tone: 'info' | 'warning') {
    if (!editor) return;
    if (editor.isActive('callout', { tone })) {
      editor.chain().focus().lift('callout').run();
      return;
    }
    if (editor.isActive('callout')) {
      editor.chain().focus().updateAttributes('callout', { tone }).run();
      return;
    }
    const title = window.prompt('Kutu başlığı (isteğe bağlı)')?.trim() || null;
    editor.chain().focus().wrapIn('callout', { tone, title }).run();
  }

  function addImage() {
    if (!editor) return;
    const src = window.prompt('Görsel adresi (https://)');
    if (!src) return;
    insertImageFromUrl(src);
  }

  const disabled = !editor;

  return (
    <div className="rounded-card border border-border bg-surface-2">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-surface-2 p-1.5">
        <ToolbarButton
          active={editor?.isActive('bold')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Kalın
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          İtalik
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('underline')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          Altı çizili
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor?.isActive('paragraph')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          Normal
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('heading', { level: 2 })}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Başlık 2
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('heading', { level: 3 })}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          Başlık 3
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('blockquote')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          Alıntı
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('callout', { tone: 'info' })}
          disabled={disabled}
          onClick={() => toggleCallout('info')}
        >
          Bilgi kutusu
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('callout', { tone: 'warning' })}
          disabled={disabled}
          onClick={() => toggleCallout('warning')}
        >
          Uyarı kutusu
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          active={editor?.isActive('bulletList')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          Liste
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('orderedList')}
          disabled={disabled}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          Numaralı
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={setLink}>
          Bağlantı
        </ToolbarButton>
        <ToolbarButton disabled={disabled} onClick={addImage}>
          Görsel ekle
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          Tablo
        </ToolbarButton>
        <Divider />
        <ToolbarButton
          disabled={disabled || !editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          Geri al
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled || !editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          Yinele
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          Temizle
        </ToolbarButton>
        {editor?.isActive('table') ? (
          <>
            <Divider />
            <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()}>
              Sütun +
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()}>
              Satır +
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()}>
              Tablo sil
            </ToolbarButton>
          </>
        ) : null}
      </div>
      <div
        onDropCapture={(event) => {
          const src = imageUrlFromDataTransfer(event.dataTransfer);
          if (!src) return;
          event.preventDefault();
          event.stopPropagation();
          insertImageFromUrl(src);
        }}
        onPasteCapture={(event) => {
          const src = imageUrlFromDataTransfer(event.clipboardData);
          if (!src) return;
          event.preventDefault();
          event.stopPropagation();
          insertImageFromUrl(src);
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  children,
  disabled,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded-card border px-2 py-1 text-meta transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />;
}
