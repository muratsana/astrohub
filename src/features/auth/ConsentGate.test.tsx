import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ConsentGate } from './ConsentGate';
import type { Profile } from '@/services/content/profile';

/**
 * ONAY KAPISI — kimin göreceği, kimin görmeyeceği.
 *
 * Bu bileşenin değeri tam olarak KAPSAMINDA: kayıt formundaki onay
 * kutuları Google ile gireni ve eski hesapları kapsamıyor. Testler bu
 * yüzden "ekran doğru mu görünüyor" değil, "doğru kullanıcıya mı
 * görünüyor" sorusunu ölçüyor.
 */

const state = {
  user: null as { id: string } | null,
  profile: null as Profile | null,
  loading: false,
};

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: state.user, signOut: vi.fn() }),
}));

vi.mock('@/services/content/profile', () => ({
  useMyProfile: () => ({
    profile: state.profile,
    loading: state.loading,
    error: null,
    refresh: vi.fn(),
  }),
  recordConsent: vi.fn(async () => null),
}));

function profile(termsAcceptedAt: string | null): Profile {
  return {
    id: 'u1',
    username: 'murat',
    displayName: 'Murat',
    bio: null,
    city: null,
    websiteUrl: null,
    avatarPath: null,
    termsAcceptedAt,
    accountStatus: 'active',
    suspendedUntil: null,
    statusReason: null,
  };
}

function renderGate() {
  return render(
    <MemoryRouter>
      <ConsentGate />
    </MemoryRouter>
  );
}

beforeEach(() => {
  state.user = null;
  state.profile = null;
  state.loading = false;
});

describe('ConsentGate — kime görünüyor', () => {
  it('oturum yoksa hiç görünmüyor', () => {
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /*
   * Onayı olmayan kullanıcı — Google ile giren ya da 0031 öncesinde
   * açılmış bir hesap. Kapının var olma sebebi bu satır.
   */
  it('onay kaydı olmayan kullanıcıya görünüyor', () => {
    state.user = { id: 'u1' };
    state.profile = profile(null);
    renderGate();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/devam etmeden önce/i)).toBeInTheDocument();
  });

  it('onayı olan kullanıcıya görünmüyor', () => {
    state.user = { id: 'u1' };
    state.profile = profile('2026-07-31T10:00:00Z');
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /*
   * Profil yüklenirken ekranı kaplamak, onayı zaten vermiş kullanıcıya
   * her girişte yanıp sönen bir engel gösterirdi.
   */
  it('profil yüklenirken görünmüyor', () => {
    state.user = { id: 'u1' };
    state.loading = true;
    renderGate();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConsentGate — onay iki kutu birden istiyor', () => {
  beforeEach(() => {
    state.user = { id: 'u1' };
    state.profile = profile(null);
  });

  it('hiçbiri işaretli değilken devam kapalı', () => {
    renderGate();
    expect(screen.getByRole('button', { name: /onaylıyorum/i })).toBeDisabled();
  });

  it('yalnız biri işaretliyken devam hâlâ kapalı', () => {
    renderGate();
    const [terms] = screen.getAllByRole('checkbox');
    terms.click();
    expect(screen.getByRole('button', { name: /onaylıyorum/i })).toBeDisabled();
  });

  it('ikisi de işaretlenince devam açılıyor', () => {
    renderGate();
    for (const box of screen.getAllByRole('checkbox')) box.click();
    expect(
      screen.getByRole('button', { name: /onaylıyorum/i })
    ).not.toBeDisabled();
  });

  /*
   * Onay vermeden çıkamayan bir ekran, rızayı rıza olmaktan çıkarır.
   * Çıkış her koşulda açık olmalı.
   */
  it('çıkış yolu her zaman açık', () => {
    renderGate();
    expect(
      screen.getByRole('button', { name: /çıkış yap/i })
    ).not.toBeDisabled();
  });
});
