/**
 * Mozaik planlama (§7.12).
 *
 * Tek kadraja sığmayan hedefler (Veil, Rosette, North America, M31 kısa odakta
 * değil ama uzun odakta) birden çok panele bölünüp birleştirilir. Bu modül
 * panel sayısını, adım aralığını ve toplam süreyi hesaplar.
 *
 * ÖRTÜŞME NEDEN ZORUNLU: paneller birleştirilirken hizalama için ortak yıldız
 * gerekir ve kadraj kenarları vinyetleme/koma yüzünden en zayıf bölgedir.
 * Pratikte %10–20 örtüşme kullanılır; %0 örtüşme matematiksel olarak mümkün
 * ama montür hatası kadar bir kayma bile panel arasında boşluk bırakır.
 *
 * Tüm açısal değerler **arcdakika** (′). Saf fonksiyonlar; dış servis yok.
 */

/** Örtüşme oranı için üst sınır. %90 üstü panel sayısını anlamsızca patlatır. */
const MAX_OVERLAP = 0.9;

export interface MosaicInput {
  /** Hedefin genişliği, arcdakika. */
  targetWidthArcmin: number;
  /** Hedefin yüksekliği, arcdakika. */
  targetHeightArcmin: number;
  /** Tek karenin genişliği, arcdakika (FOV). */
  frameWidthArcmin: number;
  /** Tek karenin yüksekliği, arcdakika. */
  frameHeightArcmin: number;
  /** Örtüşme oranı 0–0.9 (0.15 = %15). */
  overlap: number;
  /**
   * Kamerayı 90° çevir. Dikdörtgen sensörde kadrajı hedefin uzun eksenine
   * hizalamak panel sayısını çoğu zaman düşürür — bu yüzden ayrı bir seçenek
   * değil, planlayıcının denemesi gereken ikinci senaryo.
   */
  rotate90?: boolean;
}

export interface MosaicPlan {
  /** Yatay panel sayısı. */
  columns: number;
  /** Dikey panel sayısı. */
  rows: number;
  /** Toplam panel sayısı (columns × rows). */
  panels: number;
  /** Paneller arası merkez–merkez adım, arcdakika. */
  stepWidthArcmin: number;
  stepHeightArcmin: number;
  /** Mozaiğin kapsadığı toplam alan, arcdakika. */
  coveredWidthArcmin: number;
  coveredHeightArcmin: number;
  /** Hedefin ötesine taşan pay, arcdakika (kenar boşluğu). */
  marginWidthArcmin: number;
  marginHeightArcmin: number;
  /** Hedef tek kareye zaten sığıyor mu? */
  fitsInSingleFrame: boolean;
  /** Uygulanan kare ölçüleri (rotate90 uygulanmış hâli). */
  effectiveFrameWidthArcmin: number;
  effectiveFrameHeightArcmin: number;
}

/**
 * Bir eksende gereken panel sayısı.
 *
 * Kapsanan alan = kare + (n−1) × adım olduğu için n, hedefi ilk kez örten
 * en küçük tam sayıdır. Kare hedeften büyükse tek panel yeter.
 */
function panelCount(target: number, frame: number, step: number): number {
  if (frame >= target) return 1;
  return Math.ceil((target - frame) / step) + 1;
}

/** Mozaik panel düzenini hesaplar. */
export function planMosaic(input: MosaicInput): MosaicPlan {
  const {
    targetWidthArcmin,
    targetHeightArcmin,
    overlap,
    rotate90 = false,
  } = input;

  if (targetWidthArcmin <= 0 || targetHeightArcmin <= 0) {
    throw new Error('Hedef boyutu pozitif olmalı');
  }
  if (input.frameWidthArcmin <= 0 || input.frameHeightArcmin <= 0) {
    throw new Error('Kare boyutu pozitif olmalı');
  }

  // Kamera 90° çevrildiyse kadrajın kenarları yer değiştirir.
  const frameWidth = rotate90 ? input.frameHeightArcmin : input.frameWidthArcmin;
  const frameHeight = rotate90 ? input.frameWidthArcmin : input.frameHeightArcmin;

  const clampedOverlap = Math.min(Math.max(overlap, 0), MAX_OVERLAP);
  const stepWidth = frameWidth * (1 - clampedOverlap);
  const stepHeight = frameHeight * (1 - clampedOverlap);

  const columns = panelCount(targetWidthArcmin, frameWidth, stepWidth);
  const rows = panelCount(targetHeightArcmin, frameHeight, stepHeight);

  const coveredWidth = frameWidth + (columns - 1) * stepWidth;
  const coveredHeight = frameHeight + (rows - 1) * stepHeight;

  return {
    columns,
    rows,
    panels: columns * rows,
    stepWidthArcmin: stepWidth,
    stepHeightArcmin: stepHeight,
    coveredWidthArcmin: coveredWidth,
    coveredHeightArcmin: coveredHeight,
    marginWidthArcmin: coveredWidth - targetWidthArcmin,
    marginHeightArcmin: coveredHeight - targetHeightArcmin,
    fitsInSingleFrame: columns === 1 && rows === 1,
    effectiveFrameWidthArcmin: frameWidth,
    effectiveFrameHeightArcmin: frameHeight,
  };
}

/**
 * Katalogdaki açısal boyut yazımını arcdakikaya çevirir.
 *
 * Katalog verisi tek biçimli değil: `178' × 63'`, `3.5° × 2°`, `90″`,
 * `11'×9'` hepsi geçerli yazımlar. Tek boyut verilmişse hedef daire kabul
 * edilir (genişlik = yükseklik) — bu, küresel kümeler ve gezegenimsi
 * bulutsular için doğru varsayımdır.
 *
 * Ayrıştırılamayan yazımda `null` döner; çağıran taraf kullanıcıdan elle
 * değer ister. Tahmin üretmek, yanlış panel sayısı vermekten kötüdür.
 */
export function parseAngularSizeArcmin(
  text: string
): { widthArcmin: number; heightArcmin: number } | null {
  // Sayı + birim çiftlerini sırayla topla. Birim yoksa arcdakika varsayılır.
  const matches = [...text.matchAll(/([\d.,]+)\s*([°′'″"]?)/g)]
    .map((m) => ({ value: Number(m[1].replace(',', '.')), unit: m[2] }))
    .filter((m) => Number.isFinite(m.value) && m.value > 0);

  if (matches.length === 0) return null;

  const toArcmin = ({ value, unit }: { value: number; unit: string }) => {
    if (unit === '°') return value * 60;
    if (unit === '″' || unit === '"') return value / 60;
    return value; // ′ ya da birimsiz
  };

  const width = toArcmin(matches[0]);
  const height = matches.length > 1 ? toArcmin(matches[1]) : width;
  return { widthArcmin: width, heightArcmin: height };
}

/**
 * Kadrajı hedefe göre çevirmenin panel sayısını düşürüp düşürmediğini dener
 * ve az panelli olanı döndürür. Eşitlikte çevrilmemiş kadraj tercih edilir —
 * çevirmek montürde ek iş, kazanç yoksa gerek yok.
 */
export function planMosaicBestOrientation(
  input: Omit<MosaicInput, 'rotate90'>
): MosaicPlan {
  const upright = planMosaic({ ...input, rotate90: false });
  const rotated = planMosaic({ ...input, rotate90: true });
  return rotated.panels < upright.panels ? rotated : upright;
}

export interface MosaicTimeInput {
  panels: number;
  /** Tek pozlama süresi, saniye. */
  subExposureSec: number;
  /** Panel başına alınacak poz sayısı. */
  subsPerPanel: number;
  /**
   * Poz başına ek yük (dither bekleme, indirme, otomatik odak payı), saniye.
   * Varsayılan 12 sn: dither + settle tipik olarak bu civarda.
   */
  overheadPerSubSec?: number;
  /** Panel değişimi başına ek yük (slew + plate solve), saniye. */
  overheadPerPanelSec?: number;
}

export interface MosaicTime {
  /** Panel başına net entegrasyon (ek yük hariç), saniye. */
  integrationPerPanelSec: number;
  /** Panel başına toplam (ek yük dâhil), saniye. */
  perPanelSec: number;
  /** Tüm mozaik, saniye. */
  totalSec: number;
  /** Tüm mozaik, saat. */
  totalHours: number;
  /** Net entegrasyonun toplam süreye oranı (0–1). */
  efficiency: number;
}

/** Mozaiğin toplam çekim süresi. */
export function mosaicTime(input: MosaicTimeInput): MosaicTime {
  const {
    panels,
    subExposureSec,
    subsPerPanel,
    overheadPerSubSec = 12,
    overheadPerPanelSec = 90,
  } = input;

  const integrationPerPanel = subExposureSec * subsPerPanel;
  const perPanel =
    integrationPerPanel + overheadPerSubSec * subsPerPanel + overheadPerPanelSec;
  const total = perPanel * panels;

  return {
    integrationPerPanelSec: integrationPerPanel,
    perPanelSec: perPanel,
    totalSec: total,
    totalHours: total / 3600,
    efficiency: total > 0 ? (integrationPerPanel * panels) / total : 0,
  };
}

/**
 * Planın kaç geceye yayılacağı.
 *
 * Kullanılabilir karanlık süresi geceden geceye değişir; burada tek bir
 * ortalama alınır ve **yukarı yuvarlanır** — yarım gece diye bir şey yok,
 * 3.2 gece 4 gece demektir.
 */
export function nightsNeeded(
  totalHours: number,
  usableHoursPerNight: number
): number {
  if (usableHoursPerNight <= 0) return Infinity;
  return Math.ceil(totalHours / usableHoursPerNight);
}
