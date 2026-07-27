import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  mobileNav,
  mobileDrawerGroups,
  mobileDrawerPrimary,
} from '@/app/navigation';
import {
  ImageIcon,
  CalendarIcon,
  MapIcon,
  HomeIcon,
  UserIcon,
  PlusIcon,
  MenuIcon,
  CloseIcon,
  SearchIcon,
} from '@/components/ui/icons';
import { cn } from '@/lib/cn';

const iconFor: Record<string, typeof ImageIcon> = {
  '/': HomeIcon,
  '/fotograflar': ImageIcon,
  '/etkinlikler': CalendarIcon,
  '/harita': MapIcon,
  '/panel': UserIcon,
};

/**
 * Mobil alt navigasyon (§5.3). Beş ana giriş, ortada belirgin "+" yükleme
 * aksiyonu; alt navigasyona sığmayan modüller "Daha Fazla" çekmecesinde.
 * Yalnızca küçük ekranlarda görünür.
 */
export function MobileNav({ onOpenSearch }: { onOpenSearch: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  // Sayfa değişince çekmece kapansın.
  useEffect(() => setDrawerOpen(false), [pathname]);

  // Çekmece açıkken arka plan kaydırılmasın.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  // İki giriş solda, iki giriş sağda; "+" tam ortada durur.
  const left = mobileNav.slice(0, 2);
  const right = mobileNav.slice(2);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden"
        aria-label="Mobil navigasyon"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around">
          {left.map((item) => (
            <MobileNavLink key={item.to} to={item.to} label={item.label} />
          ))}

          {/* Ortadaki belirgin yükleme aksiyonu (§5.3) */}
          <NavLink
            to="/fotograflar/yukle"
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2"
            aria-label="Fotoğraf yükle"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <PlusIcon className="h-5 w-5" />
            </span>
          </NavLink>

          {right.map((item) => (
            <MobileNavLink key={item.to} to={item.to} label={item.label} />
          ))}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <MenuIcon className="h-5 w-5" />
            Daha Fazla
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Daha fazla modül"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDrawerOpen(false);
            }}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-surface-1 pb-8"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-1 px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">
                Daha Fazla
              </h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Çekmeceyi kapat"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2 px-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenSearch();
                }}
                className="flex w-full items-center gap-2 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm text-muted-foreground"
              >
                <SearchIcon className="h-4 w-4" />
                Sitede ara
              </button>
              <NavLink
                to={mobileDrawerPrimary.to}
                className="flex w-full items-center gap-2 rounded-card border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary"
              >
                <UserIcon className="h-4 w-4" />
                {mobileDrawerPrimary.label}
              </NavLink>
            </div>

            {mobileDrawerGroups.map((group) => (
              <section key={group.title} className="px-4 pt-6">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="grid gap-1.5">
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.label}`}>
                      <NavLink
                        to={item.to}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2/50 px-3.5 py-2.5 text-sm font-medium text-foreground"
                      >
                        {item.label}
                        {item.soon && (
                          <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                            Yakında
                          </span>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function MobileNavLink({ to, label }: { to: string; label: string }) {
  const Icon = iconFor[to] ?? HomeIcon;
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
          isActive
            ? 'text-primary'
            : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  );
}
