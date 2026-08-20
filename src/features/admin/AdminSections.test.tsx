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

vi.mock('./livePresence', () => ({
  LivePresencePanel: () => (
    <section>
      <h2>Canlı Kullanıcılar</h2>
      <p>2 aktif</p>
    </section>
  ),
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

/*
 * Menü on üç girdiden on bire indi ve bir yeni girdi kazandı.
 *
 * Çıkarılanlar — "Hata Günlükleri", "Link Sağlığı", "E-posta Sağlığı":
 * üçünün de kendi ekranı yoktu, sırasıyla "Aktivite", "Ayarlar" ve
 * "Destek" ile aynı bileşeni çiziyorlardı.
 *
 * Eklenen — "Forum": ekran yazılmıştı ama menüde girdisi olmadığı için
 * hiçbir yoldan erişilemiyordu.
 */
const NAV = [
  'Genel Bakış',
  'Onay Kuyruğu',
  'Kullanıcılar',
  'İçerik',
  'Moderasyon',
  'Forum',
  'Destek',
  'Haftanın Fotoğrafı',
  'Aktivite',
  'Duyurular',
  'Allsky',
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
    expect(
      screen.getByRole('heading', { name: 'İçerik Akışı' })
    ).toBeInTheDocument();
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
      'Canlı Kullanıcılar',
      'Son Hareketler',
    ]) {
      expect(
        screen.getByRole('heading', { name: heading })
      ).toBeInTheDocument();
    }

    /* Sayı `moderation_queue`dan geliyor, dolayısıyla bağlantı da o
       tabloyu gösteren şikâyet kuyruğuna gitmeli — eskiden o tabloya hiç
       dokunmayan içerik onay ekranına gidiyordu. */
    expect(
      screen.getByRole('link', {
        name: /Onay bekleyen.*Kuyruktaki şikâyetler/s,
      })
    ).toHaveAttribute('href', '/admin/moderasyon');
    expect(
      screen.getByRole('link', {
        name: /Yeni kullanıcı \(7g\).*Son 7 günde açılan hesap/s,
      })
    ).toHaveAttribute('href', '/admin/kullanicilar');
  });

  it('gerçek admin yüzeyinin yetki kontrollü olduğunu gösterir', () => {
    renderPanel();
    expect(screen.getByText(/Yönetici/i)).toBeInTheDocument();
    expect(
      screen.queryByText('Platformun anlık nabzı')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Komut paleti ⌘K' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rapor al' })
    ).not.toBeInTheDocument();
  });

  it('dashboard sayaçlarını Türkçe biçimler ve boşta sahte sayı basmaz', () => {
    expect(formatAdminCount(1284)).toBe('1.284');
    expect(formatAdminCount(312)).toBe('312');
    expect(formatAdminCount(null)).toBe('—');
  });
});
