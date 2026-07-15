import type { AstroEvent, EventType } from './types';

/** Etkinlik filtre durumu (§7.5 MVP alt kümesi). */
export interface EventFilters {
  search: string;
  city: string | 'hepsi';
  type: EventType | 'hepsi';
  onlyFree: boolean;
  onlyCamping: boolean;
}

export const defaultEventFilters: EventFilters = {
  search: '',
  city: 'hepsi',
  type: 'hepsi',
  onlyFree: false,
  onlyCamping: false,
};

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

export function filterEvents(
  items: AstroEvent[],
  filters: EventFilters
): AstroEvent[] {
  let result = items;

  const q = trLower(filters.search.trim());
  if (q) {
    result = result.filter((e) =>
      [e.title, e.city, e.venue, e.organizer.name]
        .map(trLower)
        .some((f) => f.includes(q))
    );
  }
  if (filters.city !== 'hepsi') result = result.filter((e) => e.city === filters.city);
  if (filters.type !== 'hepsi') result = result.filter((e) => e.type === filters.type);
  if (filters.onlyFree) result = result.filter((e) => e.free);
  if (filters.onlyCamping) result = result.filter((e) => e.camping);

  // Tarihe göre artan (yaklaşan önce)
  return [...result].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function availableEventCities(items: AstroEvent[]): string[] {
  return [...new Set(items.map((e) => e.city))].sort((a, b) =>
    a.localeCompare(b, 'tr-TR')
  );
}

/** Kontenjan durumu etiketi. */
export function capacityLabel(e: AstroEvent): string | null {
  if (!e.capacity) return null;
  const left = e.capacity - (e.registered ?? 0);
  if (left <= 0) return 'Kontenjan dolu';
  if (left <= 10) return `Son ${left} kişi`;
  return `${e.registered ?? 0} / ${e.capacity} kayıt`;
}
