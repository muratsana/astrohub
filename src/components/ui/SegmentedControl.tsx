import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Tooltip } from './Tooltip';

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  tooltip?: ReactNode;
  className?: string;
  selectedClassName?: string;
}

/**
 * Tek seçimli segment kontrolü.
 *
 * Kategori sekmeleri, yoğunluk seçimleri ve küçük mod anahtarları aynı
 * seçili/inaktif sınıfları kullanır. Sayfalara dağılmış `aria-selected`
 * ve renk koşulları burada toplanır; istisna gerekiyorsa seçenek kendi
 * `selectedClassName`ini verir.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  role = 'tablist',
  size = 'sm',
  className,
}: {
  value: T;
  options: readonly SegmentOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  role?: 'tablist' | 'group';
  size?: 'xs' | 'sm';
  className?: string;
}) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const button = (
          <button
            key={option.value}
            type="button"
            role={role === 'tablist' ? 'tab' : undefined}
            aria-selected={role === 'tablist' ? active : undefined}
            aria-pressed={role === 'group' ? active : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-card border tracking-[0.03em] transition-colors',
              size === 'xs'
                ? 'min-h-8 px-2.5 py-1 text-meta'
                : 'min-h-11 px-3 py-1.5 text-meta',
              active
                ? (option.selectedClassName ??
                    'border-foreground/40 bg-surface-2 text-foreground')
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
              option.className
            )}
          >
            {option.label}
          </button>
        );

        return (
          <Tooltip key={option.value} content={option.tooltip}>
            {button}
          </Tooltip>
        );
      })}
    </div>
  );
}
