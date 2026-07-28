import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * ÖLÇÜM OKUMASI — terminalin temel yapı taşı.
 *
 * Küçük büyük-harf etiket + büyük tabular değer + isteğe bağlı birim.
 * Şartname §6.6 kamuya açık sayfalarda "mini istatistik kutusu" kullanmayı
 * yasaklıyordu; Rasathane Terminali yönünde bu kural bilerek terk edildi —
 * ölçüm kutuları burada süs değil, ürünün dili.
 */
export function Readout({
  label,
  value,
  unit,
  tone = 'primary',
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  /** Değerin ardına gelen küçük birim: "/9", "sa", "m" */
  unit?: string;
  tone?: 'primary' | 'cold' | 'plain' | 'muted';
  /** Değerin altındaki tek satırlık açıklama. */
  hint?: string;
  className?: string;
}) {
  const toneClass = {
    primary: 'text-primary',
    cold: 'text-cold',
    plain: 'text-foreground',
    muted: 'text-muted-foreground',
  }[tone];

  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface-1 px-3 py-2.5',
        className
      )}
    >
      <p className="label">{label}</p>
      <p
        className={cn(
          'tabular mt-1 font-display text-[23px] font-bold leading-none',
          toneClass
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal tracking-wide text-faint">
            {unit}
          </span>
        )}
      </p>
      {hint && <p className="mt-1.5 text-[10px] leading-snug text-faint">{hint}</p>}
    </div>
  );
}

/**
 * Satır içi okuma — durum çubuğu ve künye satırları için.
 * Etiket ve değer aynı satırda, aralarında ince bir boşlukla.
 */
export function InlineReadout({
  label,
  value,
  tone = 'plain',
}: {
  label: string;
  value: ReactNode;
  tone?: 'primary' | 'cold' | 'plain';
}) {
  const toneClass = {
    primary: 'text-primary',
    cold: 'text-cold',
    plain: 'text-foreground',
  }[tone];

  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="label">{label}</span>
      <span className={cn('tabular text-[11px] font-medium', toneClass)}>
        {value}
      </span>
    </span>
  );
}
