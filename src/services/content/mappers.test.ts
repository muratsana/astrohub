import { describe, expect, it } from 'vitest';
import { mapEventRow } from './events';
import { mapSiteRow } from './sites';
import { gradientFromSeed } from '@/components/media/tints';

const eventRow = {
  id: '9c1f7d2e-3a4b-4c5d-8e9f-0a1b2c3d4e5f',
  slug: 'perseid-2026',
  title: 'Perseid Meteor Yağmuru Gözlem Kampı',
  event_type: 'meteor-yagmuru',
  city: 'Antalya',
  venue: 'Saklıkent Gözlem Alanı',
  latitude: '36.781700',
  longitude: '30.349400',
  starts_at: '2026-08-12T15:00:00+00:00',
  ends_at: null,
  free: false,
  camping: true,
  kids_friendly: true,
  astrophoto_focused: true,
  telescopes_provided: true,
  capacity: 120,
  registered_count: 0,
  organizer_name: 'Antalya Astronomi Derneği',
  organizer_verified: true,
  description: 'Açıklama',
  observed_targets: ['Perseid meteorları'],
  rules: [],
  source_name: 'Organizatör bildirimi',
  source_last_verified_at: '2026-07-10',
  event_sessions: [
    { starts_at: '22:00', title: 'Gözlem', speaker: null, position: 2 },
    { starts_at: '18:00', title: 'Kurulum', speaker: null, position: 0 },
    { starts_at: '20:30', title: 'Sunum', speaker: 'Dr. A. Kaya', position: 1 },
  ],
};

describe('mapEventRow', () => {
  it('programı pozisyona göre sıralar — satır sırası garanti değildir', () => {
    const event = mapEventRow(eventRow);
    expect(event.program.map((p) => p.title)).toEqual([
      'Kurulum',
      'Sunum',
      'Gözlem',
    ]);
  });

  it('konuşmacısı olmayan oturuma boş alan eklemez', () => {
    const event = mapEventRow(eventRow);
    expect(event.program[0]).toEqual({ time: '18:00', title: 'Kurulum' });
    expect(event.program[1].speaker).toBe('Dr. A. Kaya');
  });

  it('metin gelen koordinatı sayıya çevirir', () => {
    const event = mapEventRow(eventRow);
    expect(event.coords).toEqual({ latitude: 36.7817, longitude: 30.3494 });
  });

  it('koordinatsız (çevrimiçi) etkinlikte coords tanımsızdır', () => {
    const online = { ...eventRow, latitude: null, longitude: null };
    expect(mapEventRow(online).coords).toBeUndefined();
  });

  it('yarım koordinatı konum saymaz', () => {
    const half = { ...eventRow, longitude: null };
    expect(mapEventRow(half).coords).toBeUndefined();
  });

  it('boş kural dizisini undefined yapar', () => {
    expect(mapEventRow(eventRow).rules).toBeUndefined();
  });

  it('gradyanı slug’dan kararlı türetir', () => {
    expect(mapEventRow(eventRow).gradient).toBe(
      gradientFromSeed('perseid-2026')
    );
    expect(mapEventRow(eventRow).gradient).toBe(mapEventRow(eventRow).gradient);
  });

  it('Supabase satırını etkinlik görseliyle zenginleştirir', () => {
    const event = mapEventRow(eventRow);
    expect(event.image?.url).toContain('TUG%20full%20site.jpg');
    expect(event.image?.credit).toContain('Wikimedia Commons');
  });

  it('seed etkinliğinin iletişim adresini Supabase satırına taşır', () => {
    const event = mapEventRow({
      ...eventRow,
      slug: 'ethem-hoca-gokyuzu-gozlem-senligi-2026',
    });

    expect(event.contact?.url).toBe(
      'https://apps.denizli.bel.tr/gokyuzugozlemsenligibasvuru/'
    );
  });
});

const siteRow = {
  slug: 'saklikent-antalya',
  name: 'Saklıkent Gözlem Alanı',
  region: 'Antalya',
  approx_latitude: '36.8247',
  approx_longitude: '30.3353',
  altitude_m: 1850,
  bortle: 3,
  sqm: '21.60',
  road_access: 'Asfalt',
  south_horizon: 'Açık',
  best_months: 'Mayıs – Ekim',
  has_water: true,
  has_toilet: true,
  has_electricity: true,
  has_cell_signal: true,
  has_tent_area: true,
  caravan_ok: true,
  description: 'Açıklama',
  warnings: ['Kalabalık olabilir.'],
  image_url: 'https://example.com/saha.jpg',
  image_credit: 'Kaynak',
  image_licence: 'CC BY-SA',
  source_urls: [{ label: 'Kaynak', url: 'https://example.com' }],
  rating: '0.00',
  review_count: 0,
};

describe('mapSiteRow', () => {
  it('tesis bayraklarını arayüz nesnesine çevirir', () => {
    const site = mapSiteRow({ ...siteRow, has_toilet: false });
    expect(site.facilities).toEqual({
      water: true,
      toilet: false,
      electricity: true,
      cellSignal: true,
      tentArea: true,
      caravanOk: true,
    });
  });

  it('numeric alanları sayıya çevirir', () => {
    const site = mapSiteRow(siteRow);
    expect(site.coords).toEqual({ latitude: 36.8247, longitude: 30.3353 });
    expect(site.sqm).toBe(21.6);
    expect(site.rating).toBe(0);
  });

  it('SQM ölçümü yoksa alanı hiç doldurmaz', () => {
    expect(mapSiteRow({ ...siteRow, sqm: null }).sqm).toBeUndefined();
  });

  it('boş uyarı dizisini undefined yapar', () => {
    expect(mapSiteRow({ ...siteRow, warnings: [] }).warnings).toBeUndefined();
  });

  it('görsel ve kaynakları geçirir', () => {
    const site = mapSiteRow(siteRow);
    expect(site.image).toEqual({
      url: 'https://example.com/saha.jpg',
      credit: 'Kaynak',
      licence: 'CC BY-SA',
    });
    expect(site.sourceUrls).toEqual([
      { label: 'Kaynak', url: 'https://example.com' },
    ]);
  });
});
