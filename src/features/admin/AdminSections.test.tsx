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

import { AdminPage } from './AdminPage';

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

  it('StageHub dashboard bloklarını taşır', () => {
    renderPanel();
    for (const heading of [
      'İçerik Akışı',
      'İş Kuyruğu',
      'Sistem Sağlığı',
      'Son Hareketler',
      'Son 7 günün en çok tıklananları',
      'Zamanlanmış işler',
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }
  });

  it('gerçek admin yüzeyinin yetki kontrollü olduğunu gösterir', () => {
    renderPanel();
    expect(screen.getByText(/Yönetici/i)).toBeInTheDocument();
    expect(screen.getByText(/mevcut AstroHub kontrollerine bağlıdır/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rapor al' })).toBeDisabled();
  });
});
