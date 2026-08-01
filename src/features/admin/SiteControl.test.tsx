import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SiteControl } from './SiteControl';
import type { HomeModule, FeatureFlag, HistoryEntry } from './siteSettings';

/**
 * SİTE YÖNETİMİ SEKMESİ (§13.2, §13.3).
 *
 * Ölçülen şeyler, hepsi "yazdım" ile "çalışıyor" arasındaki farkı
 * kapatmak için:
 *
 *  1. ETKİN DEĞER — taslağı olan modülde kutuda TASLAK değeri yazmalı.
 *     Canlı değeri gösterseydik yönetici yayımlamadan önce ne
 *     yayımlayacağını göremezdi.
 *  2. SIRA TAKASI iki ayrı yazma üretmeli ve konumlar ÇAPRAZ gitmeli.
 *     Tek yazma yeterli sanılırsa iki modül aynı sırada kalır.
 *  3. TASLAK YOKKEN yayımlama düğmesi kapalı olmalı.
 *  4. YÜKSEK RİSKLİ anahtar gerekçesiz değişmemeli — düğme doğrudan
 *     yazmamalı, önce gerekçe sormalı.
 *  5. YETKİSİZ kullanıcıda yazma yüzeyi kapalı olmalı.
 */

function modul(over: Partial<HomeModule> & { key: string }): HomeModule {
  return {
    title: null,
    subtitle: null,
    enabled: true,
    position: 1,
    item_limit: 6,
    layout: 'grid',
    hide_when_empty: false,
    show_mobile: true,
    show_desktop: true,
    publish_from: null,
    publish_to: null,
    draft: null,
    updated_at: '2026-08-01T10:00:00Z',
    ...over,
  };
}

let moduller: HomeModule[] = [];
let flags: FeatureFlag[] = [];
let gecmis: HistoryEntry[] = [];

const saveDraft = vi.fn().mockResolvedValue(undefined);
const publish = vi.fn().mockResolvedValue(2);
const discard = vi.fn().mockResolvedValue(2);
const setFlag = vi.fn().mockResolvedValue(undefined);
const rollback = vi.fn().mockResolvedValue(undefined);

vi.mock('./siteSettings', async () => {
  const actual =
    await vi.importActual<typeof import('./siteSettings')>('./siteSettings');
  return {
    ...actual,
    fetchHomeModules: () => Promise.resolve(moduller),
    saveHomeDraft: (k: string, p: unknown) => saveDraft(k, p),
    publishHomeDraft: (r?: string) => publish(r),
    discardHomeDraft: () => discard(),
    fetchFeatureFlags: () => Promise.resolve(flags),
    setFeatureFlag: (k: string, e: boolean, r?: string) => setFlag(k, e, r),
    fetchHistory: () => Promise.resolve(gecmis),
    rollbackSetting: (id: number, r?: string) => rollback(id, r),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  moduller = [
    modul({ key: 'news', position: 4, item_limit: 4 }),
    modul({ key: 'events', position: 5, item_limit: 5 }),
  ];
  flags = [];
  gecmis = [];
});

describe('ana sayfa modülleri', () => {
  it('taslaktaki değeri gösterir, canlı değeri değil', async () => {
    moduller = [
      modul({ key: 'news', position: 4, item_limit: 4, draft: { item_limit: 9 } }),
    ];
    render(<SiteControl canWrite />);

    const kutu = await screen.findByLabelText<HTMLInputElement>(
      'Öğe sayısı (1–24)'
    );
    /* Canlı değer 4; taslakta 9 var. Kutuda 9 yazmalı — yönetici
       yayımlayacağı şeyi görmeli. */
    expect(kutu.value).toBe('9');
    expect(await screen.findByText('taslak')).toBeInTheDocument();
  });

  it('sıra takası iki modüle ÇAPRAZ konum yazar', async () => {
    render(<SiteControl canWrite />);
    const asagi = await screen.findAllByLabelText('Aşağı taşı');

    fireEvent.click(asagi[0]!);

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    /* news (4) aşağı inerse events'in konumunu (5), events de news'inkini
       (4) almalı. Aynı değeri iki kere yazmak ikisini üst üste bindirir. */
    expect(saveDraft).toHaveBeenNthCalledWith(1, 'news', { position: 5 });
    expect(saveDraft).toHaveBeenNthCalledWith(2, 'events', { position: 4 });
  });

  it('taslak yokken yayımlama ve vazgeçme kapalı', async () => {
    render(<SiteControl canWrite />);
    expect(await screen.findByRole('button', { name: 'Yayımla' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Taslağı at' })).toBeDisabled();
  });

  it('taslak varken gerekçeyle yayımlar', async () => {
    moduller = [modul({ key: 'news', draft: { item_limit: 9 } })];
    render(<SiteControl canWrite />);

    const kutu = await screen.findByPlaceholderText(
      'Örn. kış dönemi için etkinlikler öne alındı'
    );
    fireEvent.change(kutu, { target: { value: 'kış düzeni' } });
    fireEvent.click(screen.getByRole('button', { name: 'Yayımla' }));

    await waitFor(() => expect(publish).toHaveBeenCalledWith('kış düzeni'));
  });

  it('yayın penceresi UTC anı olarak yazılır, ham kutu değeri olarak değil', async () => {
    moduller = [modul({ key: 'news' })];
    render(<SiteControl canWrite />);

    const kutu = await screen.findByLabelText<HTMLInputElement>(
      'Yayın başlangıcı'
    );
    const yazilan = '2026-08-01T12:30';
    fireEvent.blur(kutu, { target: { value: yazilan } });

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const gonderilen = saveDraft.mock.calls[0]![1] as { publish_from: string };

    /* Kutu saat dilimi TAŞIMAZ. Ham değeri göndermek veritabanına onu
       kendi dilimindeymiş (UTC) gibi okuturdu; İstanbul'daki yönetici
       12:30 yazıp 15:30 geri okurdu. Ölçülen şey: gönderilen damganın
       yöneticinin YEREL 12:30'una karşılık gelen UTC anı olduğu. */
    expect(gonderilen.publish_from).toBe(new Date(yazilan).toISOString());
    expect(gonderilen.publish_from).toMatch(/Z$/);

    /* Boş kutu "epoch" değil, "pencere yok" demek. */
    fireEvent.blur(kutu, { target: { value: '' } });
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[1]![1]).toEqual({ publish_from: null });
  });

  it('yetkisiz kullanıcıda alanlar kapalı', async () => {
    render(<SiteControl canWrite={false} />);
    /* İki modül var, dolayısıyla iki aynı etiketli kutu: tekil sorgu
       "çoklu eşleşme" ile düşer. Hepsinin kapalı olması ölçülüyor —
       birinin kapalı olması yetmez. */
    const kutular = await screen.findAllByLabelText<HTMLInputElement>(
      'Öğe sayısı (1–24)'
    );
    expect(kutular).toHaveLength(2);
    for (const kutu of kutular) expect(kutu).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Yayımla' })).toBeDisabled();
  });
});

describe('özellik anahtarları', () => {
  it('yüksek riskli anahtar gerekçe almadan yazılmaz', async () => {
    flags = [
      {
        key: 'bakim',
        label: 'Bakım modu',
        description: null,
        enabled: false,
        high_risk: true,
      },
    ];
    render(<SiteControl canWrite />);

    fireEvent.click(await screen.findByRole('button', { name: 'Aç' }));

    /* Düğme doğrudan yazmamalı: önce gerekçe istenmeli. */
    expect(setFlag).not.toHaveBeenCalled();
    const onayla = await screen.findByRole('button', { name: 'Onayla' });
    expect(onayla).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Neden değiştiriliyor?'), {
      target: { value: 'planlı bakım' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Onayla' }));

    await waitFor(() =>
      expect(setFlag).toHaveBeenCalledWith('bakim', true, 'planlı bakım')
    );
  });

  it('risksiz anahtar tek tıkla değişir', async () => {
    flags = [
      {
        key: 'radyo',
        label: 'Radyo',
        description: null,
        enabled: true,
        high_risk: false,
      },
    ];
    render(<SiteControl canWrite />);

    fireEvent.click(await screen.findByRole('button', { name: 'Kapat' }));
    await waitFor(() =>
      expect(setFlag).toHaveBeenCalledWith('radyo', false, undefined)
    );
  });
});

describe('değişiklik geçmişi', () => {
  it('kaydı özetler ve geri alınabilir', async () => {
    gecmis = [
      {
        id: 12,
        scope: 'home_modules',
        record_key: 'news',
        old_value: { item_limit: 4 },
        new_value: { item_limit: 9 },
        reason: 'kış düzeni',
        rolled_back_from: null,
        created_at: '2026-08-01T12:00:00Z',
      },
    ];
    render(<SiteControl canWrite />);

    expect(await screen.findByText(/item_limit: 4 → 9/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Geri al' }));
    await waitFor(() => expect(rollback).toHaveBeenCalledWith(12, expect.any(String)));
  });
});
