import { GridIcon, ListIcon } from './icons';
import type { ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';

/**
 * IZGARA / LİSTE GÖRÜNÜM ANAHTARI.
 *
 * Aynı içeriği iki yoğunlukta sunar: ızgara görsel odaklıdır, liste ise
 * daha çok kaydı ekrana sığdırıp karşılaştırmayı kolaylaştırır.
 *
 * Seçim `localStorage`'da modül bazında saklanır — galeri liste, haberler
 * ızgara kalabilir; kullanıcı her sayfada tercihini yeniden yapmaz.
 */

const options: { mode: ViewMode; label: string; Icon: typeof GridIcon }[] = [
  { mode: 'grid', label: 'Izgara görünümü', Icon: GridIcon },
  { mode: 'list', label: 'Liste görünümü', Icon: ListIcon },
];

export function ViewToggle({
  mode,
  onChange,
  className,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Görünüm"
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-card border border-border',
        className
      )}
    >
      {options.map(({ mode: value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          aria-label={label}
          title={label}
          className={cn(
            /* 44×44: ikon kontrolü, genişletecek metni yok (WCAG 2.5.5).
               Önceki 36×32 mobilde iki düğme arasında yanlış basmaya
               açıktı. */
            'flex h-11 w-11 items-center justify-center border-l border-border transition-colors first:border-l-0',
            mode === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
