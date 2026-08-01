import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReminderControl } from './ReminderControl';
import type { DeliveryStats, FailedReminder } from './reminderAdmin';

/**
 * YÖNETİCİ HATIRLATMA SEKMESİ (§9).
 *
 * Ölçülen üç şey: hatalı işin GERÇEK hata metnini göstermesi (teşhis
 * edilecek şey o), yeniden denemenin listeyi tazelemesi ve duyurunun tek
 * tıkla gitmemesi — geri alınamayan, herkese giden bir işlemin onay adımı
 * olmalı.
 */

const stats: DeliveryStats = {
  bekleyen: 12,
  vakti_gelen: 0,
  hatali: 2,
  gonderilen: 340,
  gonderilen_24s: 18,
  toplam: 354,
};

let failed: FailedReminder[] = [];

const retry = vi.fn().mockResolvedValue(true);
const broadcast = vi.fn().mockResolvedValue(41);
const saveDefault = vi.fn().mockResolvedValue(undefined);

vi.mock('./reminderAdmin', async () => {
  const actual = await vi.importActual<typeof import('./reminderAdmin')>(
    './reminderAdmin'
  );
  return {
    ...actual,
    fetchDeliveryStats: () => Promise.resolve(stats),
    fetchFailedReminders: () => Promise.resolve(failed),
    retryReminder: (id: string) => retry(id),
    fetchReminderDefaults: () =>
      Promise.resolve({
        onerilen: 'gun' as const,
        acik_secenekler: ['hafta', 'gun', 'etkinlik_gunu', 'ozel'] as const,
      }),
    saveReminderDefault: (kind: string) => saveDefault(kind),
    broadcastAnnouncement: (input: unknown) => broadcast(input),
  };
});

function makeFailed(over: Partial<FailedReminder> = {}): FailedReminder {
  return {
    id: 'h1',
    eventTitle: 'Geminid Meteor Yağmuru Kampı',
    eventSlug: 'geminid-2026-erciyes',
    dueAt: '2026-12-12T15:00:00.000Z',
    attempts: 3,
    lastError: 'notify: recipient not found',
    ...over,
  };
}

beforeEach(() => {
  failed = [];
  vi.clearAllMocks();
});

describe('teslim istatistikleri', () => {
  it('altı sayaç da görünüyor', async () => {
    render(<ReminderControl canWrite />);
    await screen.findByText('Bekleyen');
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('340')).toBeTruthy();
    expect(screen.getByText('Son 24 saat')).toBeTruthy();
  });

  it('hatalı iş yokken bunu söylüyor', async () => {
    render(<ReminderControl canWrite />);
    expect(
      await screen.findByText('Bekleyen hatalı teslim yok.')
    ).toBeTruthy();
  });
});

describe('hatalı işler', () => {
  /* Hata metni kırpılmıyor: yöneticinin teşhis edeceği şey burada. */
  it('etkinlik adı, deneme sayısı ve hata metni yazılı', async () => {
    failed = [makeFailed()];
    render(<ReminderControl canWrite />);
    expect(
      await screen.findByText('Geminid Meteor Yağmuru Kampı')
    ).toBeTruthy();
    expect(screen.getByText(/3 deneme/)).toBeTruthy();
    expect(screen.getByText('notify: recipient not found')).toBeTruthy();
  });

  it('yeniden deneme satırın kimliğiyle çağrılıyor', async () => {
    failed = [makeFailed()];
    render(<ReminderControl canWrite />);
    fireEvent.click(await screen.findByRole('button', { name: 'Yeniden dene' }));
    await waitFor(() => expect(retry).toHaveBeenCalledWith('h1'));
  });

  /**
   * Yeniden deneme `false` dönebiliyor: satır bu arada gönderilmiş,
   * etkinlik iptal edilmiş ya da hata sürüyor olabilir. Üçünde de
   * "gönderildi" demek yanlış bilgi olurdu.
   */
  it('gönderilemediğinde başarı yazmıyor', async () => {
    failed = [makeFailed()];
    retry.mockResolvedValueOnce(false);
    render(<ReminderControl canWrite />);
    fireEvent.click(await screen.findByRole('button', { name: 'Yeniden dene' }));
    expect(await screen.findByText(/Gönderilemedi/)).toBeTruthy();
  });

  /* Yetkisiz yöneticiye (moderatör) düğme gösterilmiyor: RPC zaten
     reddeder, basılabilir bırakmak hata üretmekten başka işe yaramaz. */
  it('yazma yetkisi yoksa yeniden deneme düğmesi yok', async () => {
    failed = [makeFailed()];
    render(<ReminderControl canWrite={false} />);
    await screen.findByText('Geminid Meteor Yağmuru Kampı');
    expect(screen.queryByRole('button', { name: 'Yeniden dene' })).toBeNull();
  });
});

describe('varsayılan hatırlatma', () => {
  it('mevcut değer seçili geliyor', async () => {
    render(<ReminderControl canWrite />);
    const select = (await screen.findByLabelText(
      'Varsayılan hatırlatma'
    )) as HTMLSelectElement;
    expect(select.value).toBe('gun');
  });

  it('değişiklik kaydediliyor', async () => {
    render(<ReminderControl canWrite />);
    const select = await screen.findByLabelText('Varsayılan hatırlatma');
    fireEvent.change(select, { target: { value: 'hafta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() => expect(saveDefault).toHaveBeenCalledWith('hafta'));
  });

  /* "Öneriliyor, kurulmuyor" ayrımı ekranda yazılı olmalı — yoksa
     yönetici bu ayarı herkese hatırlatma açmak sanabilir. */
  it('önerinin kurulum olmadığı yazılı', async () => {
    render(<ReminderControl canWrite />);
    expect(
      await screen.findByText(/hatırlatma kurulmuyor, yalnızca öneriliyor/i)
    ).toBeTruthy();
  });
});

describe('zorunlu duyuru', () => {
  it('kısa başlıkla gönderilemiyor', async () => {
    render(<ReminderControl canWrite />);
    const button = await screen.findByRole('button', {
      name: 'Duyuruyu gönder',
    });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  /* İki adım: geri alınamayan ve herkese giden bir işlem. */
  it('tek tıkla gitmiyor, onay istiyor', async () => {
    render(<ReminderControl canWrite />);
    fireEvent.change(await screen.findByLabelText('Başlık'), {
      target: { value: 'Kullanım koşulları güncellendi' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Duyuruyu gönder' }));
    expect(broadcast).not.toHaveBeenCalled();
    expect(screen.getByText(/Bütün kullanıcılara gidecek/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Evet, gönder' }));
    await waitFor(() =>
      expect(broadcast).toHaveBeenCalledWith({
        title: 'Kullanım koşulları güncellendi',
        body: '',
        url: '',
      })
    );
    expect(await screen.findByText('41 kullanıcıya gönderildi.')).toBeTruthy();
  });

  it('vazgeçilince gönderilmiyor', async () => {
    render(<ReminderControl canWrite />);
    fireEvent.change(await screen.findByLabelText('Başlık'), {
      target: { value: 'Bir duyuru' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Duyuruyu gönder' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vazgeç' }));
    expect(broadcast).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Duyuruyu gönder' })
    ).toBeTruthy();
  });

  /* Pazarlama sınırı ekranda yazılı olmalı: kural kodda değil kullanımda. */
  it('pazarlama sınırı yazılı', async () => {
    render(<ReminderControl canWrite />);
    expect(
      await screen.findByText(/pazarlama iletisi bu kanaldan gönderilmez/i)
    ).toBeTruthy();
  });

  it('yazma yetkisi yoksa duyuru bölümü hiç yok', async () => {
    render(<ReminderControl canWrite={false} />);
    await screen.findByText('Hatırlatma teslimi');
    expect(screen.queryByLabelText('Başlık')).toBeNull();
  });
});
