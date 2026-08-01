import { describe, expect, it } from 'vitest';
import {
  createLocalReverseGeocoder,
  haversineKm,
  nearestPlace,
  MAX_MATCH_KM,
  type GeoPlace,
} from './geocode';

/**
 * Ters kodlamanın koruduğu iki şey var: DOĞRU il ve YANLIŞ il yerine
 * sessizlik. İkincisi daha kolay kaybolur — "en yakın"ı koşulsuz
 * döndüren bir sürüm bütün mutlu yol testlerini geçer, sınır dışındaki
 * kullanıcıya yanlış il yazar.
 */

const PROVINCES: GeoPlace[] = [
  { name: 'İstanbul', latitude: 41.0082, longitude: 28.9784, ref: 'istanbul' },
  { name: 'Ankara', latitude: 39.9334, longitude: 32.8597, ref: 'ankara' },
  { name: 'Kayseri', latitude: 38.7312, longitude: 35.4787, ref: 'kayseri' },
  { name: 'Sivas', latitude: 39.7477, longitude: 37.0179, ref: 'sivas' },
  { name: 'Trabzon', latitude: 41.0027, longitude: 39.7168, ref: 'trabzon' },
  { name: 'Rize', latitude: 41.0201, longitude: 40.5234, ref: 'rize' },
  { name: 'Kırklareli', latitude: 41.7333, longitude: 27.2167, ref: 'kirklareli' },
];

describe('haversineKm', () => {
  it('aynı noktada sıfır', () => {
    expect(haversineKm(39, 35, 39, 35)).toBe(0);
  });

  /* Ankara–İstanbul kuş uçuşu ~350 km; bilinen bir büyüklük. */
  it('bilinen mesafeyi makul üretir', () => {
    const d = haversineKm(39.9334, 32.8597, 41.0082, 28.9784);
    expect(d).toBeGreaterThan(330);
    expect(d).toBeLessThan(370);
  });

  it('simetrik', () => {
    expect(haversineKm(39, 35, 41, 29)).toBeCloseTo(
      haversineKm(41, 29, 39, 35),
      6
    );
  });
});

describe('nearestPlace', () => {
  /*
   * ASIL DÜZELTİLEN HATA: 15 şehirlik listede Sivas yoktu ve oradaki
   * kullanıcıya "Kayseri" deniyordu. Liste 81 ile çıkınca kendi ili
   * geliyor.
   */
  it('Sivas koordinatında Sivas döner', () => {
    const m = nearestPlace(PROVINCES, 39.75, 37.02);
    expect(m?.label).toBe('Sivas');
    expect(m?.ref).toBe('sivas');
    expect(m?.distanceKm).toBeLessThan(5);
  });

  it('Rize koordinatında Trabzon değil Rize döner', () => {
    expect(nearestPlace(PROVINCES, 41.02, 40.52)?.label).toBe('Rize');
  });

  it('boş listede null', () => {
    expect(nearestPlace([], 39, 35)).toBeNull();
  });
});

describe('createLocalReverseGeocoder', () => {
  const geocoder = createLocalReverseGeocoder(async () => PROVINCES);

  it('ülke içindeki koordinatı ile eşler', async () => {
    const m = await geocoder.resolve(39.93, 32.86);
    expect(m?.label).toBe('Ankara');
  });

  /*
   * SINIR/VPN DURUMU (belgedeki 10. senaryo). Sofya (42.70, 23.32)
   * Kırklareli'ne ~330 km: eşiğin dışında. Eşik olmasaydı Bulgaristan'daki
   * kullanıcı ekranda "Kırklareli" görürdü.
   */
  it('ülke dışındaki koordinatta il adı uydurmaz', async () => {
    expect(await geocoder.resolve(42.6977, 23.3219)).toBeNull();
  });

  it('okyanus ortasında da null', async () => {
    expect(await geocoder.resolve(0, -30)).toBeNull();
  });

  it('eşik çağıran tarafından gevşetilebilir', async () => {
    const loose = createLocalReverseGeocoder(async () => PROVINCES, 1000);
    expect((await loose.resolve(42.6977, 23.3219))?.label).toBe('Kırklareli');
  });

  /*
   * NaN sessizce listenin ilk kaydını seçtiriyordu: her karşılaştırma
   * false döndüğü için "en iyi" hiç güncellenmez ve ilk kayıt kalırdı.
   */
  it('geçersiz koordinatta null', async () => {
    expect(await geocoder.resolve(Number.NaN, 32)).toBeNull();
    expect(await geocoder.resolve(41, Number.POSITIVE_INFINITY)).toBeNull();
  });

  /* Sağlayıcı hatası → adsızlık, yanlış ad değil (9. senaryo). */
  it('liste okunamazsa null döner, çökmez', async () => {
    const broken = createLocalReverseGeocoder(async () => {
      throw new Error('ağ yok');
    });
    expect(await broken.resolve(39.93, 32.86)).toBeNull();
  });

  it('boş listede null', async () => {
    const empty = createLocalReverseGeocoder(async () => []);
    expect(await empty.resolve(39.93, 32.86)).toBeNull();
  });

  it('varsayılan eşik 250 km', () => {
    expect(MAX_MATCH_KM).toBe(250);
  });
});
