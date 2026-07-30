import { describe, expect, it } from 'vitest';
import {
  wallClockInZone,
  zoneOffsetMinutes,
  zonedTime,
  zonedNoon,
  zonedMidnight,
  zonedDayKey,
} from './zonedDay';

/*
 * Bu testler sürecin kendi zaman diliminden BAĞIMSIZDIR: tüm girdiler ve
 * beklenen değerler mutlak UTC anlarıdır. CI UTC'de, geliştirici makinesi
 * İstanbul'da koşsa da sonuç değişmez — QA ASTRO-01'in özü tam olarak bu.
 */
describe('zoneOffsetMinutes', () => {
  it('İstanbul yıl boyu +180 (DST yok)', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'Europe/Istanbul')).toBe(180);
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'Europe/Istanbul')).toBe(180);
  });

  it('New York kışın -300, yazın -240', () => {
    expect(zoneOffsetMinutes(new Date('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-300);
    expect(zoneOffsetMinutes(new Date('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-240);
  });
});

describe('wallClockInZone', () => {
  it('UTC anını dilimin duvar saatine çevirir', () => {
    // 2026-07-30 23:30 UTC = İstanbul'da 31 Temmuz 02:30 — gün değişti.
    const w = wallClockInZone(new Date('2026-07-30T23:30:00Z'), 'Europe/Istanbul');
    expect([w.year, w.month, w.day, w.hour, w.minute]).toEqual([2026, 7, 31, 2, 30]);
  });

  it('gece yarısını 24 değil 00 olarak okur (h23)', () => {
    const w = wallClockInZone(new Date('2026-07-30T21:00:00Z'), 'Europe/Istanbul');
    expect(w.hour).toBe(0);
    expect(w.day).toBe(31);
  });
});

describe('zonedTime', () => {
  it('İstanbul duvar saatini doğru UTC anına çevirir', () => {
    expect(zonedTime(2026, 7, 30, 12, 0, 'Europe/Istanbul').toISOString()).toBe(
      '2026-07-30T09:00:00.000Z'
    );
  });

  it('DST sınırında (ileri alma günü) tutarlı çözer', () => {
    // ABD'de yaz saati 8 Mart 2026'da 02:00→03:00. O günün öğleni EDT'dir.
    expect(zonedTime(2026, 3, 8, 12, 0, 'America/New_York').toISOString()).toBe(
      '2026-03-08T16:00:00.000Z'
    );
    // Bir gün öncesi hâlâ EST.
    expect(zonedTime(2026, 3, 7, 12, 0, 'America/New_York').toISOString()).toBe(
      '2026-03-07T17:00:00.000Z'
    );
  });
});

describe('zonedNoon / zonedMidnight', () => {
  it('tarayıcı dilimi ne olursa olsun konumun öğlenini bulur', () => {
    // New York'ta akşam 20:00 (= 31 Tem 00:00 UTC+0? hayır: 20:00 EDT = 00:00Z değil)
    // 2026-07-30 20:00 EDT = 2026-07-31 00:00 UTC. İstanbul'da bu an 31 Temmuz 03:00.
    const instant = new Date('2026-07-31T00:00:00.000Z');
    // İstanbul günü 31 Temmuz → öğlen 31 Tem 12:00 TRT = 09:00Z.
    expect(zonedNoon(instant, 'Europe/Istanbul').toISOString()).toBe(
      '2026-07-31T09:00:00.000Z'
    );
    // New York günü hâlâ 30 Temmuz → öğlen 30 Tem 12:00 EDT = 16:00Z.
    expect(zonedNoon(instant, 'America/New_York').toISOString()).toBe(
      '2026-07-30T16:00:00.000Z'
    );
  });

  it('gece yarısı günün başlangıcıdır', () => {
    expect(
      zonedMidnight(new Date('2026-07-30T22:00:00Z'), 'Europe/Istanbul').toISOString()
    ).toBe('2026-07-30T21:00:00.000Z'); // 31 Tem 00:00 TRT
  });
});

describe('zonedDayKey', () => {
  it('aynı an farklı dilimlerde farklı güne düşebilir', () => {
    const instant = new Date('2026-07-30T22:30:00Z');
    expect(zonedDayKey(instant, 'Europe/Istanbul')).toBe('2026-07-31');
    expect(zonedDayKey(instant, 'America/New_York')).toBe('2026-07-30');
  });
});
