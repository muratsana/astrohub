import { describe, expect, it } from 'vitest';
import type { AstroPhoto } from './types';
import { COZUM_YOK, PHOTO_LICENSE } from './types';
import { photoTargetHeading } from './photoHeading';

const basePhoto: AstroPhoto = {
  id: 'photo-1',
  slug: 'splinter',
  title: 'Splinter Galaxy, Knife Edge Galaxy',
  target: {
    catalog: 'NGC 5907',
    name: 'Splinter Galaxy, Knife Edge Galaxy',
    constellation: 'Draco',
  },
  type: 'deep-sky',
  user: { username: 'muratsana', displayName: 'Murat Sana' },
  description: '',
  gradient: 'from-black to-slate-900',
  capturedAt: '2025-07-07',
  location: { label: 'Beyağaç / Denizli', visibility: 'region' },
  setup: { optic: '130mm APO', camera: 'ASI2600MM', mount: 'G11T' },
  exposures: [],
  palette: 'LRGB',
  processing: { software: [] },
  license: PHOTO_LICENSE,
  solve: COZUM_YOK,
  likes: 0,
  comments: 0,
  rating: { toplam: 0, sayi: 0 },
  year: 2025,
  city: 'Denizli',
};

describe('photoTargetHeading', () => {
  it('obje kodunu ilk sıraya alır ve ilk yaygın adı gösterir', () => {
    expect(photoTargetHeading(basePhoto)).toBe('NGC 5907 - Splinter Galaxy');
  });

  it('isim katalog koduyla aynıysa tekrarlamaz', () => {
    expect(
      photoTargetHeading({
        ...basePhoto,
        target: { ...basePhoto.target, catalog: 'M 42', name: 'M 42' },
      })
    ).toBe('M 42');
  });
});
