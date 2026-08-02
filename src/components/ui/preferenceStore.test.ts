import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  notifyPreferenceChange,
  readPreference,
  setPreferenceAdapter,
  subscribePreferences,
  writePreference,
} from './preferenceStore';

/**
 * ARAYÜZ TERCİHİ KAYIT DEFTERİ (Faz 4).
 *
 * Ölçülen asıl şey KATMAN AYRIMI: defter adaptör olmadan da çalışıyor.
 * Bu, tasarım sistemi kancasının (`useStoredChoice`) ürün katmanı
 * yokken —testlerde, önizleme derlemesinde, oturumsuz kullanıcıda—
 * hiçbir dal eklemeden çalıştığı anlamına geliyor.
 */

beforeEach(() => {
  setPreferenceAdapter(null);
});

describe('adaptör yokken', () => {
  it('okuma `null`, yazma sessiz', () => {
    /* Kanca bu durumda yalnızca `localStorage` ile çalışıyor ve
       kodunda "hesap var mı" diye bir dal taşımıyor. */
    expect(readPreference('view:galeri')).toBeNull();
    expect(() => writePreference('view:galeri', 'table')).not.toThrow();
  });
});

describe('adaptör kayıtlıyken', () => {
  it('okuma ve yazma adaptöre gidiyor', () => {
    const store = new Map<string, string>([['view:galeri', 'table']]);
    setPreferenceAdapter({
      get: (k) => store.get(k) ?? null,
      set: (k, v) => void store.set(k, v),
    });

    expect(readPreference('view:galeri')).toBe('table');
    writePreference('view:ilanlar', 'list');
    expect(store.get('view:ilanlar')).toBe('list');
  });

  it('bilinmeyen anahtar `null`', () => {
    setPreferenceAdapter({ get: () => null, set: () => {} });
    expect(readPreference('yok')).toBeNull();
  });
});

describe('abonelik', () => {
  it('adaptör kaydı aboneleri uyandırıyor', () => {
    const dinleyici = vi.fn();
    subscribePreferences(dinleyici);
    setPreferenceAdapter({ get: () => null, set: () => {} });
    expect(dinleyici).toHaveBeenCalled();
  });

  it('satırlar geldiğinde uyandırılabiliyor', () => {
    /* Hesap değeri bir ağ turu sonra geliyor; abonelik olmasaydı kanca
       onu hiç görmezdi ve özelliğin tamamı (başka cihazdaki seçim)
       çalışmazdı. */
    setPreferenceAdapter({ get: () => 'table', set: () => {} });
    const dinleyici = vi.fn();
    subscribePreferences(dinleyici);
    notifyPreferenceChange();
    expect(dinleyici).toHaveBeenCalledTimes(1);
  });

  it('abonelik iptal edilebiliyor', () => {
    const dinleyici = vi.fn();
    const iptal = subscribePreferences(dinleyici);
    iptal();
    notifyPreferenceChange();
    expect(dinleyici).not.toHaveBeenCalled();
  });
});

describe('çıkış', () => {
  it('`null` adaptör kaydı siliyor — tercihler sonraki kullanıcıya sızmıyor', () => {
    setPreferenceAdapter({ get: () => 'table', set: () => {} });
    expect(readPreference('view:galeri')).toBe('table');

    setPreferenceAdapter(null);
    expect(readPreference('view:galeri')).toBeNull();
  });
});
