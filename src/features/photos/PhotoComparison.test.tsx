import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PhotoComparison } from './PhotoComparison';
import type { AstroPhoto } from './types';

/**
 * KARŞILAŞTIRMA GERÇEK THUMBNAIL GÖSTERİR (A11).
 *
 * Bölüm her iki kayıt için gradyan yer tutucu çiziyordu; kullanıcı hangi
 * kareyi karşılaştırdığını göremiyordu. Artık gerçek thumbnail (`thumbUrl`)
 * geliyor; yoksa RemoteImage yıldız alanına düşüyor. Bu test iki kaydın da
 * kendi görselini bastığını sabitliyor.
 */
const CATALOG = vi.hoisted(() => ({ items: [] as AstroPhoto[] }));

vi.mock('@/services/content/photos', () => ({
  usePhotoCatalog: () => ({
    items: CATALOG.items,
    loading: false,
    error: null,
    refresh: () => {},
  }),
}));

function foto(over: Partial<AstroPhoto>): AstroPhoto {
  return {
    slug: 'a',
    title: 'Kayıt A',
    target: { name: 'Orion', catalog: 'M 42', constellation: 'Orion' },
    type: 'deep-sky',
    user: { username: 'murat', displayName: 'Murat' },
    description: '',
    gradient: 'from-black to-black',
    capturedAt: '2026-01-01',
    location: { label: 'Ankara', visibility: 'city' },
    setup: { optic: 'RC8', camera: '2600MM', mount: 'EQ6' },
    exposures: [],
    palette: 'RGB',
    versions: [],
    calibration: { darks: 0, flats: 0, bias: 0, darkFlats: 0 },
    processing: { software: [], aiDeclared: false },
    solve: { durum: 'yok' } as AstroPhoto['solve'],
    license: 'CC',
    likes: 0,
    comments: 0,
    rating: { toplam: 0, sayi: 0 },
    editorsPick: false,
    ...over,
  } as AstroPhoto;
}

describe('PhotoComparison — gerçek thumbnail (A11)', () => {
  it('A ve B kayıtlarının gerçek görselini basar', () => {
    const a = foto({
      slug: 'kayit-a',
      title: 'Kayıt A',
      image: {
        url: 'https://cdn.test/a.jpg',
        thumbUrl: 'https://cdn.test/a-thumb.jpg',
        credit: 'x',
        licence: 'CC',
      },
    });
    const b = foto({
      slug: 'kayit-b',
      title: 'Kayıt B',
      image: {
        url: 'https://cdn.test/b.jpg',
        thumbUrl: 'https://cdn.test/b-thumb.jpg',
        credit: 'x',
        licence: 'CC',
      },
    });
    CATALOG.items = [a, b];

    render(
      <MemoryRouter>
        <PhotoComparison photo={a} />
      </MemoryRouter>
    );

    const aImg = screen.getByAltText('Kayıt A') as HTMLImageElement;
    const bImg = screen.getByAltText('Kayıt B') as HTMLImageElement;
    expect(aImg.getAttribute('src')).toBe('https://cdn.test/a-thumb.jpg');
    expect(bImg.getAttribute('src')).toBe('https://cdn.test/b-thumb.jpg');
  });
});
