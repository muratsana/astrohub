/**
 * Setup uyumluluk kontrolü (§7.12).
 *
 * Bir astrofotoğraf zincirinin (montür → optik → düzeltici → filtre → kamera →
 * guide) birlikte çalışıp çalışmayacağını **hesaplanabilir** kurallarla
 * denetler. Buradaki her kural sayıya dayanır; "bu tüp bu montüre yakışır mı"
 * gibi zevk soruları bu modülde yoktur.
 *
 * Uyarı seviyeleri bilinçli olarak üç kademelidir:
 *   ok      — sorun yok
 *   warning — çalışır ama ödün var (kullanıcı bilerek seçebilir)
 *   error   — fiziksel olarak kurulamaz ya da sonuç kullanılamaz
 *
 * Sonuçlar React'ten bağımsız düz veridir; arayüz yalnızca biçimlendirir.
 */

import { computeOptics, pixelScale } from '@/domain/astronomy/optics';
import type { OpticsResult } from '@/domain/astronomy/optics';

export type CheckSeverity = 'ok' | 'warning' | 'error';

export interface CompatibilityCheck {
  id: string;
  title: string;
  severity: CheckSeverity;
  /** Ölçülen değerin kısa gösterimi ("14.2 / 20 kg"). */
  value: string;
  /** Kullanıcıya ne yapması gerektiğini söyleyen tek cümle. */
  detail: string;
}

/**
 * Görüntüleme için kullanılabilir montür kapasitesi oranı.
 *
 * Üretici kapasitesi **görsel gözlem** içindir. Astrofotoğrafta rüzgâr,
 * periyodik hata ve dengesizlik aynı yükte guiding'i bozar; sektörde yerleşik
 * pratik nominal kapasitenin %60'ıdır. Bu bir tahmin değil, kabul görmüş bir
 * emniyet payıdır — ama yine de bir kural, fizik yasası değil.
 */
const IMAGING_PAYLOAD_RATIO = 0.6;

/** Backfocus toleransı (mm). ±0.5 mm altı sorunsuz; 2 mm üstü köşe bozulması. */
const BACKFOCUS_OK_MM = 0.5;
const BACKFOCUS_WARN_MM = 2;

/**
 * Filtre optik yolu uzatır: kalınlığın yaklaşık 1/3'ü kadar.
 * (n≈1.5 cam için t × (1 − 1/n) ≈ t/3.)
 */
const FILTER_PATH_FACTOR = 1 / 3;

export interface SetupInput {
  mount: {
    name: string;
    /** Üretici yük kapasitesi, kg (karşı ağırlık hariç). */
    payloadCapacityKg: number;
  };
  optic: {
    name: string;
    focalLength: number; // mm
    aperture: number; // mm
    weightKg: number;
    /** Düzelticinin gerektirdiği backfocus, mm (tipik 55). */
    requiredBackfocusMm: number;
  };
  camera: {
    name: string;
    pixelSize: number; // µm
    sensorWidth: number; // mm
    sensorHeight: number; // mm
    weightKg: number;
    /** Sensöre kadar olan sabit mesafe, mm (flanş + pencere). */
    backfocusMm: number;
  };
  /** Kamera ile düzeltici arasına konan ara halkalar toplamı, mm. */
  spacerMm: number;
  /** Filtre kalınlığı, mm (0 = filtre yok). */
  filterThicknessMm: number;
  /** Guide sistemi — yoksa guide kontrolü atlanır. */
  guide?: {
    name: string;
    focalLength: number; // mm
    pixelSize: number; // µm
  };
  /** Kablo, ısıtıcı, odaklayıcı motoru vb. toplam ek ağırlık, kg. */
  accessoriesKg: number;
  /** Reducer/Barlow çarpanı. */
  reducerFactor: number;
  /** Sahanın tipik seeing değeri, arcsaniye. Örnekleme kararı buna bağlı. */
  seeingArcsec: number;
}

export interface CompatibilityReport {
  checks: CompatibilityCheck[];
  /** En kötü seviye — özet rozetinde kullanılır. */
  verdict: CheckSeverity;
  optics: OpticsResult;
  totalWeightKg: number;
  /** Görüntüleme için kullanılabilir kapasite, kg. */
  usablePayloadKg: number;
  /** Kameranın gerçekleşen optik yolu, mm. */
  achievedBackfocusMm: number;
}

/** İki seviyeden kötü olanı. */
function worse(a: CheckSeverity, b: CheckSeverity): CheckSeverity {
  const order: CheckSeverity[] = ['ok', 'warning', 'error'];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

/* ══════════════════════ Tekil kontroller ══════════════════════ */

/** Montür yük kontrolü — görüntüleme payıyla. */
export function checkPayload(
  payloadCapacityKg: number,
  totalWeightKg: number
): CompatibilityCheck {
  const usable = payloadCapacityKg * IMAGING_PAYLOAD_RATIO;
  const value = `${totalWeightKg.toFixed(1)} / ${usable.toFixed(1)} kg`;

  if (totalWeightKg > payloadCapacityKg) {
    return {
      id: 'payload',
      title: 'Montür yük kapasitesi',
      severity: 'error',
      value,
      detail: `Toplam yük üreticinin nominal kapasitesini (${payloadCapacityKg} kg) aşıyor. Bu setup görsel gözlemde bile güvenli değil.`,
    };
  }
  if (totalWeightKg > usable) {
    return {
      id: 'payload',
      title: 'Montür yük kapasitesi',
      severity: 'warning',
      value,
      detail: `Nominal kapasitenin altında ama görüntüleme payının (%60 → ${usable.toFixed(1)} kg) üstünde. Rüzgârsız gecelerde çalışır; guiding RMS'i yükselir.`,
    };
  }
  return {
    id: 'payload',
    title: 'Montür yük kapasitesi',
    severity: 'ok',
    value,
    detail: 'Yük, görüntüleme için önerilen payın içinde.',
  };
}

/** Backfocus kontrolü — düzelticinin istediği mesafe tutturuluyor mu? */
export function checkBackfocus(
  requiredMm: number,
  cameraBackfocusMm: number,
  spacerMm: number,
  filterThicknessMm: number
): CompatibilityCheck & { achievedMm: number; deltaMm: number } {
  const achieved =
    cameraBackfocusMm + spacerMm + filterThicknessMm * FILTER_PATH_FACTOR;
  const delta = achieved - requiredMm;
  const abs = Math.abs(delta);
  const value = `${achieved.toFixed(2)} / ${requiredMm.toFixed(2)} mm`;
  const direction = delta > 0 ? 'fazla' : 'eksik';
  const fix =
    delta > 0
      ? `${abs.toFixed(2)} mm ara halka çıkarın.`
      : `${abs.toFixed(2)} mm ara halka ekleyin.`;

  const base = { id: 'backfocus', title: 'Backfocus', value, achievedMm: achieved, deltaMm: delta };

  if (abs <= BACKFOCUS_OK_MM) {
    return {
      ...base,
      severity: 'ok',
      detail: 'Optik yol düzelticinin toleransı içinde; köşe yıldızları yuvarlak kalır.',
    };
  }
  if (abs <= BACKFOCUS_WARN_MM) {
    return {
      ...base,
      severity: 'warning',
      detail: `Optik yol ${abs.toFixed(2)} mm ${direction}. Köşelerde hafif uzama görülebilir — ${fix}`,
    };
  }
  return {
    ...base,
    severity: 'error',
    detail: `Optik yol ${abs.toFixed(2)} mm ${direction}; düzeltici bu mesafede çalışmaz, köşe yıldızları belirgin bozulur. ${fix}`,
  };
}

/**
 * Örnekleme kontrolü — seeing'e göre.
 *
 * `optics.samplingVerdict` sabit eşiklerle (1–2″/px) çalışır ve genel bir
 * ilk bakış verir. Burada eşik sahaya bağlanır: ideal aralık seeing/3 ile
 * seeing/2 arasıdır (Nyquist'in pratik karşılığı). Bortle 2 bir yaylada
 * 1.5″ seeing ile şehirdeki 4″ seeing aynı pikselle örneklenemez.
 */
export function checkSampling(
  pixelScaleArcsec: number,
  seeingArcsec: number
): CompatibilityCheck {
  const ideal = { min: seeingArcsec / 3, max: seeingArcsec / 2 };
  const value = `${pixelScaleArcsec.toFixed(2)}″/px`;
  const range = `${ideal.min.toFixed(2)}–${ideal.max.toFixed(2)}″/px`;

  if (pixelScaleArcsec < ideal.min / 1.5) {
    return {
      id: 'sampling',
      title: 'Örnekleme',
      severity: 'warning',
      value,
      detail: `Aşırı örnekleme: ${seeingArcsec.toFixed(1)}″ seeing için ideal aralık ${range}. Detay kazancı yok, poz süresi ve dosya boyutu boşa gidiyor. Reducer veya binning düşünün.`,
    };
  }
  if (pixelScaleArcsec > ideal.max * 2) {
    return {
      id: 'sampling',
      title: 'Örnekleme',
      severity: 'warning',
      value,
      detail: `Yetersiz örnekleme: ideal aralık ${range}. Geniş alan için uygun; küçük hedeflerde yıldızlar kare köşeli görünür.`,
    };
  }
  return {
    id: 'sampling',
    title: 'Örnekleme',
    severity: 'ok',
    value,
    detail: `${seeingArcsec.toFixed(1)}″ seeing için makul aralıkta (ideal ${range}).`,
  };
}

/**
 * Guide sistemi kontrolü.
 *
 * Eski kural "guide odak uzaklığı ana optiğin 1/3'ünden az olmamalı" idi;
 * çok yıldızlı guiding ve alt-piksel merkez bulma bunu gevşetti. Pratik
 * ölçüt guide piksel ölçeğidir: ~5″/px üstünde düzeltmeler kabalaşır.
 */
export function checkGuiding(
  imagingFocalLength: number,
  guideFocalLength: number,
  guidePixelSize: number
): CompatibilityCheck {
  const guideScale = pixelScale(guideFocalLength, guidePixelSize);
  const ratio = imagingFocalLength / guideFocalLength;
  const value = `${guideScale.toFixed(2)}″/px · 1:${ratio.toFixed(1)}`;

  if (guideScale > 8) {
    return {
      id: 'guiding',
      title: 'Guide sistemi',
      severity: 'error',
      value,
      detail: `Guide piksel ölçeği ${guideScale.toFixed(1)}″/px — bu kabalıkta düzeltme uzun odakta işe yaramaz. Daha uzun odaklı guide veya OAG gerekir.`,
    };
  }
  if (guideScale > 5 || ratio > 6) {
    return {
      id: 'guiding',
      title: 'Guide sistemi',
      severity: 'warning',
      value,
      detail: `Guide ölçeği ana optiğe göre kaba (1:${ratio.toFixed(1)}). Çok yıldızlı guiding ile çalışır; diferansiyel esneme riski artar, OAG daha güvenli.`,
    };
  }
  return {
    id: 'guiding',
    title: 'Guide sistemi',
    severity: 'ok',
    value,
    detail: 'Guide ölçeği ana optiğe uygun.',
  };
}

/**
 * Odak oranı ve pozlama uyarısı.
 *
 * f/10 ve üstü tüplerde deep-sky pozları çok uzar; bu bir hata değil ama
 * kullanıcının bilmesi gereken bir ödün.
 */
export function checkFocalRatio(fRatioValue: number | null): CompatibilityCheck {
  if (fRatioValue === null) {
    return {
      id: 'fratio',
      title: 'Odak oranı',
      severity: 'ok',
      value: '—',
      detail: 'Açıklık girilmediği için odak oranı hesaplanmadı.',
    };
  }
  const value = `f/${fRatioValue.toFixed(1)}`;
  if (fRatioValue >= 10) {
    return {
      id: 'fratio',
      title: 'Odak oranı',
      severity: 'warning',
      value,
      detail: 'Yavaş optik: deep-sky hedeflerde aynı sinyal için f/5 bir sisteme göre ~4 kat süre gerekir. Gezegen ve küçük hedefler için uygun.',
    };
  }
  return {
    id: 'fratio',
    title: 'Odak oranı',
    severity: 'ok',
    value,
    detail: 'Deep-sky için verimli aralıkta.',
  };
}

/* ══════════════════════ Tüm zincir ══════════════════════ */

/** Setup'ın tüm uyumluluk kontrollerini çalıştırır. */
export function checkSetup(input: SetupInput): CompatibilityReport {
  const optics = computeOptics(
    { focalLength: input.optic.focalLength, aperture: input.optic.aperture },
    {
      pixelSize: input.camera.pixelSize,
      sensorWidth: input.camera.sensorWidth,
      sensorHeight: input.camera.sensorHeight,
    },
    input.reducerFactor
  );

  const totalWeight =
    input.optic.weightKg +
    input.camera.weightKg +
    input.accessoriesKg +
    (input.guide ? 1.2 : 0); // guide + halkalar için tipik pay

  const payload = checkPayload(input.mount.payloadCapacityKg, totalWeight);
  const backfocus = checkBackfocus(
    input.optic.requiredBackfocusMm,
    input.camera.backfocusMm,
    input.spacerMm,
    input.filterThicknessMm
  );
  const sampling = checkSampling(optics.pixelScale, input.seeingArcsec);
  const focalRatio = checkFocalRatio(optics.fRatio);

  const checks: CompatibilityCheck[] = [payload, backfocus, sampling, focalRatio];

  if (input.guide) {
    checks.push(
      checkGuiding(
        optics.effectiveFocalLength,
        input.guide.focalLength,
        input.guide.pixelSize
      )
    );
  }

  return {
    checks,
    verdict: checks.reduce<CheckSeverity>((acc, c) => worse(acc, c.severity), 'ok'),
    optics,
    totalWeightKg: totalWeight,
    usablePayloadKg: input.mount.payloadCapacityKg * IMAGING_PAYLOAD_RATIO,
    achievedBackfocusMm: backfocus.achievedMm,
  };
}
