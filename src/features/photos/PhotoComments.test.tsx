import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PhotoComments } from './PhotoComments';
import type { AstroPhoto } from './types';

vi.mock('@/features/site/SiteConfigContext', () => ({
  useFlag: () => true,
}));

vi.mock('@/services/content/profile', () => ({
  profileAvatarUrl: (path: string | null | undefined) =>
    path ? `https://cdn.test/avatars/${path}` : null,
}));

vi.mock('@/services/content/engagement', () => ({
  usePhotoComments: () => ({
    comments: [
      {
        id: 'c1',
        body: 'Mükemmel bir çalışma emek ve sabır, tebrikler!',
        createdAt: '2026-08-20T19:14:00+03:00',
        removalReason: undefined,
        author: {
          username: 'muratsana',
          displayName: 'Murat Sana',
          avatarPath: 'u1/avatar.jpg',
        },
      },
    ],
    loading: false,
    canWrite: true,
    busy: false,
    error: null,
    send: vi.fn(),
    remove: vi.fn(),
    currentUsername: 'muratsana',
  }),
}));

function photo(): AstroPhoto {
  return {
    id: 'p1',
    slug: 'orion',
    title: 'Orion',
    target: {
      name: 'Orion Bulutsusu',
      catalog: 'M 42',
      constellation: 'Orion',
    },
    type: 'deep-sky',
    user: { username: 'muratsana', displayName: 'Murat' },
    description: '',
    gradient: '',
    capturedAt: '2026-01-12',
    year: 2026,
    city: 'Antalya',
    location: { label: 'Antalya', visibility: 'region' },
    setup: { optic: 'RC8', camera: 'ASI2600MM', mount: 'EQ6' },
    exposures: [],
    palette: 'SHO',
    versions: [],
    calibration: { darks: 0, flats: 0, bias: 0, darkFlats: 0 },
    processing: { software: [], aiDeclared: false },
    solve: { durum: 'yok' } as AstroPhoto['solve'],
    license: 'CC',
    likes: 0,
    comments: 1,
    rating: { toplam: 0, sayi: 0 },
    editorsPick: false,
  } as AstroPhoto;
}

describe('PhotoComments', () => {
  it('yorumcu avatarını ve yorum saatini gösterir', () => {
    const { container } = render(
      <MemoryRouter>
        <PhotoComments photo={photo()} />
      </MemoryRouter>
    );

    const profileLink = screen.getByLabelText('Murat Sana profilini aç');
    const avatar = profileLink.querySelector('img');
    const time = container.querySelector('time');

    expect(avatar?.getAttribute('src')).toBe(
      'https://cdn.test/avatars/u1/avatar.jpg'
    );
    expect(time?.getAttribute('datetime')).toBe('2026-08-20T19:14:00+03:00');
    expect(time?.textContent).toMatch(/20\.08\.2026.*19:14/);
    expect(screen.getByText(/Mükemmel bir çalışma/)).toBeTruthy();
  });
});
