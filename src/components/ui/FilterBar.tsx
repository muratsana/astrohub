import {
  Children,
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { CloseIcon } from './icons';
import { useIsNarrow } from './useIsNarrow';

type FilterDensity = 'default' | 'toolbar' | 'popover';

const FilterDensityContext = createContext<FilterDensity>('default');

/**
 * FİLTRE ŞERİDİ — arama, seçiciler ve hızlı anahtarlar.
 *
 * Galeri sayfasında yerinde yazılmıştı; etkinlikler, ilanlar, ekipman ve saha
 * sayfaları da aynı şeridi kullandığı için buraya çıkarıldı.
 */
/**
 * MOBİLDE ÇEKMECE — §7.1'in "mobil filtre drawer'ı" maddesi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ŞERİDİN İÇİNDE, AYRI BİR BİLEŞENDE DEĞİL
 *
 * Belge aynı bölümde "her modül aynı arama/filtre motorunu kullanmalı;
 * ayrı ve tutarsız filtre bileşenleri üretilmemelidir" diyor. Ayrı bir
 * `MobileFilterDrawer` yazmak, on sayfanın her birinde İKİ filtre
 * ağacı tutmak demekti — biri masaüstü, biri mobil. İkisinin zamanla
 * ayrışması kaçınılmaz: yeni bir facet birine eklenir, diğerinde
 * unutulur.
 *
 * Burada çocuklar TEK KEZ çiziliyor; değişen yalnızca içinde
 * durdukları kap. On sayfa da hiçbir şey değiştirmeden çekmeceyi aldı.
 *
 * Kırılma noktası `useIsNarrow`da — tablo görünümü de aynı noktada
 * karta dönüşüyor ve iki kopya tutmak ikisinin ayrışması demekti.
 */
export function FilterBar({
  children,
  className,
  columns,
  primaryCount,
  collapseQuery = '(max-width: 639px)',
  /**
   * Çekmece düğmesinde gösterilecek aktif filtre sayısı.
   *
   * Filtreler kapalıyken kaç tanesinin açık olduğunu SÖYLEMEK ZORUNDA:
   * gizlenmiş bir filtre, olmayan bir filtreden ayırt edilemezse
   * kullanıcı kısa listenin sebebini aramaya başlar.
   */
  activeCount = 0,
}: {
  children: ReactNode;
  /** Geniş ekrandaki sütun sayısı. */
  columns?: 2 | 3 | 4;
  className?: string;
  activeCount?: number;
  primaryCount?: number;
  collapseQuery?: string;
}) {
  const narrow = useIsNarrow(collapseQuery);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /* Geniş ekrana dönüldüğünde çekmece açık kalmamalı: kullanıcı cihazı
     yatay çevirdiğinde ekranın ortasında asılı bir panel bulurdu. */
  useEffect(() => {
    if (!narrow) setOpen(false);
  }, [narrow]);

  useEffect(() => {
    if (!open) return;

    /* Arkadaki liste kaymasın — çekmece açıkken sayfanın kendisi
       kaydırılırsa kullanıcı filtreyi kapatmadan içeriği kaybeder. */
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      /*
       * ODAK TUZAĞI. `aria-modal` yalnızca ekran okuyucuya "arkası yok"
       * der; klavye odağı hâlâ arkadaki bağlantılara geçer. Tuzak
       * olmadan Tab'a basan kullanıcı görünmeyen bir listede gezinir.
       */
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const grid = (
    <div
      className={cn(
        columns ? 'grid items-stretch gap-2' : 'flex flex-wrap items-stretch gap-2',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 xl:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 xl:grid-cols-4',
        narrow && '[&>*]:!w-full [&>*]:!min-w-0 [&>*]:!max-w-none',
        !narrow && 'mb-4',
        className
      )}
    >
      {children}
    </div>
  );

  if (!narrow) {
    if (primaryCount === undefined) return grid;

    const items = Children.toArray(children);
    const primary = items.slice(0, primaryCount);
    const secondary = items.slice(primaryCount);

    return (
      <div className="flex min-w-0 items-stretch gap-2">
        <FilterDensityContext.Provider value="toolbar">
          <div
            className={cn(
              'flex min-w-0 flex-1 items-stretch gap-2',
              className
            )}
          >
            {primary}
          </div>
        </FilterDensityContext.Provider>

        {secondary.length > 0 && (
          <details className="group relative shrink-0">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-card border border-border-strong bg-surface-1 px-3 text-body-sm font-medium text-foreground shadow-overlay transition-colors hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              Filtreler
              {activeCount > 0 && (
                <span className="num rounded-card bg-primary px-2 py-0.5 text-meta text-primary-foreground">
                  {activeCount}
                </span>
              )}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-[min(28rem,calc(100vw-2rem))] rounded-card border border-border-strong bg-surface-1 p-2 shadow-overlay">
              <div
                className={cn(
                  'grid items-stretch gap-1.5',
                  columns === 2 && 'sm:grid-cols-2',
                  columns === 3 && 'sm:grid-cols-2 xl:grid-cols-3',
                  columns === 4 && 'sm:grid-cols-2 xl:grid-cols-4',
                  !columns && 'sm:grid-cols-2'
                )}
              >
                <FilterDensityContext.Provider value="popover">
                  {secondary}
                </FilterDensityContext.Provider>
              </div>
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        className="mb-4 flex min-h-12 w-full items-center justify-between rounded-card border border-border-strong bg-surface-1 px-4 text-body-sm font-medium text-foreground shadow-overlay"
      >
        Filtreler
        {activeCount > 0 && (
          <span className="num rounded-card bg-primary px-2 py-0.5 text-meta text-primary-foreground">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex flex-col justify-end">
          {/* Perde: dışına dokunmak kapatıyor — mobilde en beklenen
              kapatma hareketi bu. */}
          <button
            type="button"
            aria-label="Filtreleri kapat"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/80"
          />

          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative max-h-[85vh] overflow-y-auto rounded-t-card border-t border-border-strong bg-background p-4 shadow-overlay"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2
                id={titleId}
                className="text-caption font-semibold text-foreground"
              >
                Filtreler
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Filtreleri kapat"
                className="grid h-11 w-11 place-items-center rounded-card text-muted-foreground transition-colors hover:text-foreground"
              >
                <CloseIcon aria-hidden className="h-4 w-4" />
              </button>
            </div>

            {grid}

            {/*
              "Sonuçları gör" kapatmaktan başka bir şey YAPMIYOR ve
              yapmamalı: filtreler zaten anında uygulanıyor. Düğme
              sonucu "onaylıyormuş" gibi görünmesin diye adı da eylemi
              söylüyor — sonuçlara dönmek.
            */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 h-11 w-full rounded-card border border-primary bg-primary text-body-sm font-medium text-primary-foreground"
            >
              Sonuçları gör
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Filtre şeridi hücresi: üstte kısa etiket, altta kontrol.
 */
export function FilterCell({
  label,
  htmlFor,
  children,
  className,
  active = false,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  const density = useContext(FilterDensityContext);
  const toolbarCompact = density === 'toolbar';
  const popoverCompact = density === 'popover';
  const labelClass = cn(
    'label block text-muted-foreground',
    popoverCompact && 'mb-0.5 text-meta'
  );

  return (
    <div
      className={cn(
        'flex min-w-[10rem] flex-1 flex-col justify-center border',
        toolbarCompact && 'min-h-10 rounded-card px-2.5 py-0.5 shadow-overlay',
        popoverCompact && 'min-h-10 min-w-0 rounded-md px-3 py-2 shadow-none',
        density === 'default' && 'min-h-12 rounded-card px-3 py-1.5 shadow-overlay',
        'transition-colors hover:border-foreground/25 hover:bg-surface-2',
        'has-[:focus-visible]:border-primary has-[:focus-visible]:bg-surface-2 has-[:focus-visible]:shadow-[0_0_0_1px_var(--color-primary)]',
        active
          ? 'border-primary/60 bg-primary/10'
          : cn(
              popoverCompact ? 'border-border bg-background/65' : 'border-border-strong bg-surface-1'
            ),
        className
      )}
    >
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cn(labelClass, toolbarCompact && 'sr-only')}>
          {label}
        </label>
      ) : (
        <p className={cn(labelClass, toolbarCompact && 'sr-only')}>{label}</p>
      )}
      {children}
    </div>
  );
}

/**
 * Şerit içindeki kontrollerin ortak sınıfı. Kendi kenarlığı yoktur —
 * çerçeveyi hücre çizer; alan yalnızca içine yazılan değerdir.
 */
export const filterControlClass =
  'h-8 w-full rounded-none border-0 bg-transparent px-0 text-body-sm font-medium text-foreground ' +
  'focus:bg-transparent focus-visible:outline-none';

/**
 * Onay kutusu hücresi. Etiket ve kutu aynı satırda; hücre yüksekliği
 * diğerleriyle hizalı kalsın diye aynı dolgu kullanılır.
 */
export function FilterToggle({
  label,
  checked,
  onChange,
  id,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id: string;
  className?: string;
}) {
  const density = useContext(FilterDensityContext);
  const popoverCompact = density === 'popover';

  return (
    <div
      className={cn(
        'flex min-w-[10rem] flex-1 items-center border',
        popoverCompact
          ? 'min-h-10 min-w-0 rounded-md px-3 py-2 shadow-none'
          : 'min-h-12 rounded-card px-3 py-1.5 shadow-overlay',
        'transition-colors hover:border-foreground/25 hover:bg-surface-2',
        'has-[:focus-visible]:border-primary has-[:focus-visible]:bg-surface-2 has-[:focus-visible]:shadow-[0_0_0_1px_var(--color-primary)]',
        checked
          ? 'border-primary/60 bg-primary/10'
          : cn(
              popoverCompact ? 'border-border bg-background/65' : 'border-border-strong bg-surface-1'
            ),
        className
      )}
    >
      <label
        htmlFor={id}
        className="label flex cursor-pointer items-center gap-2 text-muted-foreground has-[:checked]:text-foreground"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          /* 24px: WCAG 2.2 AA dokunma hedefi (2.5.8). 14px'lik kutu
             mobilde parmakla vurulamıyordu. */
          className={cn(
            'rounded-card border-border accent-primary',
            popoverCompact ? 'h-4 w-4' : 'h-6 w-6'
          )}
        />
        {label}
      </label>
    </div>
  );
}
