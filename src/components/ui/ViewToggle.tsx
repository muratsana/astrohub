import { GridIcon, ListIcon, TableIcon } from './icons';
import type { ListView, ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';
import { Tooltip } from './Tooltip';

/**
 * IZGARA / LİSTE GÖRÜNÜM ANAHTARI.
 *
 * Aynı içeriği iki yoğunlukta sunar: ızgara görsel odaklıdır, liste ise
 * daha çok kaydı ekrana sığdırıp karşılaştırmayı kolaylaştırır.
 *
 * Seçim `localStorage`'da modül bazında saklanır — galeri liste, haberler
 * ızgara kalabilir; kullanıcı her sayfada tercihini yeniden yapmaz.
 */

const OPTIONS: Record<ListView, { label: string; Icon: typeof GridIcon }> = {
  grid: { label: 'Izgara görünümü', Icon: GridIcon },
  list: { label: 'Liste görünümü', Icon: ListIcon },
  table: { label: 'Tablo görünümü', Icon: TableIcon },
};

const DEFAULT_MODES: readonly ViewMode[] = ['grid', 'list'];

/**
 * Bileşen GÖRÜNÜM KÜMESİNDE genel: tablo yalnızca onu gerçekten
 * destekleyen modülde çıkıyor. Üçüncü düğmeyi her sayfaya koyup
 * bazılarında işlevsiz bırakmak, panelde kapattığımız "ölü hedef"
 * hatasının aynısı olurdu.
 */
export function ViewToggle<M extends string = ViewMode>({
  mode,
  onChange,
  modes = DEFAULT_MODES as readonly M[],
  className,
}: {
  mode: M;
  onChange: (mode: M) => void;
  modes?: readonly M[];
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
      {modes.map((value) => {
        const { label, Icon } = OPTIONS[value as ListView];
        return (
          <Tooltip key={value} content={label}>
            <button
              type="button"
              onClick={() => onChange(value)}
              aria-pressed={mode === value}
              aria-label={label}
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
          </Tooltip>
        );
      })}
    </div>
  );
}
