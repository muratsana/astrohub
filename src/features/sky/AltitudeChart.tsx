import { useId } from 'react';
import type { AltitudePoint } from '@/domain/astronomy/sessionPlan';
import { formatClock } from '@/domain/astronomy/ephemeris';

/**
 * YÜKSEKLİK EĞRİSİ — hedefin gece boyunca ufuktan yüksekliği.
 *
 * SVG ile çizilir; grafik kütüphanesi eklenmedi. Eğri tek bir polyline,
 * eksenler birkaç çizgi — bir kütüphane bunun için 40 kB'lık bir bağımlılık
 * ve ilk yüklemeye giren bir chunk demek olurdu (§16.4).
 *
 * Erişilebilirlik: grafik `role="img"` ve tam cümlelik `aria-label` taşır;
 * altındaki künye satırı zaten aynı sayıları metin olarak veriyor, bu yüzden
 * eğri ekran okuyucu için tek başına bilgi kaynağı değil.
 */

const VIEW_W = 320;
const VIEW_H = 96;
/** Ufuk altı da çizilebilsin diye eksen −10°'den başlar. */
const MIN_DEG = -10;
const MAX_DEG = 90;

export function AltitudeChart({
  points,
  timeZone,
  minAltitude = 30,
  highlight,
  label,
}: {
  points: AltitudePoint[];
  timeZone: string;
  /** Yatay eşik çizgisi — planlamada kullanılan alt sınır. */
  minAltitude?: number;
  /** Vurgulanacak aralık (planlanan slot). */
  highlight?: { start: Date; end: Date };
  label: string;
}) {
  const clipId = useId();

  if (points.length < 2) {
    return (
      <p className="py-4 text-center text-[11px] text-muted-foreground">
        Eğri için yeterli veri yok.
      </p>
    );
  }

  const t0 = points[0].at.getTime();
  const t1 = points[points.length - 1].at.getTime();
  const span = Math.max(t1 - t0, 1);

  const x = (at: Date) => ((at.getTime() - t0) / span) * VIEW_W;
  const y = (deg: number) =>
    VIEW_H - ((Math.min(Math.max(deg, MIN_DEG), MAX_DEG) - MIN_DEG) / (MAX_DEG - MIN_DEG)) * VIEW_H;

  const line = points.map((p) => `${x(p.at).toFixed(1)},${y(p.altitude).toFixed(1)}`).join(' ');
  const area = `${line} ${VIEW_W},${VIEW_H} 0,${VIEW_H}`;

  const peak = points.reduce((a, b) => (b.altitude > a.altitude ? b : a));

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label} yükseklik eğrisi: zirve ${Math.round(peak.altitude)} derece, saat ${formatClock(peak.at, timeZone)}`}
        className="h-24 w-full"
      >
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} />
          </clipPath>
        </defs>

        {/* Planlanan aralık */}
        {highlight && (
          <rect
            x={x(highlight.start)}
            y={0}
            width={Math.max(x(highlight.end) - x(highlight.start), 1)}
            height={VIEW_H}
            className="fill-primary/10"
          />
        )}

        {/* Ufuk ve eşik çizgileri */}
        <line
          x1="0"
          x2={VIEW_W}
          y1={y(0)}
          y2={y(0)}
          className="stroke-border-strong"
          strokeWidth="1"
        />
        <line
          x1="0"
          x2={VIEW_W}
          y1={y(minAltitude)}
          y2={y(minAltitude)}
          className="stroke-border"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        <g clipPath={`url(#${clipId})`}>
          <polygon points={area} className="fill-primary/12" />
          <polyline
            points={line}
            fill="none"
            className="stroke-primary"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </g>

        <circle cx={x(peak.at)} cy={y(peak.altitude)} r="2.5" className="fill-primary" />
      </svg>

      <figcaption className="mt-1 flex justify-between text-[10px] text-faint">
        <span className="tabular">{formatClock(points[0].at, timeZone)}</span>
        <span>
          zirve {Math.round(peak.altitude)}° · {formatClock(peak.at, timeZone)}
        </span>
        <span className="tabular">
          {formatClock(points[points.length - 1].at, timeZone)}
        </span>
      </figcaption>
    </figure>
  );
}
