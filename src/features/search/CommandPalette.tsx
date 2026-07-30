import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTheme } from '@/features/theme/ThemeContext';
import type { Theme } from '@/features/theme/themes';
import { cn } from '@/lib/cn';
import {
  runCommandSearch,
  flattenCommands,
  type Command,
  type CommandAction,
} from './commands';

/**
 * Komut kimliği → tema. Eşleme burada duruyor çünkü `commands.ts` saf
 * veri: tema tipini oraya taşımak, komut listesini tema modülüne
 * bağımlı hâle getirirdi.
 */
const THEME_BY_ACTION: Record<CommandAction, Theme> = {
  'tema-acik': 'light',
  'tema-koyu': 'dark',
  'tema-saha': 'field',
};

/**
 * KOMUT PALETİ — sitenin tek gezinme ve arama giriş noktası (⌘K / Ctrl+K).
 *
 * Üst menüde açılır menü olmadığı için palet aynı anda üç iş yapar:
 * sayfaya gider, araç çalıştırır, içerik arar. Boşken sık kullanılan
 * kısayolları gösterir — keşif tamamen aramaya bırakılmaz.
 *
 * Tamamen klavyeyle kullanılır: ↑/↓ gezinme, ↵ çalıştırma, Esc kapatma.
 * `role="listbox"` + `aria-activedescendant` ile ekran okuyucu desteklenir.
 */
export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const groups = useMemo(() => runCommandSearch(query), [query]);
  const flat = useMemo(() => flattenCommands(groups), [groups]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  // Katman açıkken arka plan kaydırılmasın.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Seçili satır listeden taşarsa görünür alana kaydır.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  function run(command: Command) {
    onClose();
    if (command.action) {
      setTheme(THEME_BY_ACTION[command.action]);
      return;
    }
    if (command.to) navigate(command.to);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) =>
        flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length
      );
    } else if (event.key === 'Enter' && flat[active]) {
      event.preventDefault();
      run(flat[active]);
    }
  }

  const activeId = flat[active] ? `${listboxId}-${flat[active].id}` : undefined;
  let index = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-background/85 px-4 pt-[8vh] backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Komut paleti"
        onKeyDown={onKeyDown}
        className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-card border border-border-strong bg-surface-1"
      >
        {/* Giriş satırı: terminal istemi */}
        <div className="flex items-center gap-2.5 border-b border-border px-4">
          <span aria-hidden className="text-[15px] leading-none text-primary">
            ›
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="git · ara · hesapla…"
            aria-label="Komut ya da arama terimi"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            autoComplete="off"
            spellCheck={false}
            className="h-12 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-faint"
          />
          <kbd className="hidden shrink-0 rounded-[2px] border border-border px-1.5 py-0.5 text-[9px] tracking-widest text-faint sm:block">
            Esc
          </kbd>
        </div>

        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Komutlar"
          className="overflow-y-auto py-1"
        >
          {flat.length === 0 ? (
            <p className="px-4 py-10 text-center text-[12px] leading-relaxed text-muted-foreground">
              <span className="text-foreground">“{query}”</span> için sonuç yok.
              <br />
              Katalog kodu (M31, NGC 7000), şehir ya da ekipman adı deneyin.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.kind + group.label} className="mb-1 last:mb-0">
                <h2 className="label px-4 pb-1 pt-2.5">{group.label}</h2>
                <ul>
                  {group.items.map((command) => {
                    index += 1;
                    const isActive = index === active;
                    const itemIndex = index;
                    return (
                      <li key={command.id}>
                        <button
                          type="button"
                          id={`${listboxId}-${command.id}`}
                          role="option"
                          aria-selected={isActive}
                          data-active={isActive}
                          onMouseEnter={() => setActive(itemIndex)}
                          onClick={() => run(command)}
                          className={cn(
                            'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                            isActive ? 'bg-surface-3' : 'hover:bg-surface-2'
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'shrink-0 text-[11px]',
                              isActive ? 'text-primary' : 'text-faint'
                            )}
                          >
                            {command.kind === 'icerik' ? '■' : '›'}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[13px] font-medium text-foreground">
                                {command.title}
                              </span>
                              {command.soon && (
                                <span className="shrink-0 rounded-[2px] border border-border px-1 text-[9px] tracking-widest text-faint">
                                  Yakında
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {command.subtitle}
                            </span>
                          </span>

                          {isActive && (
                            <span
                              aria-hidden
                              className="shrink-0 text-[10px] tracking-widest text-faint"
                            >
                              ↵
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[10px] tracking-[0.03em] text-faint">
          <span>↑↓ gez</span>
          <span>↵ çalıştır</span>
          <span>esc kapat</span>
        </div>
      </div>
    </div>
  );
}
