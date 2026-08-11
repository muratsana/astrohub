import { useEffect, useRef } from 'react';
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

export function RichContentEditor({
  blocks,
  onChange,
  placeholder,
}: RichContentEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const html = blocksToEditorHtml(blocks);
    if (el && html !== el.innerHTML) el.innerHTML = html;
  }, [blocks]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    onChange(editorHtmlToBlocks(el.innerHTML));
  }

  function exec(command: string, value?: string) {
    ref.current?.focus();
    document.execCommand(command, false, value);
    emit();
  }

  function addLink() {
    const url = window.prompt('Bağlantı adresi');
    if (!url) return;
    exec('createLink', url);
  }

  function addImage() {
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
    const caption = window.prompt('Alt yazı (isteğe bağlı)')?.trim();
    const figcaption = caption
      ? `<figcaption>${escapeHtml(caption)}</figcaption>`
      : '';
    exec(
      'insertHTML',
      `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(
        alt.trim()
      )}">${figcaption}</figure>`
    );
  }

  return (
    <div className="rounded-card border border-border bg-surface-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-1.5">
        <ToolbarButton onClick={() => exec('bold')}>Kalın</ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')}>İtalik</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => exec('formatBlock', '<p>')}>
          Normal
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', '<h2>')}>
          Başlık 2
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', '<h3>')}>
          Başlık 3
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('formatBlock', '<blockquote>')}>
          Alıntı
        </ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => exec('insertUnorderedList')}>
          Liste
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')}>
          Numaralı
        </ToolbarButton>
        <ToolbarButton onClick={addLink}>Bağlantı</ToolbarButton>
        <ToolbarButton onClick={addImage}>Görsel ekle</ToolbarButton>
        <Divider />
        <ToolbarButton onClick={() => exec('removeFormat')}>Temizle</ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        className={cn(
          'min-h-[28rem] w-full max-w-none overflow-y-auto bg-background px-4 py-3 text-body-sm leading-relaxed text-foreground outline-none',
          'empty:before:text-faint empty:before:content-[attr(data-placeholder)]',
          '[&_a]:text-primary [&_a]:underline',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground',
          '[&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold',
          '[&_h3]:mt-4 [&_h3]:font-semibold',
          '[&_img]:my-3 [&_img]:max-h-80 [&_img]:rounded-card [&_img]:border [&_img]:border-border',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
          '[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1'
        )}
      />
    </div>
  );
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

function ToolbarButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-card border border-transparent px-2 py-1 text-meta text-muted-foreground hover:border-border hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />;
}
