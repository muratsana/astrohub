import { describe, it, expect } from 'vitest';
import {
  exposureRowSeconds,
  totalIntegrationSeconds,
  formatIntegration,
} from './integration';

describe('entegrasyon hesabı (§7.4)', () => {
  it('tek satırın süresini hesaplar', () => {
    expect(exposureRowSeconds({ filter: 'Ha', frames: 20, exposureSeconds: 300 })).toBe(6000);
  });

  it('negatif değerlerde hata verir', () => {
    expect(() =>
      exposureRowSeconds({ filter: 'L', frames: -1, exposureSeconds: 60 })
    ).toThrow();
  });

  it('toplam entegrasyonu satırlardan toplar', () => {
    const rows = [
      { filter: 'Ha', frames: 24, exposureSeconds: 300 }, // 7200
      { filter: 'OIII', frames: 18, exposureSeconds: 300 }, // 5400
      { filter: 'SII', frames: 12, exposureSeconds: 300 }, // 3600
    ];
    expect(totalIntegrationSeconds(rows)).toBe(16200); // 4.5 saat
  });

  it('boş listede 0 döner', () => {
    expect(totalIntegrationSeconds([])).toBe(0);
  });

  it('süreyi Türkçe biçimlendirir', () => {
    expect(formatIntegration(45)).toBe('45 sn');
    expect(formatIntegration(45 * 60)).toBe('45 dk');
    expect(formatIntegration(16200)).toBe('4 sa 30 dk');
    expect(formatIntegration(7200)).toBe('2 sa');
  });
});
