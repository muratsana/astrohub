import { describe, it, expect } from 'vitest';
import { altitudeCurve, usableWindow, planSession } from './sessionPlan';
import { parseRa, parseDec, astronomicalNight } from './ephemeris';

const LAT = 39.9334; // Ankara
const LON = 32.8597;

/** 15 Ocak 2026 gecesi — kuzey yarımkürede uzun karanlık. */
const night = (() => {
  const window = astronomicalNight(new Date(2026, 0, 15), LAT, LON);
  if (!window.start || !window.end) throw new Error('test gecesi hesaplanamadı');
  return { start: window.start, end: window.end };
})();

/** Orion Bulutsusu — ocak gecesinde Türkiye'den yüksekte. */
const m42 = { ra: parseRa('05 35 17'), dec: parseDec('-05 23 28') };
/** Kutup yıldızı — Türkiye'den hep aynı yükseklikte, hiç batmaz. */
const polaris = { ra: parseRa('02 31 49'), dec: parseDec('+89 15 51') };
/** Güney gökyüzü cismi — Türkiye'den hiç yükselmez. */
const southern = { ra: parseRa('12 00 00'), dec: parseDec('-70 00 00') };

describe('yükseklik eğrisi', () => {
  it('aralığı verilen adımla tarar', () => {
    const curve = altitudeCurve(m42, night, LAT, LON, 60);
    const spanHours =
      (night.end.getTime() - night.start.getTime()) / 3_600_000;

    expect(curve.length).toBeGreaterThanOrEqual(Math.floor(spanHours));
    expect(curve[0].at.getTime()).toBe(night.start.getTime());
    expect(curve.every((p) => p.altitude >= -90 && p.altitude <= 90)).toBe(true);
  });
});

describe('kullanılabilir pencere', () => {
  it('yükselen hedef için pencere bulur', () => {
    const window = usableWindow(m42, night, LAT, LON, 30);
    expect(window).not.toBeNull();
    expect(window!.minutes).toBeGreaterThan(60);
    expect(window!.peakAltitude).toBeGreaterThan(30);
  });

  it('pencere gece sınırlarının dışına taşmaz', () => {
    const window = usableWindow(m42, night, LAT, LON, 30)!;
    expect(window.start.getTime()).toBeGreaterThanOrEqual(night.start.getTime());
    expect(window.end.getTime()).toBeLessThanOrEqual(night.end.getTime());
  });

  it('hiç yükselmeyen hedefte null döner', () => {
    expect(usableWindow(southern, night, LAT, LON, 30)).toBeNull();
  });

  it('yüksek eşikte pencere daralır ya da kapanır', () => {
    const low = usableWindow(m42, night, LAT, LON, 20)!;
    const high = usableWindow(m42, night, LAT, LON, 50);
    expect(high === null || high.minutes <= low.minutes).toBe(true);
  });

  it('kutup cismi gece boyunca pencerede kalır', () => {
    const window = usableWindow(polaris, night, LAT, LON, 30)!;
    const nightMinutes = (night.end.getTime() - night.start.getTime()) / 60_000;
    expect(window.minutes).toBeGreaterThan(nightMinutes * 0.9);
  });
});

describe('gece planı', () => {
  it('yükselmeyen hedefi gerekçesiyle atlar', () => {
    const plan = planSession(
      [{ id: 'guney', coords: southern, requestedMinutes: 60 }],
      night,
      LAT,
      LON
    );

    expect(plan.scheduled).toHaveLength(0);
    expect(plan.skipped[0]).toMatchObject({ id: 'guney', reason: 'ufkun-altinda' });
  });

  it('tek hedefe istenen süreyi ayırır', () => {
    const plan = planSession(
      [{ id: 'm42', coords: m42, requestedMinutes: 90 }],
      night,
      LAT,
      LON
    );

    expect(plan.scheduled).toHaveLength(1);
    expect(plan.scheduled[0].minutes).toBeCloseTo(90, 0);
    expect(plan.scheduled[0].fulfillment).toBeCloseTo(1, 2);
  });

  it('slotlar çakışmaz ve sıralı ilerler', () => {
    const plan = planSession(
      [
        { id: 'm42', coords: m42, requestedMinutes: 60 },
        { id: 'polaris', coords: polaris, requestedMinutes: 60 },
      ],
      night,
      LAT,
      LON
    );

    expect(plan.scheduled.length).toBeGreaterThan(1);
    for (let i = 1; i < plan.scheduled.length; i++) {
      expect(plan.scheduled[i].start.getTime()).toBeGreaterThanOrEqual(
        plan.scheduled[i - 1].end.getTime()
      );
    }
  });

  it('erken biten pencereyi öne alır', () => {
    // Polaris tüm gece müsait, M42 şafağa doğru batıyor → M42 önce gelmeli.
    const plan = planSession(
      [
        { id: 'polaris', coords: polaris, requestedMinutes: 120 },
        { id: 'm42', coords: m42, requestedMinutes: 120 },
      ],
      night,
      LAT,
      LON
    );

    const order = plan.scheduled.map((s) => s.id);
    expect(order.indexOf('m42')).toBeLessThan(order.indexOf('polaris'));
  });

  it('gece dolduğunda kalan hedefi zaman gerekçesiyle atlar', () => {
    const nightMinutes = (night.end.getTime() - night.start.getTime()) / 60_000;
    const plan = planSession(
      [
        { id: 'polaris', coords: polaris, requestedMinutes: nightMinutes },
        { id: 'polaris-2', coords: polaris, requestedMinutes: 180 },
      ],
      night,
      LAT,
      LON
    );

    expect(plan.skipped.some((s) => s.reason === 'zaman-kalmadi')).toBe(true);
  });

  it('boşta kalan süreyi raporlar', () => {
    const plan = planSession(
      [{ id: 'm42', coords: m42, requestedMinutes: 60 }],
      night,
      LAT,
      LON
    );
    const nightMinutes = (night.end.getTime() - night.start.getTime()) / 60_000;

    expect(plan.totalMinutes).toBeCloseTo(60, 0);
    expect(plan.idleMinutes).toBeCloseTo(nightMinutes - 60, 0);
  });

  it('boş istek listesinde boş plan döner', () => {
    const plan = planSession([], night, LAT, LON);
    expect(plan.scheduled).toHaveLength(0);
    expect(plan.skipped).toHaveLength(0);
    expect(plan.totalMinutes).toBe(0);
  });
});
