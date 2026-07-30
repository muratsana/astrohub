import { describe, expect, it } from 'vitest';
import {
  clientKey,
  hitRateLimit,
  isAllowedOrigin,
  snapCoordinate,
  GRID,
  RATE_LIMIT,
} from './policy';

describe('isAllowedOrigin', () => {
  it('kendi alan adımızı ve önizleme dağıtımlarını kabul eder', () => {
    expect(isAllowedOrigin('https://astrohub.com.tr')).toBe(true);
    expect(isAllowedOrigin('https://www.astrohub.com.tr')).toBe(true);
    expect(isAllowedOrigin('https://astrohub-abc123.vercel.app')).toBe(true);
  });

  it('yabancı siteyi reddeder — kotamızla hava servisi çalıştıramaz', () => {
    expect(isAllowedOrigin('https://baskasite.com')).toBe(false);
    // Alan adını içeren ama sahibi olmayan adres de geçmemeli.
    expect(isAllowedOrigin('https://astrohub.com.tr.saldirgan.com')).toBe(false);
  });

  it('http yalnızca localhost için geçerli', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
    expect(isAllowedOrigin('http://astrohub.com.tr')).toBe(false);
  });

  it('origin başlığı yoksa engellemez — tarayıcı dışı istemciler', () => {
    // Asıl fren oran limiti ve coğrafi sınır; burada engellemek
    // güvenlik değil yanılsama üretirdi.
    expect(isAllowedOrigin(null)).toBe(true);
  });

  it('bozuk origin değeri reddedilir', () => {
    expect(isAllowedOrigin('bu bir adres değil')).toBe(false);
  });
});

describe('snapCoordinate', () => {
  it('Türkiye içindeki koordinatı ızgaraya oturtur', () => {
    // İstanbul: 41.0082, 28.9784 → en yakın 0.05 katı
    const point = snapCoordinate('41.0082', '28.9784');
    expect(point).not.toBeNull();
    expect(point!.lat).toBeCloseTo(41.0, 3);
    expect(point!.lon).toBeCloseTo(29.0, 3);

    /* Izgara katı mı: `%` kayan noktada yanıltıcı (41 % 0.05 → 0.0499…),
       bu yüzden bölüm tam sayıya yakın mı diye bakılıyor. */
    const steps = point!.lat / GRID;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
  });

  it('yakın iki konum AYNI hücreye düşer — önbellek paylaşılır', () => {
    const a = snapCoordinate('41.0082', '28.9784');
    const b = snapCoordinate('41.0121', '28.9810');
    expect(a).toEqual(b);
  });

  it('Türkiye dışını reddeder — saldırı yüzeyi daralır', () => {
    expect(snapCoordinate('48.85', '2.35')).toBeNull(); // Paris
    expect(snapCoordinate('-33.86', '151.20')).toBeNull(); // Sidney
    expect(snapCoordinate('0', '0')).toBeNull();
  });

  it('eksik ya da sayı olmayan değer reddedilir', () => {
    expect(snapCoordinate(null, '28.97')).toBeNull();
    expect(snapCoordinate('41.0', null)).toBeNull();
    expect(snapCoordinate('abc', '28.97')).toBeNull();
    expect(snapCoordinate('NaN', 'Infinity')).toBeNull();
  });

  it('sınır değerleri kapsam içinde sayılır', () => {
    expect(snapCoordinate('35.5', '25.5')).not.toBeNull();
    expect(snapCoordinate('42.5', '45.0')).not.toBeNull();
  });
});

describe('hitRateLimit', () => {
  it('pencere içindeki ilk istekleri geçirir', () => {
    const store = new Map<string, number[]>();
    for (let i = 0; i < RATE_LIMIT.max; i++) {
      expect(hitRateLimit(store, 'ip', 1_000 + i).allowed).toBe(true);
    }
  });

  it('sınırı aşınca reddeder ve ne zaman deneneceğini söyler', () => {
    const store = new Map<string, number[]>();
    const now = 10_000;
    for (let i = 0; i < RATE_LIMIT.max; i++) hitRateLimit(store, 'ip', now);

    const blocked = hitRateLimit(store, 'ip', now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(RATE_LIMIT.windowMs / 1000);
  });

  it('pencere kayınca yeniden açılır', () => {
    const store = new Map<string, number[]>();
    const now = 10_000;
    for (let i = 0; i < RATE_LIMIT.max; i++) hitRateLimit(store, 'ip', now);
    expect(hitRateLimit(store, 'ip', now).allowed).toBe(false);

    const later = now + RATE_LIMIT.windowMs + 1;
    expect(hitRateLimit(store, 'ip', later).allowed).toBe(true);
  });

  it('sayaçlar IP başına ayrı tutulur', () => {
    const store = new Map<string, number[]>();
    for (let i = 0; i < RATE_LIMIT.max; i++) hitRateLimit(store, 'a', 1000);
    expect(hitRateLimit(store, 'a', 1000).allowed).toBe(false);
    expect(hitRateLimit(store, 'b', 1000).allowed).toBe(true);
  });
});

describe('clientKey', () => {
  const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name] ?? null,
  });

  it('x-forwarded-for zincirinden gerçek istemciyi alır', () => {
    expect(
      clientKey(headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' }))
    ).toBe('203.0.113.7');
  });

  it('yoksa cf-connecting-ip kullanır', () => {
    expect(clientKey(headers({ 'cf-connecting-ip': '198.51.100.9' }))).toBe(
      '198.51.100.9'
    );
  });

  it('hiçbiri yoksa tek bir kovaya düşer', () => {
    // Kimliksiz isteklerin ortak sayaç paylaşması bilinçli: adres
    // uyduramayan istemciler birbirinin hakkını yemiş olmaz, ama
    // sınırsız da kalmaz.
    expect(clientKey(headers({}))).toBe('bilinmeyen');
  });
});
