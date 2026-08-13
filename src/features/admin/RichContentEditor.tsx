import { Node, mergeAttributes } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TextAlign from '@tiptap/extension-text-align';
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

export function RichContentEditor({
  blocks,
  onChange,
  placeholder,
}: RichContentEditorProps) {
  const lastHtml = useRef('');
  const [initialHtml] = useState(() => blocksToEditorHtml(blocks));
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
        emptyEditorClass: 'is-editor-empty',
      }),
      Image.configure({ inline: false, allowBase64: false }),
      FigureImage,
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

  function addImage() {
    if (!editor) return;
    const src = window.prompt('Görsel adresi (https://)');
    if (!src) return;
    if (!isAllowedImageHost(src)) {
      window.alert('Bu görsel adresi izinli bir konaktan değil.');
      return;
    }
    const alt = window.prompt('Görsel açıklaması (alt metin)');
    if (!alt?.trim()) {
      window.alert('Yazı içi görsel için açıklama zorunlu.');
      return;
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
          active={editor?.isActive({ textAlign: 'left' })}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          Sol
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'center' })}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          Orta
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive({ textAlign: 'right' })}
          disabled={disabled}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          Sağ
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
      <EditorContent editor={editor} />
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
