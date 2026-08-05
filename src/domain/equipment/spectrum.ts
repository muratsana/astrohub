/**
 * SPEKTRAL FİLTRE ALANI — tipler ve saf hesaplar.
 *
 * Filtre veritabanı paketinin taşıdığı ayrım burada da korunuyor ve
 * korunması ZORUNLU: "dual-band" bir PAZARLAMA sözü, "iki emisyon
 * çizgisi" bir ÖLÇÜM, "iki geçiş penceresi" bir başka ölçüm. Üçü aynı
 * üründe farklı sayılar olabilir ve tek alana indirmek, kullanıcının
 * kutunun üstündeki yazıya bakıp yanlış filtre almasına yol açar.
 *
 * Bu dosyada ağ ya da React yok — sunum `features/equipment` altında.
 */

/** Paketin tanıdığı emisyon çizgileri. */
export type SpectralLineCode =
  | 'ha'
  | 'hb'
  | 'oiii'
  | 'sii'
  | 'nii'
  | 'oii'
  | 'heii';

export interface SpectralLine {
  code: SpectralLineCode;
  /** Kısa gösterim — "Hα", "OIII". */
  shortName: string;
  wavelengthNm: number;
}

/**
 * Görünür spektrumda çizgi konumları.
 *
 * Sabit tablo, veritabanından okunan değil: geçiş şeridini çizmek için
 * dalga boyu gerekiyor ve bu değerler fizik sabiti — sürüm sürüm
 * değişmiyorlar. Veritabanındaki `astro_spectral_lines` aynı sayıları
 * taşıyor; oradan okumak, şeridi çizmek için bir ağ isteği beklemek
 * demekti.
 */
export const SPECTRAL_LINES: Record<SpectralLineCode, SpectralLine> = {
  oii: { code: 'oii', shortName: 'OII', wavelengthNm: 372.7 },
  hb: { code: 'hb', shortName: 'Hβ', wavelengthNm: 486.1 },
  oiii: { code: 'oiii', shortName: 'OIII', wavelengthNm: 500.7 },
  heii: { code: 'heii', shortName: 'HeII', wavelengthNm: 468.6 },
  nii: { code: 'nii', shortName: 'NII', wavelengthNm: 658.3 },
  ha: { code: 'ha', shortName: 'Hα', wavelengthNm: 656.3 },
  sii: { code: 'sii', shortName: 'SII', wavelengthNm: 672.4 },
};

export type MarketBandLabel =
  | 'broadband'
  | 'single'
  | 'dual'
  | 'triple'
  | 'quad'
  | 'unknown';

export const marketBandLabels: Record<MarketBandLabel, string> = {
  broadband: 'Geniş bant',
  single: 'Tek çizgi',
  dual: 'Çift bant',
  triple: 'Üç bant',
  quad: 'Dört bant',
  unknown: 'Belirsiz',
};

export type FilterCategoryCode =
  | 'broadband'
  | 'single_line_narrowband'
  | 'dual_band'
  | 'triple_band'
  | 'quad_band';

export const filterCategoryLabels: Record<FilterCategoryCode, string> = {
  broadband: 'Geniş bant',
  single_line_narrowband: 'Tek çizgili dar bant',
  dual_band: 'Çift bant (dual)',
  triple_band: 'Üç bant (triple)',
  quad_band: 'Dört bant (quad)',
};

export interface FilterPassband {
  line: SpectralLineCode;
  /** Bilinmiyorsa null — tahmin ÜRETİLMİYOR. */
  bandwidthNm: number | null;
}

export interface AstroFilterSpec {
  /** `equipment_models.slug` ile aynı — kanonik kayda bağ. */
  slug: string;
  categoryCode: FilterCategoryCode;
  /** Kutunun üstündeki söz. */
  marketBand: MarketBandLabel;
  /** Gerçekten kaç emisyon çizgisi — bilinmiyorsa null. */
  emissionLineCount: number | null;
  /** Fiziksel geçiş penceresi sayısı — bilinmiyorsa null. */
  passWindowCount: number | null;
  bandwidthMinNm: number | null;
  bandwidthMaxNm: number | null;
  fastOpticsProfile: string | null;
  passbands: FilterPassband[];
  isDiscontinued: boolean;
  notes: string | null;
}

/**
 * Pazarlama adı ile ölçüm çelişiyor mu?
 *
 * "Quad-band" diyen ama üç emisyon çizgisi geçiren filtreler var ve bu
 * bir hata değil — üretici dördüncü pencereyi sürekli bir bölge olarak
 * sayıyor olabilir. Arayüz bunu gizlemiyor, işaretliyor: kullanıcı hangi
 * sayının neyi anlattığını görsün.
 *
 * `null` döner = karşılaştıracak veri yok (uydurma bir çelişki üretilmez).
 */
export function bandLabelMismatch(spec: AstroFilterSpec): boolean | null {
  const expected: Partial<Record<MarketBandLabel, number>> = {
    single: 1,
    dual: 2,
    triple: 3,
    quad: 4,
  };
  const beklenen = expected[spec.marketBand];
  if (beklenen === undefined || spec.emissionLineCount === null) return null;
  return spec.emissionLineCount !== beklenen;
}

/** Geçiş bantlarını dalga boyuna göre sıralar — şerit soldan sağa çizilsin. */
export function sortedPassbands(spec: AstroFilterSpec): FilterPassband[] {
  return [...spec.passbands].sort(
    (a, b) => SPECTRAL_LINES[a.line].wavelengthNm - SPECTRAL_LINES[b.line].wavelengthNm
  );
}

/** Şerit için görünür spektrum sınırları (nm). */
export const VISIBLE_RANGE = { min: 360, max: 700 } as const;

/**
 * Dalga boyunu şerit üzerinde 0–1 konumuna çevirir.
 * Aralık dışı değerler kırpılır — 372 nm'lik OII şeridin solunda kaybolmasın.
 */
export function wavelengthPosition(nm: number): number {
  const { min, max } = VISIBLE_RANGE;
  return Math.min(1, Math.max(0, (nm - min) / (max - min)));
}

/**
 * Görünür spektrumda bir dalga boyunun yaklaşık rengi.
 *
 * Kaba bir yaklaşım ve öyle olması yeterli: şeridin işi renk ölçmek değil,
 * "bu filtre kırmızıda mı yeşilde mi geçiriyor" sorusunu bir bakışta
 * cevaplamak. Sayısal doğruluk yanındaki nm etiketinde.
 */
export function wavelengthColor(nm: number): string {
  if (nm < 420) return '#7a5cd0';
  if (nm < 460) return '#4a63d8';
  if (nm < 495) return '#3f9fd0';
  if (nm < 530) return '#3fb87a';
  if (nm < 580) return '#c9c04a';
  if (nm < 620) return '#d98a3a';
  return '#d1524a';
}

/**
 * Bant genişliğini okunur metne çevirir.
 * Tek değer varsa "3 nm", aralık varsa "3–7 nm", yoksa null.
 */
export function bandwidthText(
  min: number | null,
  max: number | null
): string | null {
  if (min === null && max === null) return null;
  if (min !== null && max !== null) {
    return min === max ? `${min} nm` : `${min}–${max} nm`;
  }
  return `${min ?? max} nm`;
}
