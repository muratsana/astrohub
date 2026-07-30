import { describe, expect, it } from 'vitest';
import { nearestIndex, parseMeteoblue, type MeteoblueRaw } from './meteoblue';

const NOW = new Date('2026-07-28T21:00:00Z');
const UPPER = { wind200hPa: 120, wind500hPa: 45 };

function raw(over: Partial<MeteoblueRaw> = {}): MeteoblueRaw {
  return {
    basic: {
      data_1h: {
        time: ['2026-07-28 20:00', '2026-07-28 21:00', '2026-07-28 22:00'],
        temperature: [22, 20, 18],
        relativehumidity: [55, 62, 70],
        windspeed: [8, 6, 5],
      },
    },
    clouds: {
      data_1h: {
        time: ['2026-07-28 20:00', '2026-07-28 21:00', '2026-07-28 22:00'],
        totalcloudcover: [40, 25, 10],
        lowclouds: [5, 0, 0],
        midclouds: [10, 5, 0],
        highclouds: [30, 20, 10],
        visibility: [24000, 30000, 35000],
      },
    },
    ...over,
  };
}

describe('nearestIndex', () => {
  it('şu ana en yakın saati seçer', () => {
    expect(
      nearestIndex(
        ['2026-07-28 20:00', '2026-07-28 21:00', '2026-07-28 22:00'],
        NOW
      )
    ).toBe(1);
  });

  it('boş dizide -1 döner', () => {
    expect(nearestIndex([], NOW)).toBe(-1);
  });

  it('damgaları UTC okur', () => {
    // Vekil `tz=UTC` istiyor. Damgayı yerel saat sayarsak tarayıcı saat
    // dilimine göre yanlış saati seçer ve panel komşu saatin havasını
    // gösterir — sessiz ve fark edilmesi zor bir hata.
    const i = nearestIndex(['2026-07-28 18:00', '2026-07-28 21:00'], NOW);
    expect(i).toBe(1);
  });
});

describe('parseMeteoblue', () => {
  it('bulut katmanlarını ayrı ayrı taşır', () => {
    const result = parseMeteoblue(raw(), NOW, UPPER)!;
    expect(result.cloudCover).toBe(25);
    expect(result.layers).toEqual({
      low: 0,
      mid: 5,
      high: 20,
      // 30 000 m → 30 km
      visibilityKm: 30,
    });
  });

  it('çiy noktasını sıcaklık ve nemden hesaplar', () => {
    // meteoblue çiy noktasını doğrudan vermiyor; 20 °C / %62 → ~12.7 °C.
    const result = parseMeteoblue(raw(), NOW, UPPER)!;
    expect(result.dewPoint).toBeCloseTo(12.7, 0);
    expect(result.dewPoint).toBeLessThan(result.temperature);
  });

  it('kaynağı meteoblue olarak işaretler', () => {
    expect(parseMeteoblue(raw(), NOW, UPPER)!.source).toBe('meteoblue');
  });

  it('seeing için üst atmosfer rüzgârını kullanır', () => {
    // Seeing meteoblue'dan gelmiyor; jet akımı Open-Meteo'dan. Güçlü jet
    // kötü seeing demek — indeks yükselmeli.
    const calm = parseMeteoblue(raw(), NOW, { wind200hPa: 20, wind500hPa: 10 })!;
    const jet = parseMeteoblue(raw(), NOW, { wind200hPa: 200, wind500hPa: 100 })!;
    expect(jet.seeing!.index).toBeGreaterThan(calm.seeing!.index);
  });

  it('üst atmosfer verisi yoksa seeing üretmez, okumayı korur', () => {
    // Eski davranış eksik rüzgârı 0 sayıp yapay "mükemmel seeing"
    // basıyordu (QA ASTRO-03). Bulut verisi hâlâ değerli; yalnızca
    // üretemediğimiz alan boş kalıyor.
    const result = parseMeteoblue(raw(), NOW, null)!;
    expect(result).not.toBeNull();
    expect(result.seeing).toBeNull();
    expect(result.cloudCover).not.toBeNull();
  });

  it('yer rüzgârı eksikse okumayı reddeder', () => {
    const missing = raw();
    delete missing.basic!.data_1h!.windspeed;
    expect(parseMeteoblue(missing, NOW, UPPER)).toBeNull();
  });

  it('zorunlu alan eksikse tüm yanıtı reddeder', () => {
    // Yarım bir panel boş panelden yanıltıcı: kullanıcı eksik hücreyi
    // görmezden gelip diğerlerine güvenir.
    const missing = raw();
    delete missing.basic!.data_1h!.temperature;
    expect(parseMeteoblue(missing, NOW, UPPER)).toBeNull();
  });

  it('bulut örtüsü hiç gelmezse reddeder', () => {
    const noCloud = raw({ clouds: { data_1h: { time: ['2026-07-28 21:00'] } } });
    expect(parseMeteoblue(noCloud, NOW, UPPER)).toBeNull();
  });

  it('katmanlar eksikse toplamı korur, katmanı null bırakır', () => {
    // Eksik katmanı sıfır saymak "o yükseklikte bulut yok" demek olurdu.
    const partial = raw();
    delete partial.clouds!.data_1h!.midclouds;
    const result = parseMeteoblue(partial, NOW, UPPER)!;
    expect(result.cloudCover).toBe(25);
    expect(result.layers).toBeNull();
  });

  it('boş yanıtta null döner', () => {
    expect(parseMeteoblue({}, NOW, UPPER)).toBeNull();
  });
});
