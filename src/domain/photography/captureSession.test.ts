import { describe, expect, it } from 'vitest';
import {
  enErkenGun,
  geceSayisi,
  isGunDamgasi,
  oturumMetni,
  oturumlariMetni,
  oturumuDuzelt,
  tekGece,
  toplamGece,
  type CaptureSession,
} from './captureSession';

function s(id: string, startsOn: string, endsOn: string | null = null): CaptureSession {
  return { id, startsOn, endsOn };
}

describe('isGunDamgasi', () => {
  it('YYYY-MM-DD kabul eder', () => {
    expect(isGunDamgasi('2026-01-15')).toBe(true);
  });
  it('saatli ya da bozuk değeri reddeder', () => {
    expect(isGunDamgasi('2026-01-15T21:00')).toBe(false);
    expect(isGunDamgasi('2026-13-40')).toBe(false);
    expect(isGunDamgasi('15.01.2026')).toBe(false);
    expect(isGunDamgasi('')).toBe(false);
  });
});

describe('oturumuDuzelt', () => {
  it('ters aralığı düzeltir', () => {
    expect(oturumuDuzelt(s('a', '2026-01-18', '2026-01-12'))).toEqual({
      id: 'a',
      startsOn: '2026-01-12',
      endsOn: '2026-01-18',
    });
  });
  it('eşit uçlu aralığı tek geceye indirir', () => {
    expect(oturumuDuzelt(s('a', '2026-01-12', '2026-01-12')).endsOn).toBeNull();
  });
  it('bozuk bitişi tek geceye indirir', () => {
    expect(oturumuDuzelt(s('a', '2026-01-12', 'çöp')).endsOn).toBeNull();
  });
});

describe('tekGece / geceSayisi', () => {
  it('bitişsiz oturum tek gece', () => {
    expect(tekGece(s('a', '2026-01-12'))).toBe(true);
    expect(geceSayisi(s('a', '2026-01-12'))).toBe(1);
  });
  it('aralık uçları dahil sayar', () => {
    expect(geceSayisi(s('a', '2026-01-12', '2026-01-18'))).toBe(7);
    expect(tekGece(s('a', '2026-01-12', '2026-01-18'))).toBe(false);
  });
});

describe('oturumMetni (C06)', () => {
  it('tek gece', () => {
    expect(oturumMetni(s('a', '2026-01-15'))).toBe('15 Oca 2026');
  });
  it('aynı ay aralığı — ay ve yıl bir kez', () => {
    expect(oturumMetni(s('a', '2026-01-12', '2026-01-18'))).toBe(
      '12–18 Oca 2026'
    );
  });
  it('aynı yıl farklı ay', () => {
    expect(oturumMetni(s('a', '2026-01-28', '2026-02-03'))).toBe(
      '28 Oca – 3 Şub 2026'
    );
  });
  it('farklı yıl — iki uçta da yıl', () => {
    expect(oturumMetni(s('a', '2025-12-28', '2026-01-03'))).toBe(
      '28 Ara 2025 – 3 Oca 2026'
    );
  });
});

describe('oturumlariMetni / toplamGece / enErkenGun (C06)', () => {
  const cok = [
    s('a', '2026-02-03'),
    s('b', '2026-01-12', '2026-01-18'),
  ];

  it('oturumları başlangıca göre sıralar ve virgülle listeler', () => {
    expect(oturumlariMetni(cok)).toBe('12–18 Oca 2026, 3 Şub 2026');
  });
  it('toplam geceyi tüm oturumlardan toplar', () => {
    expect(toplamGece(cok)).toBe(8); // 7 + 1
  });
  it('en erken günü verir (geriye dönük captured_at)', () => {
    expect(enErkenGun(cok)).toBe('2026-01-12');
  });
  it('boş listede boş metin ve null', () => {
    expect(oturumlariMetni([])).toBe('');
    expect(enErkenGun([])).toBeNull();
    expect(toplamGece([])).toBe(0);
  });
});
