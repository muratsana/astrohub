import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  applyAspect,
  clampRect,
  croppedFieldDeg,
  croppedPixels,
  isFullFrame,
  ASPECT_PRESETS,
  FULL_FRAME,
  type CropRect,
} from '@/domain/photography/crop';
import { cn } from '@/lib/cn';

/**
 * KIRPMA ARACI — yükleme sihirbazında kadraj ayarı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ALAN ÖLÇÜSÜ CANLI GÖSTERİLİYOR
 *
 * Sıradan bir fotoğrafta kırpma kompozisyon kararı; astrofotoğrafta
 * ayrıca bir ÖLÇÜ değişikliği. Kadraj daraldıkça gökyüzünde kapladığı
 * alan küçülüyor. Kullanıcı ekipmanını seçtiyse piksel ölçeği biliniyor
 * ve kırpılmış alanın derece karşılığı KESİN olarak hesaplanabiliyor —
 * bu yüzden sürüklerken canlı yazılıyor.
 *
 * Ekipman seçilmemişse alan satırı hiç çizilmiyor. Uydurulmuş bir derece
 * değeri, hiç olmayandan kötü.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖRT TUTAMAK, SEKİZ DEĞİL
 *
 * Köşe tutamakları yeterli: kenar tutamakları oran kilitliyken zaten
 * köşe gibi davranıyor (bir kenarı çekmek diğerini de değiştiriyor) ve
 * dokunmatik ekranda sekiz hedef 32px'lik bir alanda üst üste biniyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KLAVYEYLE DE ÇALIŞIYOR
 *
 * Yalnızca sürüklemeyle çalışan bir kırpma aracı, fare kullanamayan
 * herkesi dışarıda bırakır. Ok tuşları kadrajı kaydırıyor, Shift+ok
 * boyutlandırıyor. Ön ayar düğmeleri zaten klavyeyle erişilebilir ve
 * çoğu kullanıcı için tek gereken onlar.
 */

type Handle = 'sol-ust' | 'sag-ust' | 'sol-alt' | 'sag-alt' | 'tasi';

export function CropTool({
  file,
  arcsecPerPixel,
  value,
  onChange,
  autoCrop,
  autoCropState = 'idle',
}: {
  file: File;
  /** Sihirbazın hesapladığı piksel ölçeği; yoksa alan satırı çizilmiyor. */
  arcsecPerPixel?: number | null;
  value: CropRect;
  onChange: (rect: CropRect) => void;
  autoCrop?: CropRect | null;
  autoCropState?: 'idle' | 'detecting' | 'ready' | 'failed';
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [source, setSource] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [preset, setPreset] = useState<string>('auto');
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    handle: Handle;
    startX: number;
    startY: number;
    rect: CropRect;
  } | null>(null);

  /* Nesne adresi bileşen ömrü boyunca yaşıyor ve sökülürken geri
     veriliyor; verilmezse her dosya seçiminde bellek sızar. */
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const imageAspect = source ? source.width / source.height : 1;

  const ratio = useMemo(
    () => ASPECT_PRESETS.find((p) => p.id === preset)?.ratio ?? null,
    [preset]
  );

  const guncelle = useCallback(
    (next: CropRect) => onChange(applyAspect(next, ratio, imageAspect)),
    [onChange, ratio, imageAspect]
  );

  /* Ön ayar değiştiğinde mevcut seçim yeni orana oturtuluyor — kullanıcı
     seçimini kaybetmiyor, yalnızca kenarları düzeliyor. */
  useEffect(() => {
    if (!source) return;
    onChange(applyAspect(value, ratio, imageAspect));
    // Yalnızca ön ayar/kaynak değişiminde koşmalı; `value` bağımlılığa
    // eklenirse her sürükleme adımında yeniden oturtma tetiklenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ratio, source]);

  useEffect(() => {
    if (autoCrop) setPreset('auto');
  }, [autoCrop]);

  const onPointerDown = (handle: Handle) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      rect: value,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    const frame = frameRef.current;
    if (!drag || !frame) return;

    const box = frame.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    const dx = (e.clientX - drag.startX) / box.width;
    const dy = (e.clientY - drag.startY) / box.height;
    const r = drag.rect;

    if (drag.handle === 'tasi') {
      guncelle({ ...r, x: r.x + dx, y: r.y + dy });
      return;
    }

    /* Köşe çekme: karşı köşe SABİT kalıyor. Sabitlenmeseydi dikdörtgen
       sürüklerken kayar ve kullanıcı seçtiği yeri kaybederdi. */
    const sol = drag.handle === 'sol-ust' || drag.handle === 'sol-alt';
    const ust = drag.handle === 'sol-ust' || drag.handle === 'sag-ust';

    guncelle(
      clampRect({
        x: sol ? r.x + dx : r.x,
        y: ust ? r.y + dy : r.y,
        width: sol ? r.width - dx : r.width + dx,
        height: ust ? r.height - dy : r.height + dy,
      })
    );
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    dragRef.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const px = source ? croppedPixels(value, source) : null;
  const alan = source ? croppedFieldDeg(value, source, arcsecPerPixel) : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="label mr-1">En-boy</span>
        <button
          type="button"
          aria-pressed={preset === 'auto'}
          onClick={() => {
            setPreset('auto');
            onChange(autoCrop ?? FULL_FRAME);
          }}
          disabled={autoCropState === 'detecting'}
          className={cn(
            'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors',
            preset === 'auto'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
            autoCropState === 'detecting' && 'opacity-60'
          )}
        >
          {autoCropState === 'detecting' ? 'Algılanıyor' : 'Otomatik'}
        </button>
        {ASPECT_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              'h-8 rounded-card border px-2.5 text-meta font-medium transition-colors',
              preset === p.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPreset('serbest');
            onChange(FULL_FRAME);
          }}
          disabled={isFullFrame(value) && preset === 'serbest'}
          className="h-8 rounded-card border border-border px-2.5 text-meta text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-40"
        >
          Sıfırla
        </button>
      </div>

      <div
        ref={frameRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-none select-none overflow-hidden rounded-card border border-border bg-black"
      >
        {url && (
          <img
            src={url}
            alt="Kırpılacak görsel"
            onLoad={(e) =>
              setSource({
                width: e.currentTarget.naturalWidth,
                height: e.currentTarget.naturalHeight,
              })
            }
            className="block max-h-[50vh] w-full object-contain"
          />
        )}

        {/* Dışarıda kalan alan karartılıyor — kadraj sınırı böyle okunuyor. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/55"
          style={{
            clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${value.x * 100}% ${value.y * 100}%, ${value.x * 100}% ${(value.y + value.height) * 100}%, ${(value.x + value.width) * 100}% ${(value.y + value.height) * 100}%, ${(value.x + value.width) * 100}% ${value.y * 100}%, ${value.x * 100}% ${value.y * 100}%)`,
          }}
        />

        <div
          role="group"
          aria-label="Kırpma alanı"
          tabIndex={0}
          onPointerDown={onPointerDown('tasi')}
          onKeyDown={(e) => {
            const adim = e.shiftKey ? 0 : 0.02;
            const olcek = e.shiftKey ? 0.02 : 0;
            if (e.key === 'ArrowLeft')
              guncelle({
                ...value,
                x: value.x - adim,
                width: value.width - olcek,
              });
            else if (e.key === 'ArrowRight')
              guncelle({
                ...value,
                x: value.x + adim,
                width: value.width + olcek,
              });
            else if (e.key === 'ArrowUp')
              guncelle({
                ...value,
                y: value.y - adim,
                height: value.height - olcek,
              });
            else if (e.key === 'ArrowDown')
              guncelle({
                ...value,
                y: value.y + adim,
                height: value.height + olcek,
              });
            else return;
            e.preventDefault();
          }}
          className="absolute cursor-move border-2 border-primary outline-none focus-visible:border-cold"
          style={{
            left: `${value.x * 100}%`,
            top: `${value.y * 100}%`,
            width: `${value.width * 100}%`,
            height: `${value.height * 100}%`,
          }}
        >
          {(
            [
              ['sol-ust', '-left-1.5 -top-1.5 cursor-nwse-resize'],
              ['sag-ust', '-right-1.5 -top-1.5 cursor-nesw-resize'],
              ['sol-alt', '-bottom-1.5 -left-1.5 cursor-nesw-resize'],
              ['sag-alt', '-bottom-1.5 -right-1.5 cursor-nwse-resize'],
            ] as [Handle, string][]
          ).map(([handle, konum]) => (
            <span
              key={handle}
              onPointerDown={onPointerDown(handle)}
              /* 12px görünür kutu ama dokunma hedefi 24px (WCAG 2.5.8):
                 görünür tutamağı büyütmek kadrajı kapatırdı. */
              className={cn(
                'absolute h-3 w-3 rounded-card border border-background bg-primary',
                'after:absolute after:-inset-1.5 after:content-[""]',
                konum
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-meta">
        <span className="tabular text-muted-foreground">
          {px ? `${px.width} × ${px.height} px` : 'ölçü okunuyor…'}
          {isFullFrame(value) && (
            <span className="ml-2 text-faint">· kırpma yok</span>
          )}
        </span>

        {/*
          ALAN SATIRI YALNIZCA HESAPLANABİLİYORSA. Ekipman seçilmemişse
          piksel ölçeği yok ve derece uydurulamaz.
        */}
        {alan && (
          <span className="tabular text-cold">
            Alan: {alan.widthDeg.toFixed(2)}° × {alan.heightDeg.toFixed(2)}°
          </span>
        )}
      </div>
    </div>
  );
}
