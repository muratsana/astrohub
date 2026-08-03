import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';

const photoCatalog = vi.hoisted(() => ({ items: [] as unknown[] }));
const profileState = vi.hoisted(() => ({
  profile: null as unknown,
  loading: false,
  error: null as string | null,
}));

vi.mock('@/services/content/photos', () => ({
  usePhotoCatalog: () => photoCatalog,
}));

vi.mock('@/services/content/profile', () => ({
  useProfileByUsername: () => ({
    ...profileState,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/features/social/UserActions', () => ({
  UserActions: () => null,
}));

function renderProfile(path = '/profil/murat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/profil/:username" element={<ProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    photoCatalog.items = [];
    profileState.profile = null;
    profileState.loading = false;
    profileState.error = null;
  });

  it('fotoğrafı olmasa da public profil kaydını gösterir', () => {
    profileState.profile = {
      id: 'u1',
      username: 'murat',
      displayName: 'Murat Sana',
      bio: 'Derin uzay fotoğrafları.',
      city: 'Ankara',
      websiteUrl: 'https://astrofoto.example',
      avatarPath: null,
      termsAcceptedAt: null,
    };

    renderProfile();

    expect(screen.getByRole('heading', { name: 'Murat Sana' })).toBeInTheDocument();
    expect(screen.getByText('Derin uzay fotoğrafları.')).toBeInTheDocument();
    expect(screen.getByText('Henüz yayınlanmış fotoğraf yok.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Portfolyo' })).toHaveAttribute(
      'href',
      'https://astrofoto.example'
    );
  });
});
