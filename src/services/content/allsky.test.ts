import { describe, expect, it } from 'vitest';
import {
  imageUrlFromAllskyPage,
  slugifyAllsky,
  validateAllskyCamera,
} from './allsky';

describe('allsky servis yardımcıları', () => {
  it('Allsky index adresinden canlı görüntü adresi türetir', () => {
    expect(
      imageUrlFromAllskyPage('https://ozdensobs.com/allsky/index.php')
    ).toBe('https://ozdensobs.com/allsky/image.jpg');
  });

  it('Türkçe başlıktan kararlı slug üretir', () => {
    expect(slugifyAllsky('Özdens Gözlemevi / Beypazarı')).toBe(
      'ozdens-gozlemevi-beypazari'
    );
  });

  it('http ve boş görüntü adresini reddeder', () => {
    const base = {
      slug: 'test',
      title: 'Test Allsky',
      pageUrl: 'https://example.com/allsky/index.php',
      imageUrl: 'http://example.com/image.jpg',
      location: '',
      owner: '',
      camera: '',
      lens: '',
      refreshSeconds: 15,
      position: 1,
      enabled: true,
      notes: '',
    };

    expect(validateAllskyCamera(base)).toMatch(/görüntü adresi/i);
    expect(validateAllskyCamera({ ...base, imageUrl: '' })).toMatch(
      /görüntü adresi/i
    );
  });
});
