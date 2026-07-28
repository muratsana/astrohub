import { describe, it, expect } from 'vitest';
import {
  bortleScale,
  typicalSqm,
  brightnessRatio,
  integrationAdvantage,
  bortleForSqm,
  clampBortle,
  compareSky,
  type BortleClass,
} from './skyQuality';

describe('Bortle ölçeği', () => {
  it('dokuz sınıfın hepsi tanımlı', () => {
    expect(Object.keys(bortleScale)).toHaveLength(9);
  });

  it('sınıf numarası büyüdükçe gökyüzü aydınlanır (SQM düşer)', () => {
    for (let i = 1; i < 9; i++) {
      const darker = bortleScale[i as BortleClass];
      const brighter = bortleScale[(i + 1) as BortleClass];
      expect(darker.sqmRange[0]).toBeGreaterThanOrEqual(brighter.sqmRange[1]);
    }
  });

  it('her sınıfın aralığı artan sırada', () => {
    for (const info of Object.values(bortleScale)) {
      expect(info.sqmRange[0]).toBeLessThan(info.sqmRange[1]);
    }
  });

  it('tipik SQM aralığın ortasıdır', () => {
    expect(typicalSqm(3)).toBeCloseTo(21.45, 5);
  });
});

describe('parlaklık oranı', () => {
  it('5 kadir farkı tam 100 kattır', () => {
    expect(brightnessRatio(22, 17)).toBeCloseTo(100, 6);
  });

  it('2.5 kadir farkı 10 kattır', () => {
    expect(brightnessRatio(21.5, 19)).toBeCloseTo(10, 6);
  });

  it('aynı değerde oran birdir', () => {
    expect(brightnessRatio(21, 21)).toBeCloseTo(1, 9);
  });

  it('ters çevrildiğinde oran tersine döner', () => {
    expect(brightnessRatio(19, 21.5)).toBeCloseTo(0.1, 6);
  });
});

describe('süre kazancı', () => {
  it('fon oranıyla aynıdır — fon sınırlı çekim varsayımı', () => {
    expect(integrationAdvantage(21.5, 19)).toBeCloseTo(
      brightnessRatio(21.5, 19),
      9
    );
  });
});

describe('SQM’den Bortle', () => {
  it('aralık içindeki değeri doğru sınıfa koyar', () => {
    expect(bortleForSqm(21.65)).toBe(2);
    expect(bortleForSqm(21.4)).toBe(3);
    expect(bortleForSqm(18.2)).toBe(7);
  });

  it('ölçek dışındaki uç değerleri en yakın sınıfa çeker', () => {
    expect(bortleForSqm(23)).toBe(1);
    expect(bortleForSqm(15)).toBe(9);
  });
});

describe('Bortle kırpma', () => {
  it('geçerli aralığın dışını sınırlara çeker', () => {
    expect(clampBortle(0)).toBe(1);
    expect(clampBortle(12)).toBe(9);
    expect(clampBortle(4.4)).toBe(4);
    expect(clampBortle(4.6)).toBe(5);
  });
});

describe('gökyüzü karşılaştırması', () => {
  it('anlamlı farkı oran ve süreyle özetler', () => {
    const result = compareSky(21.6, 18.5);
    expect(result.magnitudeDelta).toBeCloseTo(3.1, 6);
    expect(result.ratio).toBeGreaterThan(17);
    expect(result.timeAdvantage).toBeCloseTo(result.ratio, 9);
    expect(result.summary).toContain('kat daha sönük');
  });

  it('fark yok denecek kadar küçükse bunu söyler', () => {
    expect(compareSky(21.0, 21.0).summary).toContain('kayda değer fark yok');
    expect(compareSky(21.02, 21.0).summary).toContain('kayda değer fark yok');
  });
});
