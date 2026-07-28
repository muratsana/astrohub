import type { SupabaseClient } from '@supabase/supabase-js';
import {
  equipment as equipmentSeed,
  type EquipmentCategory,
  type EquipmentModel,
} from '@/features/equipment/data';
import { mergeSpecs } from '@/domain/equipment/specs';
import { isConnectionStandard } from '@/domain/equipment/connections';
import type {
  DataConfidence,
  EquipmentOptics,
  EquipmentSource,
  ProductionStatus,
} from '@/features/equipment/data';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * EKİPMAN KATALOĞU — veritabanı satırından arayüz modeline.
 *
 * Şema iki katmanlı (§9.2): sık filtrelenen alanlar typed kolon, gerisi
 * JSONB. Arayüz ise tek bir `specs` sözlüğü bekliyor. Birleştirme
 * `domain/equipment/specs.ts` içinde ve tersi (metin → kolon) ile aynı
 * dosyada duruyor; ikisi ayrı yerlerde yaşarsa biri değişip diğeri
 * değişmediğinde künye sessizce bozulur. Gidiş-dönüş testi bunu tohum
 * verinin tamamı üzerinde her koşuda doğruluyor.
 */

interface EquipmentRow {
  id: string;
  slug: string;
  model: string;
  category_id: string;
  summary: string | null;
  price_hint: string | null;
  focal_length_mm: number | string | null;
  aperture_mm: number | string | null;
  pixel_size_um: number | string | null;
  payload_capacity_kg: number | string | null;
  weight_kg: number | string | null;
  specs: Record<string, string> | null;
  notes: string[] | null;
  equipment_brands: { name: string } | null;

  /* ── Setup planlayıcısı alanları (0014) ── */
  connection_input: string | null;
  connection_output: string | null;
  clear_aperture_mm: number | string | null;
  image_circle_mm: number | string | null;
  optical_length_mm: number | string | null;
  required_backfocus_mm: number | string | null;
  flange_distance_mm: number | string | null;
  optic_factor: number | string | null;
  filter_thickness_mm: number | string | null;
  prism_size_mm: number | string | null;
  production_status: string | null;
  release_year: number | null;
  discontinued_year: number | null;
  sources: EquipmentSource[] | null;
  verified_at: string | null;
  data_confidence: string | null;
}

/**
 * `numeric` kolonları supabase-js'e **metin** olarak gelir.
 *
 * PostgREST, JavaScript'in çift duyarlıklı sayısında kaybolabilecek
 * değerleri korumak için numeric'i string serileştirir. Doğrudan
 * `row.focal_length_mm` kullanmak `'550'` verir ve `formatTypedSpecs`
 * içinde `'550 mm'` yerine yine `'550 mm'` üretir ama aritmetik yapan her
 * çağrı ("550" + 1 = "5501") sessizce bozulur. Sınırda bir kez çeviriyoruz.
 */
function num(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const PRODUCTION_STATUSES: ProductionStatus[] = [
  'guncel',
  'uretimi-durduruldu',
  'eski-model',
  'bilinmiyor',
];

const CONFIDENCES: DataConfidence[] = [
  'dogrulanmis',
  'tek-kaynak',
  'inceleme-gerekli',
];

/**
 * Bağlantı standardı listede yoksa **atılır**.
 *
 * Serbest metin bir bağlantı ("M48 vidalı") uyumluluk kontrolünde
 * hiçbir şeyle eşleşmez ama alan dolu göründüğü için motor "veri var"
 * sanar ve sessizce "adaptör gerekli" der. Tanımadığımız değeri hiç
 * almamak, motorun dürüstçe "veri yetersiz" demesini sağlıyor.
 */
function asConnection(value: string | null) {
  return value && isConnectionStandard(value) ? value : undefined;
}

/**
 * Optik alanları yalnızca dolu olanlarla kurar.
 *
 * `{ factor: undefined }` ile `undefined` arasındaki fark tohum veriyle
 * gidiş-dönüş testinde ortaya çıkıyor: boş bir nesne, tohumda hiç
 * olmayan bir alanı "var ama boş" hâline getiriyordu.
 */
function opticsOf(row: EquipmentRow): EquipmentOptics | undefined {
  const entries: [keyof EquipmentOptics, number | null][] = [
    ['clearApertureMm', num(row.clear_aperture_mm)],
    ['imageCircleMm', num(row.image_circle_mm)],
    ['opticalLengthMm', num(row.optical_length_mm)],
    ['requiredBackfocusMm', num(row.required_backfocus_mm)],
    ['flangeDistanceMm', num(row.flange_distance_mm)],
    ['factor', num(row.optic_factor)],
    ['filterThicknessMm', num(row.filter_thickness_mm)],
    ['prismSizeMm', num(row.prism_size_mm)],
  ];

  const optics: EquipmentOptics = {};
  let any = false;
  for (const [key, value] of entries) {
    if (value === null) continue;
    optics[key] = value;
    any = true;
  }
  return any ? optics : undefined;
}

export function mapEquipmentRow(row: EquipmentRow): EquipmentModel {
  const input = asConnection(row.connection_input);
  const output = asConnection(row.connection_output);
  const status = PRODUCTION_STATUSES.find((s) => s === row.production_status);
  const confidence = CONFIDENCES.find((c) => c === row.data_confidence);

  return {
    id: row.id,
    slug: row.slug,
    brand: row.equipment_brands?.name ?? '—',
    model: row.model,
    category: row.category_id as EquipmentCategory,
    specs: mergeSpecs(
      {
        apertureMm: num(row.aperture_mm),
        focalLengthMm: num(row.focal_length_mm),
        pixelSizeUm: num(row.pixel_size_um),
        payloadCapacityKg: num(row.payload_capacity_kg),
        weightKg: num(row.weight_kg),
      },
      row.specs
    ),
    priceHint: row.price_hint ?? undefined,
    summary: row.summary ?? undefined,
    notes: row.notes && row.notes.length > 0 ? row.notes : undefined,

    connections: input || output ? { input, output } : undefined,
    optics: opticsOf(row),
    /* 'bilinmiyor' şemanın varsayılanı; tohum veride o alan hiç yok.
       Alanı yazmak, iki kaynağı ayrıştırır ve gidiş-dönüş testini bozar. */
    productionStatus: status && status !== 'bilinmiyor' ? status : undefined,
    releaseYear: row.release_year ?? undefined,
    discontinuedYear: row.discontinued_year ?? undefined,
    sources: row.sources && row.sources.length > 0 ? row.sources : undefined,
    verifiedAt: row.verified_at ?? undefined,
    confidence,
  };
}

async function fetchEquipment(client: SupabaseClient): Promise<EquipmentModel[]> {
  const { data, error } = await client
    .from('equipment_models')
    .select(
      'id, slug, model, category_id, summary, price_hint, focal_length_mm, ' +
        'aperture_mm, pixel_size_um, payload_capacity_kg, weight_kg, ' +
        'specs, notes, equipment_brands(name), ' +
        'connection_input, connection_output, clear_aperture_mm, ' +
        'image_circle_mm, optical_length_mm, required_backfocus_mm, ' +
        'flange_distance_mm, optic_factor, filter_thickness_mm, ' +
        'prism_size_mm, production_status, release_year, discontinued_year, ' +
        'sources, verified_at, data_confidence'
    )
    .order('category_id')
    .order('model');

  if (error) throw new Error(error.message);
  return (data as unknown as EquipmentRow[]).map(mapEquipmentRow);
}

/** Ekipman kataloğu: veritabanı varsa oradan, yoksa tohum diziden. */
export function useEquipmentCatalog(): ContentSelection<EquipmentModel> {
  return useCatalog('ekipman', equipmentSeed, fetchEquipment);
}
