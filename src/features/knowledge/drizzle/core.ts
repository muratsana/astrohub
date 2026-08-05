/**
 * DRIZZLE ÇEKİRDEĞİ — matematik ve simülasyon.
 *
 * İçerik paketindeki `lib/drizzle-core.js` dosyasının BİREBİR TypeScript
 * karşılığı. Sayısal davranış değiştirilmedi: eklenen tek şey tipler.
 * Algoritma Fruchter & Hook'a karşı doğrulanmış durumda ve makaledeki her
 * sayı bu fonksiyonlardan çıkıyor — "iyileştirme" yapılırsa metin yalan
 * söylemeye başlar.
 *
 * DOM'a dokunan tek fonksiyon `renderToCanvas`; gerisi saf hesap.
 *
 * Kaynak: Fruchter, A. S. & Hook, R. N., "Drizzle: A Method for the Linear
 * Reconstruction of Undersampled Images", PASP 114:144–152 (2002) —
 * denklem 2, 3, 9 ve 10.
 */

/* ─────────────────────────────────────────────────────────────── temel ── */

/** Görüntü ölçeği (yay saniyesi / piksel). */
export function imageScale(pixelUm: number, focalMm: number, binning = 1) {
  return (206.265 * pixelUm * binning) / focalMm;
}

/**
 * Gürültü korelasyon faktörü R (Fruchter & Hook denklem 9–10).
 *
 * @param r pixfrac × drizzle ölçeği — damlanın çıktı pikseli cinsinden boyutu
 * @returns piksel-piksel ölçülen gürültünün gerçeği kaç kat küçük gösterdiği
 *
 * DİKKAT — BU BİR HATA DEĞİL: R, `r` ile tekdüze ARTAR; `r → 0` iken
 * `R → 1`. Yani düşük R "daha iyi" demek DEĞİLDİR — küçük damla, çıktı
 * ızgarasında delik bırakma riskini yükseltir. `pixfrac = 1/ölçek` bir
 * minimum değil, delik riski ile korelasyon arasındaki denge noktasıdır.
 * Paketin belgesi bu ifadeyi "düzeltilmemesi gereken" iki maddeden biri
 * olarak işaretliyor.
 */
export function noiseCorrelation(r: number) {
  return r >= 1 ? r / (1 - 1 / (3 * r)) : 1 / (1 - r / 3);
}

export type SamplingVerdict = 'severe-under' | 'under' | 'good' | 'over';

/** Örnekleme sınıflandırması — piksel cinsinden FWHM'ye göre. */
export function samplingVerdict(fwhmPx: number): SamplingVerdict {
  if (fwhmPx < 1.5) return 'severe-under';
  if (fwhmPx < 2.0) return 'under';
  if (fwhmPx <= 3.0) return 'good';
  return 'over';
}

/** Dither miktarı: rehber pikselinden çekim pikseline. */
export function ditherConversion({
  guidePixelUm,
  guideFocalMm,
  imagePixelUm,
  imageFocalMm,
  amountGuidePx,
  phd2Scale = 1,
}: {
  guidePixelUm: number;
  guideFocalMm: number;
  imagePixelUm: number;
  imageFocalMm: number;
  amountGuidePx: number;
  phd2Scale?: number;
}) {
  const guideScale = imageScale(guidePixelUm, guideFocalMm);
  const imgScale = imageScale(imagePixelUm, imageFocalMm);
  const ratio = guideScale / imgScale;
  return {
    guideScale,
    imgScale,
    ratio,
    moveImagePx: amountGuidePx * phd2Scale * ratio,
  };
}

/* ─────────────────────────────────────────────────────────── simülatör ── */

export const SIM = {
  /** Çıktı alanındaki giriş pikseli sayısı (kenar uzunluğu). */
  GRID: 20,
  /** Kenar boşluğu (giriş pikseli). */
  PAD: 4,
  /** Gökyüzü süper-örnekleme çarpanı. */
  SS: 16,
} as const;

/** Deterministik PRNG (mulberry32) — sonuçların tekrarlanabilir olması için. */
export function mulberry32(a: number) {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ScenePoint {
  x: number;
  y: number;
  a: number;
  fil?: boolean;
}

/** Yapay gökyüzü sahnesi: yıldızlar + ince filament + çift yıldız. */
export function buildScene(): ScenePoint[] {
  const st: ScenePoint[] = [];
  const pts: [number, number, number][] = [
    [6.3, 5.7, 1.0],
    [13.4, 4.2, 0.62],
    [9.1, 12.6, 0.85],
    [15.7, 14.3, 0.5],
    [4.2, 15.1, 0.42],
    [11.8, 8.35, 0.34],
    [17.2, 7.9, 0.28],
    [7.6, 17.4, 0.3],
    [2.9, 9.8, 0.24],
    [14.1, 18.2, 0.22],
    [18.4, 11.2, 0.2],
    [10.3, 2.4, 0.26],
  ];
  pts.forEach((p) => st.push({ x: p[0], y: p[1], a: p[2] }));
  for (let i = 0; i < 44; i++) {
    const t = i / 43;
    st.push({
      x: 2.5 + t * 15.5,
      y: 18.6 - t * 15.2 + 1.1 * Math.sin(t * 5.2),
      a: 0.1 + 0.05 * Math.sin(t * 9),
      fil: true,
    });
  }
  // Çözünürlük testi için çift yıldız.
  st.push({ x: 12.5, y: 16.4, a: 0.46 });
  st.push({ x: 13.35, y: 16.4, a: 0.44 });
  return st;
}

export interface Sky {
  /** Summed-area table — kutu ortalaması O(1)'de alınsın diye. */
  sat: Float64Array;
  /** Yüksek çözünürlüklü ızgaranın kenar uzunluğu. */
  HR: number;
  /** Sahnedeki tepe parlaklık — gürültü ölçeklemesi buna göre. */
  peak: number;
  fwhm: number;
}

/**
 * Verilen FWHM için yüksek çözünürlüklü gökyüzü + integral görüntü (SAT).
 * SAT sayesinde 80 kareye kadar akıcı çalışır.
 */
export function buildSky(fwhm: number, scene: ScenePoint[] = buildScene()): Sky {
  const { GRID, PAD, SS } = SIM;
  const FULL = GRID + 2 * PAD;
  const HR = FULL * SS;
  const sig = fwhm / 2.3548;
  const img = new Float32Array(HR * HR);

  scene.forEach((s) => {
    const sg = s.fil ? Math.max(sig, 0.62) : sig;
    const iv = 1 / (2 * sg * sg);
    const cx = (s.x + PAD) * SS;
    const cy = (s.y + PAD) * SS;
    const rr = Math.ceil(3.2 * sg * SS);
    const u0 = Math.max(0, Math.floor(cx - rr));
    const u1 = Math.min(HR - 1, Math.ceil(cx + rr));
    const v0 = Math.max(0, Math.floor(cy - rr));
    const v1 = Math.min(HR - 1, Math.ceil(cy + rr));
    for (let v = v0; v <= v1; v++) {
      const dy = (v + 0.5 - cy) / SS;
      const dy2 = dy * dy;
      const row = v * HR;
      for (let u = u0; u <= u1; u++) {
        const dx = (u + 0.5 - cx) / SS;
        img[row + u] += s.a * Math.exp(-(dx * dx + dy2) * iv);
      }
    }
  });

  // Hafif arka plan nebulozitesi.
  for (let v = 0; v < HR; v++) {
    const row = v * HR;
    const yy = v / SS - PAD;
    for (let u = 0; u < HR; u++) {
      const xx = u / SS - PAD;
      img[row + u] += 0.035 * Math.exp(-((xx - 10) ** 2 + (yy - 10) ** 2) / 150);
    }
  }

  let peak = 0;
  for (let i = 0; i < img.length; i++) if (img[i] > peak) peak = img[i];

  // Summed-area table.
  const W = HR + 1;
  const sat = new Float64Array(W * W);
  for (let y = 0; y < HR; y++) {
    const rowS = (y + 1) * W;
    const rowP = y * W;
    const rowI = y * HR;
    let run = 0;
    for (let x = 0; x < HR; x++) {
      run += img[rowI + x];
      sat[rowS + x + 1] = sat[rowP + x + 1] + run;
    }
  }
  return { sat, HR, peak, fwhm };
}

function boxMean(sky: Sky, u0: number, v0: number, u1: number, v1: number) {
  const W = sky.HR + 1;
  const A = sky.sat[v0 * W + u0];
  const B = sky.sat[v0 * W + u1];
  const C = sky.sat[v1 * W + u0];
  const D = sky.sat[v1 * W + u1];
  return (D - B - C + A) / ((u1 - u0) * (v1 - v0));
}

/** 0 = dither yok · 1 = rastgele alt-piksel · 2 = tam piksel. */
export type DitherMode = 0 | 1 | 2;

export interface SimulateOptions {
  frames: number;
  /** Drizzle ölçeği (1, 2, 3). */
  scale: number;
  /** Damla boyutu (0–1). */
  pixfrac: number;
  /** 0–10 arası gürültü seviyesi. */
  noise: number;
  dither: DitherMode;
}

export interface SimulateResult {
  OUT: number;
  GRID: number;
  /** "Gerçek gökyüzü", çıktı çözünürlüğünde. */
  truth: Float64Array;
  /** İlk ham kare (GRID×GRID). */
  raw: Float64Array;
  /** Kayıt + bilineer enterpolasyon + ortalama (klasik yığın). */
  stack: Float64Array;
  /** Drizzle çıktısı. */
  drizzle: Float64Array;
  /** Referans görüntünün tepe değeri — canvas germe ölçeği. */
  tmax: number;
  /** Hiç örnek almamış çıktı pikseli yüzdesi. */
  holePct: number;
  /** Çıktı pikseli başına toplam damla ağırlığı. */
  coverage: number;
  /** Gürültü korelasyon faktörü R. */
  R: number;
}

/**
 * Tam drizzle simülasyonu.
 *
 * Her kare gökyüzünden kaydırılarak örneklenir; sonra iki yolla birleştirilir:
 * damla dağıtımıyla (drizzle) ve bilineer kayıt + ortalamayla (klasik).
 * İkisinin yan yana durması makalenin bütün argümanı.
 */
export function simulate(
  sky: Sky,
  { frames, scale, pixfrac, noise, dither }: SimulateOptions
): SimulateResult {
  const { GRID, PAD, SS } = SIM;
  const S = scale;
  const OUT = GRID * S;
  const rnd = mulberry32(777);
  let spare: number | null = null;
  const gauss = () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    const u = Math.max(1e-9, rnd());
    const v2 = rnd();
    const m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v2);
    return m * Math.cos(2 * Math.PI * v2);
  };

  const acc = new Float64Array(OUT * OUT);
  const wacc = new Float64Array(OUT * OUT);
  const sAcc = new Float64Array(OUT * OUT);
  const sCnt = new Float64Array(OUT * OUT);
  const frame = new Float64Array(GRID * GRID);
  const noiseSig = noise * 0.011 * sky.peak;
  let firstFrame: Float64Array | null = null;

  for (let k = 0; k < frames; k++) {
    let ox: number;
    let oy: number;
    if (dither === 0) {
      ox = 0;
      oy = 0;
    } else if (dither === 2) {
      ox = Math.round(rnd() * 4 - 2) * SS;
      oy = Math.round(rnd() * 4 - 2) * SS;
    } else {
      ox = Math.round((rnd() * 2 - 1) * 2.6 * SS);
      oy = Math.round((rnd() * 2 - 1) * 2.6 * SS);
    }

    /* Kareyi örnekle: her piksel kendi alanının ortalamasını alır. */
    for (let j = 0; j < GRID; j++) {
      const v0 = (PAD + j) * SS + oy;
      const v1 = v0 + SS;
      for (let i = 0; i < GRID; i++) {
        const u0 = (PAD + i) * SS + ox;
        let val = boxMean(sky, u0, v0, u0 + SS, v1);
        if (noiseSig > 0) val += gauss() * noiseSig;
        frame[j * GRID + i] = val;
      }
    }
    if (k === 0) firstFrame = frame.slice();

    /* DRIZZLE: damlayı çıktı ızgarasına örtüşme alanıyla dağıt. */
    const half = pixfrac / 2;
    for (let j = 0; j < GRID; j++) {
      const cy = j + 0.5 + oy / SS;
      const dyl = (cy - half) * S;
      const dyh = (cy + half) * S;
      const m0 = Math.max(0, Math.floor(dyl));
      const m1 = Math.min(OUT - 1, Math.ceil(dyh) - 1);
      for (let i = 0; i < GRID; i++) {
        const cx = i + 0.5 + ox / SS;
        const dxl = (cx - half) * S;
        const dxh = (cx + half) * S;
        const n0 = Math.max(0, Math.floor(dxl));
        const n1 = Math.min(OUT - 1, Math.ceil(dxh) - 1);
        const d = frame[j * GRID + i];
        for (let m = m0; m <= m1; m++) {
          const oyy = Math.min(dyh, m + 1) - Math.max(dyl, m);
          if (oyy <= 0) continue;
          const base = m * OUT;
          for (let n = n0; n <= n1; n++) {
            const oxx = Math.min(dxh, n + 1) - Math.max(dxl, n);
            if (oxx <= 0) continue;
            const a = oxx * oyy; // örtüşme alanı = ağırlık
            acc[base + n] += d * a; // I' = Σ(d·a) / Σ(a)
            wacc[base + n] += a;
          }
        }
      }
    }

    /* KLASİK: kayıt + bilineer enterpolasyon + ortalama (karşılaştırma). */
    for (let m = 0; m < OUT; m++) {
      const sy = (m + 0.5) / S - oy / SS - 0.5;
      const jy = Math.floor(sy);
      const fy = sy - jy;
      if (jy < 0 || jy >= GRID - 1) continue;
      for (let n = 0; n < OUT; n++) {
        const sx = (n + 0.5) / S - ox / SS - 0.5;
        const ix = Math.floor(sx);
        const fx = sx - ix;
        if (ix < 0 || ix >= GRID - 1) continue;
        const v00 = frame[jy * GRID + ix];
        const v10 = frame[jy * GRID + ix + 1];
        const v01 = frame[(jy + 1) * GRID + ix];
        const v11 = frame[(jy + 1) * GRID + ix + 1];
        sAcc[m * OUT + n] +=
          (v00 * (1 - fx) + v10 * fx) * (1 - fy) +
          (v01 * (1 - fx) + v11 * fx) * fy;
        sCnt[m * OUT + n]++;
      }
    }
  }

  const drizzle = new Float64Array(OUT * OUT);
  let holes = 0;
  let wsum = 0;
  for (let q = 0; q < OUT * OUT; q++) {
    wsum += wacc[q];
    if (wacc[q] > 1e-12) drizzle[q] = acc[q] / wacc[q];
    else {
      drizzle[q] = 0;
      holes++;
    }
  }
  const stack = new Float64Array(OUT * OUT);
  for (let q = 0; q < OUT * OUT; q++) stack[q] = sCnt[q] > 0 ? sAcc[q] / sCnt[q] : 0;

  // Referans: "gerçek gökyüzü" çıktı çözünürlüğünde.
  const truth = new Float64Array(OUT * OUT);
  const step = SS / S;
  for (let m = 0; m < OUT; m++) {
    for (let n = 0; n < OUT; n++) {
      const u0 = Math.round(PAD * SS + n * step);
      const u1 = Math.round(PAD * SS + (n + 1) * step);
      const v0 = Math.round(PAD * SS + m * step);
      const v1 = Math.round(PAD * SS + (m + 1) * step);
      truth[m * OUT + n] = boxMean(
        sky,
        u0,
        v0,
        Math.max(u1, u0 + 1),
        Math.max(v1, v0 + 1)
      );
    }
  }
  let tmax = 0;
  for (let q = 0; q < truth.length; q++) if (truth[q] > tmax) tmax = truth[q];

  return {
    OUT,
    GRID,
    truth,
    raw: firstFrame ?? new Float64Array(GRID * GRID),
    stack,
    drizzle,
    tmax,
    holePct: (100 * holes) / (OUT * OUT),
    coverage: wsum / (OUT * OUT),
    R: noiseCorrelation(pixfrac * S),
  };
}

/** Float dizisini bir canvas'a asinh germe ile çizer. */
export function renderToCanvas(
  canvas: HTMLCanvasElement | null,
  data: Float64Array,
  w: number,
  h: number,
  scaleMax: number
) {
  if (!canvas) return;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const im = ctx.createImageData(w, h);
  const px = im.data;
  const k = 1 / Math.max(1e-9, scaleMax);
  const denom = Math.asinh(22);
  for (let i = 0; i < w * h; i++) {
    const v = data[i];
    let t =
      v == null || Number.isNaN(v)
        ? 0
        : Math.asinh(Math.max(0, v) * k * 22) / denom;
    t = Math.max(0, Math.min(1, t));
    const g = Math.round(255 * t);
    px[i * 4] = Math.round(g * 0.93);
    px[i * 4 + 1] = Math.round(g * 0.96);
    px[i * 4 + 2] = g;
    px[i * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

/* ─────────────────────────────────────────────── metin yardımcıları ── */

/** Sabit basamaklı sayı biçimi — göstergelerde zıplamayı önler. */
export const fmt = (n: number, d = 2) => Number(n).toFixed(d);
