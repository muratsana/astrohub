import { typedSpecs, remainingSpecs } from '@/domain/equipment/specs';
import { parseRa, parseDec } from '@/domain/astronomy/ephemeris';
import type { EquipmentModel } from '@/features/equipment/data';
import type { CelestialTarget } from '@/features/targets/data';

/**
 * KATALOG SATIRLARI — tohum kaydından veritabanı satırına.
 *
 * Bu eşleme iki yerden çağrılıyor: çevrimdışı SQL üreticisi
 * (`scripts/seed`) ve yönetim panelindeki senkronizasyon. İkisi kendi
 * eşlemesini taşısaydı, bir kolon eklendiğinde biri güncellenip diğeri
 * eskir ve "panelden senkronladım ama alan boş geldi" gibi bulunması zor
 * bir fark doğardı. Hangi alanın hangi kolona gittiğine karar vermek bir
 * biçimlendirme işi değil, şema kuralı — bu yüzden alan katmanında.
 */

/** Marka adından kararlı kimlik: 'Sky-Watcher' → 'sky-watcher'. */
export function brandId(name: string): string {
  return name
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface EquipmentRowValues {
  slug: string;
  brand_id: string;
  category_id: string;
  model: string;
  summary: string | null;
  price_hint: string | null;
  focal_length_mm: number | null;
  aperture_mm: number | null;
  pixel_size_um: number | null;
  sensor_width_mm: number | null;
  sensor_height_mm: number | null;
  payload_capacity_kg: number | null;
  weight_kg: number | null;
  specs: Record<string, string>;
  notes: string[];

  /* ── Setup planlayıcısı alanları (0014) ── */
  connection_input: string | null;
  connection_output: string | null;
  clear_aperture_mm: number | null;
  image_circle_mm: number | null;
  optical_length_mm: number | null;
  required_backfocus_mm: number | null;
  flange_distance_mm: number | null;
  optic_factor: number | null;
  filter_thickness_mm: number | null;
  prism_size_mm: number | null;
  production_status: string;
  release_year: number | null;
  discontinued_year: number | null;
  sources: unknown[];
  verified_at: string | null;
  data_confidence: string | null;
}

export function equipmentRow(item: EquipmentModel): EquipmentRowValues {
  const typed = typedSpecs(item.specs);
  return {
    slug: item.slug,
    brand_id: brandId(item.brand),
    category_id: item.category,
    model: item.model,
    summary: item.summary ?? null,
    price_hint: item.priceHint ?? null,
    focal_length_mm: typed.focalLengthMm,
    aperture_mm: typed.apertureMm,
    pixel_size_um: typed.pixelSizeUm,
    sensor_width_mm: typed.sensorWidthMm,
    sensor_height_mm: typed.sensorHeightMm,
    payload_capacity_kg: typed.payloadCapacityKg,
    weight_kg: typed.weightKg,
    specs: remainingSpecs(item.specs),
    notes: item.notes ?? [],

    connection_input: item.connections?.input ?? null,
    connection_output: item.connections?.output ?? null,
    clear_aperture_mm: item.optics?.clearApertureMm ?? null,
    image_circle_mm: item.optics?.imageCircleMm ?? null,
    optical_length_mm: item.optics?.opticalLengthMm ?? null,
    required_backfocus_mm: item.optics?.requiredBackfocusMm ?? null,
    flange_distance_mm: item.optics?.flangeDistanceMm ?? null,
    optic_factor: item.optics?.factor ?? null,
    filter_thickness_mm: item.optics?.filterThicknessMm ?? null,
    prism_size_mm: item.optics?.prismSizeMm ?? null,
    /* Şema 'bilinmiyor' varsayılanını taşıyor; tohumda alan yoksa aynı
       değeri yazıyoruz ki senkronizasyon eski bir durumu bırakmasın. */
    production_status: item.productionStatus ?? 'bilinmiyor',
    release_year: item.releaseYear ?? null,
    discontinued_year: item.discontinuedYear ?? null,
    sources: item.sources ?? [],
    verified_at: item.verifiedAt ?? null,
    data_confidence: item.confidence ?? null,
  };
}

/** Katalogdaki benzersiz markalar — model satırları yabancı anahtarla bağlı. */
export function brandRows(
  items: EquipmentModel[]
): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const item of items) seen.set(brandId(item.brand), item.brand);
  return [...seen].map(([id, name]) => ({ id, name }));
}

export interface TargetRowValues {
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  constellation: string;
  ra_deg: number | null;
  dec_deg: number | null;
  magnitude: number | null;
  size_major_arcmin: number | null;
  size_minor_arcmin: number | null;
  best_months: string | null;
  difficulty: string | null;
  recommended_focal: string | null;
  recommended_filters: string | null;
  description: string;
}

/**
 * "3.2° × 1.0°" ya da "11′ × 7′" → arcdakika çifti.
 *
 * Derece işareti varsa 60 ile çarpılır. Tek eksenli boyutta ikinci değer
 * birinciye eşitlenir — dairesel cisimde iki eksen zaten aynı ve `null`
 * bırakmak "ölçülmemiş" anlamına gelirdi.
 */
export function parseAngularPair(text: string): {
  major: number | null;
  minor: number | null;
} {
  const matches = [...text.matchAll(/([\d.,]+)\s*([°′'])?/g)]
    .map((m) => ({ value: Number(m[1].replace(',', '.')), unit: m[2] ?? '' }))
    .filter((m) => Number.isFinite(m.value) && m.value > 0);

  if (matches.length === 0) return { major: null, minor: null };
  const toArcmin = (m: { value: number; unit: string }) =>
    m.unit === '°' ? m.value * 60 : m.value;

  const major = toArcmin(matches[0]);
  const minor = matches.length > 1 ? toArcmin(matches[1]) : major;
  return { major: round(major, 2), minor: round(minor, 2) };
}

export function targetRow(target: CelestialTarget): TargetRowValues {
  const size = parseAngularPair(target.angularSize);
  /*
   * Koordinatı olmayan hedeflerde (Ay, gezegenler, meteor yağmurları)
   * `parseRa` NaN döner ve kolona null yazılır. Sıfır yazmak, hepsini
   * gökyüzünde Koç noktasına çivilemek olurdu.
   */
  return {
    slug: target.slug,
    name: target.name,
    catalog: target.catalog,
    kind: target.kind,
    constellation: target.constellation,
    ra_deg: round(parseRa(target.ra), 5),
    dec_deg: round(parseDec(target.dec), 5),
    magnitude: target.magnitude ?? null,
    size_major_arcmin: size.major,
    size_minor_arcmin: size.minor,
    best_months: target.bestMonths,
    difficulty: target.difficulty,
    recommended_focal: target.recommendedFocal,
    recommended_filters: target.recommendedFilters,
    description: target.description,
  };
}

export interface IdentifierRowValues {
  slug: string;
  code: string;
  is_primary: boolean;
}

/**
 * Katalog kodları: birincil kod + alias'lar.
 *
 * Birincil kodu da satır olarak yazıyoruz — arama tek tabloya bakabilsin.
 * `object_id` çağıran tarafta çözülür; bu katman slug'la çalışıyor çünkü
 * UUID'ler yalnızca veritabanında var.
 */
export function identifierRows(target: CelestialTarget): IdentifierRowValues[] {
  const rows: IdentifierRowValues[] = [
    { slug: target.slug, code: target.catalog, is_primary: true },
  ];
  for (const code of target.aliases) {
    if (code === target.catalog) continue;
    rows.push({ slug: target.slug, code, is_primary: false });
  }
  return rows;
}

function round(value: number, digits: number): number | null {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
