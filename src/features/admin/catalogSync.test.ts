import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, chunk, planSync } from './catalogSync';
import {
  brandId,
  brandRows,
  equipmentRow,
  identifierRows,
  parseAngularPair,
  targetRow,
} from '@/domain/catalog/rows';
import { equipment } from '@/features/equipment/data';
import { targets } from '@/features/targets/data';

describe('chunk', () => {
  it('listeyi eşit parçalara böler', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('parça boyutundan kısa listeyi tek parça yapar', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('boş listede boş dizi döner, tek boş parça değil', () => {
    // Boş parça göndermek PostgREST\'te 400 üretir.
    expect(chunk([], 10)).toEqual([]);
  });

  it('sıfır ya da negatif boyutta hata verir', () => {
    // Sonsuz döngüye girmek yerine erken patlamak doğru davranış.
    expect(() => chunk([1, 2], 0)).toThrow();
    expect(() => chunk([1, 2], -1)).toThrow();
  });

  it('varsayılan parça boyutu tanımlı ve pozitif', () => {
    expect(CHUNK_SIZE).toBeGreaterThan(0);
    expect(chunk(Array.from({ length: CHUNK_SIZE + 1 }, (_, i) => i))).toHaveLength(2);
  });
});

describe('planSync', () => {
  it('yazılacak satır sayısını önceden bildirir', () => {
    const plan = planSync();
    expect(plan.steps).toHaveLength(5);
    expect(plan.totalRows).toBe(
      plan.steps.reduce((sum, step) => sum + step.rows, 0)
    );
  });

  it('ekipman ve hedef sayıları katalogla uyuşur', () => {
    const plan = planSync();
    const models = plan.steps.find((s) => s.label === 'Ekipman modelleri');
    const objects = plan.steps.find((s) => s.label === 'Gök cisimleri');
    expect(models?.rows).toBe(equipment.length);
    expect(objects?.rows).toBe(targets.length);
  });
});

describe('brandId', () => {
  it('Türkçe karakterleri ASCII karşılığına indirir', () => {
    expect(brandId('Sky-Watcher')).toBe('sky-watcher');
    expect(brandId('Şahin Optik')).toBe('sahin-optik');
    expect(brandId('Işık Astro')).toBe('isik-astro');
  });

  it('baştaki ve sondaki tireleri temizler', () => {
    expect(brandId('  Player One  ')).toBe('player-one');
  });
});

describe('brandRows', () => {
  it('aynı markayı bir kez üretir', () => {
    const rows = brandRows(equipment);
    const ids = rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('her ekipmanın markası listede', () => {
    const ids = new Set(brandRows(equipment).map((r) => r.id));
    for (const item of equipment) {
      expect(ids.has(brandId(item.brand)), item.brand).toBe(true);
    }
  });
});

describe('equipmentRow', () => {
  it('typed alanları sayıya çevirir, kalanı JSONB\'ye bırakır', () => {
    const model = equipment.find((e) => e.slug === 'sw-esprit-100')!;
    const row = equipmentRow(model);
    expect(row.focal_length_mm).toBe(550);
    expect(row.aperture_mm).toBe(100);
    // "Tip" typed kolon değil; JSONB katmanında kalmalı.
    expect(row.specs['Tip']).toBe('Üçlü APO');
    expect(row.specs['Odak']).toBeUndefined();
  });

  it('notu olmayan modelde boş dizi verir, null değil', () => {
    // Kolon `text[] not null default '{}'`; null göndermek kısıtı ihlal eder.
    const model = equipment.find((e) => !e.notes)!;
    expect(equipmentRow(model).notes).toEqual([]);
  });

  it('kategori kimliği slug ile birebir', () => {
    for (const item of equipment) {
      expect(equipmentRow(item).category_id).toBe(item.category);
    }
  });
});

describe('parseAngularPair', () => {
  it('yay dakikasını olduğu gibi alır', () => {
    expect(parseAngularPair('178′ × 63′')).toEqual({ major: 178, minor: 63 });
  });

  it('dereceyi yay dakikasına çevirir', () => {
    expect(parseAngularPair('3.2° × 1°')).toEqual({ major: 192, minor: 60 });
  });

  it('tek eksende ikinci değeri birinciye eşitler', () => {
    // `null` bırakmak "ölçülmemiş" anlamına gelirdi; dairesel cisimde iki
    // eksen zaten aynı.
    expect(parseAngularPair('20′')).toEqual({ major: 20, minor: 20 });
  });

  it('ölçüsü olmayan kayıtta null döner', () => {
    expect(parseAngularPair('—')).toEqual({ major: null, minor: null });
  });
});

describe('targetRow', () => {
  it('koordinatı dereceye çevirir', () => {
    const target = targets.find((t) => t.slug === 'm31-andromeda')!;
    const row = targetRow(target);
    expect(row.ra_deg).toBeCloseTo(10.68, 1);
    expect(row.dec_deg).toBeCloseTo(41.27, 1);
  });

  it('hareketli hedefte koordinatı null bırakır, sıfır değil', () => {
    const moon = targets.find((t) => t.kind === 'ay')!;
    const row = targetRow(moon);
    expect(row.ra_deg).toBeNull();
    expect(row.dec_deg).toBeNull();
  });

  it('tüm katalog için şema kısıtlarını sağlar', () => {
    for (const target of targets) {
      const row = targetRow(target);
      // celestial_slug_format: ^[a-z0-9-]{2,80}$
      expect(row.slug, row.slug).toMatch(/^[a-z0-9-]{2,80}$/);
      if (row.ra_deg !== null) {
        expect(row.ra_deg, row.slug).toBeGreaterThanOrEqual(0);
        expect(row.ra_deg, row.slug).toBeLessThan(360);
      }
      if (row.dec_deg !== null) {
        expect(row.dec_deg, row.slug).toBeGreaterThanOrEqual(-90);
        expect(row.dec_deg, row.slug).toBeLessThanOrEqual(90);
      }
    }
  });
});

describe('identifierRows', () => {
  it('birincil kodu işaretler', () => {
    const target = targets.find((t) => t.slug === 'm31-andromeda')!;
    const rows = identifierRows(target);
    expect(rows[0]).toEqual({
      slug: 'm31-andromeda',
      code: 'M 31',
      is_primary: true,
    });
    expect(rows.some((r) => r.code === 'NGC 224' && !r.is_primary)).toBe(true);
  });

  it('birincil kod alias listesinde tekrar ediyorsa iki kez yazmaz', () => {
    // `catalog_identifiers` birincil anahtarı (object_id, code); tekrar
    // eden kod tüm parçayı düşürürdü.
    const rows = identifierRows({
      ...targets[0],
      catalog: 'M 1',
      aliases: ['M 1', 'NGC 1952'],
    });
    expect(rows.filter((r) => r.code === 'M 1')).toHaveLength(1);
  });

  it('katalogun tamamında kod tekrarı yok', () => {
    for (const target of targets) {
      const codes = identifierRows(target).map((r) => r.code);
      expect(new Set(codes).size, target.slug).toBe(codes.length);
    }
  });
});
