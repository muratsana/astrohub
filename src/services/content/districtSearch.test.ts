import { describe, expect, it } from 'vitest';
import {
  searchDistricts,
  type DistrictWithProvince,
} from './districts';

/**
 * İLÇE ARAMASI — sıralamanın gerçekten kullanıcının aradığını bulması.
 *
 * Testlerin çoğu SIRA iddiası, "bulundu mu" iddiası değil: içerme testi
 * zaten her şeyi buluyor, mesele doğru olanın başa gelmesi. Kullanıcı
 * "gölb" yazdığında ilk satırda Gölbaşı olmalı.
 */
function ilce(name: string, provinceName: string): DistrictWithProvince {
  return {
    name,
    provinceName,
    provinceCode: 0,
    slug: name.toLowerCase(),
    searchName: name.toLowerCase(),
    latitude: null,
    longitude: null,
  };
}

const LISTE: DistrictWithProvince[] = [
  ilce('Gölbaşı', 'Ankara'),
  ilce('Gölbaşı', 'Adıyaman'),
  ilce('Çankaya', 'Ankara'),
  ilce('Kadıköy', 'İstanbul'),
  ilce('Iğdır Merkez', 'Iğdır'),
  ilce('Gölköy', 'Ordu'),
  ilce('Karagöl', 'Artvin'),
];

describe('searchDistricts', () => {
  it('önek eşleşmesini başa koyuyor', () => {
    const r = searchDistricts(LISTE, 'gölb');
    expect(r.map((d) => `${d.name} · ${d.provinceName}`)).toEqual([
      'Gölbaşı · Adıyaman',
      'Gölbaşı · Ankara',
    ]);
  });

  it('önekle başlayanlar, yalnızca içerenlerden önce geliyor', () => {
    // "göl" hem Gölbaşı/Gölköy (önek) hem Karagöl (içerik) ile eşleşiyor;
    // önek eşleşmeleri önde olmalı.
    const r = searchDistricts(LISTE, 'göl');
    expect(r.at(-1)?.name).toBe('Karagöl');
    expect(r.slice(0, 3).every((d) => d.name.startsWith('Göl'))).toBe(true);
  });

  it('il adıyla da aranabiliyor', () => {
    const r = searchDistricts(LISTE, 'ankara');
    expect(r.map((d) => d.name).sort()).toEqual(['Gölbaşı', 'Çankaya']);
  });

  it('il ve ilçe birlikte yazılabiliyor', () => {
    // "ankara gölb" iki parçaya bölünüyor; tek birleşik dize aransaydı
    // "ankaragölb" aranır ve hiçbir şey bulunmazdı.
    const r = searchDistricts(LISTE, 'ankara gölb');
    expect(r).toHaveLength(1);
    expect(r[0].provinceName).toBe('Ankara');
  });

  it('Türkçe harf katlaması iki yönlü çalışıyor', () => {
    // "golbasi" → Gölbaşı; "cankaya" → Çankaya.
    expect(searchDistricts(LISTE, 'golbasi')).toHaveLength(2);
    expect(searchDistricts(LISTE, 'cankaya')[0].name).toBe('Çankaya');
  });

  it('büyük I harfi doğru katlanıyor', () => {
    /* `toLowerCase()` tr yerelinde 'IĞDIR' → 'ığdır' üretir ve
       `search_name` sütunundaki 'igdir' ile eşleşmez. */
    expect(searchDistricts(LISTE, 'IĞDIR')[0].provinceName).toBe('Iğdır');
    expect(searchDistricts(LISTE, 'igdir')[0].provinceName).toBe('Iğdır');
  });

  it('boş sorgu hiçbir şey döndürmüyor', () => {
    // 974 satırlık bir liste açmak öneri değil, duvar olurdu.
    expect(searchDistricts(LISTE, '')).toEqual([]);
    expect(searchDistricts(LISTE, '   ')).toEqual([]);
  });

  it('sonuç sayısını sınırlıyor', () => {
    expect(searchDistricts(LISTE, 'a', 2)).toHaveLength(2);
  });
});
