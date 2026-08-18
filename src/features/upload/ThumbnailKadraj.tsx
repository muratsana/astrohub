import { useEffect, useMemo, useRef, useState } from 'react';
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
    <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
      <div className="flex items-start gap-3">
        <figure className="m-0">
          <canvas
            ref={buyukRef}
            width={BUYUK}
            height={BUYUK}
            className="rounded-card border border-border bg-surface-2"
            style={{ width: BUYUK / 2, height: BUYUK / 2 }}
            aria-label="Kart önizlemesi"
          />
          <figcaption className="mt-1 text-meta text-faint">Kartta</figcaption>
        </figure>
        <figure className="m-0">
          {/* Ana sayfada kareler küçük görünüyor; bu, o boyutta önizleme. */}
          <canvas
            ref={kartRef}
            width={KART}
            height={KART}
            className="rounded-card border border-border bg-surface-2"
            style={{ width: KART / 2, height: KART / 2 }}
            aria-label="Ana sayfa önizlemesi"
          />
          <figcaption className="mt-1 text-meta text-faint">Ana sayfa</figcaption>
        </figure>
      </div>

      <div className="space-y-2">
        <Slider
          label="Yakınlaştırma"
          min={EN_AZ_ZOOM}
          max={EN_COK_ZOOM}
          step={0.02}
          value={temiz.zoom}
          onChange={(zoom) => set({ zoom })}
        />
        <Slider
          label="Yatay"
          min={-1}
          max={1}
          step={0.02}
          value={temiz.panX}
          onChange={(panX) => set({ panX })}
        />
        <Slider
          label="Dikey"
          min={-1}
          max={1}
          step={0.02}
          value={temiz.panY}
          onChange={(panY) => set({ panY })}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onChange(VARSAYILAN_KADRAJ)}
        >
          Kadrajı sıfırla
        </Button>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center gap-3 text-meta text-muted-foreground">
      <span className="w-28 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 accent-primary"
      />
    </label>
  );
}
