/**
 * Astrofotoğraf optik hesapları (§7.12, §14.2). Tümü deterministik ve yerel;
 * dış servise bağımlı değildir. İş kuralları React'ten ayrı domain katmanında
 * tutulur (§12.5) ve birim testleriyle doğrulanır (§17.1).
 *
 * Birimler:
 *  - odak uzaklığı (focalLength): mm
 *  - açıklık (aperture): mm
 *  - piksel boyutu (pixelSize): mikron (µm)
 *  - sensör boyutu (sensorWidth/Height): mm
 */

/** 1 radyan = 206.265 arcsaniye; µm/mm ölçek çarpanıyla sadeleşir. */
const ARCSEC_PER_RAD = 206_265;

export interface Optic {
  focalLength: number; // mm
  aperture?: number; // mm (f-oranı için)
}

export interface Camera {
  pixelSize: number; // µm
  sensorWidth: number; // mm
  sensorHeight: number; // mm
  /** Opsiyonel: çözünürlük (px). Verilmezse sensör/piksel oranından türetilir. */
  resolutionX?: number;
  resolutionY?: number;
}

/**
 * Reducer/flattener veya Barlow uygulanmış efektif odak uzaklığı.
 * factor < 1 küçültür (reducer), > 1 büyütür (Barlow).
 */
export function effectiveFocalLength(focalLength: number, factor = 1): number {
  return focalLength * factor;
}

/** Odak oranı (f/). Açıklık verilmemişse null. */
export function fRatio(focalLength: number, aperture?: number): number | null {
  if (!aperture || aperture <= 0) return null;
  return focalLength / aperture;
}

/**
 * Piksel ölçeği (arcsaniye/piksel).
 * formül: 206.265 × pixelSize(µm) / focalLength(mm)
 */
export function pixelScale(focalLength: number, pixelSize: number): number {
  if (focalLength <= 0) throw new Error('Odak uzaklığı pozitif olmalı');
  return (ARCSEC_PER_RAD * pixelSize) / (focalLength * 1000);
}

export interface FieldOfView {
  widthDeg: number;
  heightDeg: number;
  widthArcmin: number;
  heightArcmin: number;
}

/**
 * Görüş alanı (FOV). Küçük açı yaklaşımı yerine gerçek arctan formülü:
 * FOV = 2 × atan(sensor / (2 × focalLength))
 */
export function fieldOfView(
  focalLength: number,
  sensorWidth: number,
  sensorHeight: number
): FieldOfView {
  if (focalLength <= 0) throw new Error('Odak uzaklığı pozitif olmalı');
  const angle = (dim: number) =>
    2 * Math.atan(dim / (2 * focalLength)) * (180 / Math.PI);
  const widthDeg = angle(sensorWidth);
  const heightDeg = angle(sensorHeight);
  return {
    widthDeg,
    heightDeg,
    widthArcmin: widthDeg * 60,
    heightArcmin: heightDeg * 60,
  };
}

export type SamplingCategory = 'oversampled' | 'optimal' | 'undersampled';

export interface SamplingVerdict {
  category: SamplingCategory;
  label: string;
  hint: string;
}

/**
 * Piksel ölçeğine göre örnekleme değerlendirmesi. Tipik gökyüzü koşulları
 * (seeing ~2–4") baz alınır; kesin eşik seeing'e bağlıdır (UI'da not düşülür).
 *  - < 1.0"/px  : aşırı örnekleme (oversampling)
 *  - 1.0–2.0"/px: ideal aralık
 *  - > 2.0"/px  : yetersiz örnekleme (undersampling)
 */
export function samplingVerdict(pixelScaleArcsec: number): SamplingVerdict {
  if (pixelScaleArcsec < 1.0) {
    return {
      category: 'oversampled',
      label: 'Aşırı örnekleme',
      hint: 'Piksel ölçeği düşük; iyi seeing veya guiding gerekir, çözünürlük kazancı sınırlı olabilir.',
    };
  }
  if (pixelScaleArcsec <= 2.0) {
    return {
      category: 'optimal',
      label: 'İdeal aralık',
      hint: 'Tipik gökyüzü koşulları için dengeli örnekleme (deep-sky için önerilir).',
    };
  }
  return {
    category: 'undersampled',
    label: 'Yetersiz örnekleme',
    hint: 'Geniş alan için uygun; küçük hedeflerde detay sınırlı kalır.',
  };
}

export interface OpticsResult {
  effectiveFocalLength: number;
  fRatio: number | null;
  pixelScale: number;
  fov: FieldOfView;
  sampling: SamplingVerdict;
  /** Çözünürlük (px) — verilmişse doğrudan, değilse türetilmiş. */
  resolutionX: number;
  resolutionY: number;
}

/** Tüm setup zinciri hesabını tek çağrıda üretir. */
export function computeOptics(
  optic: Optic,
  camera: Camera,
  reducerFactor = 1
): OpticsResult {
  const efl = effectiveFocalLength(optic.focalLength, reducerFactor);
  const scale = pixelScale(efl, camera.pixelSize);
  const fov = fieldOfView(efl, camera.sensorWidth, camera.sensorHeight);

  // Çözünürlük verilmemişse sensör boyutu / piksel boyutundan türet.
  const derivedX = Math.round((camera.sensorWidth * 1000) / camera.pixelSize);
  const derivedY = Math.round((camera.sensorHeight * 1000) / camera.pixelSize);

  return {
    effectiveFocalLength: efl,
    fRatio: fRatio(efl, optic.aperture),
    pixelScale: scale,
    fov,
    sampling: samplingVerdict(scale),
    resolutionX: camera.resolutionX ?? derivedX,
    resolutionY: camera.resolutionY ?? derivedY,
  };
}
