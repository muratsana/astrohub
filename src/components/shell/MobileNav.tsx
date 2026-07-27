import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  mobileNav,
  mobileDrawerPrimary,
  siteMap,
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
  '/galeri': ImageIcon,
  '/etkinlikler': CalendarIcon,
  '/saha': MapIcon,
};

/**
 * MOBİL ALT NAVİGASYON (§5.3) — terminal dilinde.
 *
 * Köşeli, hairline üst çizgili, büyük harf mono etiketler. Dört ana giriş,
 * ortada kehribar "+" kayıt aksiyonu, sağda tam modül haritasını açan
 * çekmece. Yalnızca küçük ekranlarda görünür.
 */
export function MobileNav({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setDrawerOpen(false), [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  const left = mobileNav.slice(0, 2);
  const right = mobileNav.slice(2);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-strong bg-background lg:hidden"
        aria-label="Mobil navigasyon"
      >
        <div className="mx-auto flex max-w-md items-stretch">
          {left.map((item) => (
            <MobileNavLink key={item.to} to={item.to} label={item.label} />
          ))}

          {/* Ortadaki kayıt aksiyonu (§5.3) */}
          <NavLink
            to="/galeri/yukle"
            aria-label="Yeni kayıt aç"
            className="flex flex-1 items-center justify-center py-2"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-[2px] bg-primary text-primary-foreground">
              <PlusIcon className="h-4.5 w-4.5" />
            </span>
          </NavLink>

          {right.map((item) => (
            <MobileNavLink key={item.to} to={item.to} label={item.label} />
          ))}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-expanded={drawerOpen}
            className="flex flex-1 flex-col items-center gap-1 border-l border-border py-2 text-[9px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <MenuIcon className="h-4.5 w-4.5" />
            Daha
          </button>
        </div>
      </nav>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur-[2px] lg:hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDrawerOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Modül haritası"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setDrawerOpen(false);
            }}
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border-t border-border-strong bg-surface-1 pb-8"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface-1 px-4 py-2.5">
              <h2 className="label text-foreground">Modül Haritası</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Çekmeceyi kapat"
                className="rounded-card border border-border p-1 text-muted-foreground hover:border-border-strong hover:text-foreground"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 px-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  onOpenPalette();
                }}
                className="flex w-full items-center gap-2 rounded-card border border-border bg-surface-2 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
              >
                <SearchIcon className="h-3.5 w-3.5" />
                Komut paleti
              </button>
              <NavLink
                to={mobileDrawerPrimary.to}
                className="flex w-full items-center gap-2 rounded-card border border-primary bg-primary/10 px-3 py-2.5 text-[11px] font-medium uppercase tracking-[0.14em] text-primary"
              >
                <UserIcon className="h-3.5 w-3.5" />
                {mobileDrawerPrimary.label}
              </NavLink>
            </div>

            {siteMap.map((group) => (
              <section key={group.title} className="px-4 pt-6">
                <h3 className="label mb-2 border-b border-border pb-1.5">
                  {group.title}
                </h3>
                <ul>
                  {group.items.map((item) => (
                    <li key={`${group.title}-${item.to}-${item.label}`}>
                      <NavLink
                        to={item.to}
                        className="flex items-baseline justify-between gap-2 border-b border-border py-2.5 text-[12px] text-foreground"
                      >
                        {item.label}
                        {item.soon && (
                          <span className="text-[9px] uppercase tracking-widest text-faint">
                            yakında
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
          'flex flex-1 flex-col items-center gap-1 border-l border-border py-2 text-[9px] uppercase tracking-[0.1em] transition-colors first:border-l-0',
          isActive
            ? 'text-primary shadow-[inset_0_2px_0_var(--color-primary)]'
            : 'text-muted-foreground hover:text-foreground'
        )
      }
    >
      <Icon className="h-4.5 w-4.5" />
      {label}
    </NavLink>
  );
}
