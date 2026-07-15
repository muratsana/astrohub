import { describe, it, expect } from 'vitest';
import {
  filterEvents,
  defaultEventFilters,
  capacityLabel,
} from './filtering';
import { events } from './data';

describe('etkinlik filtreleme (§7.5)', () => {
  it('varsayılanda tümünü tarihe göre artan sıralar', () => {
    const result = filterEvents(events, defaultEventFilters);
    expect(result).toHaveLength(events.length);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].startsAt <= result[i].startsAt).toBe(true);
    }
  });

  it('ücretsiz ve kamp filtrelerini uygular', () => {
    const free = filterEvents(events, { ...defaultEventFilters, onlyFree: true });
    expect(free.every((e) => e.free)).toBe(true);

    const camp = filterEvents(events, { ...defaultEventFilters, onlyCamping: true });
    expect(camp.every((e) => e.camping)).toBe(true);
    expect(camp.map((e) => e.slug)).toContain('perseid-2026');
  });

  it('şehir ve tür filtresi uygular', () => {
    const ist = filterEvents(events, { ...defaultEventFilters, city: 'İstanbul' });
    expect(ist.map((e) => e.slug)).toEqual(['halk-gozlemi']);

    const webinar = filterEvents(events, { ...defaultEventFilters, type: 'webinar' });
    expect(webinar.map((e) => e.slug)).toEqual(['astronomi-101-webinar']);
  });

  it('arama organizatör adında da eşleşir', () => {
    const result = filterEvents(events, { ...defaultEventFilters, search: 'deepsky' });
    expect(result.map((e) => e.slug)).toEqual(['karanlik-gokyuzu']);
  });

  it('kontenjan etiketi üretir', () => {
    const perseid = events.find((e) => e.slug === 'perseid-2026')!;
    expect(capacityLabel(perseid)).toBe('84 / 120 kayıt');

    const atolye = events.find((e) => e.slug === 'karanlik-gokyuzu')!;
    expect(capacityLabel(atolye)).toBe('Son 3 kişi');

    const halk = events.find((e) => e.slug === 'halk-gozlemi')!;
    expect(capacityLabel(halk)).toBeNull();
  });
});
