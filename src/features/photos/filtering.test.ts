import { describe, it, expect } from 'vitest';
import { filterPhotos, defaultFilters, availableCities } from './filtering';
import { photos } from './data';

describe('galeri filtreleme (§7.2)', () => {
  it('varsayılan filtrede tümünü yeni→eski sıralar', () => {
    const result = filterPhotos(photos, defaultFilters);
    expect(result).toHaveLength(photos.length);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].capturedAt >= result[i].capturedAt).toBe(true);
    }
  });

  it('metin aramasını başlık/hedef/katalog/kullanıcıda yapar', () => {
    const byCatalog = filterPhotos(photos, { ...defaultFilters, search: 'ngc 7000' });
    expect(byCatalog.map((p) => p.slug)).toEqual(['ngc7000-kuzey-amerika-hoo']);

    const byUser = filterPhotos(photos, { ...defaultFilters, search: 'mert' });
    expect(byUser.map((p) => p.slug)).toEqual(['m31-andromeda-lrgb']);
  });

  it('Türkçe büyük İ aramasında da eşleşir', () => {
    // "JÜPİTER" → trLower ile "jüpiter"
    const result = filterPhotos(photos, { ...defaultFilters, search: 'JÜPİTER' });
    expect(result.map((p) => p.slug)).toEqual(['jupiter-buyuk-kirmizi-leke']);
  });

  it('tür ve palet filtresi uygular', () => {
    const sho = filterPhotos(photos, { ...defaultFilters, palette: 'SHO' });
    expect(sho.every((p) => p.palette === 'SHO')).toBe(true);
    expect(sho.length).toBeGreaterThan(0);

    const ay = filterPhotos(photos, { ...defaultFilters, type: 'ay' });
    expect(ay.map((p) => p.slug)).toEqual(['ay-kopernik-krateri']);
  });

  it('popüler sıralama beğeniye göre azalan', () => {
    const result = filterPhotos(photos, { ...defaultFilters, sort: 'populer' });
    expect(result[0].likes).toBeGreaterThanOrEqual(result[1].likes);
  });

  it('editör seçimi önce editorsPick olanları getirir', () => {
    const result = filterPhotos(photos, { ...defaultFilters, sort: 'editor' });
    expect(result[0].editorsPick).toBe(true);
  });

  it('şehir listesini benzersiz ve sıralı üretir', () => {
    const cities = availableCities(photos);
    expect(new Set(cities).size).toBe(cities.length);
    expect(cities).toContain('Antalya');
  });
});
