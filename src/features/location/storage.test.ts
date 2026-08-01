import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearStoredLocation,
  readStoredLocation,
  writeStoredLocation,
} from './storage';

/**
 * Bu kayıt KİŞİSEL VERİ taşıyor: cihaz konumunda ham koordinat, şehir
 * seçiminde kullanıcının nerede olduğu. §4.2'nin son maddesi çıkışta
 * temizlenmesini istiyor ve testin koruduğu şey bu — sessizce yerinde
 * kalması, ortak bilgisayarda bir sonraki kullanıcıya sızıntıdır.
 */
beforeEach(() => {
  localStorage.clear();
});

describe('konum kaydı', () => {
  it('yazılan kayıt geri okunuyor', () => {
    writeStoredLocation({ source: 'city', cityId: 'sivas' });
    expect(readStoredLocation()).toEqual({ source: 'city', cityId: 'sivas' });
  });

  it('kayıt yokken null', () => {
    expect(readStoredLocation()).toBeNull();
  });

  /* Bozuk JSON çökmemeli: eski sürümden kalan ya da elle kurcalanmış
     bir değer bütün uygulamayı düşürmemeli. */
  it('bozuk kayıtta null döner, çökmez', () => {
    localStorage.setItem('astrohub:location', '{bu json değil');
    expect(readStoredLocation()).toBeNull();
  });

  it('temizlik koordinatı da şehir seçimini de siliyor', () => {
    writeStoredLocation({
      source: 'device',
      latitude: 39.7477,
      longitude: 37.0179,
      label: 'Sivas',
      permission: 'granted',
    });
    clearStoredLocation();
    expect(readStoredLocation()).toBeNull();
    expect(localStorage.getItem('astrohub:location')).toBeNull();
  });

  it('kayıt yokken temizlik hata vermiyor', () => {
    expect(() => clearStoredLocation()).not.toThrow();
  });
});
