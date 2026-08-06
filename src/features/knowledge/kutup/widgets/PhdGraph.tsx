/**
 * PHD2 GUIDING GRAFİĞİ — simülatör ve teşhis aracı ortak kullanır.
 *
 * Paketin `PhdGraph.jsx` bileşeninin TSX karşılığı. Düz SVG; hiçbir
 * çizim kütüphanesi yok.
 *
 * Renkler PHD2'nin kendi paletinden geliyor ve TEMAYA BAĞLANMADI: grafik
 * gerçek bir yazılım ekranını taklit ediyor, RA mavi / DEC kırmızı /
 * eğilim çizgisi turuncu okurun PHD2'de göreceğiyle aynı olmalı. Kutu
 * arka planı da bu yüzden sabit koyu — açık temada da PHD2 penceresi
 * koyudur.
 */
import { useMemo } from 'react';
import { linFit, type Trace } from '../core';

/* Çizim geometrisi sabit ve bileşenden bağımsız: bileşenin içinde
   dursaydı her boyamada yeniden kurulur ve `useMemo` bağımlılık
   listesine girerdi. */
const W = 720,
  H = 260;
const x0 = 44,
  x1 = W - 12,
  yTop = 16,
  yBot = 168;
const yMid = (yTop + yBot) / 2;
const barTop = 190,
  barBot = 246,
  barMid = (barTop + barBot) / 2;

export function PhdGraph({
  series,
  xlabel = '',
}: {
  series: Trace;
  /** Sağ üstte gösterilen süre etiketi. */
  xlabel?: string;
}) {

  const m = useMemo(() => {
    const n = series.dec.length;
    let maxV = 0.6;
    for (let i = 0; i < n; i++) {
      maxV = Math.max(maxV, Math.abs(series.dec[i]), Math.abs(series.ra[i]));
    }
    maxV = Math.ceil(maxV * 1.15 * 2) / 2;
    const X = (i: number) => x0 + (i / Math.max(1, n - 1)) * (x1 - x0);
    const Y = (v: number) => yMid - ((v / maxV) * (yBot - yTop)) / 2;
    const poly = (arr: number[]) =>
      arr
        .map(
          (v, i) =>
            (i ? 'L ' : 'M ') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)
        )
        .join(' ');
    const fit = linFit(series.dec);
    let maxC = 0.001;
    for (let i = 0; i < n; i++) maxC = Math.max(maxC, Math.abs(series.corr[i]));
    return { n, maxV, X, Y, poly, fit, maxC, step: maxV / 2 };
  }, [series]);

  const bw = Math.max(1.2, (x1 - x0) / m.n - 1.2);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Benzetilmiş PHD2 guiding grafiği"
    >
      <rect x={0} y={0} width={W} height={H} fill="#0b0b0a" />

      <line x1={x0} y1={yMid} x2={x1} y2={yMid} stroke="#3a3a37" />
      {[-2, -1, 1, 2].map((k) => (
        <line
          key={k}
          x1={x0}
          y1={m.Y(k * m.step)}
          x2={x1}
          y2={m.Y(k * m.step)}
          stroke="#1e1e1c"
        />
      ))}
      {[-2, -1, 0, 1, 2].map((k) => (
        <text
          key={k}
          x={x0 - 6}
          y={m.Y(k * m.step) + 4}
          fill="#6b6a65"
          fontSize="10"
          textAnchor="end"
          fontFamily="ui-monospace,monospace"
        >
          {(k * m.step).toFixed(m.step < 1 ? 1 : 0)}
        </text>
      ))}
      <text
        x={6}
        y={yMid - 26}
        fill="#6b6a65"
        fontSize="11"
        fontFamily="system-ui,sans-serif"
      >
        ″
      </text>

      <path
        d={m.poly(series.ra)}
        fill="none"
        stroke="#3987e5"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path
        d={m.poly(series.dec)}
        fill="none"
        stroke="#e66767"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <line
        x1={m.X(0)}
        y1={m.Y(m.fit.intercept)}
        x2={m.X(m.n - 1)}
        y2={m.Y(m.fit.intercept + m.fit.slope * (m.n - 1))}
        stroke="#c98500"
        strokeWidth={2}
        strokeDasharray="7 5"
      />

      <rect
        x={x0}
        y={barTop}
        width={x1 - x0}
        height={barBot - barTop}
        fill="#0f0f0e"
        rx={4}
      />
      <line x1={x0} y1={barMid} x2={x1} y2={barMid} stroke="#3a3a37" />
      {series.corr.map((c, i) => {
        if (!c) return null;
        const hgt = (Math.abs(c) / m.maxC) * ((barBot - barTop) / 2 - 3);
        return (
          <rect
            key={i}
            x={m.X(i) - bw / 2}
            y={c > 0 ? barMid - hgt : barMid}
            width={bw}
            height={Math.max(1, hgt)}
            fill={c > 0 ? '#199e70' : '#d55181'}
          />
        );
      })}
      <text
        x={x0 - 6}
        y={barMid + 4}
        fill="#6b6a65"
        fontSize="9.5"
        textAnchor="end"
        fontFamily="system-ui,sans-serif"
      >
        DEC
      </text>
      <text
        x={x0 + 4}
        y={barTop - 5}
        fill="#6b6a65"
        fontSize="10"
        fontFamily="system-ui,sans-serif"
      >
        DEC düzeltme darbeleri
      </text>
      {xlabel ? (
        <text
          x={x1 - 2}
          y={barTop - 5}
          fill="#6b6a65"
          fontSize="10"
          textAnchor="end"
          fontFamily="system-ui,sans-serif"
        >
          {xlabel}
        </text>
      ) : null}
    </svg>
  );
}

/** Grafiğin altında gösterilen renk anahtarı — iki araçta da aynı. */
export function PhdLegend() {
  return (
    <div className="dz-swrow">
      <span>
        <i className="dz-sw" style={{ background: '#3987e5' }} />
        RA
      </span>
      <span>
        <i className="dz-sw" style={{ background: '#e66767' }} />
        DEC
      </span>
      <span>
        <i className="dz-sw" style={{ background: '#c98500' }} />
        DEC eğilim çizgisi
      </span>
    </div>
  );
}
