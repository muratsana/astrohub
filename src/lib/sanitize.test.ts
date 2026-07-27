import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  sanitizeText,
  metaDescription,
  sanitizeUsername,
} from './sanitize';

describe('HTML sökme', () => {
  it('etiketleri atar, içeriği bırakır', () => {
    expect(stripHtml('<b>Merhaba</b> dünya')).toBe('Merhaba dünya');
    expect(stripHtml('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('küçüktür işaretini metin olarak bırakır', () => {
    expect(stripHtml('3 < 5 ve 7 > 2')).toBe('3 < 5 ve 7 > 2');
  });
});

describe('metin temizleme', () => {
  it('görünmez karakterleri atar', () => {
    // \u200B: sıfır genişlikli boşluk — "admin" taklidinin klasik aracı
    expect(sanitizeText('adm\u200Bin')).toBe('admin');
    // \u202E: sağdan sola geçersiz kılma
    expect(sanitizeText('sag\u202Edan')).toBe('sagdan');
  });

  it('kontrol karakterlerini atar', () => {
    expect(sanitizeText('deneme\u0000metni')).toBe('denememetni');
    expect(sanitizeText('deneme\u007Fmetni')).toBe('denememetni');
  });

  it('tek satır modunda tüm boşlukları teke indirir', () => {
    expect(sanitizeText('  çok   boşluklu\n\nmetin  ')).toBe(
      'çok boşluklu metin'
    );
  });

  it('çok satır modunda paragraf ayrımını korur', () => {
    expect(sanitizeText('bir\n\n\n\niki', { multiline: true })).toBe(
      'bir\n\niki'
    );
  });

  it('çok satır modunda satır sonu öncesi boşlukları temizler', () => {
    expect(sanitizeText('bir   \niki', { multiline: true })).toBe('bir\niki');
  });

  it('uzunluk sınırında kelime ortasından kesmez', () => {
    const out = sanitizeText('kısa bir cümle ama sınırı aşıyor', {
      maxLength: 20,
    });
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(21);
    expect(out).not.toContain('sını…');
  });

  it('boşluksuz uzun metni sert keser', () => {
    const out = sanitizeText('a'.repeat(50), { maxLength: 10 });
    expect(out).toBe(`${'a'.repeat(10)}…`);
  });

  it('boş girdide boş dize döner', () => {
    expect(sanitizeText(undefined)).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText('')).toBe('');
  });
});

describe('meta açıklaması (§16.2)', () => {
  it('155 karakterde kırpar', () => {
    const long = 'kelime '.repeat(60);
    const out = metaDescription(long);
    expect(out.length).toBeLessThanOrEqual(156);
    expect(out.endsWith('…')).toBe(true);
  });

  it('kısa metni olduğu gibi bırakır', () => {
    expect(metaDescription('Kısa açıklama.')).toBe('Kısa açıklama.');
  });

  it('etiketleri temizler', () => {
    expect(metaDescription('<p>Açıklama</p>')).toBe('Açıklama');
  });
});

describe('kullanıcı adı temizleme', () => {
  it('yalnızca harf, rakam, alt çizgi ve tireyi bırakır', () => {
    expect(sanitizeUsername('gökhan_uzun')).toBe('gkhan_uzun');
    expect(sanitizeUsername('deep-sky_42')).toBe('deep-sky_42');
    expect(sanitizeUsername('admin/../root')).toBe('adminroot');
  });

  it('görünmez karakterle yapılan taklidi engeller', () => {
    expect(sanitizeUsername('adm\u200Bin')).toBe('admin');
  });

  it('32 karakterde keser', () => {
    expect(sanitizeUsername('a'.repeat(60))).toHaveLength(32);
  });
});
