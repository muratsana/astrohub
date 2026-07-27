import type { AstroEvent } from './types';

/**
 * Takvim ızgarası hesabı (§19.3).
 *
 * Bileşenden ayrı tutuldu çünkü buradaki tek zor kural — çok günlü
 * etkinliklerin her gününde görünmesi — jsdom'da bir takvim çizip hücre
 * saymak yerine doğrudan test edilebilir olmalı.
 */

export interface CalendarDay {
  date: Date;
  items: { event: AstroEvent; continuing: boolean }[];
}

/** Yerel gün başlangıcı — saat bileşeni karşılaştırmayı bozmasın. */
export function startOfDay(value: string | Date): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Ayın günlerini etkinliklerle eşleştirir.
 *
 * Çok günlü etkinlik **her gününde** listelenir: 12–14 Ağustos kampını
 * yalnızca 12'sinde göstermek, 13'ünde plan yapan kullanıcıyı yanıltır.
 * Başlangıç günü dışındaki günler `continuing: true` alır ve arayüzde
 * soluk gösterilir.
 */
export function buildCalendarMonth(
  year: number,
  month: number,
  events: AstroEvent[]
): CalendarDay[] {
  const days = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: days }, (_, i) => {
    const date = new Date(year, month, i + 1);
    const items: CalendarDay['items'] = [];

    for (const event of events) {
      const start = startOfDay(event.startsAt);
      const end = event.endsAt ? startOfDay(event.endsAt) : start;
      if (date >= start && date <= end) {
        items.push({ event, continuing: date > start });
      }
    }

    return { date, items };
  });
}

/**
 * Ayın ilk gününden önceki boş hücre sayısı (pazartesi başlangıçlı hafta).
 *
 * `getDay()` pazarı 0 sayar; TR takviminde hafta pazartesi başladığı için
 * altı ekleyip yediye göre mod alınır.
 */
export function leadingBlanks(firstOfMonth: Date): number {
  return (firstOfMonth.getDay() + 6) % 7;
}

/** O ayda **başlayan** etkinlik sayısı (devam edenler sayılmaz). */
export function countStarting(days: CalendarDay[]): number {
  return days.reduce(
    (sum, day) => sum + day.items.filter((i) => !i.continuing).length,
    0
  );
}

/**
 * Takvimin açılacağı ay: filtre sonucundaki **ilk etkinliğin** ayı.
 *
 * Bugünün ayını açmak, filtre sonucu ileri bir aya düştüğünde kullanıcıyı
 * boş takvimle baş başa bırakıyor ve filtrenin çalışmadığı izlenimi veriyor.
 */
export function initialMonth(events: AstroEvent[], fallback = new Date()): Date {
  const first = [...events].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt)
  )[0];
  const base = first ? new Date(first.startsAt) : fallback;
  return new Date(base.getFullYear(), base.getMonth(), 1);
}
