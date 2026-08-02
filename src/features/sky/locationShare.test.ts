import { describe, it, expect } from 'vitest';
import {
  CITY_PARAM,
  readCityParam,
  shareableCityId,
  withCityParam,
} from './locationShare';
import type { ObservingLocation } from '@/features/location/types';

/**
 * PAYLAŞILABİLİR KONUM (§3.4).
 *
 * Ölçülen asıl şey GİZLİLİK KURALI: cihaz konumu hiçbir yoldan
 * bağlantıya girmemeli. `planShare.ts` aynı kararı gece planı için
 * vermişti; buradaki testler kuralın ikinci yerde de tuttuğunu
 * kilitliyor.
 */

const sehir: ObservingLocation = {
  label: 'Ankara',
  latitude: 39.93,
  longitude: 32.86,
  timeZone: 'Europe/Istanbul',
  source: 'city',
  cityId: 'ankara',
};

describe('shareableCityId', () => {
  it('seçilmiş şehir paylaşılıyor', () => {
    expect(shareableCityId(sehir)).toBe('ankara');
  });

  it('başlangıç şehri de paylaşılıyor', () => {
    /* `default` kaynağı kullanıcının hiç seçim yapmadığı hâl; yine de
       bir il merkezi ve bağlantıyı açanın aynı geceyi görmesi için
       gerekli. */
    expect(shareableCityId({ ...sehir, source: 'default' })).toBe('ankara');
  });

  it('CİHAZ KONUMU PAYLAŞILMIYOR', () => {
    /* Kuralın kendisi: bahçesinin GPS'ini yayımlamak §14.4'ün korumaya
       çalıştığı şey. `cityId` dolu olsa bile kaynak belirleyici. */
    expect(shareableCityId({ ...sehir, source: 'device' })).toBeNull();
    expect(
      shareableCityId({ ...sehir, source: 'device', cityId: 'ankara' })
    ).toBeNull();
  });

  it('şehir kimliği yoksa null', () => {
    const { cityId: _atilan, ...kimliksiz } = sehir;
    void _atilan;
    expect(shareableCityId(kimliksiz)).toBeNull();
  });
});

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

describe('withCityParam', () => {
  it('şehri adrese yazıyor, diğer parametreleri koruyor', () => {
    expect(withCityParam('/bu-gece?gece=2026-08-08', 'izmir')).toBe(
      '/bu-gece?gece=2026-08-08&sehir=izmir'
    );
  });

  it('var olan değeri değiştiriyor, ikinci kez eklemiyor', () => {
    expect(withCityParam('/bu-gece?sehir=ankara', 'izmir')).toBe(
      '/bu-gece?sehir=izmir'
    );
  });

  it('paylaşılamıyorsa parametreyi KALDIRIYOR', () => {
    /* Kalsaydı, cihaz konumuna geçen kullanıcı bir dahaki yüklemede
       eski şehre geri atılırdı — kendi seçimini geri alan bir adres. */
    expect(withCityParam('/bu-gece?sehir=ankara', null)).toBe('/bu-gece');
  });

  it('hash korunuyor', () => {
    expect(withCityParam('/bu-gece#hedefler', 'ankara')).toBe(
      '/bu-gece?sehir=ankara#hedefler'
    );
  });
});
