import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * LEVHA ÇERÇEVESİ — fotoğrafın bir ölçüm gibi çerçevelenmesi.
 *
 * Üst ve alt kenarda ince ölçü çentikleri, köşede isteğe bağlı görüş alanı
 * yazısı. Çentikler tek bir tekrarlanan gradyanla çizilir; ek DOM düğümü
 * yoktur ve ekran okuyucuya görünmez.
 *
 * En-boy oranı **sabit 4:3**: galeri mutlak hizalı kalır ve kareler
 * birbiriyle karşılaştırılabilir olur. Sabit oran ayrıca görsel yüklenirken
 * düzen kaymasını (CLS — §16.5) tamamen ortadan kaldırır.
 */
export function PlateFrame({
  children,
  /** Sağ alt köşede gösterilen görüş alanı: "3.1° × 2.1°" */
  fieldOfView,
  /** Sol üst köşede gösterilen küçük durum etiketi. */
  badge,
  ratio = 'aspect-[4/3]',
  className,
}: {
  children: ReactNode;
  fieldOfView?: string;
  badge?: ReactNode;
  ratio?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden border border-border bg-surface-2',
        ratio,
        className
      )}
    >
      {children}

      {/* Ölçü çentikleri: üstte ve altta, 12px aralıklı hairline'lar */}
      <span
        aria-hidden
        className="ticks-y pointer-events-none absolute inset-x-0 top-0 h-[5px]"
      />
      <span
        aria-hidden
        className="ticks-y pointer-events-none absolute inset-x-0 bottom-0 h-[5px]"
      />

      {badge && (
        <span className="absolute left-2 top-2.5 rounded-[2px] border border-border-strong bg-background/85 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
          {badge}
        </span>
      )}

      {fieldOfView && (
        <span className="tabular absolute bottom-2.5 right-2 rounded-[2px] bg-background/85 px-1.5 py-0.5 text-[10px] text-cold backdrop-blur-sm">
          {fieldOfView}
        </span>
      )}
    </div>
  );
}
