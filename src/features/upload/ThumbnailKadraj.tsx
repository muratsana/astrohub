import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import {
  EN_AZ_ZOOM,
  EN_COK_ZOOM,
  VARSAYILAN_KADRAJ,
  kadrajiTemizle,
  kaynakDikdortgen,
  type Kadraj,
} from '@/domain/profile/kadraj';

/**
 * THUMBNAIL (KART) KADRAJI — kare kartta hangi bölge görünecek (C07, C08).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KADRAJ
 *
 * Kart ve ana sayfa fotoğrafı KARE gösteriliyor; geniş ya da dikey bir
 * astrofotoğraf otomatik kırpıldığında hedef kadraj dışına düşebiliyor.
 * Bu kontrol, kullanıcının karede hangi kare bölgeyi göstereceğini
 * seçmesini sağlıyor. Seçim normalize bir kadrajla saklanıyor
 * ({zoom, panX, panY}) — ölçekten bağımsız (C10).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KAYDIRICI
 *
 * KadrajEditoru'nun tuval-sürükleme sahnesi zengin ama klavyeyle
 * kullanılamıyordu; orada kaydırıcılar bir yedekti. Burada kaydırıcılar
 * ASIL denetim: yakınlaştırma, yatay ve dikey üç eksende de klavye,
 * fare ve dokunmatikle çalışıyor (C15). Önizleme kadrajın kartta ve ana
 * sayfada TAM olarak nasıl görüneceğini gösteriyor (C08).
 */
const BUYUK = 224;
const KART = 96;

export function ThumbnailKadraj({
  file,
  kadraj,
  onChange,
}: {
  file: File;
  kadraj: Kadraj;
  onChange: (kadraj: Kadraj) => void;
}) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [hata, setHata] = useState(false);
  const buyukRef = useRef<HTMLCanvasElement>(null);
  const kartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (typeof createImageBitmap !== 'function') {
      setHata(true);
      return;
    }
    let alive = true;
    let bmp: ImageBitmap | null = null;
    createImageBitmap(file)
      .then((b) => {
        if (alive) {
          bmp = b;
          setBitmap(b);
        } else {
          b.close();
        }
      })
      .catch(() => {
        if (alive) setHata(true);
      });
    return () => {
      alive = false;
      bmp?.close();
    };
  }, [file]);

  useEffect(() => {
    if (!bitmap) return;
    const dik = kaynakDikdortgen(
      { width: bitmap.width, height: bitmap.height },
      kadrajiTemizle(kadraj),
      1
    );
    for (const canvas of [buyukRef.current, kartRef.current]) {
      if (!canvas) continue;
      // jsdom (ve canvas'sız ortamlar) getContext'i desteklemeyip
      // fırlatabiliyor; önizleme bir kolaylık, çizemezse sessizce geçiyor.
      const ctx = ((): CanvasRenderingContext2D | null => {
        try {
          return canvas.getContext('2d');
        } catch {
          return null;
        }
      })();
      if (!ctx) continue;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        bitmap,
        dik.x,
        dik.y,
        dik.width,
        dik.height,
        0,
        0,
        canvas.width,
        canvas.height
      );
    }
  }, [bitmap, kadraj]);

  const temiz = useMemo(() => kadrajiTemizle(kadraj), [kadraj]);

  function set(alan: Partial<Kadraj>) {
    onChange(kadrajiTemizle({ ...temiz, ...alan }));
  }

  if (hata) {
    return (
      <p className="text-meta text-muted-foreground">
        Bu tarayıcı önizleme çizemiyor; kart kadrajı otomatik seçilecek.
      </p>
    );
  }

  return (
    <div className="grid gap-4 rounded-card border border-border/70 bg-surface-1/60 p-3 md:grid-cols-[9rem_minmax(0,1fr)]">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
        <PreviewCanvas
          label="Kart"
          canvasRef={buyukRef}
          width={BUYUK}
          height={BUYUK}
          cssSize={112}
        />
        <PreviewCanvas
          label="Ana sayfa"
          canvasRef={kartRef}
          width={KART}
          height={KART}
          cssSize={56}
        />
      </div>

      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div>
            <p className="label text-foreground">Önizleme kadrajı</p>
            <p className="text-meta text-muted-foreground">
              Kare kartlarda görünecek bölge
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(VARSAYILAN_KADRAJ)}
          >
            Kadrajı sıfırla
          </Button>
        </div>
        <Slider
          label="Yakınlaştırma"
          valueLabel={`${temiz.zoom.toFixed(2)}×`}
          min={EN_AZ_ZOOM}
          max={EN_COK_ZOOM}
          step={0.02}
          value={temiz.zoom}
          onChange={(zoom) => set({ zoom })}
        />
        <Slider
          label="Yatay"
          valueLabel={`${Math.round(temiz.panX * 100)}`}
          min={-1}
          max={1}
          step={0.02}
          value={temiz.panX}
          onChange={(panX) => set({ panX })}
        />
        <Slider
          label="Dikey"
          valueLabel={`${Math.round(temiz.panY * 100)}`}
          min={-1}
          max={1}
          step={0.02}
          value={temiz.panY}
          onChange={(panY) => set({ panY })}
        />
      </div>
    </div>
  );
}

const PreviewCanvas = ({
  label,
  canvasRef,
  width,
  height,
  cssSize,
}: {
  label: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  width: number;
  height: number;
  cssSize: number;
}) => (
  <figure className="m-0 rounded-card border border-border bg-surface-2 p-2">
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-card border border-border bg-background"
      style={{ width: cssSize, height: cssSize }}
      aria-label={`${label} önizlemesi`}
    />
    <figcaption className="mt-1 text-meta font-medium text-muted-foreground">
      {label}
    </figcaption>
  </figure>
);

function Slider({
  label,
  valueLabel,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[7.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-meta text-muted-foreground">
      <span className="font-medium text-foreground">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 accent-primary"
      />
      <span className="rounded-card border border-border bg-surface-2 px-2 py-1 text-right font-mono text-[11px] text-foreground">
        {valueLabel}
      </span>
    </label>
  );
}
