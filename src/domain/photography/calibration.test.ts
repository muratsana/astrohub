import { describe, it, expect } from 'vitest';
import {
  calibrationPlan,
  rangeGain,
  stackNoiseFactor,
  type CalibrationKind,
} from './calibration';

/**
 * KALİBRASYON REHBERİ (§14.2).
 *
 * Ölçülenler:
 *  1. Rehber KURULUMA göre değişiyor — dark-flat kullanan CMOS'ta bias
 *     listeye hiç girmiyor (yarım çalışan adım göstermemek).
 *  2. Azalan getiri formülü (√N) elle hesaplanmış sayılarla doğrulanıyor.
 *  3. Her adım eşleşme koşullarını ve tipik hatasını taşıyor — rehberin
 *     asıl değeri sayıda değil, "neyin neyle eşleşmesi gerektiği"nde.
 */

const turler = (input: Parameters<typeof calibrationPlan>[0]): CalibrationKind[] =>
  calibrationPlan(input).map((s) => s.kind);

describe('calibrationPlan', () => {
  it('CMOS + dark-flat: bias listeye girmiyor', () => {
    expect(turler({ sensor: 'cmos', useDarkFlats: true })).toEqual([
      'dark',
      'flat',
      'dark-flat',
    ]);
  });

  it('CMOS, dark-flat yoksa bias gerekiyor', () => {
    expect(turler({ sensor: 'cmos', useDarkFlats: false })).toEqual([
      'bias',
      'dark',
      'flat',
    ]);
  });

  it('CCD’de klasik üçlü — dark-flat seçilse bile bias duruyor', () => {
    /* Bias’ı düşüren şey sensör türü değil, dark-flat’ın ofseti zaten
       içermesi; ama CCD kullanan biri için klasik akış korunuyor. */
    expect(turler({ sensor: 'ccd', useDarkFlats: false })).toEqual([
      'bias',
      'dark',
      'flat',
    ]);
    expect(turler({ sensor: 'ccd', useDarkFlats: true })).toContain('bias');
  });

  it('her adımın eşleşme koşulu ve tipik hatası yazılı', () => {
    for (const step of calibrationPlan({ sensor: 'ccd', useDarkFlats: true })) {
      expect(step.mustMatch.length, step.kind).toBeGreaterThan(0);
      expect(step.pitfall.length, step.kind).toBeGreaterThan(0);
      expect(step.countRange[0]).toBeLessThan(step.countRange[1]);
    }
  });

  it('flat optik yola bağlı: odak ve dönüş açısı eşleşme listesinde', () => {
    const flat = calibrationPlan({ sensor: 'cmos', useDarkFlats: true }).find(
      (s) => s.kind === 'flat'
    )!;
    expect(flat.mustMatch.join(' ')).toMatch(/Odak/);
    expect(flat.mustMatch.join(' ')).toMatch(/dönüş açısı/);
  });

  it('dark sıcaklığa bağlı ve soğutmasız kamera uyarısı var', () => {
    const dark = calibrationPlan({ sensor: 'cmos', useDarkFlats: false }).find(
      (s) => s.kind === 'dark'
    )!;
    expect(dark.mustMatch.join(' ')).toMatch(/sıcaklığı/i);
    expect(dark.pitfall).toMatch(/Soğutmasız/);
  });
});

describe('stackNoiseFactor', () => {
  it('√N — elle hesaplanmış değerler', () => {
    expect(stackNoiseFactor(1)).toBe(1);
    expect(stackNoiseFactor(16)).toBe(4);
    expect(stackNoiseFactor(64)).toBe(8);
    expect(stackNoiseFactor(100)).toBe(10);
  });

  it('geçersiz kare sayısı hata veriyor', () => {
    expect(() => stackNoiseFactor(0)).toThrow();
    expect(() => stackNoiseFactor(-4)).toThrow();
    expect(() => stackNoiseFactor(2.5)).toThrow();
  });
});

describe('rangeGain', () => {
  it('dört katı kare, iki katı iyileşme', () => {
    /* Azalan getirinin somut hâli: 50 → 200 bias, emek dört kat,
       gürültü kazancı iki kat. */
    expect(rangeGain([50, 200])).toBeCloseTo(2, 6);
  });

  it('20 → 50 kare ~1,58 kat', () => {
    expect(rangeGain([20, 50])).toBeCloseTo(Math.sqrt(2.5), 6);
  });
});
