import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'admin@ornek.test' },
    configured: true,
    loading: false,
    session: null,
  }),
}));

vi.mock('./useRoles', () => ({
  useRoles: () => ({
    status: 'ready',
    roles: ['admin'],
    isAdmin: true,
    isModerator: true,
    canAccessAdmin: true,
    error: null,
  }),
}));

vi.mock('./records', () => ({
  fetchDashboard: () =>
    Promise.resolve({
      kullaniciToplam: 7,
      kullaniciYeni7g: 2,
      kullaniciAskida: 1,
      moderasyonBekleyen: 3,
      icerikTaslak: 4,
      icerikYayinda: 5,
      fotografBekleyen: 6,
      silmeTalebi: 1,
      auditBugun: 9,
      sonHareketler: [
        {
          zaman: '2026-08-11T09:10:00Z',
          eylem: 'content_update',
          hedef: 'content_entries',
          kim: 'admin',
        },
      ],
    }),
}));

import { AdminPage } from './AdminPage';
import { formatAdminCount } from './dashboard';

function renderPanel(path = '/admin') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminPage />
    </MemoryRouter>
  );
}

const NAV = [
  'Genel Bakış',
  'Onay Kuyruğu',
  'Kullanıcılar',
  'İçerik',
  'Moderasyon',
  'Destek',
  'Hata Günlükleri',
  'Aktivite',
  'Link Sağlığı',
  'E-posta Sağlığı',
  'Duyurular',
  'Sayfalar',
  'Ayarlar',
];

describe('StageHub tarzı admin GUI', () => {
  it('StageHub admin navigasyonunu AstroHub etiketleriyle gösterir', () => {
    renderPanel();
    const links = screen
      .getByRole('navigation', { name: 'Yönetim bölümleri' })
      .querySelectorAll('a');

    expect(Array.from(links).map((link) => link.textContent?.trim())).toEqual(
      NAV
    );
  });

  it('varsayılan sayfa genel bakışı açar', () => {
    renderPanel();
    expect(screen.getByRole('link', { name: 'Genel Bakış' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('Platformun anlık nabzı')).toBeInTheDocument();
  });

  it('eski admin içerik adresleri yeni İçerik sekmesine düşer', () => {
    renderPanel('/admin/gallery');
    expect(screen.getByRole('link', { name: 'İçerik' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('dashboard bloklarını canlı veriye bağlar ve ilgili sayfalara yollar', async () => {
    renderPanel();
    for (const heading of [
      'İçerik Akışı',
      'İş Kuyruğu',
      'Sistem Sağlığı',
      'Son Hareketler',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    expect(
      screen.getByRole('link', {
        name: /Onay bekleyen.*Kuyruktaki içerikler/s,
      })
    ).toHaveAttribute('href', '/admin/onay-kuyrugu');
    expect(
      screen.getByRole('link', {
        name: /Yeni kullanıcı \(7g\).*Son 7 günde açılan hesap/s,
      })
    ).toHaveAttribute('href', '/admin/kullanicilar');
  });

  it('gerçek admin yüzeyinin yetki kontrollü olduğunu gösterir', () => {
    renderPanel();
    expect(screen.getByText(/Yönetici/i)).toBeInTheDocument();
    expect(screen.getByText(/mevcut AstroHub kontrollerine bağlıdır/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rapor al' })).toBeDisabled();
  });

  it('dashboard sayaçlarını Türkçe biçimler ve boşta sahte sayı basmaz', () => {
    expect(formatAdminCount(1284)).toBe('1.284');
    expect(formatAdminCount(312)).toBe('312');
    expect(formatAdminCount(null)).toBe('—');
  });
});
