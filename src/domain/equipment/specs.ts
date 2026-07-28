/**
 * EKİPMAN SPEC AYRIŞTIRMA — iki katmanlı şemanın (§9.2) köprüsü.
 *
 * Tohum veride her spec bir **metin**: `{ Açıklık: '100 mm', Odak: '550 mm' }`.
 * Veritabanında ise sık filtrelenen alanlar typed kolon. Aradaki dönüşüm
 * burada, alan katmanında — çünkü "100 mm" metnini sayıya çevirmek bir
 * sunum işi değil, iş kuralı: hangi alanın filtrelenebilir olduğuna karar
 * vermek şemanın kendisidir.
 *
 * Ayrıştırılamayan hiçbir şey **uydurulmaz**: sayı okunamazsa `null` döner
 * ve alan JSONB katmanında metin olarak kalır. Yanlış bir sayı, eksik bir
 * sayıdan kötüdür — filtre onu sessizce yanlış kovaya koyar.
 */

/** Sık filtrelenen alanların typed karşılığı (0008 migration'daki kolonlar). */
export interface TypedSpecs {
  focalLengthMm: number | null;
  apertureMm: number | null;
  pixelSizeUm: number | null;
  sensorWidthMm: number | null;
  sensorHeightMm: number | null;
  payloadCapacityKg: number | null;
  weightKg: number | null;
}

/**
 * Metnin başındaki ölçüyü sayıya çevirir: `'100 mm'` → `100`.
 *
 * Ondalık ayırıcı hem nokta hem virgül olabilir; Türkçe metinlerde "3,76"
 * yazımı yaygın. Birim yok sayılır çünkü hangi birimde olduğunu **kolon
 * adı** söylüyor (`pixel_size_um`); metinden birim okuyup dönüştürmek,
 * yazım hatası olan tek bir kayıtta bin kat sapma üretir.
 */
export function parseMeasure(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = /^\s*([-+]?\d+(?:[.,]\d+)?)/.exec(value);
  if (!match) return null;
  const parsed = Number(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** `'6248×4176'` → `{ width: 6248, height: 4176 }`. `x` ve `X` de kabul edilir. */
export function parseResolution(
  value: string | undefined | null
): { width: number; height: number } | null {
  if (!value) return null;
  const match = /^\s*(\d+)\s*[×xX*]\s*(\d+)/.exec(value);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
}

/**
 * Sensör boyutu piksel sayısı × piksel boyutundan **türetilir**, ölçülmez.
 *
 * Üretici kataloğunda ikisi de yazılıdır ama biz yalnızca çözünürlük ve
 * piksel boyutunu tutuyoruz; ikisi varken üçüncüsünü ayrıca saklamak,
 * birbirini tutmayan iki kayıt riskini davet eder. Türetme kaybı yok:
 * çarpım tanım gereği tam.
 */
export function sensorSizeMm(
  resolution: string | undefined | null,
  pixelSizeUm: number | null
): { widthMm: number; heightMm: number } | null {
  const res = parseResolution(resolution);
  if (!res || pixelSizeUm === null) return null;
  return {
    widthMm: round2((res.width * pixelSizeUm) / 1000),
    heightMm: round2((res.height * pixelSizeUm) / 1000),
  };
}

/**
 * Typed kolonlara girecek alanları çıkarır.
 *
 * Anahtarlar tohum verinin Türkçe etiketleridir; eşleme tablosu burada
 * açıkça duruyor ki yeni bir etiket eklendiğinde sessizce düşmesin —
 * `remainingSpecs` onu JSONB'ye taşır ve veri kaybolmaz.
 */
export function typedSpecs(specs: Record<string, string>): TypedSpecs {
  const pixelSizeUm = parseMeasure(specs['Piksel']);
  const sensor = sensorSizeMm(specs['Çözünürlük'], pixelSizeUm);

  return {
    focalLengthMm: parseMeasure(specs['Odak']),
    apertureMm: parseMeasure(specs['Açıklık']),
    pixelSizeUm,
    sensorWidthMm: sensor?.widthMm ?? null,
    sensorHeightMm: sensor?.heightMm ?? null,
    payloadCapacityKg: parseMeasure(specs['Yük kapasitesi']),
    weightKg: parseMeasure(specs['Ağırlık']),
  };
}

/** Typed kolona giden anahtarlar — JSONB katmanından çıkarılırlar. */
const TYPED_KEYS = new Set([
  'Odak',
  'Açıklık',
  'Piksel',
  'Yük kapasitesi',
  'Ağırlık',
]);

/**
 * JSONB katmanına kalanlar.
 *
 * `Çözünürlük` **kasten kalıyor**: sensör boyutu ondan türetilse de
 * çözünürlük başlı başına gösterilen bir bilgi ("6248×4176") ve typed
 * kolonu yok. Türetilmiş değeri sakladık diye kaynağı atmak, kullanıcıya
 * gösterecek metni kaybetmek olurdu.
 */
export function remainingSpecs(
  specs: Record<string, string>
): Record<string, string> {
  const rest: Record<string, string> = {};
  for (const [key, value] of Object.entries(specs)) {
    if (!TYPED_KEYS.has(key)) rest[key] = value;
  }
  return rest;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
