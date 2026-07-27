import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * HERO ARKA PLANI — her modüle özgü, tuval üzerine çizilen sahne.
 *
 * Neden stok fotoğraf değil: platformun kendi görselleri henüz yok ve
 * lisansı belirsiz bir stok fotoğrafı "Astrohub'ın gökyüzü" gibi sunmak
 * yanıltıcı olurdu. Bunun yerine her modül kendi sahnesini alır — hepsi
 * tohumdan deterministik çizilir, aynı slayt her ziyarette aynı görünür,
 * dış istek yapılmaz ve karanlık/kırmızı temada aynı ölçüde çalışır.
 *
 * Gerçek fotoğraflar geldiğinde yalnızca bu bileşen `<img srcset>` ile
 * değiştirilecek; çağrı yerleri değişmeyecek.
 */

export type HeroScene =
  | 'nebula' // Galeri — derin gökyüzü, emisyon bulutsusu
  | 'gathering' // Etkinlikler — ufukta teleskop siluetleri
  | 'ridge' // Saha — dağ sırtı + Samanyolu bandı
  | 'instrument' // Araçlar — nişangâh, ölçü ızgarası
  | 'chart'; // Yazılar & Haberler — takımyıldız haritası

/* ── Deterministik rastgelelik ────────────────────────────── */

function makeRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Rnd = () => number;
type Ctx = CanvasRenderingContext2D;

/* ── Ortak parçalar ───────────────────────────────────────── */

function drawStars(
  g: Ctx,
  rnd: Rnd,
  w: number,
  h: number,
  count: number,
  /** Yıldızların yalnızca bu yükseklik oranına kadar çizilmesi (ufuk için). */
  maxY = 1
) {
  for (let i = 0; i < count; i++) {
    const x = rnd() * w;
    const y = rnd() * h * maxY;
    const m = rnd();
    const r = m > 0.99 ? 1.9 : m > 0.93 ? 1.2 : 0.65;
    const a = 0.18 + rnd() * 0.72;
    g.fillStyle = `rgba(236,241,252,${a.toFixed(3)})`;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
}

function nebulaBlob(
  g: Ctx,
  rgb: number[],
  cx: number,
  cy: number,
  radius: number,
  alpha: number
) {
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
  grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`);
  grd.addColorStop(0.55, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha * 0.35})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, g.canvas.width, g.canvas.height);
}

/** Yumuşak, tekrarlanabilir bir tepe silueti üretir. */
function ridgeLine(
  g: Ctx,
  rnd: Rnd,
  w: number,
  h: number,
  baseY: number,
  amplitude: number,
  fill: string
) {
  const steps = 14;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (w / steps) * i;
    const y = baseY - rnd() * amplitude;
    points.push([x, y]);
  }

  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(points[0][0], points[0][1]);
  // Kontrol noktası olarak orta değerleri kullanan yumuşak eğri
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cxp, cyp] = points[i];
    g.quadraticCurveTo(px, py, (px + cxp) / 2, (py + cyp) / 2);
  }
  g.lineTo(w, points[points.length - 1][1]);
  g.lineTo(w, h);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
}

/* ── Sahneler ─────────────────────────────────────────────── */

function sceneNebula(g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) {
  nebulaBlob(g, rgb, w * 0.68, h * 0.42, Math.max(w, h) * 0.62, 0.34);
  nebulaBlob(g, [90, 120, 200], w * 0.34, h * 0.7, Math.max(w, h) * 0.45, 0.18);
  drawStars(g, rnd, w, h, Math.round((w * h) / 620));

  // Birkaç parlak yıldıza kırınım dikenleri
  for (let i = 0; i < 5; i++) {
    const x = w * (0.25 + rnd() * 0.7);
    const y = h * (0.12 + rnd() * 0.72);
    const len = 10 + rnd() * 22;
    g.strokeStyle = 'rgba(236,241,252,0.5)';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x - len, y);
    g.lineTo(x + len, y);
    g.moveTo(x, y - len);
    g.lineTo(x, y + len);
    g.stroke();
  }
}

function sceneGathering(g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) {
  nebulaBlob(g, rgb, w * 0.72, h * 0.3, Math.max(w, h) * 0.5, 0.2);
  drawStars(g, rnd, w, h, Math.round((w * h) / 900), 0.82);

  const horizon = h * 0.86;

  // Uzak tepe
  ridgeLine(g, rnd, w, h, horizon, h * 0.06, 'rgba(6,9,12,0.85)');

  // Teleskop ve insan siluetleri — ufuk çizgisine oturur
  const figures = 7;
  for (let i = 0; i < figures; i++) {
    const x = w * (0.08 + (0.84 / (figures - 1)) * i) + (rnd() - 0.5) * 24;
    const scale = 0.75 + rnd() * 0.5;
    g.fillStyle = 'rgba(4,6,8,0.95)';
    g.strokeStyle = 'rgba(4,6,8,0.95)';
    g.lineWidth = 2.2 * scale;

    if (rnd() > 0.45) {
      // Üçayak üzerinde teleskop
      const th = 30 * scale;
      g.beginPath();
      g.moveTo(x - 8 * scale, horizon);
      g.lineTo(x, horizon - th);
      g.lineTo(x + 8 * scale, horizon);
      g.moveTo(x, horizon - th);
      g.stroke();
      // Tüp
      g.save();
      g.translate(x, horizon - th);
      g.rotate(-0.5 - rnd() * 0.35);
      g.fillRect(-4 * scale, -3 * scale, 26 * scale, 6 * scale);
      g.restore();
    } else {
      // Ayakta duran figür
      const fh = 24 * scale;
      g.beginPath();
      g.arc(x, horizon - fh, 3.2 * scale, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.moveTo(x, horizon - fh + 3 * scale);
      g.lineTo(x, horizon - 8 * scale);
      g.moveTo(x, horizon - 8 * scale);
      g.lineTo(x - 4 * scale, horizon);
      g.moveTo(x, horizon - 8 * scale);
      g.lineTo(x + 4 * scale, horizon);
      g.stroke();
    }
  }

  // Ön plan zemin
  g.fillStyle = 'rgba(3,5,7,0.96)';
  g.fillRect(0, horizon, w, h - horizon);
}

function sceneRidge(g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) {
  // Samanyolu bandı — eğik bir şerit
  g.save();
  g.translate(w * 0.5, h * 0.42);
  g.rotate(-0.42);
  const band = g.createLinearGradient(0, -h * 0.34, 0, h * 0.34);
  band.addColorStop(0, 'rgba(0,0,0,0)');
  band.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)`);
  band.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = band;
  g.fillRect(-w, -h * 0.34, w * 2, h * 0.68);
  g.restore();

  drawStars(g, rnd, w, h, Math.round((w * h) / 480), 0.88);

  // Katmanlı dağ sırtları — uzaktan yakına koyulaşır
  ridgeLine(g, rnd, w, h, h * 0.74, h * 0.1, 'rgba(10,14,19,0.8)');
  ridgeLine(g, rnd, w, h, h * 0.85, h * 0.12, 'rgba(6,9,12,0.92)');
  ridgeLine(g, rnd, w, h, h * 0.96, h * 0.08, 'rgba(3,5,7,0.98)');
}

function sceneInstrument(g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) {
  nebulaBlob(g, rgb, w * 0.7, h * 0.5, Math.max(w, h) * 0.5, 0.22);
  drawStars(g, rnd, w, h, Math.round((w * h) / 1000));

  const cx = w * 0.72;
  const cy = h * 0.5;
  const r = Math.min(w, h) * 0.3;

  g.strokeStyle = 'rgba(110,168,199,0.45)';
  g.lineWidth = 1;

  // Nişangâh halkaları
  for (const f of [0.45, 0.72, 1]) {
    g.beginPath();
    g.arc(cx, cy, r * f, 0, Math.PI * 2);
    g.stroke();
  }

  // Eksen çizgileri
  g.beginPath();
  g.moveTo(cx - r * 1.25, cy);
  g.lineTo(cx + r * 1.25, cy);
  g.moveTo(cx, cy - r * 1.25);
  g.lineTo(cx, cy + r * 1.25);
  g.stroke();

  // Kadraj çerçevesi (görüş alanı)
  g.setLineDash([5, 4]);
  g.strokeStyle = 'rgba(255,157,46,0.6)';
  g.strokeRect(cx - r * 0.8, cy - r * 0.54, r * 1.6, r * 1.08);
  g.setLineDash([]);

  // Kenar ölçü çentikleri
  g.strokeStyle = 'rgba(110,168,199,0.4)';
  for (let x = 0; x < w; x += 22) {
    const long = x % 110 === 0;
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, long ? 12 : 6);
    g.stroke();
  }
}

function sceneChart(g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) {
  nebulaBlob(g, rgb, w * 0.6, h * 0.35, Math.max(w, h) * 0.55, 0.2);
  drawStars(g, rnd, w, h, Math.round((w * h) / 1100));

  // Takımyıldız: birbirine bağlı düğüm noktaları
  const nodes: [number, number][] = [];
  const count = 9;
  for (let i = 0; i < count; i++) {
    nodes.push([w * (0.42 + rnd() * 0.52), h * (0.14 + rnd() * 0.68)]);
  }

  g.strokeStyle = 'rgba(236,241,252,0.28)';
  g.lineWidth = 1;
  g.beginPath();
  for (let i = 1; i < nodes.length; i++) {
    // Her düğüm bir öncekine bağlanır; ara sıra iki geri atlar (dallanma)
    const from = rnd() > 0.75 && i > 2 ? nodes[i - 3] : nodes[i - 1];
    g.moveTo(from[0], from[1]);
    g.lineTo(nodes[i][0], nodes[i][1]);
  }
  g.stroke();

  for (const [x, y] of nodes) {
    g.fillStyle = 'rgba(236,241,252,0.95)';
    g.beginPath();
    g.arc(x, y, 2.4, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,157,46,0.5)';
    g.beginPath();
    g.arc(x, y, 6.5, 0, Math.PI * 2);
    g.stroke();
  }
}

const scenes: Record<
  HeroScene,
  (g: Ctx, rnd: Rnd, w: number, h: number, rgb: number[]) => void
> = {
  nebula: sceneNebula,
  gathering: sceneGathering,
  ridge: sceneRidge,
  instrument: sceneInstrument,
  chart: sceneChart,
};

export interface HeroBackdropProps {
  scene: HeroScene;
  /** Aynı görüntüyü üreten sabit anahtar. */
  seed: string;
  /** Sahne rengi "r,g,b". */
  tint?: string;
  className?: string;
}

export function HeroBackdrop({
  scene,
  seed,
  tint = '150,185,235',
  className,
}: HeroBackdropProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w < 4 || h < 4) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      const g = canvas.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      scenes[scene](
        g,
        makeRandom(hashSeed(`${scene}:${seed}`)),
        w,
        h,
        tint.split(',').map(Number)
      );
    };

    paint();

    // ResizeObserver her ortamda yok (jsdom, eski tarayıcılar).
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [scene, seed, tint]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn('block h-full w-full bg-background', className)}
    />
  );
}
