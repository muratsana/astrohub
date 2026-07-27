import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';

/**
 * YILDIZ ALANI — gerçek görsel gelene kadarki yer tutucu.
 *
 * Her hedef kendi tohumundan aynı gökyüzünü üretir: aynı fotoğraf her
 * ziyarette birebir aynı görünür, sayfa yenilendiğinde "zıplamaz". Tuval
 * bir kez çizilir, animasyon yoktur.
 *
 * Gerçek medya pipeline'ı (§10.6) devreye girdiğinde yalnızca bu bileşen
 * `<img srcset>` ile değiştirilecek; çağrı yerlerinin hiçbiri değişmeyecek.
 */

/** Basit deterministik sözde-rastgele üretici (mulberry32). */
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

/** Metinden sabit bir tohum türetir (FNV-1a). */
function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DEFAULT_TINT: [number, number, number] = [150, 185, 235];

/**
 * Tonu güvenle çözer.
 *
 * Beklenen biçim `"r,g,b"`. Buraya yanlışlıkla bir CSS gradyanı geçirmek
 * kolay (veri dosyalarında `gradient` alanı da var) ve o durumda
 * `Number('linear-gradient(...)')` NaN üretip `addColorStop`'u
 * fırlatıyordu — tek bir kart yüzünden bütün rota hata sınırına düşüyordu.
 * Geçersiz ton artık varsayılana iner: kart biraz farklı renkte çizilir,
 * sayfa ayakta kalır.
 */
function parseTint(value: string): [number, number, number] {
  const parts = value.split(',');
  if (parts.length !== 3) return DEFAULT_TINT;

  const rgb = parts.map((p) => Number(p.trim()));
  const valid = rgb.every((n) => Number.isFinite(n) && n >= 0 && n <= 255);

  return valid ? (rgb as [number, number, number]) : DEFAULT_TINT;
}

export interface StarFieldProps {
  /** Aynı görüntüyü üreten sabit anahtar — genelde hedef ya da slug. */
  seed: string;
  /** Bulutsu sisinin rengi "r,g,b" biçiminde. */
  tint?: string;
  /** Yıldız yoğunluğu çarpanı (1 = varsayılan). */
  density?: number;
  className?: string;
}

export function StarField({
  seed,
  tint = '150,185,235',
  density = 1,
  className,
}: StarFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (w < 2 || h < 2) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;

      const g = canvas.getContext('2d');
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);

      const rnd = makeRandom(hashSeed(seed));
      const rgb = parseTint(tint);

      // Bulutsu sisi: tohumdan gelen konumda iki yumuşak leke
      for (let i = 0; i < 2; i++) {
        const cx = w * (0.25 + rnd() * 0.5);
        const cy = h * (0.25 + rnd() * 0.5);
        const r = Math.max(w, h) * (0.45 + rnd() * 0.35);
        const grd = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        grd.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.2 - i * 0.07})`);
        grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, w, h);
      }

      // Yıldızlar: yoğunluk alanla ölçeklenir ki büyük ve küçük karolar
      // aynı sıklıkta görünsün.
      const count = Math.round(((w * h) / 900) * density);
      for (let i = 0; i < count; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const m = rnd();
        const radius = m > 0.988 ? 1.7 : m > 0.9 ? 1.05 : 0.6;
        const alpha = 0.2 + rnd() * 0.7;
        const warm = rnd() > 0.74;
        const c = warm ? rgb : [232, 238, 250];
        g.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, radius, 0, Math.PI * 2);
        g.fill();
      }
    };

    paint();

    // Kapsayıcı yeniden boyutlanırsa tekrar çiz (tohum sabit olduğu için
    // gökyüzü değişmez, yalnızca çözünürlük düzelir).
    // ResizeObserver her ortamda yok (jsdom, eski tarayıcılar) — yokluğunda
    // tek seferlik çizim yeterlidir, bileşen yine de çalışır.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [seed, tint, density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn('block h-full w-full bg-surface-2', className)}
    />
  );
}
