import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/AuthContext';
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
  profileAvatarUrl: (path: string | null | undefined) =>
    path ? `https://cdn.example/${path}` : null,
  useProfileByUsername: () => ({
    ...profileState,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/features/social/UserActions', () => ({
  UserActions: () => null,
}));

/*
 * AuthProvider GEREKLİ ve mock'lanmadı: sayfa FAZ 5'te şikâyet düğmesi
 * kazandı, o da oturum bağlamını okuyor. `UserActions` gibi mock'lamak
 * kolaydı ama düğmenin gerçekten çizildiğini kimse ölçmezdi — testin
 * kaçırdığı şey tam olarak buydu.
 */
function renderProfile(path = '/profil/murat') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/profil/:username" element={<ProfilePage />} />
        </Routes>
      </AuthProvider>
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

  it('profil avatarı varsa gösterir', () => {
    profileState.profile = {
      id: 'u1',
      username: 'murat',
      displayName: 'Murat Sana',
      bio: null,
      city: null,
      websiteUrl: null,
      avatarPath: 'u1/avatar.jpg',
      termsAcceptedAt: null,
    };

    renderProfile();

    expect(screen.getByAltText('Murat Sana profil fotoğrafı')).toHaveAttribute(
      'src',
      'https://cdn.example/u1/avatar.jpg'
    );
  });
});
