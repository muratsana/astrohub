import { describe, expect, it } from 'vitest';
import {
  extractCatalogCodes,
  guessTargetFromFilename,
  normalizeCode,
  resolveByCode,
} from './codeGuess';

describe('normalizeCode — veritabanıyla aynı kural', () => {
  it('boşluk ve tireyi atıp küçültüyor', () => {
    expect(normalizeCode('NGC 7000')).toBe('ngc7000');
    expect(normalizeCode('ngc-7000')).toBe('ngc7000');
    expect(normalizeCode('  M 31 ')).toBe('m31');
    expect(normalizeCode('Sh2-190')).toBe('sh2190');
  });

  /*
   * Türkçe yerel ayarla küçültme "I" harfini "ı" yapar ve "IC 1805"
   * kodunu "ıc1805"e çevirirdi — veritabanındaki `lower()` ise "ic1805"
   * üretiyor. İkisi ayrışırsa aynı kod istemcide bir objeye, sunucuda
   * başkasına çözülür.
   */
  it('IC kodunu Türkçe küçültmeyle bozmuyor', () => {
    expect(normalizeCode('IC 1805')).toBe('ic1805');
  });
});

describe('resolveByCode — çoklu katalog karşılıkları', () => {
  it('aynı objeyi farklı kataloglardan buluyor', () => {
    const m31 = resolveByCode('M 31');
    expect(m31).not.toBeNull();
    // NGC 224, M 31'in alias'ı — ikisi de AYNI kayda çözülmeli.
    expect(resolveByCode('NGC 224')?.slug).toBe(m31!.slug);
    expect(resolveByCode('ngc224')?.slug).toBe(m31!.slug);
  });

  it('boşluk ve tire farkını yok sayıyor', () => {
    const a = resolveByCode('NGC7000');
    expect(a).not.toBeNull();
    expect(resolveByCode('NGC 7000')?.slug).toBe(a!.slug);
    expect(resolveByCode('ngc-7000')?.slug).toBe(a!.slug);
  });

  it('katalogda olmayan kodu uydurmuyor', () => {
    expect(resolveByCode('NGC 99999')).toBeNull();
    expect(resolveByCode('')).toBeNull();
    expect(resolveByCode('2024')).toBeNull();
  });
});

describe('extractCatalogCodes — dosya adı ayrıştırma', () => {
  it('yaygın adlandırmaları yakalıyor', () => {
    expect(extractCatalogCodes('M31_L_300s.fit')).toContain('M31');
    expect(extractCatalogCodes('NGC7000-Ha.tif')).toContain('NGC7000');
    expect(extractCatalogCodes('IC 1805 final.jpg')).toContain('IC1805');
  });

  /*
   * ASIL RİSK BURADA. Dosya adları tarih, poz süresi, kamera modeli ve
   * sürüm numarası taşıyor; bunların hiçbiri katalog kodu değil.
   */
  it('tarihi ve poz süresini kod sanmıyor', () => {
    const kodlar = extractCatalogCodes('2024-07-11_300s_v2.fit');
    for (const kod of kodlar) {
      expect(resolveByCode(kod), `${kod} yanlışlıkla çözüldü`).toBeNull();
    }
  });

  it('kamera modelinin içinden kod çıkarmıyor', () => {
    // "ASI2600MC" içinde "c2600" ya da "i2600" aranmamalı: önek bir
    // kelimenin ORTASINDA başlayamaz.
    expect(extractCatalogCodes('ASI2600MC_gain100.fit')).toEqual([]);
  });

  it('sırayı koruyor — dosya adında önce geçen önce', () => {
    const kodlar = extractCatalogCodes('M31_L_300s_c_10.fit');
    expect(kodlar[0]).toBe('M31');
  });
});

describe('guessTargetFromFilename', () => {
  it('dosya adından hedefi buluyor', () => {
    expect(guessTargetFromFilename('M42_Orion_300s.fit')?.catalog).toBe('M 42');
    expect(guessTargetFromFilename('ngc 7000 v3.jpg')?.catalog).toBe('NGC 7000');
  });

  it('alias üzerinden de buluyor', () => {
    // Kullanıcı NGC kodunu yazmışsa M kaydına düşmeli.
    const m31 = resolveByCode('M 31');
    expect(guessTargetFromFilename('NGC224_LRGB.tif')?.slug).toBe(m31!.slug);
  });

  /*
   * Tahmin edememek BAŞARISIZLIK DEĞİL — kullanıcı alanı kendi doldurur.
   * Yanlış tahmin ise gerçek bir zarar: künyeye başka bir gök cismi
   * yazılmış olur.
   */
  it('kod taşımayan dosyada sessizce null dönüyor', () => {
    expect(guessTargetFromFilename('gece_calismasi_final.jpg')).toBeNull();
    expect(guessTargetFromFilename('IMG_2024.jpg')).toBeNull();
    expect(guessTargetFromFilename('DSC00123.ARW')).toBeNull();
  });

  it('uzantıyı kod kaynağı saymıyor', () => {
    expect(guessTargetFromFilename('gece.fit')).toBeNull();
    expect(guessTargetFromFilename('gece.cr2')).toBeNull();
  });
});
