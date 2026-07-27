import { describe, it, expect } from 'vitest';
import { safeUrl, isSafeUrl, displayHost, EXTERNAL_LINK_REL } from './url';

describe('güvenli URL (§15.4)', () => {
  it('http ve https adreslerini kabul eder', () => {
    expect(safeUrl('https://www.esa.int/')).toBe('https://www.esa.int/');
    expect(safeUrl('http://example.com/a?b=1')).toBe('http://example.com/a?b=1');
  });

  it('javascript şemasını reddeder', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('JavaScript:alert(1)')).toBeNull();
  });

  it('boşluk ve kontrol karakteriyle gizlenmiş şemayı reddeder', () => {
    expect(safeUrl(' javascript:alert(1)')).toBeNull();
    expect(safeUrl('java\tscript:alert(1)')).toBeNull();
    expect(safeUrl('java\nscript:alert(1)')).toBeNull();
  });

  it('data ve diğer şemaları reddeder', () => {
    expect(safeUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(safeUrl('file:///etc/passwd')).toBeNull();
    expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
  });

  it('göreli adresleri kabul etmez — bu fonksiyon dış bağlantılar içindir', () => {
    expect(safeUrl('/galeri')).toBeNull();
    expect(safeUrl('galeri')).toBeNull();
  });

  it('boş ve tanımsız değerlerde null döner', () => {
    expect(safeUrl('')).toBeNull();
    expect(safeUrl('   ')).toBeNull();
    expect(safeUrl(undefined)).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });

  it('isSafeUrl aynı kararı boolean olarak verir', () => {
    expect(isSafeUrl('https://astrohub.com.tr')).toBe(true);
    expect(isSafeUrl('javascript:void(0)')).toBe(false);
  });
});

describe('alan adı gösterimi', () => {
  it('www önekini atar', () => {
    expect(displayHost('https://www.nasa.gov/haber')).toBe('nasa.gov');
  });

  it('alt alan adını korur', () => {
    expect(displayHost('https://eclipse.gsfc.nasa.gov/x')).toBe(
      'eclipse.gsfc.nasa.gov'
    );
  });

  it('güvensiz adreste null döner', () => {
    expect(displayHost('javascript:alert(1)')).toBeNull();
  });
});

describe('dış bağlantı rel değeri', () => {
  it('tabnabbing ve referans sızıntısına karşı üç değeri de içerir', () => {
    expect(EXTERNAL_LINK_REL).toContain('noopener');
    expect(EXTERNAL_LINK_REL).toContain('noreferrer');
    expect(EXTERNAL_LINK_REL).toContain('nofollow');
  });
});
