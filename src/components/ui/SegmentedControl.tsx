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
      className={cn('flex flex-wrap items-center gap-2', className)}
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
              'rounded-card border font-medium tracking-[0.02em] transition-colors',
              size === 'xs'
                ? 'min-h-9 px-3 py-1 text-meta'
                : 'min-h-11 px-4 py-1.5 text-body-sm',
              active
                ? (option.selectedClassName ??
                    'border-primary bg-primary text-primary-foreground')
                : 'border-border-strong bg-surface-1 text-muted-foreground hover:border-foreground/25 hover:bg-surface-2 hover:text-foreground',
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
