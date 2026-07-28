import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PlateFrame } from './PlateFrame';
import { RemoteImage } from './RemoteImage';
import { cn } from '@/lib/cn';

/**
 * FOTOĞRAF KAROSU — galeri, ana sayfa ve öneri şeritlerinin ortak birimi.
 *
 * Karar: künye **her zaman görünür**. Hover'da açılan bir katman değil,
 * kartın kalıcı parçası. Yönün temel iddiası bu — teknik veri fotoğrafın
 * eşitidir, gizlenmez.
 *
 * Ölçü: kart yoğunluğu bilinçli olarak sıkı tutuldu (bir önceki sürüme göre
 * ~%20 daha küçük). Aynı ekranda daha çok kayıt görünür; künye üç satırdan
 * ikiye indi ve tür rozeti görselin üstüne taşındı.
 *
 * `variant`:
 *   grid  ızgara karosu — görsel üstte, künye altta
 *   list  liste satırı — küçük önizleme solda, künye yanında tek satırda
 */
export interface PhotoTileProps {
  to: string;
  seed: string;
  tint?: string;
  /** Katalog kodu — künyenin ilk satırı. */
  target: string;
  /** Eserin adı; katalog kodundan farklıysa ikinci satırda görünür. */
  title?: string;
  /** Gerçek görsel adresi; yoksa yıldız alanı çizilir. */
  imageUrl?: string;
  palette?: string;
  integration?: string;
  bortle?: number;
  username?: string;
  fieldOfView?: string;
  /** Tür ailesi rozeti (Derin Uzay, Güneş Sistemi…). */
  family?: { label: string; className: string };
  /** Editör seçimi gibi ikincil işaret. */
  flag?: ReactNode;
  variant?: 'grid' | 'list';
  className?: string;
}

export function PhotoTile({
  to,
  seed,
  tint,
  target,
  title,
  imageUrl,
  palette,
  integration,
  bortle,
  username,
  fieldOfView,
  family,
  flag,
  variant = 'grid',
  className,
}: PhotoTileProps) {
  const meta = [palette, integration].filter(Boolean).join(' · ');
  const origin = [
    bortle ? `B${bortle}` : null,
    username ? `@${username}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  if (variant === 'list') {
    return (
      <Link
        to={to}
        className={cn(
          'group flex items-center gap-3 rounded-card border border-border bg-surface-1 p-2 transition-colors',
          'hover:border-border-strong focus-visible:border-primary',
          className
        )}
      >
        <PlateFrame className="w-24 shrink-0 border-border sm:w-32">
          <RemoteImage src={imageUrl} alt={target} seed={seed} tint={tint} />
        </PlateFrame>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-[14px] font-bold text-foreground transition-colors group-hover:text-primary">
              {target}
            </span>
            {family && <FamilyBadge {...family} />}
            {flag}
          </span>
          {title && (
            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
              {title}
            </span>
          )}
        </span>

        <span className="tabular hidden shrink-0 text-right text-[11px] sm:block">
          <span className="block text-cold">{meta || '—'}</span>
          <span className="block text-muted-foreground">{origin || '—'}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      to={to}
      className={cn(
        // h-full + flex: ızgara hücresi gerildiğinde kart da gerilir,
        // künye bloğu altta hizalı kalır (bkz. CardGrid).
        'group flex h-full flex-col rounded-card border border-border bg-surface-1 transition-colors',
        'hover:border-border-strong focus-visible:border-primary',
        className
      )}
    >
      <PlateFrame
        fieldOfView={fieldOfView}
        badge={family ? <FamilyBadge {...family} /> : undefined}
        flag={flag}
        className="shrink-0 border-0 border-b border-border"
      >
        <RemoteImage src={imageUrl} alt={target} seed={seed} tint={tint} />
      </PlateFrame>

      <div className="flex flex-1 flex-col px-2.5 py-2">
        <p className="truncate font-display text-[13px] font-bold leading-tight text-foreground transition-colors group-hover:text-primary">
          {target}
        </p>
        {title && (
          <p className="truncate text-[10px] leading-snug text-muted-foreground">
            {title}
          </p>
        )}
        <p className="tabular mt-auto truncate pt-1 text-[10px] leading-snug text-cold">
          {meta || '—'}
        </p>
        <p className="tabular truncate text-[10px] leading-snug text-muted-foreground">
          {origin || '—'}
        </p>
      </div>
    </Link>
  );
}

/** Aile rozeti — kendi rengini taşır, metin her zaman görünür (§6.7). */
export function FamilyBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-[2px] border px-1.5 py-0.5 text-[9px] font-medium leading-[1.5] tracking-[0.02em] backdrop-blur-sm',
        className
      )}
    >
      {label}
    </span>
  );
}
