import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AccountMenu } from './AccountMenu';

/**
 * E03/E04 REGRESYONU — ÇIKIŞ MENÜDE OLMALI VE GERÇEKTEN ÇIKMALI.
 *
 * Menüde "Çıkış yap" hiç yoktu: çıkmak isteyen kullanıcının tek yolu
 * `/hesap` sayfasına girip aşağı inmekti. Ortak bir bilgisayarda
 * oturumunu kapatmak isteyen biri için bu bir kolaylık meselesi değil.
 *
 * İki şeyi birden ölçüyoruz çünkü ikisi ayrı ayrı bozulabilir: düğmenin
 * VARLIĞI ve düğmenin gerçekten `signOut` ÇAĞIRMASI. Yalnızca metni
 * arayan bir test, hiçbir şey yapmayan bir düğmeden memnun kalırdı.
 */

const signOut = vi.fn(async () => {});
const navigate = vi.fn();
const roles = { canAccessAdmin: false };

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ signOut }),
}));

vi.mock('@/features/admin/useRoles', () => ({
  useRoles: () => roles,
}));

vi.mock('react-router', async () => {
  const gercek = await vi.importActual<typeof import('react-router')>(
    'react-router'
  );
  return { ...gercek, useNavigate: () => navigate };
});

function ciz(props: Parameters<typeof AccountMenu>[0] = {}) {
  return render(
    <MemoryRouter>
      <AccountMenu {...props} />
    </MemoryRouter>
  );
}

describe('kullanıcı menüsü', () => {
  beforeEach(() => {
    signOut.mockClear();
    navigate.mockClear();
    roles.canAccessAdmin = false;
  });

  it('tetikleyicide kullanıcı adı yazıyor', () => {
    ciz({ username: 'muratsana' });
    expect(screen.getByRole('button', { name: /muratsana/ })).toBeTruthy();
  });

  /* Kullanıcı adı henüz seçilmemiş hesapta eski etikete düşülmeli;
     boş bir düğme kimin oturumu açık sorusunu cevapsız bırakırdı. */
  it('kullanıcı adı yoksa "Hesabım" diyor', () => {
    ciz({});
    expect(screen.getByRole('button', { name: /Hesabım/ })).toBeTruthy();
  });

  it('menüde çıkış düğmesi var', async () => {
    ciz({ username: 'muratsana' });
    fireEvent.click(screen.getByRole('button', { name: /muratsana/ }));
    expect(screen.getByRole('menuitem', { name: 'Çıkış yap' })).toBeTruthy();
  });

  it('çıkış gerçekten oturumu kapatıyor ve ana sayfaya gidiyor', async () => {
    ciz({ username: 'muratsana' });
    fireEvent.click(screen.getByRole('button', { name: /muratsana/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Çıkış yap' }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  /* Public profil bağlantısı kullanıcı adı olmadan çizilemez: `/profil/`
     diye bir rota yok ve boş adrese götüren menü girişi, çalışmayan bir
     düğmeden farksız. */
  it('kullanıcı adı yokken public profil bağlantısı çizilmiyor', async () => {
    ciz({});
    fireEvent.click(screen.getByRole('button', { name: /Hesabım/ }));
    expect(screen.queryByRole('menuitem', { name: 'Public profilim' })).toBeNull();
  });

  it('yönetim girişi yalnızca yetkiliye görünüyor', async () => {
    roles.canAccessAdmin = true;
    ciz({ username: 'muratsana' });
    fireEvent.click(screen.getByRole('button', { name: /muratsana/ }));
    expect(screen.getByRole('menuitem', { name: 'Yönetim' })).toBeTruthy();
  });
});
