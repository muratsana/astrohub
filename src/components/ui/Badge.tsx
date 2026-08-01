import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'muted'
  | 'primary'
  | 'cold'
  | 'success'
  | 'warning'
  | 'danger';

const tones: Record<BadgeTone, string> = {
  muted: 'border-border text-muted-foreground',
  primary: 'border-primary/45 text-primary',
  cold: 'border-cold/45 text-cold',
  success: 'border-success/45 text-success',
  warning: 'border-warning/45 text-warning',
  danger: 'border-danger/45 text-danger',
};

/**
 * Durum etiketi. Köşeli, büyük harf, geniş harf aralıklı.
 * Renk tek başına anlam taşımaz; metin esastır (§6.7).
 */
export function Badge({
  children,
  tone = 'muted',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-card border px-1.5 py-0.5 text-meta font-medium leading-[1.5] tracking-[0.03em]',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
