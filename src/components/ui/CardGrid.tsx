import type { ReactNode } from 'react';
import type { ViewMode } from './useViewMode';
import { cn } from '@/lib/cn';

/**
 * KART IZGARASI — bütün modüllerin ortak liste kabı.
 *
 * NEDEN AYRI BİR BİLEŞEN
 * Kart yükseklikleri modüller arasında tutmuyordu. Sebep ince: CSS grid
 * satırdaki `<li>` öğelerini zaten eşitler (`align-items: stretch`), ama
 * kartın kendisi `<li>`'nin yüksekliğini **almaz** — `h-full` verilmedikçe
 * içeriği kadar yer kaplar. Başlığı iki satıra taşan bir kart satırı
 * yükseltir, komşusu kısa kalır ve altta boşluk oluşur.
 *
 * Burada `[&>li]:h-full` ile her hücre gerilir; kartların kökü de `h-full`
 * kullanır (bkz. PhotoTile, EventCard). İkisi birlikte olmadan eşitlik
 * sağlanmıyor — tek başına ızgarayı ayarlamak yetmiyor.
 *
 * `density` ızgara kolon sayısını belirler:
 *   tight    küçük karolar (galeri, hedef kataloğu) — 5 kolona kadar
 *   default  orta kartlar (etkinlik, ilan) — 4 kolona kadar
 *   wide     geniş kartlar (gözlem noktaları) — 3 kolona kadar
 */
const densities = {
  tight:
    'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  default: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  wide: 'sm:grid-cols-2 xl:grid-cols-3',
} as const;

export function CardGrid({
  view,
  density = 'default',
  children,
  className,
}: {
  view: ViewMode;
  density?: keyof typeof densities;
  children: ReactNode;
  className?: string;
}) {
  return (
    <ul
      className={cn(
        'grid [&>li]:h-full',
        view === 'grid' ? cn('gap-2.5', densities[density]) : 'gap-2',
        className
      )}
    >
      {children}
    </ul>
  );
}
