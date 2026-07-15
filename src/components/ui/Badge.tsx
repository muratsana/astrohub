import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone =
  | 'muted'
  | 'primary'
  | 'success'
  | 'teal'
  | 'blue'
  | 'danger';

const tones: Record<BadgeTone, string> = {
  muted: 'border-border text-muted-foreground',
  primary: 'border-primary/30 text-primary',
  success: 'border-success/30 text-success',
  teal: 'border-accent-teal/30 text-accent-teal',
  blue: 'border-accent-blue/30 text-accent-blue',
  danger: 'border-danger/30 text-danger',
};

/** Küçük durum/etiket rozeti. Renk tek başına anlam taşımaz; metin esastır (§6.7). */
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
        'rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
