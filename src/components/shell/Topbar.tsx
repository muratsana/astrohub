import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import {
  SearchIcon,
  MoonIcon,
  SunIcon,
  ChevronDownIcon,
} from '@/components/ui/icons';
import { primaryNav, type NavEntry } from '@/app/navigation';
import { useTheme } from '@/features/theme/ThemeContext';
import { cn } from '@/lib/cn';

/**
 * Masaüstü üst navigasyon (§5.1) ve menü grupları (§5.2).
 * Sağ bölüm: arama, tema, giriş, üye ol. Koyu, ince alt border; sticky.
 * Mobilde nav gizli (alt navigasyon devreye girer — §5.3).
 */
export function Topbar({ onOpenSearch }: { onOpenSearch: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-6">
          <Logo />

          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Ana navigasyon"
          >
            {primaryNav.map((entry) =>
              entry.children ? (
                <NavMenu key={entry.to} entry={entry} />
              ) : (
                <NavLink
                  key={entry.to}
                  to={entry.to}
                  className={({ isActive }) => topLinkClasses(isActive)}
                >
                  {entry.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onOpenSearch}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label="Sitede ara"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <SearchIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              aria-label={
                theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç'
              }
              aria-pressed={theme === 'light'}
            >
              {theme === 'dark' ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" />
              )}
            </button>
            <NavLink
              to="/giris"
              className="hidden px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
            >
              Giriş Yap
            </NavLink>
            <ButtonLink to="/kayit" size="sm">
              Üye Ol
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}

function topLinkClasses(isActive: boolean, extra?: string) {
  return cn(
    'rounded-full px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
    extra
  );
}

/**
 * Açılır menü (§5.2). Başlık kendisi de bir sayfaya gider; buton menüyü
 * açar. Hover ile açılır; klavye ve dokunmatik için tıklama da çalışır.
 * Dışarı tıklama ve Esc kapatır.
 */
function NavMenu({ entry }: { entry: NavEntry }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  const items = entry.children ?? [];
  const isActive =
    pathname === entry.to ||
    items.some(
      (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
    );

  // Sayfa değişince menü kapansın.
  useEffect(() => setOpen(false), [pathname]);

  // Dışarı tıklama kapatır.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={topLinkClasses(isActive, 'inline-flex items-center gap-1')}
      >
        {entry.label}
        <ChevronDownIcon
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        // pt-2 boşluğu sarmalayıcının içindedir; imleç menüye giderken
        // hover kopmaz.
        <div className="absolute left-0 top-full w-80 pt-2">
          <ul className="overflow-hidden rounded-card border border-border bg-surface-1 p-1.5 shadow-2xl">
            <li>
              <NavLink
                to={entry.to}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2"
              >
                {entry.label} — genel bakış
              </NavLink>
            </li>
            <li aria-hidden className="my-1.5 border-t border-border" />
            {items.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  className="block rounded-lg px-3 py-2 transition-colors hover:bg-surface-2"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {item.label}
                    {item.soon && (
                      <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                        Yakında
                      </span>
                    )}
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
