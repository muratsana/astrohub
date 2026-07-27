import { describe, it, expect } from 'vitest';
import { cityRouteSlug, cityIdFromPath, cityRoutePaths } from './routes';
import { cities } from '@/features/location/cities';

describe('şehir SEO adresleri (§20)', () => {
  it('şehir kimliğinden adres üretir', () => {
    expect(cityRouteSlug('ankara')).toBe('ankara-astronomi-etkinlikleri');
  });

  it('adresten şehir kimliğini geri okur', () => {
    expect(cityIdFromPath('/ankara-astronomi-etkinlikleri')).toBe('ankara');
    expect(cityIdFromPath('/izmir-astronomi-etkinlikleri/')).toBe('izmir');
  });

  it('tanımsız şehri kabul etmez — uydurma adres 404 almalı', () => {
    expect(cityIdFromPath('/atlantis-astronomi-etkinlikleri')).toBeNull();
  });

  it('desene uymayan adreslerde null döner', () => {
    expect(cityIdFromPath('/etkinlikler')).toBeNull();
    expect(cityIdFromPath('/ankara')).toBeNull();
    expect(cityIdFromPath('/')).toBeNull();
  });

  it('her şehir için tam olarak bir yol üretir', () => {
    expect(cityRoutePaths).toHaveLength(cities.length);
    expect(new Set(cityRoutePaths).size).toBe(cities.length);
  });

  it('üretilen her yol geri okunduğunda aynı şehri verir', () => {
    for (const city of cities) {
      expect(cityIdFromPath(`/${cityRouteSlug(city.id)}`)).toBe(city.id);
    }
  });
});
