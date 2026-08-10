import { afterEach, describe, expect, it, vi } from 'vitest';
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

afterEach(() => vi.unstubAllGlobals());

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
  'Moderasyon',
  'İçerik ve Kayıtlar',
  'Anasayfa',
  'Forum',
  'Kullanıcılar',
  'Yayın Merkezi',
  'Bildirim Merkezi',
  'Site Yapısı',
  'Katalog ve Araçlar',
  'Denetim Kaydı',
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

  it('eski modül adresi yeni görev merkezine düşüyor', () => {
    renderPanel('/admin/gallery');
    expect(
      screen.getByRole('button', { name: 'İçerik ve Kayıtlar' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('dar ekranda uzun sidebar yerine tek bölüm seçici var', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        media: '(max-width: 1023px)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    renderPanel();
    expect(await screen.findByLabelText('Yönetim bölümü')).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Yönetim bölümleri' })
    ).not.toBeInTheDocument();
  });

  it('bilinmeyen bölüm varsayılana düşüyor, paneli boşaltmıyor', () => {
    renderPanel('/admin/olmayan-bir-sey');
    expect(screen.getByRole('button', { name: 'Genel Bakış' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });
});

describe('içerik sekmeleri', () => {
  /* Kullanıcı isteği: "her içerik türü için sekme". Ölçülen şey, türlerin
     TAMAMININ tek sırada görünmesi — eksik bir tür, o türün panelde hiç
     yönetilemediği anlamına gelir. */
  const TURLER = [
    'Haberler',
    'Yazılar',
    'İlanlar',
    'Etkinlikler',
    'Fotoğraflar',
    'Gözlem noktaları',
    'Topluluklar',
    'Sözlük',
    'SSS',
    'Haftanın fotoğrafı',
    'Yorumlar',
  ];

  it('her içerik türü için sekme var', () => {
    renderPanel('/admin/content');
    const sekmeler = screen
      .getByRole('tablist', { name: 'İçerik türleri' })
      .querySelectorAll('button');
    expect(
      Array.from(sekmeler).map((b) => b.textContent?.trim())
    ).toEqual(TURLER);
  });

  it('sekme değişince o türün paneli açılıyor', async () => {
    renderPanel('/admin/content');
    fireEvent.click(screen.getByRole('tab', { name: 'İlanlar' }));
    expect(await screen.findByText('İçerik kayıtları')).toBeInTheDocument();
    /* Seçilmeyen tür ÇİZİLMİYOR: beşi birden asılı kalırsa hepsi veri
       çeker ve görünmeyen dördü boşuna ağ turu yapar. */
    expect(screen.queryByText('İçerik yönetimi')).not.toBeInTheDocument();
  });
});

describe('bölümler ne açıyor', () => {
  const beklenen: Record<string, string[]> = {
    /* İçerik bölümü artık SEKMELİ (FAZ 4.1): türler üstte tek sırada,
       yalnızca seçili olan çiziliyor. Önceden beş panel alt alta
       duruyordu ve kullanıcı ilan/etkinlik düzenlemek için sayfanın
       ortasına kadar kaydırmak zorundaydı — üstteki panel "İçerik
       yönetimi" adını taşıdığı için çoğu kişi ötekilerin varlığını fark
       etmiyordu. Varsayılan sekme "Haberler". */
    'İçerik ve Kayıtlar': ['İçerik yönetimi'],
    Kullanıcılar: ['Kullanıcılar', 'Denetim kaydı'],
    Forum: ['Forum kategorileri', 'Forum konuları', 'Kullanıcı metinleri'],
    Anasayfa: ['Öne çıkan içerikler'],
    'Site Yapısı': ['Ana sayfa modülleri', 'Özellik anahtarları'],
    'Katalog ve Araçlar': [
      'Katalog senkronizasyonu',
      'Ekipman veritabanı',
      'Teknik veri içe aktarma',
    ],
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
      fireEvent.click(screen.getByRole('button', { name: 'Katalog ve Araçlar' }))
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
    fireEvent.click(screen.getByRole('button', { name: 'İçerik ve Kayıtlar' }));
    const icSekmeler = screen
      .queryAllByRole('tab')
      .map((t) => t.textContent?.trim());
    expect(icSekmeler).not.toContain('Forum konuları');
    expect(screen.getByText('İçerik yönetimi')).toBeInTheDocument();
  });

  it('forum gönderileri İçerik sekmesinde görünmüyor', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'İçerik ve Kayıtlar' }));
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
