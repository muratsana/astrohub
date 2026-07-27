import { describe, it, expect } from 'vitest';
import {
  moonlessDarkMinutes,
  nightScore,
  nightEntry,
  monthNights,
  bestNights,
  calendarWeeks,
  moonGlyph,
} from './nightCalendar';
import { astronomicalNight } from './ephemeris';

// Ankara — Türkiye ortalaması bir enlem.
const LAT = 39.9334;
const LON = 32.8597;

describe('aysız karanlık süre', () => {
  it('karanlık oluşmayan gecede sıfırdır', () => {
    expect(
      moonlessDarkMinutes(
        { start: null, end: null, durationMinutes: 0, neverDark: true },
        LAT,
        LON
      )
    ).toBe(0);
  });

  it('karanlık süreyi asla aşmaz', () => {
    const date = new Date(2026, 0, 15);
    const night = astronomicalNight(date, LAT, LON);
    const moonless = moonlessDarkMinutes(night, LAT, LON);

    expect(moonless).toBeGreaterThanOrEqual(0);
    expect(moonless).toBeLessThanOrEqual(night.durationMinutes);
  });

  it('yeni ay gecesinde karanlığın neredeyse tamamı aysızdır', () => {
    // 2026-01-18 civarı yeni ay: ay gündüz gökyüzünde, gece ufkun altında.
    const entry = nightEntry(new Date(2026, 0, 18), LAT, LON);
    expect(entry.moon.illumination).toBeLessThan(0.1);
    expect(entry.moonlessMinutes).toBeGreaterThan(
      entry.night.durationMinutes * 0.85
    );
  });

  it('dolunay gecesinde aysız süre belirgin biçimde kısalır', () => {
    const newMoon = nightEntry(new Date(2026, 0, 18), LAT, LON);
    const fullMoon = nightEntry(new Date(2026, 0, 3), LAT, LON);

    expect(fullMoon.moon.illumination).toBeGreaterThan(0.9);
    expect(fullMoon.moonlessMinutes).toBeLessThan(newMoon.moonlessMinutes);
  });
});

describe('gece puanı', () => {
  it('6 saat aysız karanlık + yeni ay tam puan verir', () => {
    expect(nightScore(360, 0)).toBe(100);
  });

  it('6 saatin üstünü tavanda tutar', () => {
    expect(nightScore(600, 0)).toBe(100);
  });

  it('karanlık yoksa ve dolunaysa sıfırdır', () => {
    expect(nightScore(0, 1)).toBe(0);
  });

  it('süre puanı ay puanından ağır basar', () => {
    // 6 saat aysız + dolunay (80) > 0 dakika + yeni ay (20)
    expect(nightScore(360, 1)).toBeGreaterThan(nightScore(0, 0));
  });
});

describe('aylık takvim', () => {
  it('ayın gün sayısı kadar kayıt üretir', () => {
    expect(monthNights(2026, 0, LAT, LON)).toHaveLength(31); // ocak
    expect(monthNights(2026, 1, LAT, LON)).toHaveLength(28); // şubat 2026
    expect(monthNights(2024, 1, LAT, LON)).toHaveLength(29); // artık yıl
  });

  it('kayıtlar ayın günleriyle sıralı gelir', () => {
    const entries = monthNights(2026, 5, LAT, LON);
    expect(entries[0].date.getDate()).toBe(1);
    expect(entries[entries.length - 1].date.getDate()).toBe(30);
    expect(entries.every((e) => e.date.getMonth() === 5)).toBe(true);
  });

  it('en iyi geceler puana göre sıralanır', () => {
    const entries = monthNights(2026, 0, LAT, LON);
    const best = bestNights(entries, 3);

    expect(best).toHaveLength(3);
    expect(best[0].score).toBeGreaterThanOrEqual(best[1].score);
    expect(best[1].score).toBeGreaterThanOrEqual(best[2].score);
    // En iyi gece, ayın ortalamasından iyi olmalı
    const avg = entries.reduce((s, e) => s + e.score, 0) / entries.length;
    expect(best[0].score).toBeGreaterThan(avg);
  });

  it('eşit puanda erken tarih önce gelir', () => {
    const entries = monthNights(2026, 0, LAT, LON);
    const tied = entries.filter((e) => e.score === entries[0].score);
    if (tied.length > 1) {
      const best = bestNights(tied, 2);
      expect(best[0].date.getTime()).toBeLessThan(best[1].date.getTime());
    }
  });
});

describe('takvim ızgarası', () => {
  it('haftaları yediye tamamlar', () => {
    const weeks = calendarWeeks(monthNights(2026, 0, LAT, LON));
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('ayın ilk gününü doğru haftagününe yerleştirir', () => {
    // 1 Ocak 2026 perşembe → pazartesi başlangıçlı ızgarada 4. hücre (index 3)
    const weeks = calendarWeeks(monthNights(2026, 0, LAT, LON));
    expect(weeks[0].slice(0, 3).every((c) => c === null)).toBe(true);
    expect(weeks[0][3]?.date.getDate()).toBe(1);
  });

  it('boş girdide boş ızgara döner', () => {
    expect(calendarWeeks([])).toEqual([]);
  });

  it('tüm günler ızgarada tam olarak bir kez görünür', () => {
    const entries = monthNights(2026, 3, LAT, LON);
    const flat = calendarWeeks(entries).flat().filter(Boolean);
    expect(flat).toHaveLength(entries.length);
  });
});

describe('ay sembolü', () => {
  it('yeni ay ve dolunay için ayrı sembol verir', () => {
    expect(moonGlyph(0.01, true)).toBe('●');
    expect(moonGlyph(0.99, false)).toBe('○');
  });

  it('büyüyen ve küçülen ayı ayırır', () => {
    expect(moonGlyph(0.2, true)).not.toBe(moonGlyph(0.2, false));
    expect(moonGlyph(0.6, true)).not.toBe(moonGlyph(0.6, false));
  });
});
