import { describe, expect, it } from 'vitest';
import { commonsImage, commonsSrcSet, commonsWidthUrl } from './commons';

describe('commonsWidthUrl', () => {
  it('FilePath adresinin width parametresini değiştirir', () => {
    const url = commonsImage('Orion Nebula.jpg', 1800);
    expect(commonsWidthUrl(url, 640)).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/Orion%20Nebula.jpg?width=640'
    );
  });

  it('Commons dışı adreste null döner — boyut sözleşmesini bilmiyoruz', () => {
    expect(
      commonsWidthUrl('https://ornek.supabase.co/storage/foto.jpg', 640)
    ).toBeNull();
  });
});

describe('commonsSrcSet', () => {
  it('genişlik başına bir kopya üretir', () => {
    const url = commonsImage('M31.jpg');
    const srcSet = commonsSrcSet(url, [320, 640]);
    expect(srcSet).toBe(
      'https://commons.wikimedia.org/wiki/Special:FilePath/M31.jpg?width=320 320w, ' +
        'https://commons.wikimedia.org/wiki/Special:FilePath/M31.jpg?width=640 640w'
    );
  });

  it('Commons dışı adreste null döner; RemoteImage tek src ile devam eder', () => {
    expect(commonsSrcSet('https://ornek.dev/a.jpg', [320])).toBeNull();
  });
});
