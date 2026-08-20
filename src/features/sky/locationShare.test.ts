import { describe, it, expect } from 'vitest';
import { CITY_PARAM, readCityParam } from './locationShare';

/**
 * GECE KONUM PARAMETRESİ (§3.4).
 *
 * Adres çubuğundan yalnız şehir slug'ı okunur. Koordinat ya da cihaz
 * konumu bu modülün konusu değildir.
 */

describe('readCityParam', () => {
  it('parametreyi okuyor', () => {
    expect(readCityParam('?sehir=ankara')).toBe('ankara');
    expect(readCityParam(`?gece=2026-08-08&${CITY_PARAM}=izmir`)).toBe('izmir');
  });

  it('büyük harf ve boşluk temizleniyor', () => {
    expect(readCityParam('?sehir=%20Ankara%20')).toBe('ankara');
  });

  it('parametre yoksa null', () => {
    expect(readCityParam('')).toBeNull();
    expect(readCityParam('?gece=2026-08-08')).toBeNull();
    expect(readCityParam('?sehir=')).toBeNull();
  });

  it('biçimsiz değer eleniyor', () => {
    /* Veri adres çubuğundan geliyor; kullanıcı kurcalayabilir. */
    expect(readCityParam('?sehir=<script>')).toBeNull();
    expect(readCityParam('?sehir=a')).toBeNull();
    expect(readCityParam(`?sehir=${'x'.repeat(61)}`)).toBeNull();
  });
});
