import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NotificationBell } from './NotificationBell';
import type { NotificationItem } from '@/services/content/notifications';

/**
 * ÜST ÇUBUK ZİLİ VE BİLDİRİM MERKEZİ.
 *
 * §8.1 iki şey istiyor ve ikisi de burada ölçülüyor: rozetin GERÇEK
 * okunmamış sayısını göstermesi (üst sınır `99+`) ve merkezin ikondan
 * açılması.
 */

let count = 0;
let items: NotificationItem[] = [];
let user: { id: string } | null = { id: 'ben' };

vi.mock('@/services/content/notifications', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/content/notifications')
  >('@/services/content/notifications');
  return {
    ...actual,
    useUnreadCount: () => ({ count, refresh: vi.fn() }),
    useNotifications: () => ({
      items,
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    markAllNotificationsRead: vi.fn().mockResolvedValue(undefined),
    markNotificationRead: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user, loading: false, configured: true }),
}));

function notification(over: Partial<NotificationItem> = {}): NotificationItem {
  return {
    id: 'b1',
    kind: 'follow',
    category: 'sosyal',
    title: 'Ali seni takip etmeye başladı',
    body: null,
    url: '/profil/ali',
    readAt: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  count = 0;
  items = [];
  user = { id: 'ben' };
});

describe('zil', () => {
  /* Ziyaretçiye bildirim ikonu göstermek, arkasında hiçbir zaman içerik
     olmayacak bir düğme koymak olurdu. */
  it('oturum yokken hiç çizilmez', () => {
    user = null;
    const { container } = renderBell();
    expect(container).toBeEmptyDOMElement();
  });

  it('okunmamış sayısını rozette gösterir', () => {
    count = 7;
    renderBell();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  /* §8.1: yüksek sayılarda `99+`. Üç haneli bir sayı rozeti düğmeden
     geniş yapardı. */
  it('yüz ve üstünü 99+ olarak yazar', () => {
    count = 143;
    renderBell();
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('99 hâlâ tam sayı olarak görünür', () => {
    count = 99;
    renderBell();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('sıfırken rozet yok', () => {
    renderBell();
    expect(screen.queryByText('0')).toBeNull();
  });

  it('sayı erişilebilir ada da giriyor', () => {
    count = 3;
    renderBell();
    expect(
      screen.getByRole('button', { name: 'Bildirimler — 3 okunmamış' })
    ).toBeInTheDocument();
  });
});

describe('bildirim merkezi', () => {
  /* §8.1: "Bildirim merkezi kullanıcı ikonundan açılmalı." */
  it('kapalıyken panel çizilmiyor', () => {
    renderBell();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('zile basınca panel açılıyor', () => {
    items = [notification()];
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Bildirimler' }));
    expect(screen.getByRole('dialog', { name: 'Bildirim merkezi' })).toBeInTheDocument();
    expect(screen.getByText('Ali seni takip etmeye başladı')).toBeInTheDocument();
  });

  it('panel tam listeye bağlantı taşıyor', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Bildirimler' }));
    expect(
      screen.getByRole('link', { name: /Tüm bildirimler/ }).getAttribute('href')
    ).toBe('/bildirimler');
  });

  it('Escape paneli kapatıyor', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Bildirimler' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  /* Yolu olmayan bildirim panelde de bağlantı değil. */
  it('yolu olmayan bildirim panelde bağlantı değil', () => {
    items = [notification({ url: null, title: 'Raporun incelendi' })];
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Bildirimler' }));
    expect(screen.getByText('Raporun incelendi')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Raporun incelendi/ })).toBeNull();
  });

  it('boş panelde ne olduğunu yazıyor', () => {
    renderBell();
    fireEvent.click(screen.getByRole('button', { name: 'Bildirimler' }));
    expect(screen.getByText('Yeni bildirimin yok.')).toBeInTheDocument();
  });
});
