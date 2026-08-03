import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * YÖNETİCİ OTURUMUYLA PANEL — sidebar'ın gerçekten ne açtığı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN OTURUM TAKLİT EDİLİYOR
 *
 * Panelin asıl gövdesi yalnızca yetkili bir oturumda çiziliyor; diğer
 * testler "kurulum yok" durumunu ölçüyor. Yani panelin ASIL yüzeyi
 * — yönetim bölümleri ve içlerindeki
 * paneller — hiçbir test tarafından görülmüyordu.
 *
 * Gerçek bir hesap açmak üretim veritabanına dokunmak demekti. `useAuth`
 * ve `useRoles` taklit ediliyor: ikisi de yalnızca "kim bu ve neye
 * yetkisi var" sorusunu cevaplıyor, altlarındaki bileşenler değişmiyor.
 *
 * YETKİ SINIRI BU TESTLE ÖLÇÜLMÜYOR ve ölçülemez — o sınır veritabanında
 * ve RLS matrisinde ölçülüyor. Burada ölçülen tek şey ARAYÜZ YAPISI:
 * hangi yönetim bölümü hangi paneli açıyor.
 */

vi.mock('@/features/auth/AuthContext', async () => {
  const gercek = await vi.importActual<Record<string, unknown>>(
    '@/features/auth/AuthContext'
  );
  return {
    ...gercek,
    useAuth: () => ({
      user: { id: 'u1', email: 'admin@ornek.test' },
      configured: true,
      loading: false,
      session: null,
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('./useRoles', async () => {
  const gercek = await vi.importActual<Record<string, unknown>>('./useRoles');
  return {
    ...gercek,
    useRoles: () => ({
      status: 'ready',
      roles: ['admin'],
      isAdmin: true,
      isModerator: true,
      canAccessAdmin: true,
      error: null,
    }),
  };
});

import { AdminPage } from './AdminPage';

function renderPanel(path = '/admin') {
  /*
   * `retry: false`: katalog panelleri react-query kullanıyor ve
   * yapılandırma olmadığı için sorgular düşüyor. Varsayılan yeniden
   * deneme testi yavaşlatır, sonucu değiştirmez.
   */
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <AdminPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Sayfadaki panel başlıklarını toplar. */
function panelBasliklari(): string[] {
  return Array.from(document.querySelectorAll('h2, h3'))
    .map((h) => h.textContent?.trim() ?? '')
    .filter(Boolean);
}

const BOLUMLER = [
  'Genel Bakış',
  'Anasayfa',
  'Galeri',
  'Haberler',
  'Yazılar',
  'Forum',
  'Etkinlikler',
  'Araçlar',
  'İlanlar',
  'Saha',
  'Moderasyon',
  'Kullanıcılar',
  'Radyo',
  'TV',
  'Kurumsal',
  'Medya Kütüphanesi',
  'Bildirim Merkezi',
  'İçe Aktarma İşleri',
  'Entegrasyonlar',
  'Audit Log',
  'Sistem ve Ayarlar',
];

describe('admin sidebar', () => {
  it('yönetim bölümlerini sol navigasyonda veriyor', () => {
    renderPanel();
    const adlar = screen
      .getByRole('navigation', { name: 'Yönetim bölümleri' })
      .querySelectorAll('button');
    const labels = Array.from(adlar)
      .map((button) => button.textContent?.trim())
      .filter((t): t is string => Boolean(t));
    expect(labels).toEqual(BOLUMLER);
  });

  it('varsayılan bölüm özet — tek ekran başlangıç orada', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Genel Bakış' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('Yönetim özeti')).toBeInTheDocument();
  });

  /*
   * SEKME ADRESTE TAŞINIYOR. Yenileme sekmeyi kaybetmemeli: moderasyon
   * uzun bir iş ve sayfa yenilenebiliyor. Bağlantının paylaşılabilmesi
   * de buna bağlı.
   */
  it('adresteki bölüm açılıyor', () => {
    renderPanel('/admin/forum');
    expect(screen.getByRole('button', { name: 'Forum' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('bilinmeyen bölüm varsayılana düşüyor, paneli boşaltmıyor', () => {
    renderPanel('/admin/olmayan-bir-sey');
    expect(screen.getByRole('button', { name: 'Genel Bakış' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});

describe('bölümler ne açıyor', () => {
  const beklenen: Record<string, string[]> = {
    Galeri: ['Galeri fotoğrafları', 'Kullanıcı metinleri'],
    Haberler: ['İçerik yönetimi'],
    Yazılar: ['İçerik yönetimi'],
    Kullanıcılar: ['Kullanıcılar', 'Denetim kaydı'],
    Forum: ['Forum kategorileri', 'Forum konuları', 'Kullanıcı metinleri'],
    Anasayfa: ['Ana sayfada öne çıkanlar'],
    Saha: ['Saha kayıtları', 'Kullanıcı metinleri'],
    Radyo: ['İstasyon', 'Programlar'],
    TV: ['YouTube bağlantısı', 'Video arşivi'],
  };

  for (const [bolum, paneller] of Object.entries(beklenen)) {
    it(`${bolum} → ${paneller.join(', ')}`, () => {
      renderPanel();
      fireEvent.click(screen.getByRole('button', { name: bolum }));
      const basliklar = panelBasliklari();
      for (const panel of paneller) {
        expect(basliklar, `${bolum} · ${panel}`).toContain(panel);
      }
    });
  }

  /*
   * Katalog paneli react-query kullanıyor ve sağlayıcı olmadan
   * ÇÖKÜYOR. Uygulamada sağlayıcı kökte (`main.tsx`) — ama bu testin
   * ilk sürümü onu kurmadığı için sekme hata verdi. Kaydediliyor:
   * katalog bölümü sağlayıcıya bağımlı ve bu bağımlılık sessiz değil.
   */
  it('Katalog bölümü QueryClient ile çiziliyor', () => {
    renderPanel();
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Araçlar' }))
    ).not.toThrow();
  });
});

describe('bölüm ayrımı', () => {
  /*
   * Aynı kaydı iki sekmeden yönetmek, biri güncellenirken diğerinin
   * eski kalması demek. Forum konusu İçerik sekmesinden çıkarıldı.
   */
  it('forum konuları İçerik sekmesinde görünmüyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Haberler' }));
    const icSekmeler = screen
      .queryAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(icSekmeler).not.toContain('Forum konuları');
    expect(screen.getByText('İçerik yönetimi')).toBeInTheDocument();
  });

  it('forum gönderileri İçerik sekmesinde görünmüyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Haberler' }));
    const icSekmeler = screen
      .queryAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(icSekmeler).not.toContain('Forum gönderileri');
  });

  it('moderasyon sekmesi kuyruğu gösteriyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Moderasyon' }));
    expect(panelBasliklari()).toContain('Kuyruk');
  });
});
