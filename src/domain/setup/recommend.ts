import type { EquipmentModel } from '@/features/equipment/data';
import { typedSpecs } from '@/domain/equipment/specs';

/**
 * ÖNERİ MOTORU (şartname §17 / denetim maddesi G15).
 *
 * NE YAPAR: eksik ya da sorunlu bir yuva için katalogdan aday sıralar ve
 * her adayın NEDEN önerildiğini yazar.
 *
 * NEDEN "PUAN" DEĞİL DE GEREKÇE ÖNCE: bir öneri listesi tek başına bir
 * otorite iddiasıdır ve kullanıcı neye göre sıralandığını göremezse ya
 * körü körüne uyar ya da tümden yok sayar. Buradaki her aday, kararı
 * veren ölçümü yanında taşıyor: "örnekleme 1.4″/px — seeing 3″ için
 * uygun", "yük payı %38". Puan yalnızca sıralama içindir, ekranda tek
 * başına gösterilmez.
 *
 * VERİSİ OLMAYAN ADAY PUANLANMAZ, ELENİR. Projenin kuralı: eksik veriyi
 * ortalamayla doldurmak, olmayan bir bilgiye güven vermek olur. Piksel
 * boyutu bilinmeyen bir kamerayı "muhtemelen uyar" diye sıralamak tam
 * olarak bu hatadır — o aday `insufficient` listesine düşer ve arayüz
 * "veri eksik" diyerek gösterir.
 *
 * MOTORDAN BAĞIMSIZ: `engine.ts` tam bir setup'ı analiz eder, burası tek
 * bir yuvayı doldurur. Aynı formüller iki yerde tekrarlanmıyor; burada
 * yalnızca sıralama için gereken sadeleştirilmiş büyüklükler var ve
 * hangi sadeleştirmenin yapıldığı her fonksiyonda yazılı.
 */

/** Örnekleme (arcsec/piksel) — 206.265 × piksel(µm) / odak(mm). */
export function pixelScale(pixelSizeUm: number, focalLengthMm: number): number {
  return (206.265 * pixelSizeUm) / focalLengthMm;
}

/**
 * Örnekleme kalitesi, 0–1.
 *
 * İYİ ARALIK seeing/3 ile seeing/2 arası. Bu, yaygın kabul gören
 * Nyquist yaklaşımıdır: 3″ seeing'de 1.0–1.5″/px. Aralığın dışına
 * çıkıldıkça puan doğrusal düşüyor; sert bir eşik "1.51 kötü, 1.49 iyi"
 * gibi anlamsız bir ayrım üretirdi.
 */
export function samplingScore(scale: number, seeingArcsec: number): number {
  const ideal = { min: seeingArcsec / 3, max: seeingArcsec / 2 };
  if (scale >= ideal.min && scale <= ideal.max) return 1;

  const distance =
    scale < ideal.min ? ideal.min - scale : scale - ideal.max;
  /* Ölçek yarım aralık genişliğinde sıfıra iniyor: iki kat uzaktaki bir
     aday hâlâ listede ama açıkça arkada. */
  const tolerance = Math.max(0.35, (ideal.max - ideal.min) * 2);
  return Math.max(0, 1 - distance / tolerance);
}

export type SamplingVerdict = 'yetersiz' | 'uygun' | 'aşırı';

export function samplingVerdict(
  scale: number,
  seeingArcsec: number
): SamplingVerdict {
  if (scale > seeingArcsec / 2) return 'yetersiz'; // az örnekleme
  if (scale < seeingArcsec / 3) return 'aşırı'; // gereksiz büyütme
  return 'uygun';
}

export interface RecommendContext {
  /** Zincirin efektif odak uzunluğu, mm. */
  focalLengthMm?: number;
  /** Optiğin görüntü çemberi, mm — sensörün sığıp sığmadığı buradan. */
  imageCircleMm?: number;
  /** Montür adayları için taşınacak toplam yük, kg. */
  loadKg?: number;
  /** Sahanın tipik seeing değeri, arcsaniye. */
  seeingArcsec: number;
}

export interface Recommendation {
  model: EquipmentModel;
  /** Yalnızca sıralama için — tek başına gösterilmez. */
  score: number;
  /** Kararı veren ölçümler, kullanıcıya gösterilecek biçimde. */
  reasons: string[];
  /** Dikkat çeken ama eleyici olmayan bulgular. */
  warnings: string[];
}

export interface RecommendResult {
  /** Puanı yüksekten düşüğe sıralı adaylar. */
  ranked: Recommendation[];
  /** Verisi yetersiz olduğu için hiç puanlanmayanlar. */
  insufficient: EquipmentModel[];
}

/**
 * Teknik sayılar künyede METİN olarak duruyor ("550 mm", "3.76 µm") ve
 * `typedSpecs` onları ayrıştıran tek yer. Burada yeniden ayrıştırmak,
 * iki farklı "550 mm nedir" tanımı üretirdi.
 */
function numbersOf(model: EquipmentModel) {
  return typedSpecs(model.specs);
}

/**
 * Sensör köşegeni.
 *
 * Ayrıştırılamıyorsa TAHMİN ÜRETİLMİYOR — köşegen bilinmeden vinyetleme
 * kararı verilemez ve "muhtemelen sığar" demek, olmayan bir ölçüme
 * güven vermek olur.
 */
function sensorDiagonalMm(model: EquipmentModel): number | undefined {
  const { sensorWidthMm, sensorHeightMm } = numbersOf(model);
  if (sensorWidthMm === null || sensorHeightMm === null) return undefined;
  return Math.hypot(sensorWidthMm, sensorHeightMm);
}

/**
 * Kamera adaylarını sıralar.
 *
 * Kararı veren iki büyüklük: örnekleme (odak + piksel) ve sensörün
 * görüntü çemberine sığıp sığmadığı. İkisi de ölçülmüş veri gerektirir;
 * piksel boyutu yoksa aday hiç puanlanmaz.
 */
export function recommendCameras(
  candidates: EquipmentModel[],
  context: RecommendContext
): RecommendResult {
  const ranked: Recommendation[] = [];
  const insufficient: EquipmentModel[] = [];

  for (const model of candidates) {
    const pixel = numbersOf(model).pixelSizeUm;
    if (!pixel || !context.focalLengthMm) {
      insufficient.push(model);
      continue;
    }

    const scale = pixelScale(pixel, context.focalLengthMm);
    const verdict = samplingVerdict(scale, context.seeingArcsec);
    let score = samplingScore(scale, context.seeingArcsec);

    const reasons = [
      `Örnekleme ${scale.toFixed(2)}″/px — ${context.seeingArcsec.toFixed(1)}″ seeing için ${verdict}`,
    ];
    const warnings: string[] = [];

    const diagonal = sensorDiagonalMm(model);
    if (diagonal && context.imageCircleMm) {
      if (diagonal <= context.imageCircleMm) {
        reasons.push(
          `Sensör köşegeni ${diagonal.toFixed(1)} mm — ${context.imageCircleMm.toFixed(0)} mm görüntü çemberine sığıyor`
        );
        score += 0.25;
      } else {
        warnings.push(
          `Sensör köşegeni ${diagonal.toFixed(1)} mm, görüntü çemberi ${context.imageCircleMm.toFixed(0)} mm — köşelerde vinyetleme beklenir`
        );
        score -= 0.4;
      }
    } else if (context.imageCircleMm) {
      /* Köşegen bilinmiyorsa PUANA DOKUNULMUYOR ve bu yazılıyor:
         "sığar" demek de "sığmaz" demek de uydurma olurdu. */
      warnings.push('Sensör ölçüsü katalogda yok — vinyetleme kontrol edilemedi');
    }

    ranked.push({ model, score, reasons, warnings });
  }

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, insufficient };
}

/**
 * Montür adaylarını sıralar.
 *
 * FOTOĞRAF YÜKÜ ÜRETİCİ BEYANININ TAMAMI DEĞİL. Görsel gözlem için
 * verilen taşıma kapasitesi uzun pozda tutmuyor; yerleşik pratik kural
 * beyanın yaklaşık %60'ı. Motor da aynı katsayıyı kullanıyor
 * (`engine.ts`), burada tekrar edilmesinin sebebi yalnızca tek bir
 * yuvanın sıralanması — kural değişirse iki yerde birden değişmeli ve
 * bu yüzden sabit adlandırıldı.
 */
export const PHOTO_PAYLOAD_FACTOR = 0.6;

export function recommendMounts(
  candidates: EquipmentModel[],
  context: RecommendContext
): RecommendResult {
  const ranked: Recommendation[] = [];
  const insufficient: EquipmentModel[] = [];

  for (const model of candidates) {
    const declared = numbersOf(model).payloadCapacityKg;
    if (!declared || !context.loadKg) {
      insufficient.push(model);
      continue;
    }

    const usable = declared * PHOTO_PAYLOAD_FACTOR;
    const margin = (usable - context.loadKg) / usable;

    const reasons = [
      `Fotoğraf kapasitesi ${usable.toFixed(1)} kg (beyan ${declared.toFixed(1)} kg × %60)`,
    ];
    const warnings: string[] = [];

    let score: number;
    if (margin < 0) {
      warnings.push(
        `Yük ${context.loadKg.toFixed(1)} kg — kapasiteyi ${Math.abs(usable - context.loadKg).toFixed(1)} kg aşıyor`
      );
      score = margin; // negatif: listede en sona düşer
    } else {
      reasons.push(`Yük payı %${Math.round(margin * 100)}`);
      /*
        AŞIRI PAY DA İDEAL DEĞİL: %40 pay rahat, %80 pay genelde
        gereksiz ağır ve pahalı bir montür demek. Puan %35 civarında
        tepe yapıyor ve iki yana doğru düşüyor.
      */
      score = 1 - Math.abs(margin - 0.35) / 0.65;
      if (margin > 0.7) {
        warnings.push('Kapasite fazlası yüksek — daha hafif bir montür yetebilir');
      }
    }

    ranked.push({ model, score, reasons, warnings });
  }

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, insufficient };
}

/**
 * Optik adaylarını sıralar — kamera belliyken.
 *
 * Aynı örnekleme mantığı ters yönde: piksel sabit, odak değişken.
 */
export function recommendOptics(
  candidates: EquipmentModel[],
  pixelSizeUm: number | undefined,
  context: RecommendContext
): RecommendResult {
  const ranked: Recommendation[] = [];
  const insufficient: EquipmentModel[] = [];

  for (const model of candidates) {
    const focal = numbersOf(model).focalLengthMm;
    if (!focal || !pixelSizeUm) {
      insufficient.push(model);
      continue;
    }

    const scale = pixelScale(pixelSizeUm, focal);
    const verdict = samplingVerdict(scale, context.seeingArcsec);
    const score = samplingScore(scale, context.seeingArcsec);

    const reasons = [
      `${focal.toFixed(0)} mm odakta örnekleme ${scale.toFixed(2)}″/px — ${verdict}`,
    ];
    const warnings: string[] = [];

    const aperture = numbersOf(model).apertureMm;
    if (aperture && focal) {
      reasons.push(`f/${(focal / aperture).toFixed(1)}`);
    }

    ranked.push({ model, score, reasons, warnings });
  }

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, insufficient };
}
