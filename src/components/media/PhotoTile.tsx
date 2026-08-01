import type { ReactNode } from 'react';
import { RemoteImage } from './RemoteImage';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
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
      <ContentCard to={to} variant="list" className={className}>
        <ContentCardMedia variant="list">
          <RemoteImage
            src={imageUrl}
            alt={target}
            sizes="128px"
            widths={[160, 320]}
            seed={seed}
            tint={tint}
          />
        </ContentCardMedia>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-display text-body-sm font-bold text-foreground transition-colors group-hover:text-primary">
              {target}
            </span>
            {family && <FamilyBadge {...family} />}
            {flag}
          </span>
          {title && (
            <span className="mt-0.5 block truncate text-meta text-muted-foreground">
              {title}
            </span>
          )}
        </span>

        <span className="tabular hidden shrink-0 text-right text-meta sm:block">
          <span className="block text-cold">{meta || '—'}</span>
          <span className="block text-muted-foreground">{origin || '—'}</span>
        </span>
      </ContentCard>
    );
  }

  return (
    <ContentCard to={to} className={className}>
      {/*
        ORAN KARE, 4:3 DEĞİL.

        Galeri karosu editöryel kartla aynı ızgarada aynı genişlikte
        (329px) duruyor ama daha kısa kalıyordu: editöryel kartta üç
        satırlık özet ve künye var, fotoğraf karosunda yok. Ölçtüm: 324px'e
        karşı 428px.

        Farkı kapatmanın iki yolu vardı — fotoğraf karosuna boş alan
        eklemek ya da görseli büyütmek. İkincisi seçildi: bir fotoğraf
        galerisinde asıl içerik fotoğrafın kendisi, ona daha çok yer vermek
        hem boşluk üretmiyor hem de kare oran galeri ızgaralarının
        alışılmış biçimi.

        `square` kart ailesindeki üç kayıtlı orandan biri ve YALNIZCA
        buraya ait — kayıt `ContentCard`ın `CARD_RATIO`sunda.
      */}
      <ContentCardMedia
        ratio="square"
        fieldOfView={fieldOfView}
        badge={family ? <FamilyBadge {...family} /> : undefined}
        flag={flag}
      >
        <RemoteImage src={imageUrl} alt={target} seed={seed} tint={tint} />
      </ContentCardMedia>

      <ContentCardBody>
        <ContentCardTitle>{target}</ContentCardTitle>
        {title && (
          <p className="truncate text-meta leading-snug text-muted-foreground">
            {title}
          </p>
        )}
        <ContentCardMeta tone="cold" className="mt-auto pt-1">
          {meta || '—'}
        </ContentCardMeta>
        <ContentCardMeta>{origin || '—'}</ContentCardMeta>
      </ContentCardBody>
    </ContentCard>
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
        'inline-block shrink-0 rounded-card border px-1.5 py-0.5 text-meta font-medium leading-[1.5] tracking-[0.02em] backdrop-blur-sm',
        className
      )}
    >
      {label}
    </span>
  );
}
