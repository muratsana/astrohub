import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { siteMap, mobileDrawerPrimary } from '@/app/navigation';
import { CloseIcon, UserIcon, SearchIcon } from '@/components/ui/icons';

/**
 * MODÜL HARİTASI ÇEKMECESİ.
 *
 * Mobil alt çubuğun "Daha" düğmesi ve — üst menü dokuz modüle çıkıp `xl`
 * kırılımına taşındığı için — masaüstündeki "Modüller" düğmesi tarafından
 * açılır. İkisi de aynı haritayı gösterir; ayrı bir menü kurgusu tutmak iki
 * yerin birbirinden sapmasıyla biterdi.
 */
export function NavDrawer({
  open,
  onClose,
  onOpenPalette,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPalette: () => void;
}) {
  const { pathname } = useLocation();

  // Gezinince kendiliğinden kapanır.
  useEffect(() => {
    onClose();
    // pathname dışındaki bağımlılıklar kasıtlı olarak dışarıda: yalnızca
    // rota değişimi kapatmalı, onClose kimliğinin değişmesi değil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-[2px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Modül haritası"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto border-t border-border-strong bg-surface-1 pb-8 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(420px,92vw)] sm:max-h-none sm:border-l sm:border-t-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface-1 px-4 py-2.5">
          <h2 className="label text-foreground">Modül Haritası</h2>
          <button
            type="button"
            onClick={onClose}
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
              onClose();
              onOpenPalette();
            }}
            className="flex w-full items-center gap-2 rounded-card border border-border bg-surface-2 px-3 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            Komut paleti
            <kbd className="ml-auto rounded-[2px] border border-border px-1 py-px text-[9px] text-faint">
              ⌘K
            </kbd>
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
                    className="flex items-baseline justify-between gap-2 border-b border-border py-2.5 text-[12px] text-foreground transition-colors hover:text-primary"
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
  );
}
