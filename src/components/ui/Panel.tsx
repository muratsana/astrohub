import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * PANEL — hairline çerçeveli içerik bloğu.
 *
 * Başlık satırı bir "enstrüman etiketi" gibi davranır: solda büyük harf ad,
 * sağda isteğe bağlı durum. Gölge yoktur; ayrım yalnızca çizgi ve yüzeydir.
 */
export function Panel({
  title,
  status,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  /** Başlığın sağındaki küçük durum bilgisi. */
  status?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-card border border-border bg-surface-1',
        className
      )}
    >
      {(title || status) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
          {title && <h3 className="label text-foreground">{title}</h3>}
          {status && (
            <span className="tabular text-meta text-muted-foreground">
              {status}
            </span>
          )}
        </header>
      )}
      <div className={cn('px-4 py-4', bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Etiket–değer satırı. Teknik künyelerde ve detay sayfalarında
 * (§7.3 sekmeli teknik veri) tekrar eden temel satır.
 */
export function SpecRow({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: ReactNode;
  tone?: 'plain' | 'cold' | 'primary' | 'muted';
}) {
  const toneClass = {
    plain: 'text-foreground',
    cold: 'text-cold',
    primary: 'text-primary',
    muted: 'text-muted-foreground',
  }[tone];

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className={cn('tabular text-right text-meta', toneClass)}>
        {value}
      </dd>
    </div>
  );
}

/** SpecRow'ları saran tanım listesi. */
export function SpecList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <dl className={cn('w-full', className)}>{children}</dl>;
}
