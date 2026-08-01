import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { LocationPicker } from './LocationPicker';
import { LocationProvider } from './LocationContext';
import { resetProvinceCache } from '@/services/content/provinces';

/**
 * "BÜTÜN DROPDOWN'LARDA 81 İL" ÖLÇÜTÜ (§4.1 son madde).
 *
 * Ölçüt E2E olarak yazılmıştı ama önizleme derlemesinde veritabanı yok:
 * orada seçici tohum yedeğine düşer ve 15 il gösterir — yani E2E bu
 * ölçütü ölçemez, yalnızca yedeği ölçer. Doğru yer burası: il kaynağı
 * taklit edilip seçicinin ONU çizdiği ölçülüyor.
 *
 * Korunan asıl davranış: seçicinin kendi listesi YOK. Uzun süre uygulama
 * içindeki 15 şehirlik diziyi çiziyordu; Sivas'taki kullanıcı kendi ilini
 * seçemiyordu.
 */

const PROVINCES = Array.from({ length: 81 }, (_, i) => ({
  code: i + 1,
  name: `İl ${i + 1}`,
  slug: `il-${i + 1}`,
  searchName: `il ${i + 1}`,
  latitude: 39 + i * 0.01,
  longitude: 35 + i * 0.01,
  isActive: true,
}));

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          order: () =>
            Promise.resolve({
              data: PROVINCES.map((p) => ({
                code: p.code,
                name: p.name,
                slug: p.slug,
                search_name: p.searchName,
                latitude: p.latitude,
                longitude: p.longitude,
                is_active: p.isActive,
              })),
              error: null,
            }),
        }),
      }),
    }),
}));

beforeEach(() => {
  resetProvinceCache();
  localStorage.clear();
});

afterEach(() => {
  resetProvinceCache();
});

async function openPicker() {
  render(
    <LocationProvider>
      <LocationPicker />
    </LocationProvider>
  );
  fireEvent.click(screen.getByRole('button', { expanded: false }));
  /* Liste asenkron geliyor; 81. il görünene kadar bekleniyor. */
  await screen.findByRole('option', { name: /İl 81/ });
  return screen.getByRole('listbox', { name: 'Gözlem konumu' });
}

describe('LocationPicker il listesi', () => {
  it('81 ilin tamamını çiziyor', async () => {
    const list = await openPicker();
    const cities = within(list)
      .getAllByRole('option')
      .filter((o) => /^İl \d+/.test(o.textContent ?? ''));
    expect(cities).toHaveLength(81);
  });

  /*
   * Cihaz konumu satırı listenin parçası ama bir il değil; il sayımının
   * onu içermediği ayrıca ölçülüyor ki 82 yanlışlıkla doğru görünmesin.
   * Başlangıç modu MANUAL olduğu için metin "Otomatik konuma dön".
   */
  it('cihaz konumu satırı ayrı duruyor', async () => {
    const list = await openPicker();
    expect(
      within(list).getByRole('option', { name: /Otomatik konuma dön/ })
    ).toBeInTheDocument();
  });

  it('arama listeyi daraltıyor', async () => {
    const list = await openPicker();
    fireEvent.change(within(list).getByLabelText('İl ara'), {
      target: { value: 'İl 4' },
    });
    const shown = within(list)
      .getAllByRole('option')
      .filter((o) => /^İl \d+/.test(o.textContent ?? ''));
    /* "İl 4", "İl 40"…"İl 49" — on bir kayıt; tamamı değil. */
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(81);
    expect(shown.every((o) => /İl 4/.test(o.textContent ?? ''))).toBe(true);
  });

  it('eşleşme yoksa bunu söylüyor', async () => {
    const list = await openPicker();
    fireEvent.change(within(list).getByLabelText('İl ara'), {
      target: { value: 'zzzz' },
    });
    expect(within(list).getByText(/için il bulunamadı/)).toBeInTheDocument();
  });
});
