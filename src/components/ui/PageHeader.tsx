import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * SAYFA BAŞLIĞI — modül sayfalarının ortak açılışı.
 *
 * Galeri sayfasında elle yazılmış olan başlık bloğu buraya çıkarıldı: on
 * dokuz sayfada aynı ölçüleri tekrar yazmak, er ya da geç birinde 26px yerine
 * 24px olmasıyla biterdi. Tek yer, tek ölçü.
 *
 * Yapı: üstte isteğe bağlı kırıntı yolu, solda başlık + açıklama, sağda
 * eylem(ler). Altta hairline — modülün "başlık şeridi".
 */
export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  meta,
  className,
}: {
  title: string;
  description?: ReactNode;
  /** Sağ tarafta duran eylem düğmeleri. */
  actions?: ReactNode;
  /** Üstte küçük kırıntı yolu: [{ label, to }] — son öğe bağlantısız. */
  breadcrumb?: { label: string; to?: string }[];
  /** Başlığın hemen sağındaki küçük sayaç/durum. */
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'mb-5 border-b border-border pb-5',
        className
      )}
    >
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Kırıntı yolu" className="mb-2.5">
          <ol className="flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-faint">
            {breadcrumb.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-[26px] text-foreground sm:text-[30px]">
              {title}
            </h1>
            {meta && (
              <span className="tabular text-[11px] text-faint">{meta}</span>
            )}
          </div>
          {description && (
            <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
