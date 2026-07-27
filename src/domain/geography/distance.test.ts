import { describe, it, expect } from 'vitest';
import {
  haversineKm,
  formatDistance,
  projectToBox,
  isWithinBounds,
  sortByProximity,
  TURKEY_BOUNDS,
} from './distance';

const istanbul = { latitude: 41.0082, longitude: 28.9784 };
const ankara = { latitude: 39.9334, longitude: 32.8597 };
const van = { latitude: 38.4891, longitude: 43.4089 };

describe('haversine mesafesi', () => {
  it('aynı nokta için sıfırdır', () => {
    expect(haversineKm(istanbul, istanbul)).toBeCloseTo(0, 6);
  });

  it('İstanbul–Ankara mesafesini bilinen değere yakın verir (~350 km)', () => {
    expect(haversineKm(istanbul, ankara)).toBeGreaterThan(340);
    expect(haversineKm(istanbul, ankara)).toBeLessThan(360);
  });

  it('simetriktir', () => {
    expect(haversineKm(istanbul, van)).toBeCloseTo(haversineKm(van, istanbul), 9);
  });

  it('üçgen eşitsizliğini bozmaz', () => {
    const direct = haversineKm(istanbul, van);
    const viaAnkara = haversineKm(istanbul, ankara) + haversineKm(ankara, van);
    expect(direct).toBeLessThanOrEqual(viaAnkara + 1e-6);
  });
});

describe('mesafe biçimlendirme', () => {
  it('bir kilometrenin altını metreye çevirir', () => {
    expect(formatDistance(0.42)).toBe('420 m');
  });

  it('yakın mesafede ondalık gösterir, uzakta yuvarlar', () => {
    expect(formatDistance(4.26)).toBe('4.3 km');
    expect(formatDistance(341.7)).toBe('342 km');
  });

  it('geçersiz değerde tire döner', () => {
    expect(formatDistance(Number.NaN)).toBe('—');
    expect(formatDistance(Infinity)).toBe('—');
  });
});

describe('şematik izdüşüm', () => {
  it('kuzeydeki nokta yukarıda çıkar (y ters çevrilir)', () => {
    const north = projectToBox({ latitude: 42, longitude: 32 });
    const south = projectToBox({ latitude: 36, longitude: 32 });
    expect(north.y).toBeLessThan(south.y);
  });

  it('doğudaki nokta sağda çıkar', () => {
    expect(projectToBox(van).x).toBeGreaterThan(projectToBox(istanbul).x);
  });

  it('sınırların dışını kutuya kırpar', () => {
    const p = projectToBox({ latitude: 60, longitude: 10 });
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('kutu köşelerini 0 ve 1’e eşler', () => {
    const topLeft = projectToBox({
      latitude: TURKEY_BOUNDS.maxLat,
      longitude: TURKEY_BOUNDS.minLon,
    });
    expect(topLeft.x).toBeCloseTo(0, 6);
    expect(topLeft.y).toBeCloseTo(0, 6);
  });

  it('sınır içi/dışı ayrımını yapar', () => {
    expect(isWithinBounds(ankara)).toBe(true);
    expect(isWithinBounds({ latitude: 51.5, longitude: -0.12 })).toBe(false);
  });
});

describe('yakınlık sıralaması', () => {
  const items = [
    { id: 'van', coords: van },
    { id: 'ankara', coords: ankara },
    { id: 'online', coords: undefined },
    { id: 'istanbul', coords: istanbul },
  ];

  it('mesafeye göre artan sıralar', () => {
    const { located } = sortByProximity(items, istanbul, (i) => i.coords);
    expect(located.map((l) => l.item.id)).toEqual(['istanbul', 'ankara', 'van']);
  });

  it('koordinatsız kayıtları ayrı listeye alır', () => {
    const { unlocated } = sortByProximity(items, istanbul, (i) => i.coords);
    expect(unlocated.map((i) => i.id)).toEqual(['online']);
  });

  it('mesafeleri sonuçla birlikte döndürür', () => {
    const { located } = sortByProximity(items, istanbul, (i) => i.coords);
    expect(located[0].distanceKm).toBeCloseTo(0, 6);
    expect(located[1].distanceKm).toBeGreaterThan(300);
  });

  it('boş listede boş sonuç verir', () => {
    const { located, unlocated } = sortByProximity(
      [] as { id: string; coords?: typeof van }[],
      istanbul,
      (i) => i.coords
    );
    expect(located).toHaveLength(0);
    expect(unlocated).toHaveLength(0);
  });
});
