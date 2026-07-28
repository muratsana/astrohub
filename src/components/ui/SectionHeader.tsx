import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * BÖLÜM BAŞLIĞI — terminal dilinde bir "kanal başlığı".
 *
 * Başlık solda, sağda ince bir çizgi ve varsa bağlantı. Çizgi kalan boşluğu
 * doldurur: bölümler birbirinden gölgeyle değil, yatay bir kuralla ayrılır.
 */
export function SectionHeader({
  title,
  description,
  linkTo,
  linkLabel = 'Tümü',
  meta,
}: {
  title: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
  /** Başlığın hemen sağındaki küçük sayaç/durum bilgisi. */
  meta?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {/*
        `min-w-0` + `truncate` şart: başlık, sayaç ve bağlantı birlikte dar
        ekranda kabı aşıyordu. Aradaki hairline sıfıra kadar büzülebildiği
        için taşma görünmüyor sanılıyor, oysa sayfa yatay kayıyordu (390px'te
        ölçüldü). Başlık artık kırpılır, bağlantı hiç büzülmez.
      */}
      <div className="flex items-center gap-3">
        <h2 className="min-w-0 truncate text-[17px] text-foreground sm:text-[19px]">
          {title}
        </h2>

        {meta && (
          <span className="tabular hidden whitespace-nowrap text-[11px] text-faint sm:inline">
            {meta}
          </span>
        )}

        {/* Kalan boşluğu dolduran hairline — bölümün "kanal" hissini kurar */}
        <span aria-hidden className="h-px min-w-0 flex-1 bg-border" />

        {linkTo && (
          <Link
            to={linkTo}
            className="shrink-0 whitespace-nowrap text-[10px] tracking-[0.04em] text-muted-foreground transition-colors hover:text-primary"
          >
            {linkLabel} →
          </Link>
        )}
      </div>

      {description && (
        <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
