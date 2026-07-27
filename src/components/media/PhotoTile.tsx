import { Link } from 'react-router-dom';
import { PlateFrame } from './PlateFrame';
import { StarField } from './StarField';
import { cn } from '@/lib/cn';

/**
 * FOTOĞRAF KAROSU — galeri, ana sayfa ve öneri şeritlerinin ortak birimi.
 *
 * Karar: künye **her zaman görünür**. Hover'da açılan bir katman değil,
 * kartın kalıcı parçası. Yönün temel iddiası bu — teknik veri fotoğrafın
 * eşitidir, gizlenmez.
 *
 * Künye üç satır: hedef · işleme+entegrasyon · gökyüzü+üretici.
 */
export function PhotoTile({
  to,
  seed,
  tint,
  target,
  title,
  palette,
  integration,
  bortle,
  username,
  fieldOfView,
  badge,
  className,
}: {
  to: string;
  seed: string;
  tint?: string;
  /** Katalog kodu — künyenin ilk satırı. */
  target: string;
  /** Eserin adı; katalog kodundan farklıysa ikinci satırda görünür. */
  title?: string;
  palette?: string;
  integration?: string;
  bortle?: number;
  username?: string;
  fieldOfView?: string;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group block rounded-card border border-border bg-surface-1 transition-colors',
        'hover:border-border-strong focus-visible:border-primary',
        className
      )}
    >
      <PlateFrame
        fieldOfView={fieldOfView}
        badge={badge}
        className="border-0 border-b border-border"
      >
        <StarField seed={seed} tint={tint} />
      </PlateFrame>

      <div className="px-3 py-2.5">
        <p className="truncate font-display text-[15px] font-bold uppercase leading-tight text-foreground transition-colors group-hover:text-primary">
          {target}
        </p>
        {title && (
          <p className="truncate text-[11px] leading-snug text-muted-foreground">
            {title}
          </p>
        )}
        <p className="tabular mt-1.5 truncate text-[11px] leading-snug text-cold">
          {[palette, integration].filter(Boolean).join(' · ') || '—'}
        </p>
        <p className="tabular truncate text-[11px] leading-snug text-muted-foreground">
          {[bortle ? `B${bortle}` : null, username ? `@${username}` : null]
            .filter(Boolean)
            .join(' · ') || '—'}
        </p>
      </div>
    </Link>
  );
}
