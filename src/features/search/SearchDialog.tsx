import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { flattenGroups, searchAll, type SearchDoc } from './index';

/**
 * Global arama katmanı (§16.1). Tek kutu; sonuçlar kategori başlıklarıyla
 * gruplanır. Tamamen klavyeyle kullanılabilir (§6.7, §19.7):
 * ↑/↓ gezinme, Enter açma, Esc kapatma; açılırken odak kutuya taşınır,
 * kapanırken tetikleyen butona geri döner.
 */
export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const navigate = useNavigate();

  const groups = useMemo(() => searchAll(query), [query]);
  const flat = useMemo(() => flattenGroups(groups), [groups]);

  // Açılışta odak kutuya; kapanışta sorgu sıfırlanır.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  // Sonuç kümesi değişince seçim başa döner.
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

  if (!open) return null;

  function go(doc: SearchDoc) {
    onClose();
    navigate(doc.to);
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
      go(flat[active]);
    }
  }

  const activeId = flat[active] ? `${listboxId}-${flat[active].id}` : undefined;
  let index = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 pt-[10vh] backdrop-blur-sm"
      // Katman dışına tıklamak kapatır; içeriğe tıklama yayılmaz.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sitede ara"
        onKeyDown={onKeyDown}
        className="flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Fotoğraf, hedef, etkinlik, ekipman, gözlem noktası ara…"
            aria-label="Arama terimi"
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-activedescendant={activeId}
            className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground sm:block">
            Esc
          </kbd>
        </div>

        <div
          id={listboxId}
          role="listbox"
          aria-label="Arama sonuçları"
          className="overflow-y-auto p-2"
        >
          {query.trim() === '' ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Aramak için yazmaya başlayın. Fotoğraflar, astronomik hedefler,
              etkinlikler, gözlem noktaları, ekipman ve ilanlar taranır.
            </p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              <span className="text-foreground">“{query}”</span> için sonuç
              bulunamadı. Farklı bir terim ya da katalog kodu (örn. M31, NGC
              7000) deneyin.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.category} className="mb-2 last:mb-0">
                <h2 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </h2>
                <ul>
                  {group.items.map((item) => {
                    index += 1;
                    const isActive = index === active;
                    const itemIndex = index;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`${listboxId}-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActive(itemIndex)}
                          onClick={() => go(item)}
                          className={cn(
                            'flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                            isActive ? 'bg-surface-3' : 'hover:bg-surface-2'
                          )}
                        >
                          <span className="truncate text-sm font-medium text-foreground">
                            {item.title}
                          </span>
                          <span className="shrink-0 truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <span>↑ ↓ gezin</span>
          <span>↵ aç</span>
          <span>Esc kapat</span>
        </div>
      </div>
    </div>
  );
}
