import { describe, expect, it } from 'vitest';
import {
  formatEventDateRange,
  formatEventLongDateRange,
  formatEventTime,
} from './eventDates';

describe('event date labels', () => {
  it('çok günlük etkinlikte başlangıç ve bitiş tarihini gösterir', () => {
    expect(
      formatEventDateRange(
        '2026-08-11T16:00:00+03:00',
        '2026-08-15T12:00:00+03:00'
      )
    ).toBe('11.08.2026 → 15.08.2026');
  });

  it('aynı gün biten etkinliği tek tarih olarak yazar', () => {
    expect(
      formatEventDateRange(
        '2026-06-27T15:00:00+03:00',
        '2026-06-27T23:00:00+03:00'
      )
    ).toBe('27.06.2026');
  });

  it('detay sayfası için uzun tarih aralığı ve saat üretir', () => {
    expect(
      formatEventLongDateRange(
        '2026-08-11T16:00:00+03:00',
        '2026-08-15T12:00:00+03:00'
      )
    ).toContain('11 Ağustos 2026');
    expect(formatEventTime('2026-08-11T16:00:00+03:00')).toBe('16:00');
  });
});
