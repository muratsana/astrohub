/**
 * KUTUP HİZALAMASI ÇEKİRDEĞİ — paketin `lib/pa-core.js` dosyasının
 * TypeScript portu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BİREBİR PORT — FORMÜLLER DEĞİŞTİRİLMEDİ
 *
 * Yalnızca tipler eklendi. Bir formülü "daha temiz" yazmak, kaynak
 * paketle sessizce ayrışmak demek olurdu; drizzle portunda bu bir kez
 * denendi ve yanlış çıktı, sonra kaynağa dönülerek düzeltildi.
 *
 * `core.test.ts` bu dosyanın çıktısını paketin kendi JS sürümüyle
 * (`docs/kutup/pa-core.js`) karşılaştırıyor: ayrışırsa test düşer.
 *
 * ══════════════════════════════════════════════════════════════════════
 * Orijinal başlık:
 *
 * Kutup hizalaması — çekirdek fizik ve benzetim.
 *
 * Hiçbir DOM API'si kullanmaz; hem React bileşenleri hem de vanilla
 * widget'lar aynı bağıntıları paylaşır.
 *
 * KOORDİNAT SİSTEMİ (Dünya çerçevesi)
 *   ẑ  = gerçek gök kutbu (NCP)
 *   x̂  = meridyen üzerinde, gök ekvatorunda (saat açısı H = 0)
 *   ŷ  = H = +6 saat, gök ekvatorunda
 *
 * Montürün kutup ekseni:  p = normalize(a, b, 1)
 *   a = yükseklik (altitude) hatası [rad]  — meridyen düzleminde eğim
 *   b = azimut hatası × cos(enlem) [rad]   — doğu-batı eğimi
 *
 * DOĞRULANMIŞ BAĞINTILAR
 *   dδ/dt = ω · [a·sin H − b·cos H]              → deklinasyondan BAĞIMSIZ
 *   dα/dt = −ω · sin δ · [a·cos H + b·sin H]     (büyük çember)
 *   dρ/dt =  ω · [a·cos H + b·sin H] / cos δ     (alan dönmesi)
 */

export const D2R = Math.PI / 180;
export const ARCMIN = D2R / 60;

/** Yıldız günü dönme hızı, yay saniyesi / dakika. */
export const OMEGA_ARCSEC_MIN = (((2 * Math.PI) / 86164.0905) * 60) / D2R * 3600;

/** 1 yay dakikası hata → en fazla bu kadar sürüklenme (yay sn/dk). */
export const DRIFT_PER_ARCMIN = OMEGA_ARCSEC_MIN * ARCMIN;

/**
 * PHD2 / Barrett sabiti: 12/π = 3.8197. Gökyüzünü saatte 15° (ortalama
 * güneş hızı) kabul eder. Yıldız gününe göre tam değer 3.80929'dur.
 */
export const K_PHD2 = 12 / Math.PI;
export const K_SIDEREAL = 3.809289;

/** Barrett Denklem 3 / 13 sabiti. Tam değeri 45018.6. */
export const BARRETT_K = 45000;

/* ------------------------------------------------------------------ */
/* Temel bağıntılar                                                    */
/* ------------------------------------------------------------------ */

export interface ErrorVector {
  a: number;
  b: number;
  epsArcmin: number;
}

/**
 * Yükseklik/azimut hatasını gökyüzü düzlemindeki (a, b) vektörüne
 * çevirir.
 *
 * @param altErr yükseklik hatası, yay dakikası
 * @param azErr azimut hatası (vidada), yay dakikası
 * @param latDeg enlem, derece
 */
export function errorVector(
  altErr: number,
  azErr: number,
  latDeg: number
): ErrorVector {
  const a = altErr * ARCMIN;
  const b = azErr * ARCMIN * Math.cos(latDeg * D2R);
  return { a, b, epsArcmin: Math.hypot(a, b) / ARCMIN };
}

/** Deklinasyon sürüklenmesi [yay sn/dk]. Hedefin deklinasyonundan bağımsız. */
export function decDrift(a: number, b: number, hourAngle: number): number {
  const H = hourAngle * 15 * D2R;
  return OMEGA_ARCSEC_MIN * (a * Math.sin(H) - b * Math.cos(H));
}

/** Sağ açıklık sürüklenmesi (büyük çember) [yay sn/dk]. */
export function raDrift(
  a: number,
  b: number,
  hourAngle: number,
  decDeg: number
): number {
  const H = hourAngle * 15 * D2R;
  return (
    -OMEGA_ARCSEC_MIN *
    Math.sin(decDeg * D2R) *
    (a * Math.cos(H) + b * Math.sin(H))
  );
}

/** Alan dönmesi hızı [yay sn/dk]. Guiding bunu DÜZELTEMEZ. */
export function fieldRotation(
  a: number,
  b: number,
  hourAngle: number,
  decDeg: number
): number {
  const H = hourAngle * 15 * D2R;
  const cd = Math.max(0.02, Math.cos(decDeg * D2R));
  return (OMEGA_ARCSEC_MIN * (a * Math.cos(H) + b * Math.sin(H))) / cd;
}

/**
 * PHD2 Guiding Assistant'ın yaptığı hesap: ölçülen DEC sürüklenmesinden
 * hizalama hatası. `cos δ` bölmesi dahil.
 */
export function errorFromDrift(
  driftArcsecMin: number,
  decDeg: number
): number {
  const cd = Math.max(0.02, Math.cos(decDeg * D2R));
  return (K_PHD2 * Math.abs(driftArcsecMin)) / cd;
}

/** Aynı hesap, `cos δ` olmadan — geometrik olarak doğru olan. */
export function errorFromDriftTrue(driftArcsecMin: number): number {
  return K_SIDEREAL * Math.abs(driftArcsecMin);
}

/* ------------------------------------------------------------------ */
/* Alan dönmesi ve tolerans (Barrett)                                  */
/* ------------------------------------------------------------------ */

/** Barrett Denklem 13 — poz sonunda en uzak köşedeki iz, mikrometre. */
export function trailMicrons(
  errArcmin: number,
  tMin: number,
  flMm: number,
  psiDeg: number,
  decDeg: number
): number {
  const cd = Math.max(0.02, Math.cos(decDeg * D2R));
  return (errArcmin * tMin * flMm * psiDeg) / (BARRETT_K * cd);
}

/** Barrett Denklem 3 — verilen iz toleransı için izin verilen en büyük hata. */
export function maxError(
  tauMicrons: number,
  tMin: number,
  flMm: number,
  psiDeg: number,
  decDeg: number
): number {
  const cd = Math.max(0.02, Math.cos(decDeg * D2R));
  return (BARRETT_K * tauMicrons * cd) / (tMin * flMm * psiDeg);
}

/** Piksel ölçeği [yay sn / piksel]. */
export function pixelScale(pxUm: number, flMm: number): number {
  return (206.265 * pxUm) / flMm;
}

/** Sensörün yarım köşegeninin açısal karşılığı [derece]. */
export function halfDiagDeg(wMm: number, hMm: number, flMm: number): number {
  return Math.atan2(Math.hypot(wMm, hMm) / 2, flMm) / D2R;
}

/** Dönme açısından (yay sn) ve kol uzunluğundan (derece) iz [yay sn]. */
export function trailArcsec(
  rotArcsecPerMin: number,
  tMin: number,
  psiDeg: number
): number {
  return rotArcsecPerMin * tMin * (psiDeg * D2R);
}

/* ------------------------------------------------------------------ */
/* Ekipman ön ayarları                                                 */
/* ------------------------------------------------------------------ */

export interface Sensor {
  id: string;
  ad: string;
  w: number;
  h: number;
  px: number;
}

export const SENSORS: Sensor[] = [
  { id: 'apsc', ad: 'APS-C · IMX571 (ASI2600)', w: 23.5, h: 15.7, px: 3.76 },
  { id: 'imx533', ad: '1″ kare · IMX533 (ASI533)', w: 11.3, h: 11.3, px: 3.76 },
  { id: 'm43', ad: '4/3″ · IMX294 (ASI294)', w: 19.1, h: 13.0, px: 4.63 },
  { id: 'ff', ad: 'Tam kare · IMX455 (ASI6200)', w: 36.0, h: 24.0, px: 3.76 },
  { id: 'imx585', ad: '1.2″ · IMX585 (ASI585)', w: 11.2, h: 6.3, px: 2.9 },
];

export function sensorById(id: string): Sensor {
  return SENSORS.find((s) => s.id === id) || SENSORS[0];
}

export interface Target {
  id: string;
  ad: string;
  dec: number;
}

/** Deklinasyonun etkisini göstermek için gerçek hedefler. */
export const TARGETS: Target[] = [
  { id: 'm42', ad: 'M42 Orion Bulutsusu', dec: -5.4 },
  { id: 'm31', ad: 'M31 Andromeda', dec: 41.3 },
  { id: 'ngc7000', ad: 'NGC 7000 Kuzey Amerika', dec: 44.3 },
  { id: 'm51', ad: 'M51 Girdap Galaksisi', dec: 47.2 },
  { id: 'm101', ad: 'M101 Fırıldak Galaksisi', dec: 54.3 },
  { id: 'ic1396', ad: 'IC 1396 Fil Hortumu', dec: 57.5 },
  { id: 'ngc7023', ad: 'NGC 7023 İris Bulutsusu', dec: 68.2 },
  { id: 'm81', ad: 'M81 / M82', dec: 69.1 },
  { id: 'ngc188', ad: 'NGC 188 (kutba çok yakın)', dec: 85.2 },
];

export function targetById(id: string): Target {
  return TARGETS.find((t) => t.id === id) || TARGETS[7];
}

/* ------------------------------------------------------------------ */
/* Biçimlendirme                                                       */
/* ------------------------------------------------------------------ */

export function fmtErr(arcmin: number): string {
  if (!isFinite(arcmin)) return '—';
  if (arcmin < 1) return Math.round(arcmin * 60) + '″';
  if (arcmin < 10) return arcmin.toFixed(1) + '′';
  return Math.round(arcmin) + '′';
}

/* ------------------------------------------------------------------ */
/* Rastgelelik (deterministik)                                          */
/* ------------------------------------------------------------------ */

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussFrom(rnd: () => number): number {
  let u = 0,
    v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/* PHD2 benzeri guiding izi                                            */
/* ------------------------------------------------------------------ */

export interface TraceOptions {
  n?: number;
  expSec?: number;
  seed?: number;
  seeing?: number;
  minMove?: number;
  aggr?: number;
  lp?: number;
  decRate?: number;
  raRate?: number;
  pe?: number;
  decOsc?: number;
  decOscP?: number;
  guided?: boolean;
  backlash?: number;
  stiction?: number;
}

export interface Trace {
  ra: number[];
  dec: number[];
  corr: number[];
}

/**
 * Yıldızın GERÇEK konumu (sürüklenme + periyodik hata + düzeltmeler) ayrı
 * tutulur; ölçüm buna seeing gürültüsü eklenerek üretilir. PHD2 grafiği
 * düzeltmeden ÖNCEKİ ölçümü çizer, biz de öyle yapıyoruz.
 */
export function makeTrace(o: TraceOptions): Trace {
  const n = o.n || 130;
  const expSec = o.expSec || 2;
  const dt = expSec / 60;
  const rnd = mulberry32(o.seed || 4242);
  const ra: number[] = [],
    dec: number[] = [],
    corr: number[] = [];
  let decTrue = 0,
    raTrue = 0,
    dsm = 0,
    lastDir = 0,
    blDebt = 0;
  const seeing = o.seeing === undefined ? 0.42 : o.seeing;
  const minMove = o.minMove === undefined ? 0.12 : o.minMove;
  const aggr = o.aggr === undefined ? 0.85 : o.aggr;
  const lp = o.lp === undefined ? 0.45 : o.lp;

  for (let i = 0; i < n; i++) {
    const t = i * expSec;
    decTrue += (o.decRate || 0) * dt;
    raTrue += (o.raRate || 0) * dt;
    const pe = (o.pe || 0) * Math.sin((2 * Math.PI * t) / 480);
    const osc =
      (o.decOsc || 0) * Math.sin((2 * Math.PI * t) / (o.decOscP || 100));

    const decMeas = decTrue + osc + gaussFrom(rnd) * seeing;
    const raMeas = raTrue + pe + gaussFrom(rnd) * seeing;

    let c = 0;
    if (o.guided !== false) {
      /* PHD2'nin DEC algoritmaları gürültüyü süzer: düzeltme kararı anlık
         konuma değil, alçak geçiren süzgeçten geçmiş konuma dayanır. */
      dsm = dsm * (1 - lp) + decMeas * lp;
      if (Math.abs(dsm) > minMove) {
        c = -dsm * aggr;
        const dir = c > 0 ? 1 : -1;
        if (o.backlash && dir !== lastDir && lastDir !== 0) blDebt = o.backlash;
        let applied = c;
        if (blDebt > 0) {
          const eat = Math.min(blDebt, Math.abs(applied));
          blDebt -= eat;
          applied = applied - dir * eat;
        }
        if (o.stiction && dir !== lastDir && lastDir !== 0)
          applied *= o.stiction;
        decTrue = Math.max(-9, Math.min(9, decTrue + applied));
        dsm = Math.max(-9, Math.min(9, dsm + applied));
        lastDir = dir;
      }
      raTrue -= (raTrue + pe) * aggr;
    }
    ra.push(raMeas);
    dec.push(decMeas);
    corr.push(c);
  }
  return { ra, dec, corr };
}

/** En küçük kareler eğimi (PHD2'nin eğilim çizgisi). */
export function linFit(arr: number[]): { slope: number; intercept: number } {
  const n = arr.length;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += arr[i];
    sxy += i * arr[i];
    sxx += i * i;
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { slope, intercept: (sy - slope * sx) / n };
}

export function rms(arr: number[]): number {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i] * arr[i];
  return Math.sqrt(s / arr.length);
}
