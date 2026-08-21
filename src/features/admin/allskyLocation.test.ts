import { describe, expect, it } from 'vitest';
import type { DistrictWithProvince } from '@/services/content/districts';
import {
  allskyLocationSuggestions,
  formatAllskyLocation,
} from './allskyLocation';

function district(
  name: string,
  provinceName: string,
  provinceCode = 6
): DistrictWithProvince {
  return {
    provinceCode,
    provinceName,
    name,
    slug: name.toLocaleLowerCase('tr-TR'),
    searchName: name.toLocaleLowerCase('tr-TR'),
    latitude: null,
    longitude: null,
  };
}

describe('allskyLocationSuggestions', () => {
  it('ilçe verisini Allsky kayıt formatına çeviriyor', () => {
    expect(formatAllskyLocation(district('Beypazarı', 'Ankara'))).toBe(
      'Ankara, Beypazarı'
    );
  });

  it('yazılan metne göre veritabanı konumlarını öneriyor', () => {
    const results = allskyLocationSuggestions(
      [
        district('Beypazarı', 'Ankara'),
        district('Çankaya', 'Ankara'),
        district('Beydağ', 'İzmir', 35),
      ],
      'bey'
    );

    expect(results.map((result) => result.value)).toEqual([
      'Ankara, Beypazarı',
      'İzmir, Beydağ',
    ]);
  });

  it('boş aramada öneri üretmiyor', () => {
    expect(allskyLocationSuggestions([district('Beypazarı', 'Ankara')], ' ')).toEqual(
      []
    );
  });
});
