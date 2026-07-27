import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { cn } from '@/lib/cn';

/**
 * SÜRÜM KARŞILAŞTIRMA SÜRGÜSÜ (§8.1).
 *
 * İki sürümü üst üste bindirir ve sürgüyle üsttekini keser. Yan yana iki
 * kutu yerine bindirme tercih edildi: aynı kadrajdaki fark (gürültü, yıldız
 * şişkinliği, renk) ancak piksel aynı yerdeyken görülür, yan yana bakışta
 * göz iki kadraj arasında gidip gelirken farkı kaybediyor.
 *
 * ERİŞİLEBİLİRLİK: sürgü bir `role="slider"` ve klavyeyle çalışır (ok
 * tuşları %5, Home/End uçlar). Sürükleme tek başına yeterli değil —
 * dokunmatik olmayan ve fare kullanamayan kullanıcı da karşılaştırabilmeli.
 * Her iki sürümün künyesi ayrıca metin olarak yazılıdır; sürgü bilginin
 * tek taşıyıcısı değil.
 */

export interface CompareSide {
  label: string;
  gradient: string;
  caption?: string;
}

export function VersionCompare({
  before,
  after,
  className,
}: {
  /** Sürgünün solunda kalan (eski) sürüm. */
  before: CompareSide;
  /** Sürgünün sağında kalan (yeni) sürüm. */
  after: CompareSide;
  className?: string;
}) {
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, ratio)));
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    // Pointer'ı yakala: fare çerçevenin dışına çıksa da sürükleme sürsün.
    event.currentTarget.setPointerCapture(event.pointerId);
    setFromClientX(event.clientX);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    setFromClientX(event.clientX);
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const nudge = (delta: number) =>
    setPosition((p) => Math.min(100, Math.max(0, p + delta)));

  return (
    <div className={cn('space-y-2', className)}>
      <div
        ref={frameRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-none select-none overflow-hidden rounded-card border border-border"
      >
        {/* Alt katman: yeni sürüm (tam görünür) */}
        <PhotoPlaceholder
          gradient={after.gradient}
          alt={after.label}
          rounded="rounded-none"
          className="aspect-[16/9] w-full"
        />

        {/* Üst katman: eski sürüm, sürgüye kadar kırpılır */}
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <PhotoPlaceholder
            gradient={before.gradient}
            alt={before.label}
            rounded="rounded-none"
            className="aspect-[16/9] w-full"
          />
        </div>

        {/* Etiketler */}
        <span className="pointer-events-none absolute left-2 top-2 rounded-[2px] bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-foreground">
          {before.label}
        </span>
        <span className="pointer-events-none absolute right-2 top-2 rounded-[2px] bg-background/85 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-foreground">
          {after.label}
        </span>

        {/* Sürgü çizgisi ve tutamağı */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`Sürüm karşılaştırma sürgüsü: solda ${before.label}, sağda ${after.label}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`%${Math.round(position)} ${before.label}`}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') nudge(-5);
            else if (event.key === 'ArrowRight') nudge(5);
            else if (event.key === 'Home') setPosition(0);
            else if (event.key === 'End') setPosition(100);
            else return;
            event.preventDefault();
          }}
          className="absolute inset-y-0 z-10 w-px cursor-ew-resize bg-primary outline-none focus-visible:w-0.5"
          style={{ left: `${position}%` }}
        >
          <span className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary bg-background text-[10px] text-primary">
            ⇄
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          <span className="label mr-1.5">Sol</span>
          {before.caption ?? before.label}
        </span>
        <span className="tabular text-faint">%{Math.round(position)}</span>
        <span className="text-right">
          <span className="label mr-1.5">Sağ</span>
          {after.caption ?? after.label}
        </span>
      </div>
    </div>
  );
}
