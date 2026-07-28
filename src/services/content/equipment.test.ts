import { describe, expect, it } from 'vitest';
import { mapEquipmentRow } from './equipment';
import { equipment } from '@/features/equipment/data';
import { typedSpecs, remainingSpecs } from '@/domain/equipment/specs';

/** Tohum kaydından, veritabanının döndüreceği satırı üretir. */
function rowFor(slug: string, { asText = false } = {}) {
  const seed = equipment.find((e) => e.slug === slug);
  if (!seed) throw new Error(`tohum kaydı yok: ${slug}`);
  const typed = typedSpecs(seed.specs);
  const cast = (v: number | null) =>
    v === null ? null : asText ? String(v) : v;

  return {
    // Gerçek satırda kimlik var; tohum kayıtta yok. Test fikstürü DB
    // satırını taklit ettiği için kimliği burada üretiyoruz.
    id: `id-${seed.slug}`,
    slug: seed.slug,
    model: seed.model,
    category_id: seed.category,
    summary: seed.summary ?? null,
    price_hint: seed.priceHint ?? null,
    focal_length_mm: cast(typed.focalLengthMm),
    aperture_mm: cast(typed.apertureMm),
    pixel_size_um: cast(typed.pixelSizeUm),
    payload_capacity_kg: cast(typed.payloadCapacityKg),
    weight_kg: cast(typed.weightKg),
    specs: remainingSpecs(seed.specs),
    notes: seed.notes ?? null,
    equipment_brands: { name: seed.brand },
  };
}

describe('mapEquipmentRow', () => {
  it('satırı tohum kaydının aynısına çevirir', () => {
    const seed = equipment.find((e) => e.slug === 'sw-esprit-100')!;
    expect(mapEquipmentRow(rowFor('sw-esprit-100'))).toEqual({
      ...seed,
      id: 'id-sw-esprit-100',
    });
  });

  it('numeric kolonlar metin gelse de aynı sonucu verir', () => {
    // PostgREST numeric'i string serileştirir; sınırda çevrilmezse künye bozulur.
    const seed = equipment.find((e) => e.slug === 'zwo-asi2600mm')!;
    expect(mapEquipmentRow(rowFor('zwo-asi2600mm', { asText: true }))).toEqual({
      ...seed,
      id: 'id-zwo-asi2600mm',
    });
  });

  it('tüm tohum kataloğu için gidiş-dönüş korunur', () => {
    for (const seed of equipment) {
      expect(mapEquipmentRow(rowFor(seed.slug))).toEqual({
        ...seed,
        id: `id-${seed.slug}`,
      });
    }
  });

  it('marka bağı kopmuşsa uydurmaz', () => {
    const row = { ...rowFor('sw-eq6r-pro'), equipment_brands: null };
    expect(mapEquipmentRow(row).brand).toBe('—');
  });

  it('boş not dizisini undefined yapar — boş bölüm çizilmesin', () => {
    const row = { ...rowFor('sw-eq6r-pro'), notes: [] };
    expect(mapEquipmentRow(row).notes).toBeUndefined();
  });
});
