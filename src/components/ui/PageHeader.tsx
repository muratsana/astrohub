import type { ReactNode } from 'react';
import { Link } from 'react-router';
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
/**
 * KIRINTI YOLU — `PageHeader`tan ayrı da kullanılabiliyor.
 *
 * Profil sayfası kendi başlık bloğunu çiziyor (kapak görseli + üstüne
 * binen avatar) ama kırıntı yolunu kaybetmemeli. Aynı işaretlemeyi
 * ikinci kez yazmak, iki yerde iki farklı boşluk değeriyle bitecek
 * türden bir tekrar olurdu.
 */
export function Breadcrumb({
  items,
  className,
}: {
  items?: { label: string; to?: string }[];
  className?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Kırıntı yolu" className={cn('mb-2.5', className)}>
      <ol className="flex flex-wrap items-center gap-1.5 text-meta tracking-[0.03em] text-faint">
        {items.map((crumb, i) => (
          <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {crumb.to ? (
              <Link
                to={crumb.to}
                className="inline-block py-1 transition-colors hover:text-foreground"
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
  );
}

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
      <Breadcrumb items={breadcrumb} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="type-page text-foreground">
              {title}
            </h1>
            {meta && (
              <span className="tabular text-meta text-faint">{meta}</span>
            )}
          </div>
          {description && (
            <p className="mt-2 max-w-[70ch] text-meta leading-relaxed text-muted-foreground">
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
