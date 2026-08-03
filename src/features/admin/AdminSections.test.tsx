import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * YÖNETİCİ OTURUMUYLA PANEL — sekmelerin gerçekten ne açtığı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN OTURUM TAKLİT EDİLİYOR
 *
 * Panelin asıl gövdesi yalnızca yetkili bir oturumda çiziliyor; diğer
 * testler "kurulum yok" durumunu ölçüyor ve o durumda sekme çubuğu hiç
 * çizilmiyor. Yani panelin ASIL yüzeyi — yedi bölüm ve içlerindeki
 * paneller — hiçbir test tarafından görülmüyordu.
 *
 * Gerçek bir hesap açmak üretim veritabanına dokunmak demekti. `useAuth`
 * ve `useRoles` taklit ediliyor: ikisi de yalnızca "kim bu ve neye
 * yetkisi var" sorusunu cevaplıyor, altlarındaki bileşenler değişmiyor.
 *
 * YETKİ SINIRI BU TESTLE ÖLÇÜLMÜYOR ve ölçülemez — o sınır veritabanında
 * ve RLS matrisinde ölçülüyor. Burada ölçülen tek şey ARAYÜZ YAPISI:
 * hangi sekme hangi paneli açıyor.
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
  'Özet',
  'Moderasyon',
  'İçerik',
  'Kullanıcılar',
  'Forum',
  'Ana sayfa',
  'Site yönetimi',
  'Yayın',
  'Radyo',
  'TV',
  'Hatırlatma',
  'Katalog',
];

describe('sekme çubuğu', () => {
  it('on iki bölümü de veriyor ve sırası özetten işe doğru', () => {
    renderPanel();
    const adlar = screen
      .getAllByRole('tab')
      .map((t) => t.textContent?.trim())
      .filter((t): t is string => Boolean(t));
    /* Sekme çubuğu ilk on bir sekmedir; panellerin kendi iç sekmeleri
       sonra geliyor. */
    expect(adlar.slice(0, BOLUMLER.length)).toEqual(BOLUMLER);
  });

  it('varsayılan bölüm özet — tek ekran başlangıç orada', () => {
    renderPanel();
    expect(screen.getByRole('tab', { name: 'Özet' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Yönetim özeti')).toBeInTheDocument();
  });

  /*
   * SEKME ADRESTE TAŞINIYOR. Yenileme sekmeyi kaybetmemeli: moderasyon
   * uzun bir iş ve sayfa yenilenebiliyor. Bağlantının paylaşılabilmesi
   * de buna bağlı.
   */
  it('adresteki bölüm açılıyor', () => {
    renderPanel('/admin?bolum=forum');
    expect(screen.getByRole('tab', { name: 'Forum' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('bilinmeyen bölüm varsayılana düşüyor, paneli boşaltmıyor', () => {
    renderPanel('/admin?bolum=olmayan-bir-sey');
    expect(screen.getByRole('tab', { name: 'Özet' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});

describe('bölümler ne açıyor', () => {
  const beklenen: Record<string, string[]> = {
    İçerik: ['İçerik yönetimi', 'İçerik kayıtları', 'Kullanıcı metinleri'],
    Kullanıcılar: ['Kullanıcılar', 'Denetim kaydı'],
    Forum: ['Forum kategorileri', 'Forum konuları', 'Kullanıcı metinleri'],
    /* İki ayrı sekme, iki ayrı iş: "Ana sayfa" hangi İÇERİĞİN öne
       çıkacağını, "Site yönetimi" ana sayfanın YAPISINI yönetiyor. */
    'Ana sayfa': ['Ana sayfada öne çıkanlar'],
    'Site yönetimi': [
      'Ana sayfa modülleri',
      'Özellik anahtarları',
      'Değişiklik geçmişi',
    ],
    Yayın: ['TV Kontrolü', 'Radyo Kontrolü'],
  };

  for (const [sekme, paneller] of Object.entries(beklenen)) {
    it(`${sekme} → ${paneller.join(', ')}`, () => {
      renderPanel();
      fireEvent.click(screen.getByRole('tab', { name: sekme }));
      const basliklar = panelBasliklari();
      for (const panel of paneller) {
        expect(basliklar, `${sekme} · ${panel}`).toContain(panel);
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
      fireEvent.click(screen.getByRole('tab', { name: 'Katalog' }))
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
    fireEvent.click(screen.getByRole('tab', { name: 'İçerik' }));
    const icSekmeler = screen
      .getAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(icSekmeler).not.toContain('Forum konuları');
    expect(icSekmeler).toContain('Fotoğraflar');
  });

  it('forum gönderileri İçerik sekmesinde görünmüyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'İçerik' }));
    const icSekmeler = screen
      .getAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(icSekmeler).not.toContain('Forum gönderileri');
  });

  it('moderasyon sekmesi kuyruğu gösteriyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('tab', { name: 'Moderasyon' }));
    expect(panelBasliklari()).toContain('Kuyruk');
  });
});
