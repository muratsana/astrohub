import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { SearchIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useHiddenPrefixes } from '@/features/site/useSiteMap';
import {
  flattenCommands,
  runCommandSearch,
  type Command,
} from '@/features/search/commands';

function navigable(command: Command): command is Command & { to: string } {
  return Boolean(command.to) && !command.soon;
}

export function GlobalSearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const hiddenPrefixes = useHiddenPrefixes();

  const results = useMemo(
    () =>
      flattenCommands(runCommandSearch(query, hiddenPrefixes))
        .filter(navigable)
        .slice(0, 6),
    [hiddenPrefixes, query]
  );

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function go(command: Command & { to: string }) {
    setOpen(false);
    setQuery('');
    navigate(command.to);
  }

  function submit() {
    const first = results[active] ?? results[0];
    if (first) go(first);
  }

  return (
    <form
      ref={rootRef}
      role="search"
      aria-label="Site içinde ara"
      className="relative hidden sm:block"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div
        className={cn(
          'flex h-8 w-[5.8rem] max-w-[5.8rem] items-center gap-1.5 rounded-card border border-border bg-background px-2 text-muted-foreground transition-colors',
          'focus-within:border-border-strong focus-within:text-foreground'
        )}
      >
        <SearchIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
            } else if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                results.length === 0 ? 0 : (index + 1) % results.length
              );
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              setActive((index) =>
                results.length === 0
                  ? 0
                  : (index - 1 + results.length) % results.length
              );
            }
          }}
          placeholder="Ara"
          aria-label="Site içinde ara"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-meta font-medium text-foreground outline-none placeholder:text-faint"
        />
      </div>

      {open && query.trim() ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-72 overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-meta text-muted-foreground">
              Sonuç yok.
            </p>
          ) : (
            <ul className="py-1">
              {results.map((result, index) => (
                <li key={result.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(result)}
                    className={cn(
                      'grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 px-3 py-2 text-left transition-colors',
                      index === active ? 'bg-surface-3' : 'hover:bg-surface-2'
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-medium text-foreground">
                        {result.title}
                      </span>
                      <span className="block truncate text-meta text-muted-foreground">
                        {result.subtitle}
                      </span>
                    </span>
                    <span className="self-center text-meta text-faint">↵</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </form>
  );
}
