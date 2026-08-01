import { describe, expect, it } from 'vitest';
import { relativeTime, clockTime } from './relativeTime';

const NOW = new Date('2026-08-01T12:00:00Z').getTime();

function agoIso(ms: number): string {
  return new Date(NOW - ms).toISOString();
}

describe('relativeTime', () => {
  it('bir dakikadan yeniyi "az önce" der', () => {
    expect(relativeTime(agoIso(5_000), NOW)).toBe('az önce');
  });

  /*
   * Sunucu saati tarayıcı saatinden birkaç saniye ileri olduğunda, yeni
   * gelen bildirim "3 saniye sonra" diye yazılıyordu. İleri sapma da
   * "az önce" sayılıyor.
   */
  it('ileri tarihli küçük sapmayı "az önce" sayar', () => {
    expect(relativeTime(new Date(NOW + 3_000).toISOString(), NOW)).toBe(
      'az önce'
    );
  });

  it('dakika, saat ve gün ölçeklerini ayırır', () => {
    expect(relativeTime(agoIso(5 * 60_000), NOW)).toContain('dakika');
    expect(relativeTime(agoIso(3 * 3_600_000), NOW)).toContain('saat');
    expect(relativeTime(agoIso(3 * 86_400_000), NOW)).toContain('gün');
  });

  /* Yedi günden eskisi göreceli yazılmıyor: "34 gün önce" okuyan kişi
     takvim hesabı yapmak zorunda kalıyor. */
  it('yedi günden eskisini mutlak tarihe çevirir', () => {
    const value = relativeTime(agoIso(40 * 86_400_000), NOW);
    expect(value).not.toContain('önce');
    expect(value).toContain('2026');
  });

  it('geçersiz damgada boş dize döndürür', () => {
    expect(relativeTime('bu bir tarih değil', NOW)).toBe('');
  });
});

describe('clockTime', () => {
  it('saat ve dakika verir', () => {
    expect(clockTime('2026-08-01T09:05:00')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('geçersiz damgada boş dize döndürür', () => {
    expect(clockTime('yok')).toBe('');
  });
});
