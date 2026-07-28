import type { SupabaseClient } from '@supabase/supabase-js';
import {
  equipment as equipmentSeed,
  type EquipmentCategory,
  type EquipmentModel,
} from '@/features/equipment/data';
import { mergeSpecs } from '@/domain/equipment/specs';
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

export function mapEquipmentRow(row: EquipmentRow): EquipmentModel {
  return {
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
  };
}

async function fetchEquipment(client: SupabaseClient): Promise<EquipmentModel[]> {
  const { data, error } = await client
    .from('equipment_models')
    .select(
      'slug, model, category_id, summary, price_hint, focal_length_mm, ' +
        'aperture_mm, pixel_size_um, payload_capacity_kg, weight_kg, ' +
        'specs, notes, equipment_brands(name)'
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
