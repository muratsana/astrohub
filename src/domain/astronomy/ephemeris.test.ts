import { describe, it, expect } from 'vitest';
import {
  sunPosition,
  sunAltitude,
  moonPhase,
  moonRiseSet,
  astronomicalNight,
  twilightWindow,
  equatorialToHorizontal,
  greenwichSiderealTime,
  parseRa,
  parseDec,
  targetNightPeak,
  formatClock,
  formatDuration,
} from './ephemeris';

/**
 * Referans değerler bağımsız kaynaklardan (USNO / IMCCE efemeris tabloları)
 * alınmıştır. Tolerans, düşük hassasiyet formüllerinin ilan edilen doğruluk
 * sınırlarına göre belirlendi: güneş ±0.05°, ay ±0.5°, saatler ±3 dk.
 */

const ISTANBUL = { lat: 41.0082, lon: 28.9784 };

describe('yıldız zamanı', () => {
  it('J2000.0 döneminde bilinen değeri verir', () => {
    // 2000-01-01 12:00 UTC → GMST ≈ 280.46°
    const gst = greenwichSiderealTime(new Date(Date.UTC(2000, 0, 1, 12)));
    expect(gst).toBeCloseTo(280.46, 1);
  });

  it('sonucu her zaman 0–360 aralığında tutar', () => {
    for (const iso of ['1990-03-21T00:00:00Z', '2030-11-09T18:23:00Z']) {
      const gst = greenwichSiderealTime(new Date(iso));
      expect(gst).toBeGreaterThanOrEqual(0);
      expect(gst).toBeLessThan(360);
    }
  });
});

describe('güneş konumu', () => {
  it('ilkbahar ekinoksunda dik açıklık sıfıra yakındır', () => {
    // 2026 ilkbahar ekinoksu: 20 Mart 14:46 UTC
    const { dec, ra } = sunPosition(new Date('2026-03-20T14:46:00Z'));
    expect(Math.abs(dec)).toBeLessThan(0.05);
    // Ekinoksta sağ açıklık 0h'a yakındır (360°'ye sarabilir)
    expect(Math.min(ra, 360 - ra)).toBeLessThan(0.5);
  });

  it('yaz gündönümünde dik açıklık ekliptik eğimine ulaşır', () => {
    const { dec } = sunPosition(new Date('2026-06-21T08:24:00Z'));
    expect(dec).toBeCloseTo(23.44, 1);
  });

  it('kış gündönümünde dik açıklık en düşük noktasındadır', () => {
    const { dec } = sunPosition(new Date('2026-12-21T20:50:00Z'));
    expect(dec).toBeCloseTo(-23.44, 1);
  });
});

describe('güneş yüksekliği', () => {
  it('İstanbul güneş öğleninde güneş en yüksek noktasındadır', () => {
    // Güneş öğleni = 12:00 UTC − boylam/15° = 12:00 − 1s56dk ≈ 10:04 UTC
    const solarNoon = new Date('2026-06-21T10:04:00Z');
    const alt = sunAltitude(solarNoon, ISTANBUL.lat, ISTANBUL.lon);
    // Beklenen: 90 − 41.01 + 23.44 ≈ 72.4°
    expect(alt).toBeGreaterThan(71);
    expect(alt).toBeLessThan(74);
  });

  it('güneş öğleninden bir saat önce ve sonra daha alçaktadır', () => {
    const peak = sunAltitude(
      new Date('2026-06-21T10:04:00Z'),
      ISTANBUL.lat,
      ISTANBUL.lon
    );
    for (const iso of ['2026-06-21T09:04:00Z', '2026-06-21T11:04:00Z']) {
      expect(sunAltitude(new Date(iso), ISTANBUL.lat, ISTANBUL.lon)).toBeLessThan(
        peak
      );
    }
  });

  it('gece yarısı güneş ufkun belirgin biçimde altındadır', () => {
    const alt = sunAltitude(
      new Date('2026-06-21T21:04:00Z'),
      ISTANBUL.lat,
      ISTANBUL.lon
    );
    expect(alt).toBeLessThan(-10);
  });
});

describe('astronomik karanlık', () => {
  it('İstanbul için ekim gecesinde makul bir pencere üretir', () => {
    const w = astronomicalNight(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon);
    expect(w.neverDark).toBe(false);
    expect(w.start).not.toBeNull();
    expect(w.end).not.toBeNull();
    // Ekim ortasında İstanbul'da astronomik karanlık ~9–10 saat
    expect(w.durationMinutes).toBeGreaterThan(8 * 60);
    expect(w.durationMinutes).toBeLessThan(11 * 60);
  });

  it('pencerenin iki ucunda güneş tam olarak −18° yüksekliktedir', () => {
    // Saat dilimine bağlı bir iddia yerine fiziksel değişmez sınanır:
    // uçlarda eşik değeri geçilmiş, hemen öncesinde/sonrasında geçilmemiş olmalı.
    const w = astronomicalNight(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon);
    expect(w.start!.getTime()).toBeLessThan(w.end!.getTime());

    for (const edge of [w.start!, w.end!]) {
      expect(sunAltitude(edge, ISTANBUL.lat, ISTANBUL.lon)).toBeCloseTo(-18, 1);
    }
    // Başlangıçtan 30 dk önce hava henüz yeterince kararmamıştır…
    const before = new Date(w.start!.getTime() - 30 * 60_000);
    expect(sunAltitude(before, ISTANBUL.lat, ISTANBUL.lon)).toBeGreaterThan(-18);
    // …bitişten 30 dk sonra da şafak sökmüştür.
    const after = new Date(w.end!.getTime() + 30 * 60_000);
    expect(sunAltitude(after, ISTANBUL.lat, ISTANBUL.lon)).toBeGreaterThan(-18);
  });

  it('pencere aranan gün öğleni ile ertesi gün öğleni arasında kalır', () => {
    const day = new Date(2026, 9, 15);
    const noon = new Date(day);
    noon.setHours(12, 0, 0, 0);
    const nextNoon = new Date(noon.getTime() + 86_400_000);

    const w = astronomicalNight(day, ISTANBUL.lat, ISTANBUL.lon);
    expect(w.start!.getTime()).toBeGreaterThan(noon.getTime());
    expect(w.end!.getTime()).toBeLessThan(nextNoon.getTime());
  });

  it('kışın yazdan daha uzun karanlık verir', () => {
    const winter = astronomicalNight(new Date(2026, 11, 21), ISTANBUL.lat, ISTANBUL.lon);
    const summer = astronomicalNight(new Date(2026, 5, 21), ISTANBUL.lat, ISTANBUL.lon);
    expect(winter.durationMinutes).toBeGreaterThan(summer.durationMinutes);
  });

  it('kutup dairesinde yaz ortasında karanlık oluşmadığını bildirir', () => {
    // Tromsø, 69.6°K — haziranda güneş −18°'nin altına hiç inmez
    const w = astronomicalNight(new Date(2026, 5, 21), 69.65, 18.96);
    expect(w.neverDark).toBe(true);
    expect(w.durationMinutes).toBe(0);
  });

  it('daha gevşek eşik daha uzun pencere verir', () => {
    const astro = twilightWindow(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon, -18);
    const nautical = twilightWindow(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon, -12);
    expect(nautical.durationMinutes).toBeGreaterThan(astro.durationMinutes);
  });
});

describe('ay fazı', () => {
  it('bilinen dolunayda aydınlanma ~1 olur', () => {
    // 2026-01-03 10:03 UTC dolunay
    const p = moonPhase(new Date('2026-01-03T10:03:00Z'));
    expect(p.illumination).toBeGreaterThan(0.97);
    expect(p.name).toBe('Dolunay');
  });

  it('bilinen yeni ayda aydınlanma ~0 olur', () => {
    // 2026-01-18 19:52 UTC yeni ay
    const p = moonPhase(new Date('2026-01-18T19:52:00Z'));
    expect(p.illumination).toBeLessThan(0.03);
    expect(p.name).toBe('Yeni Ay');
  });

  it('aydınlanma her zaman 0–1 aralığındadır', () => {
    for (let d = 0; d < 30; d++) {
      const p = moonPhase(new Date(2026, 6, 1 + d));
      expect(p.illumination).toBeGreaterThanOrEqual(0);
      expect(p.illumination).toBeLessThanOrEqual(1);
      expect(p.age).toBeGreaterThanOrEqual(0);
      expect(p.age).toBeLessThan(1);
    }
  });

  it('yeni aydan sonra büyüyen, dolunaydan sonra küçülen olarak işaretlenir', () => {
    expect(moonPhase(new Date('2026-01-22T00:00:00Z')).waxing).toBe(true);
    expect(moonPhase(new Date('2026-01-08T00:00:00Z')).waxing).toBe(false);
  });
});

describe('ay doğuş/batış', () => {
  it('İstanbul için bir gün içinde doğuş ya da batış bulur', () => {
    const rs = moonRiseSet(new Date(2026, 6, 27), ISTANBUL.lat, ISTANBUL.lon);
    expect(rs.rise !== null || rs.set !== null).toBe(true);
    expect(rs.alwaysUp).toBe(false);
    expect(rs.alwaysDown).toBe(false);
  });
});

describe('koordinat ayrıştırma', () => {
  it('sağ açıklığı dereceye çevirir', () => {
    // 20h 58m 47s → 314.696°
    expect(parseRa('20h 58m 47s')).toBeCloseTo(314.696, 2);
    expect(parseRa('00h 42m 44s')).toBeCloseTo(10.683, 2);
  });

  it('dik açıklığı işaretiyle birlikte çevirir', () => {
    expect(parseDec('+44° 19′ 48″')).toBeCloseTo(44.33, 2);
    expect(parseDec('-05° 23′ 28″')).toBeCloseTo(-5.391, 2);
    expect(parseDec('−05° 23′ 28″')).toBeCloseTo(-5.391, 2);
  });

  it('okunamayan girdide NaN döner', () => {
    expect(Number.isNaN(parseRa('bilinmiyor'))).toBe(true);
  });
});

describe('hedef geceleri', () => {
  it('kuzey kutup yıldızı İstanbul için hiç batmaz', () => {
    // Polaris: RA 02h 31m 49s, Dec +89° 15′ 51″
    const coords = { ra: parseRa('02h 31m 49s'), dec: parseDec('+89° 15′ 51″') };
    const alt = equatorialToHorizontal(
      coords,
      new Date('2026-07-27T22:00:00Z'),
      ISTANBUL.lat,
      ISTANBUL.lon
    ).altitude;
    // Kutup yıldızının yüksekliği ≈ gözlemcinin enlemi
    expect(alt).toBeCloseTo(ISTANBUL.lat, 0);
  });

  it('M31 ekim gecesinde İstanbul üzerinde yüksek zirve yapar', () => {
    const coords = { ra: parseRa('00h 42m 44s'), dec: parseDec('+41° 16′ 09″') };
    const w = astronomicalNight(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon);
    const peak = targetNightPeak(
      coords,
      { start: w.start!, end: w.end! },
      ISTANBUL.lat,
      ISTANBUL.lon
    );
    // Dik açıklığı gözlemci enlemine çok yakın → neredeyse başucundan geçer
    expect(peak.peakAltitude).toBeGreaterThan(80);
    expect(peak.neverRises).toBe(false);
  });

  it('güney yarımküre hedefi İstanbul için hiç doğmaz olarak işaretlenir', () => {
    // Küçük Magellan Bulutu: Dec −72°
    const coords = { ra: parseRa('00h 52m 45s'), dec: -72.8 };
    const w = astronomicalNight(new Date(2026, 9, 15), ISTANBUL.lat, ISTANBUL.lon);
    const peak = targetNightPeak(
      coords,
      { start: w.start!, end: w.end! },
      ISTANBUL.lat,
      ISTANBUL.lon
    );
    expect(peak.neverRises).toBe(true);
  });
});

describe('biçimlendirme', () => {
  it('boş saati tire ile gösterir', () => {
    expect(formatClock(null)).toBe('—');
  });

  it('saati varsayılan olarak Türkiye diliminde yazar', () => {
    // 18:30 UTC = 21:30 Europe/Istanbul (UTC+3). Testin çalıştığı makinenin
    // saat diliminden bağımsız olmalı.
    expect(formatClock(new Date('2026-10-15T18:30:00Z'))).toBe('21:30');
  });

  it('istenen saat dilimini kullanır', () => {
    expect(formatClock(new Date('2026-10-15T18:30:00Z'), 'UTC')).toBe('18:30');
  });

  it('süreyi saat ve dakika olarak yazar', () => {
    expect(formatDuration(492)).toBe('8sa 12dk');
    expect(formatDuration(45)).toBe('45dk');
    expect(formatDuration(0)).toBe('—');
  });
});
