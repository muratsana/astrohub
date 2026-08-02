import { describe, it, expect } from 'vitest';
import {
  filterDistricts,
  nearestDistrict,
  NEAREST_DISTRICT_LIMIT_KM,
  type District,
} from './districts';

/**
 * İLÇE KATMANI (§4.1).
 *
 * Ölçülen asıl şey İDDİANIN SINIRI: en yakın merkez bir TAHMİN,
 * ölçüm değil. Sınır poligonları saklanmadığı için bir ilçenin
 * kenarındaki nokta komşu ilçeye daha yakın olabilir; kod bunu
 * gizlemiyor, uzaklığı da döndürüyor.
 */

const ilce = (over: Partial<District> & { name: string }): District => ({
  provinceCode: 6,
  slug: over.name.toLowerCase(),
  searchName: over.name.toLowerCase(),
  latitude: null,
  longitude: null,
  ...over,
});

const ankara: District[] = [
  ilce({ name: 'Çankaya', latitude: 39.9179, longitude: 32.8627 }),
  ilce({ name: 'Polatlı', latitude: 39.5843, longitude: 32.1471 }),
  ilce({ name: 'Şereflikoçhisar', latitude: 38.9383, longitude: 33.5442 }),
];

describe('filterDistricts', () => {
  it('Türkçe katlamalı arama', () => {
    /* "cankaya" yazan kullanıcı "Çankaya"yı bulmalı. */
    expect(filterDistricts(ankara, 'cankaya').map((d) => d.name)).toEqual([
      'Çankaya',
    ]);
    expect(filterDistricts(ankara, 'POLATLI').map((d) => d.name)).toEqual([
      'Polatlı',
    ]);
  });

  it('büyük harf tuzağı — `I` sorunu', () => {
    /* `'ŞEREFLİKOÇHİSAR'.toLocaleLowerCase('tr')` noktasız ı üretir ve
       `search_name` ile eşleşmezdi; `normalizeTr` ikisini de katlıyor. */
    expect(filterDistricts(ankara, 'SEREFLIKOCHISAR')).toHaveLength(1);
  });

  it('boş sorgu tüm listeyi veriyor', () => {
    expect(filterDistricts(ankara, '   ')).toHaveLength(3);
  });
});

describe('nearestDistrict', () => {
  it('en yakın merkezi buluyor', () => {
    const sonuc = nearestDistrict(ankara, 39.93, 32.85)!;
    expect(sonuc.district.name).toBe('Çankaya');
    expect(sonuc.distanceKm).toBeLessThan(5);
  });

  it('uzaklığı da veriyor — arayüz "yaklaşık" diyebilsin', () => {
    const sonuc = nearestDistrict(ankara, 39.58, 32.15)!;
    expect(sonuc.district.name).toBe('Polatlı');
    expect(sonuc.distanceKm).toBeLessThan(2);
  });

  it('koordinatsız ilçeler atlanıyor', () => {
    /* Koordinatı olmayan bir ilçe eşleştirmeye giremez; girseydi
       `NaN` üretip listenin başına geçerdi. */
    const karisik = [ilce({ name: 'Koordinatsız' }), ...ankara];
    expect(nearestDistrict(karisik, 39.93, 32.85)!.district.name).toBe('Çankaya');
  });

  it('hiç koordinatlı ilçe yoksa `null`', () => {
    expect(nearestDistrict([ilce({ name: 'Yok' })], 39, 32)).toBeNull();
  });

  it('uzak nokta büyük uzaklık döndürüyor — arayüz iddia etmesin diye', () => {
    /* İstanbul'dan Ankara ilçelerine bakılırsa en yakın merkez bile
       sınırın çok ötesinde; o zaman ilçe adı YAZILMIYOR. */
    const sonuc = nearestDistrict(ankara, 41.0082, 28.9784)!;
    expect(sonuc.distanceKm).toBeGreaterThan(NEAREST_DISTRICT_LIMIT_KM);
  });
});
