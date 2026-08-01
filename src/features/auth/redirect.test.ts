import { describe, it, expect, afterEach, vi } from 'vitest';
import { authRedirect, isLocalOrigin } from './redirect';

/**
 * Bu testler bir GÜVENLİK sınırını koruyor: dönüş adresi yalnızca
 * tanınan kökenlere üretilebilir. Kırılırsa OAuth kodu yabancı bir
 * sayfaya teslim edilebilir hâle gelir — bu yüzden "tanınmayan köken"
 * durumu tek tek yazıldı, tek bir örnekle geçiştirilmedi.
 */

/** `window.location.origin`'i geçici olarak değiştirir. */
function setOrigin(origin: string) {
  Object.defineProperty(window, 'location', {
    value: { origin },
    writable: true,
    configurable: true,
  });
}

const realLocation = window.location;

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  });
});

describe('isLocalOrigin', () => {
  it('yerel kökenleri tanır', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true);
    expect(isLocalOrigin('http://127.0.0.1:4173')).toBe(true);
    expect(isLocalOrigin('http://[::1]:5173')).toBe(true);
  });

  it('yabancı kökenleri reddeder', () => {
    expect(isLocalOrigin('https://astrohub.com.tr')).toBe(false);
    expect(isLocalOrigin('https://evil.example')).toBe(false);
  });

  /*
   * "localhost" İÇEREN ad yerel DEĞİLDİR. `localhost.evil.example`
   * saldırganın alan adıdır; alt dize araması yapan bir kontrol buna
   * kanardı. Kontrol `hostname` TAM eşleşmesi üzerinden.
   */
  it('adında localhost geçen yabancı alan adına kanmaz', () => {
    expect(isLocalOrigin('https://localhost.evil.example')).toBe(false);
    expect(isLocalOrigin('https://notlocalhost')).toBe(false);
  });

  it('bozuk girdide çökmez', () => {
    expect(isLocalOrigin('bu bir adres değil')).toBe(false);
    expect(isLocalOrigin('')).toBe(false);
  });
});

describe('authRedirect', () => {
  it('VITE_SITE_URL tanımlıysa onu kullanır', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://astrohub.com.tr');
    expect(authRedirect('/giris')).toBe('https://astrohub.com.tr/giris');
  });

  it('sondaki eğik çizgiyi çift eğik çizgiye çevirmez', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://astrohub.com.tr///');
    expect(authRedirect('/panel')).toBe('https://astrohub.com.tr/panel');
  });

  /*
   * ÜRETİM KÖKENİ SAYFANIN KÖKENİNİ EZER: paket yabancı bir alan adından
   * sunulsa bile adres derlemeye gömülü olana çıkar.
   */
  it('VITE_SITE_URL varken sayfanın kökenine bakmaz', () => {
    vi.stubEnv('VITE_SITE_URL', 'https://astrohub.com.tr');
    setOrigin('https://evil.example');
    expect(authRedirect('/panel')).toBe('https://astrohub.com.tr/panel');
  });

  it('VITE_SITE_URL yokken yerel kökene izin verir', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    setOrigin('http://localhost:5173');
    expect(authRedirect('/giris')).toBe('http://localhost:5173/giris');
  });

  /* Asıl korunan davranış: tanınmayan kökende adres ÜRETİLMEZ. */
  it('VITE_SITE_URL yokken yabancı köken için adres üretmez', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    setOrigin('https://evil.example');
    expect(authRedirect('/panel')).toBeUndefined();
  });

  /* Boş dize değil `undefined`: '' göreli adres üretir ve gönderilir. */
  it('reddederken boş dize değil undefined döner', () => {
    vi.stubEnv('VITE_SITE_URL', '');
    setOrigin('https://evil.example');
    expect(authRedirect('/giris')).not.toBe('/giris');
  });
});
