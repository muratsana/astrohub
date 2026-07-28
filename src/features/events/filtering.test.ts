import { describe, it, expect } from 'vitest';
import {
  filterEvents,
  defaultEventFilters,
  capacityLabel,
} from './filtering';
import { events } from './data';
import type { AstroEvent } from './types';

/**
 * Fikstürler testin içinde.
 *
 * Önceki hâli gerçek etkinlik listesine bağlıydı ve `perseid-2026` gibi
 * slug'ları doğrudan bekliyordu. Sonuç: takvime bir etkinlik eklendiğinde
 * ya da bir tanesi geçtiğinde filtre mantığı hiç değişmediği hâlde beş
 * test düşüyordu. Bir filtreleme testi filtrelemeyi sınamalı, içeriği
 * değil.
 *
 * Gerçek veri yine sınanıyor ama **değişmezleri** üzerinden: sıralama
 * bozuk mu, kaynak alanı boş mu (§8.4).
 */
function makeEvent(partial: Partial<AstroEvent> & { slug: string }): AstroEvent {
  return {
    title: partial.slug,
    type: 'gozlem-senligi',
    city: 'Ankara',
    venue: 'Test alanı',
    startsAt: '2026-08-01T20:00:00+03:00',
    free: true,
    camping: false,
    kidsFriendly: false,
    astrophotoFocused: false,
    telescopesProvided: false,
    organizer: { name: 'Test Derneği', verified: false },
    description: '',
    program: [],
    observedTargets: [],
    gradient: '',
    source: { name: 'test', lastVerifiedAt: '2026-07-28' },
    ...partial,
  };
}

const fixtures: AstroEvent[] = [
  makeEvent({
    slug: 'kampli-ucretsiz',
    startsAt: '2026-08-05T18:00:00+03:00',
    free: true,
    camping: true,
    capacity: 120,
    registered: 84,
  }),
  makeEvent({
    slug: 'istanbul-halk',
    city: 'İstanbul',
    type: 'halk-gozlemi',
    startsAt: '2026-08-10T20:00:00+03:00',
    free: true,
  }),
  makeEvent({
    slug: 'ucretli-atolye',
    type: 'atolye',
    startsAt: '2026-08-20T10:00:00+03:00',
    free: false,
    organizer: { name: 'DeepSky Türkiye', verified: true },
    capacity: 30,
    registered: 27,
  }),
  makeEvent({
    slug: 'webinar-kayit',
    type: 'webinar',
    city: 'Online',
    startsAt: '2026-09-01T21:00:00+03:00',
  }),
];

describe('etkinlik filtreleme (§7.5)', () => {
  it('varsayılanda tümünü tarihe göre artan sıralar', () => {
    const result = filterEvents(fixtures, defaultEventFilters);
    expect(result).toHaveLength(fixtures.length);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].startsAt <= result[i].startsAt).toBe(true);
    }
  });

  it('ücretsiz ve kamp filtrelerini uygular', () => {
    const free = filterEvents(fixtures, {
      ...defaultEventFilters,
      onlyFree: true,
    });
    expect(free.every((e) => e.free)).toBe(true);
    expect(free.map((e) => e.slug)).not.toContain('ucretli-atolye');

    const camp = filterEvents(fixtures, {
      ...defaultEventFilters,
      onlyCamping: true,
    });
    expect(camp.map((e) => e.slug)).toEqual(['kampli-ucretsiz']);
  });

  it('şehir ve tür filtresi uygular', () => {
    const ist = filterEvents(fixtures, {
      ...defaultEventFilters,
      city: 'İstanbul',
    });
    expect(ist.map((e) => e.slug)).toEqual(['istanbul-halk']);

    const webinar = filterEvents(fixtures, {
      ...defaultEventFilters,
      type: 'webinar',
    });
    expect(webinar.map((e) => e.slug)).toEqual(['webinar-kayit']);
  });

  it('arama organizatör adında da eşleşir', () => {
    const result = filterEvents(fixtures, {
      ...defaultEventFilters,
      search: 'deepsky',
    });
    expect(result.map((e) => e.slug)).toEqual(['ucretli-atolye']);
  });

  it('kontenjan etiketi üretir', () => {
    const dolmakta = fixtures.find((e) => e.slug === 'kampli-ucretsiz')!;
    expect(capacityLabel(dolmakta)).toBe('84 / 120 kayıt');

    const sonKisiler = fixtures.find((e) => e.slug === 'ucretli-atolye')!;
    expect(capacityLabel(sonKisiler)).toBe('Son 3 kişi');

    const kontenjansiz = fixtures.find((e) => e.slug === 'istanbul-halk')!;
    expect(capacityLabel(kontenjansiz)).toBeNull();
  });
});

describe('gerçek etkinlik verisi', () => {
  it('her kayıt kaynak adı ve doğrulama tarihi taşır (§8.4)', () => {
    for (const event of events) {
      expect(event.source.name.length).toBeGreaterThan(0);
      expect(event.source.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('koordinat çifti tam ya da hiç yok', () => {
    // Yarım koordinat haritada sessizce yanlış yere pin koyar; şemadaki
    // `events_coords_paired` kısıtının veri tarafındaki karşılığı.
    for (const event of events) {
      if (!event.coords) continue;
      expect(Number.isFinite(event.coords.latitude)).toBe(true);
      expect(Number.isFinite(event.coords.longitude)).toBe(true);
    }
  });

  it('slug ve tarih biçimleri tutarlı', () => {
    for (const event of events) {
      expect(event.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isNaN(Date.parse(event.startsAt))).toBe(false);
    }
  });
});
