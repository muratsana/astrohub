import { describe, expect, it } from 'vitest';
import {
  fitWithin,
  needsResize,
  storagePath,
  extensionOf,
  DISPLAY_MAX_EDGE,
  THUMB_MAX_EDGE,
} from './resize';

describe('fitWithin', () => {
  it('uzun kenarı hedefe indirir, oranı korur', () => {
    // 6000×4000 (3:2) → uzun kenar 2048
    const result = fitWithin({ width: 6000, height: 4000 }, DISPLAY_MAX_EDGE);
    expect(result.width).toBe(2048);
    expect(result.height).toBe(1365);
    expect(result.width / result.height).toBeCloseTo(1.5, 2);
  });

  it('dikey kareyi de doğru ölçekler', () => {
    const result = fitWithin({ width: 4000, height: 6000 }, DISPLAY_MAX_EDGE);
    expect(result.height).toBe(2048);
    expect(result.width).toBe(1365);
  });

  /*
   * Büyütme yok: küçük bir kareyi hedefe kadar şişirmek dosyayı büyütür ve
   * tek bir yeni piksel bilgisi eklemez.
   */
  it('zaten küçük olanı büyütmez', () => {
    const source = { width: 800, height: 600 };
    expect(fitWithin(source, DISPLAY_MAX_EDGE)).toEqual(source);
  });

  it('tam hedefte olanı değiştirmez', () => {
    const source = { width: DISPLAY_MAX_EDGE, height: 1000 };
    expect(fitWithin(source, DISPLAY_MAX_EDGE)).toEqual(source);
  });

  /*
   * Aşırı ince bir panorama küçültülürken kısa kenar 0'a yuvarlanabilir;
   * canvas 0 genişlikte çizemez ve oran hesabı sıfıra bölerdi.
   */
  it('kenarı asla 1 pikselin altına düşürmez', () => {
    const result = fitWithin({ width: 20000, height: 30 }, THUMB_MAX_EDGE);
    expect(result.width).toBe(640);
    expect(result.height).toBeGreaterThanOrEqual(1);
  });

  it('bozuk ölçüde sıfır döner, çökmez', () => {
    expect(fitWithin({ width: 0, height: 100 }, 640)).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe('needsResize', () => {
  it('yalnızca hedefi aşanlarda true', () => {
    expect(needsResize({ width: 4000, height: 3000 }, 2048)).toBe(true);
    expect(needsResize({ width: 1600, height: 1200 }, 2048)).toBe(false);
    expect(needsResize({ width: 2048, height: 100 }, 2048)).toBe(false);
  });
});

describe('storagePath', () => {
  /*
   * Yolun ilk parçası kullanıcı kimliği: nesne politikaları sahipliği
   * oradan okuyor (0012). Değişirse bir kullanıcı başkasının klasörüne
   * yazabilir hâle gelir.
   */
  it('kullanıcı kimliğiyle başlar', () => {
    const path = storagePath('user-1', 'photo-9', 'display');
    expect(path.startsWith('user-1/')).toBe(true);
    expect(path).toBe('user-1/photo-9/display.jpg');
  });

  it('orijinalde biçim uzantısı korunur', () => {
    expect(storagePath('u', 'p', 'original', 'tif')).toBe('u/p/original.tif');
  });

  it('kullanıcının dosya adı yola hiç girmez', () => {
    // Yol yalnızca kimliklerden kuruluyor; ad kaynaklı sürprizler
    // (boşluk, Türkçe karakter, ../) baştan eleniyor.
    const path = storagePath('u', 'p', 'thumb');
    expect(path).not.toContain(' ');
    expect(path).not.toContain('..');
  });
});

describe('extensionOf', () => {
  it('uzantıyı küçük harfe indirir', () => {
    expect(extensionOf('Gece.JPG')).toBe('jpg');
    expect(extensionOf('yigin.tif')).toBe('tif');
  });

  it('uzantı yoksa varsayılana düşer', () => {
    expect(extensionOf('dosya')).toBe('jpg');
    expect(extensionOf('dosya', 'png')).toBe('png');
  });

  it('nokta içeren adlarda son uzantıyı alır', () => {
    expect(extensionOf('M31.final.v2.jpeg')).toBe('jpeg');
  });
});
