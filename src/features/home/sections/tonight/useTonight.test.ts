import { describe, expect, it } from 'vitest';
import { timelineClockPosition } from './useTonight';

describe('timelineClockPosition', () => {
  it('mevcut saati seçili gecenin eksenine yerleştirir', () => {
    const position = timelineClockPosition(
      {
        from: new Date('2026-08-07T20:00:00+03:00'),
        to: new Date('2026-08-08T06:00:00+03:00'),
      },
      new Date('2026-08-03T01:00:00+03:00')
    );

    expect(position).toBeCloseTo(0.5, 5);
  });

  it('mevcut saat gece aralığına düşmüyorsa null döner', () => {
    const position = timelineClockPosition(
      {
        from: new Date('2026-08-07T20:00:00+03:00'),
        to: new Date('2026-08-08T06:00:00+03:00'),
      },
      new Date('2026-08-03T12:00:00+03:00')
    );

    expect(position).toBeNull();
  });
});
