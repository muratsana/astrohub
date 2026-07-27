import { describe, it, expect } from 'vitest';
import {
  buildCalendarMonth,
  leadingBlanks,
  countStarting,
  initialMonth,
  startOfDay,
} from './calendar';
import type { AstroEvent } from './types';

/** Testler yalnızca tarih alanlarına bakar; gerisi tip için doldurulur. */
function makeEvent(
  slug: string,
  startsAt: string,
  endsAt?: string
): AstroEvent {
  return {
    slug,
    title: slug,
    type: 'gozlem-senligi',
    city: 'Ankara',
    venue: 'Test',
    startsAt,
    endsAt,
    free: true,
    camping: false,
    kidsFriendly: false,
    astrophotoFocused: false,
    telescopesProvided: false,
    organizer: { name: 'Test', verified: false },
    description: '',
    program: [],
    observedTargets: [],
    gradient: '',
    source: { name: 'test', lastVerifiedAt: '2026-01-01' },
  };
}

describe('takvim ayı kurulumu', () => {
  it('ayın gün sayısı kadar hücre üretir', () => {
    expect(buildCalendarMonth(2026, 7, [])).toHaveLength(31); // ağustos
    expect(buildCalendarMonth(2026, 8, [])).toHaveLength(30); // eylül
  });

  it('tek günlük etkinliği yalnızca kendi gününe koyar', () => {
    const days = buildCalendarMonth(2026, 7, [
      makeEvent('tek', '2026-08-12T18:00:00+03:00'),
    ]);

    expect(days[11].items).toHaveLength(1);
    expect(days[11].items[0].continuing).toBe(false);
    expect(days[12].items).toHaveLength(0);
  });

  it('çok günlü etkinliği her gününde gösterir', () => {
    const days = buildCalendarMonth(2026, 7, [
      makeEvent('kamp', '2026-08-12T18:00:00+03:00', '2026-08-14T10:00:00+03:00'),
    ]);

    expect(days[11].items[0].continuing).toBe(false); // 12'si başlangıç
    expect(days[12].items[0].continuing).toBe(true); // 13'ü devam
    expect(days[13].items[0].continuing).toBe(true); // 14'ü devam
    expect(days[14].items).toHaveLength(0); // 15'i yok
  });

  it('ay sınırını aşan etkinliği ilgili ayda devam olarak gösterir', () => {
    const eylul = buildCalendarMonth(2026, 8, [
      makeEvent('gecis', '2026-08-31T20:00:00+03:00', '2026-09-01T06:00:00+03:00'),
    ]);

    expect(eylul[0].items).toHaveLength(1);
    expect(eylul[0].items[0].continuing).toBe(true);
  });

  it('başlayan etkinlikleri sayar, devam edenleri saymaz', () => {
    const days = buildCalendarMonth(2026, 7, [
      makeEvent('a', '2026-08-12T18:00:00+03:00', '2026-08-14T10:00:00+03:00'),
      makeEvent('b', '2026-08-20T18:00:00+03:00'),
    ]);

    expect(countStarting(days)).toBe(2);
  });
});

describe('ızgara hizalaması', () => {
  it('haftayı pazartesiden başlatır', () => {
    // 1 Ağustos 2026 cumartesi → önünde 5 boş hücre
    expect(leadingBlanks(new Date(2026, 7, 1))).toBe(5);
    // 1 Haziran 2026 pazartesi → boşluk yok
    expect(leadingBlanks(new Date(2026, 5, 1))).toBe(0);
    // 1 Kasım 2026 pazar → önünde 6 boş hücre
    expect(leadingBlanks(new Date(2026, 10, 1))).toBe(6);
  });
});

describe('açılış ayı', () => {
  it('ilk etkinliğin ayını seçer', () => {
    const month = initialMonth([
      makeEvent('geç', '2026-11-02T18:00:00+03:00'),
      makeEvent('erken', '2026-09-05T18:00:00+03:00'),
    ]);

    expect(month.getMonth()).toBe(8); // eylül
    expect(month.getDate()).toBe(1);
  });

  it('etkinlik yoksa yedek tarihe düşer', () => {
    const fallback = new Date(2026, 2, 17);
    expect(initialMonth([], fallback).getMonth()).toBe(2);
  });
});

describe('gün başlangıcı', () => {
  it('saat bileşenini sıfırlar', () => {
    const d = startOfDay('2026-08-12T23:45:00+03:00');
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});
