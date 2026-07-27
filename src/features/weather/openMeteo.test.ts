import { describe, it, expect } from 'vitest';
import {
  nearestHourIndex,
  parseSkyConditions,
  skyConditionsUrl,
  dewRisk,
} from './openMeteo';

describe('skyConditionsUrl', () => {
  it('basınç seviyesi rüzgârlarını ister', () => {
    // Seeing tahmini bu iki alan olmadan yapılamaz; istekten düşerlerse
    // seeing sessizce 1 (mükemmel) görünür — bu yüzden test ediliyor.
    const url = skyConditionsUrl(41.0, 29.0);
    expect(url).toContain('wind_speed_200hPa');
    expect(url).toContain('wind_speed_500hPa');
  });

  it('koordinatı üç ondalığa yuvarlar', () => {
    // ~100 m çözünürlük hava için fazlasıyla yeter; tam koordinatı
    // göndermemek gereksiz konum paylaşımını azaltır.
    const url = skyConditionsUrl(41.0082123, 28.9783456);
    expect(url).toContain('latitude=41.008');
    expect(url).toContain('longitude=28.978');
    expect(url).not.toContain('41.0082123');
  });
});

describe('nearestHourIndex', () => {
  const times = [
    '2026-07-27T20:00',
    '2026-07-27T21:00',
    '2026-07-27T22:00',
    '2026-07-27T23:00',
  ];

  it('en yakın saati seçer', () => {
    expect(nearestHourIndex(times, new Date('2026-07-27T21:40'))).toBe(2);
    expect(nearestHourIndex(times, new Date('2026-07-27T21:10'))).toBe(1);
  });

  it('aralığın dışında uçtaki saate düşer', () => {
    expect(nearestHourIndex(times, new Date('2026-07-27T03:00'))).toBe(0);
    expect(nearestHourIndex(times, new Date('2026-07-28T09:00'))).toBe(3);
  });

  it('boş dizide -1 döner', () => {
    expect(nearestHourIndex([], new Date())).toBe(-1);
  });
});

describe('parseSkyConditions', () => {
  const raw = {
    hourly: {
      time: ['2026-07-27T21:00', '2026-07-27T22:00'],
      cloud_cover: [10, 80],
      relative_humidity_2m: [60, 90],
      temperature_2m: [18, 15],
      dew_point_2m: [10, 14],
      wind_speed_10m: [8, 20],
      wind_speed_500hPa: [30, 60],
      wind_speed_200hPa: [50, 150],
    },
  };

  it('şu ana en yakın saatin değerlerini çıkarır', () => {
    const result = parseSkyConditions(raw, new Date('2026-07-27T21:05'))!;
    expect(result.cloudCover).toBe(10);
    expect(result.temperature).toBe(18);
    expect(result.dewPoint).toBe(10);
    expect(result.seeing.index).toBeGreaterThanOrEqual(1);
  });

  it('saat ilerleyince diğer satıra geçer', () => {
    const result = parseSkyConditions(raw, new Date('2026-07-27T22:10'))!;
    expect(result.cloudCover).toBe(80);
  });

  it('boş yanıtta null döner', () => {
    expect(parseSkyConditions({}, new Date())).toBeNull();
    expect(parseSkyConditions({ hourly: { time: [] } }, new Date())).toBeNull();
  });

  it('eksik alanlarda çökmez', () => {
    // Open-Meteo tek tek saatler için null döndürebilir; bu durumda
    // sayfanın patlaması kabul edilemez.
    const sparse = {
      hourly: {
        time: ['2026-07-27T21:00'],
        cloud_cover: [null],
        temperature_2m: [null],
      },
    };
    const result = parseSkyConditions(sparse, new Date('2026-07-27T21:00'))!;
    expect(result).not.toBeNull();
    expect(result.cloudCover).toBe(0);
    // Çiy noktası eksikse sıcaklığa düşer — "çiy kesin" yanlış alarmı
    // vermemesi için değil, en azından NaN olmaması için.
    expect(Number.isNaN(result.dewPoint)).toBe(false);
  });
});

describe('dewRisk', () => {
  it('sıcaklık çiy noktasına yaklaşınca riski yükseltir', () => {
    expect(dewRisk(10, 9.5).label).toBe('Çiy kesin');
    expect(dewRisk(12, 9).label).toBe('Çiy riski');
    expect(dewRisk(20, 5).label).toBe('Kuru');
  });
});
