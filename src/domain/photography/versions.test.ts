import { describe, it, expect } from 'vitest';
import {
  quotaUnits,
  totalVersions,
  comparePhotos,
  differenceCount,
  versionKindLabels,
  type ComparablePhoto,
} from './versions';
import { MAX_ACTIVE_PHOTOS, canPublishPhoto } from '@/domain/membership/quota';

const base: ComparablePhoto = {
  slug: 'a',
  title: 'A',
  exposures: [{ filter: 'Ha', frames: 30, exposureSeconds: 300 }],
  palette: 'SHO',
  setup: {
    optic: 'Esprit 100',
    camera: 'ASI2600MM',
    mount: 'EQ6-R',
    filters: 'Antlia 3nm',
  },
  bortle: 3,
  capturedAt: '2026-01-10',
};

describe('sürüm kota kuralı (§4.2)', () => {
  it('sürüm sayısı ne olursa olsun fotoğraf bir birim sayılır', () => {
    expect(quotaUnits([1, 4, 7])).toBe(3);
  });

  it('elli fotoğrafın yüz sürümü kotayı aşmaz', () => {
    const counts = Array.from({ length: MAX_ACTIVE_PHOTOS }, () => 2);
    expect(quotaUnits(counts)).toBe(MAX_ACTIVE_PHOTOS);
    expect(
      canPublishPhoto({ activePublished: quotaUnits(counts), drafts: 0 })
    ).toBe(false);
    // Ama 49 fotoğraf × 3 sürüm hâlâ yayın hakkı bırakır.
    const almost = Array.from({ length: MAX_ACTIVE_PHOTOS - 1 }, () => 3);
    expect(
      canPublishPhoto({ activePublished: quotaUnits(almost), drafts: 0 })
    ).toBe(true);
  });

  it('toplam sürüm sayısı ayrı raporlanır ve sürümsüz fotoğrafı bir sayar', () => {
    expect(totalVersions([1, 4, 7])).toBe(12);
    expect(totalVersions([0, 0])).toBe(2);
  });
});

describe('teknik karşılaştırma (§8.1)', () => {
  it('aynı fotoğrafta hiçbir alan farklı çıkmaz', () => {
    const rows = comparePhotos(base, { ...base, slug: 'b' });
    expect(differenceCount(rows)).toBe(0);
  });

  it('entegrasyon farkını yön ve büyüklükle söyler', () => {
    const longer: ComparablePhoto = {
      ...base,
      slug: 'b',
      exposures: [{ filter: 'Ha', frames: 60, exposureSeconds: 300 }],
    };
    const row = comparePhotos(base, longer).find(
      (r) => r.label === 'Toplam entegrasyon'
    )!;

    expect(row.differs).toBe(true);
    expect(row.delta).toContain('B');
    expect(row.delta).toContain('2 sa 30 dk');
  });

  it('düşük Bortle’ı daha karanlık olarak raporlar', () => {
    const city: ComparablePhoto = { ...base, slug: 'b', bortle: 7 };
    const row = comparePhotos(base, city).find(
      (r) => r.label === 'Gökyüzü (Bortle)'
    )!;

    expect(row.differs).toBe(true);
    expect(row.delta).toBe('A 4 basamak daha karanlık');
  });

  it('eksik Bortle değerinde fark cümlesi üretmez', () => {
    const unknown: ComparablePhoto = { ...base, slug: 'b', bortle: undefined };
    const row = comparePhotos(base, unknown).find(
      (r) => r.label === 'Gökyüzü (Bortle)'
    )!;

    expect(row.delta).toBeUndefined();
    expect(row.b).toBe('—');
  });

  it('filtresiz kaydı tire ile gösterir', () => {
    const noFilter: ComparablePhoto = {
      ...base,
      slug: 'b',
      setup: { ...base.setup, filters: undefined },
    };
    const row = comparePhotos(base, noFilter).find((r) => r.label === 'Filtre')!;
    expect(row.b).toBe('—');
    expect(row.differs).toBe(true);
  });

  it('ekipman ve palet farklarını yakalar', () => {
    const other: ComparablePhoto = {
      ...base,
      slug: 'b',
      palette: 'HOO',
      setup: { ...base.setup, camera: 'ASI533MC' },
    };
    const rows = comparePhotos(base, other);

    expect(rows.find((r) => r.label === 'Palet')!.differs).toBe(true);
    expect(rows.find((r) => r.label === 'Kamera')!.differs).toBe(true);
    expect(rows.find((r) => r.label === 'Optik')!.differs).toBe(false);
    expect(differenceCount(rows)).toBe(2);
  });
});

describe('sürüm türleri', () => {
  it('şartnamedeki beş sürüm türünü karşılar', () => {
    expect(Object.keys(versionKindLabels)).toHaveLength(5);
    expect(versionKindLabels['yeni-entegrasyon']).toBe('Yeni entegrasyon');
  });
});
