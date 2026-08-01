import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { NotificationsPage } from './NotificationsPage';
import type { NotificationItem } from '@/services/content/notifications';

/**
 * BİLDİRİM MERKEZİ — OTURUM AÇIKKEN.
 *
 * NEDEN MOCK'LU. Sayfanın oturumsuz hâli önizleme derlemesinde
 * görülebiliyor; oturum AÇIKKEN görünen hâli görülemiyor, çünkü tek dosya
 * önizlemede Supabase hiç kurulmuyor. Bu testin ölçtüğü şey tam olarak o
 * görülemeyen taraf: liste çizimi, okunmamış ayrımı ve işaretleme
 * eylemlerinin doğru satıra gitmesi.
 *
 * Servis katmanı mock'lanıyor, ağ değil: burada sınanan şey PostgREST
 * sözleşmesi değil, sayfanın veriye verdiği tepki.
 */

const markRead = vi.fn().mockResolvedValue(undefined);
const markAll = vi.fn().mockResolvedValue(undefined);
const archive = vi.fn().mockResolvedValue(undefined);

let items: NotificationItem[] = [];

vi.mock('@/services/content/notifications', async () => {
  const actual = await vi.importActual<
    typeof import('@/services/content/notifications')
  >('@/services/content/notifications');
  return {
    ...actual,
    useNotifications: () => ({
      items,
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    useUnreadCount: () => ({ count: 1, refresh: vi.fn() }),
    useNotificationPreferences: () => ({
      categories: { sosyal: true, icerik: true, etkinlik: true, yayin: true },
      loading: false,
      error: null,
      saving: false,
      toggle: vi.fn(),
    }),
    markNotificationRead: (id: string) => markRead(id),
    markAllNotificationsRead: () => markAll(),
    archiveNotification: (id: string) => archive(id),
    deleteNotification: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'kullanici-1', email: 'uye@astrohub.test' },
    loading: false,
    configured: true,
  }),
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/bildirimler']}>
      <NotificationsPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  items = [];
});

describe('bildirim listesi', () => {
  it('bildirimi başlığıyla çizer', () => {
    items = [notification()];
    renderPage();
    expect(
      screen.getByText('Ali seni takip etmeye başladı')
    ).toBeInTheDocument();
  });

  /*
   * Bildirimin bağlantısı sunucuda `url like '/%'` ile sınırlı ve istemci
   * de dış adresi eliyor. Burada ölçülen, GEÇERLİ bir yolun gerçekten
   * bağlantı olarak çizildiği.
   */
  it('yolu olan bildirim bağlantı olur', () => {
    items = [notification()];
    renderPage();
    const link = screen.getByRole('link', {
      name: /Ali seni takip etmeye başladı/,
    });
    expect(link.getAttribute('href')).toBe('/profil/ali');
  });

  /*
   * ASIL KORUNAN DAVRANIŞ. Kaynağı silinmiş bildirimin `url`i boş geliyor;
   * satırı yine de tıklanabilir çizmek kullanıcıyı "bulunamadı" sayfasına
   * yollamak olurdu.
   */
  it('yolu olmayan bildirim bağlantı DEĞİL', () => {
    items = [notification({ url: null, title: 'Raporun incelendi' })];
    renderPage();
    expect(screen.getByText('Raporun incelendi')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Raporun incelendi/ })
    ).toBeNull();
  });

  it('okunmamışta "Okundu" düğmesi var, okunmuşta yok', () => {
    items = [
      notification({ id: 'yeni' }),
      notification({
        id: 'eski',
        title: 'Eski bildirim',
        readAt: new Date().toISOString(),
      }),
    ];
    renderPage();

    const rows = screen.getAllByRole('listitem');
    const yeni = rows.find((r) => r.textContent?.includes('takip etmeye'))!;
    const eski = rows.find((r) => r.textContent?.includes('Eski bildirim'))!;

    expect(within(yeni).getByRole('button', { name: 'Okundu' })).toBeInTheDocument();
    expect(within(eski).queryByRole('button', { name: 'Okundu' })).toBeNull();
  });

  it('"Okundu" doğru bildirimin kimliğiyle çağrılır', async () => {
    items = [notification({ id: 'hedef-satir' })];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Okundu' }));
    await waitFor(() => expect(markRead).toHaveBeenCalledWith('hedef-satir'));
  });

  it('arşivleme doğru kimlikle çağrılır', async () => {
    items = [notification({ id: 'arsivlenecek' })];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Arşivle' }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith('arsivlenecek'));
  });

  it('tümünü okundu işaretleme okunmamış varken sunulur', async () => {
    items = [notification()];
    renderPage();
    fireEvent.click(
      screen.getByRole('button', { name: 'Tümünü okundu işaretle' })
    );
    await waitFor(() => expect(markAll).toHaveBeenCalled());
  });

  it('boş listede ne yapılacağını söyleyen bir cümle var', () => {
    items = [];
    renderPage();
    expect(screen.getByText(/Henüz bildirimin yok/)).toBeInTheDocument();
  });
});

describe('bildirim tercihleri', () => {
  /*
   * `sistem` kategorisi KAPATILAMAZ (sunucu tarafı da kapatmıyor).
   * Ekranda kapatılabilir bir kutu göstermek, çalışmayan bir düğme
   * koymak olurdu.
   */
  it('sistem kategorisi için anahtar sunulmaz', () => {
    renderPage();
    expect(screen.queryByLabelText(/^Sistem$/)).toBeNull();
    expect(screen.getByLabelText(/Sosyal/)).toBeInTheDocument();
  });

  it('kapatılamayan bildirimleri açıkça yazar', () => {
    renderPage();
    expect(screen.getByText(/kapatılamaz/)).toBeInTheDocument();
  });
});
