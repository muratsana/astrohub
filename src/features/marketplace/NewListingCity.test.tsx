import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { NewListingPage } from './NewListingPage';
import { fetchProvinces } from '@/services/content/provinces';

/**
 * İLAN FORMUNDAKİ ŞEHİR ALANI GERÇEK BİR İLLE AÇILIYOR MU.
 *
 * BULUNAN HATA: alan `location.label` ile dolduruluyordu. `label` bir
 * GÖSTERİM metni ve her zaman il adı değil — cihaz konumu kullanan biri
 * "Cihaz konumu", ilçe seçen biri "Ankara / Çankaya" görüyor. İkisi de
 * `ProvinceSelect`in listesinde yok; seçici bilinmeyen değeri
 * "(listede yok)" seçeneğiyle koruyor (serbest metin döneminden kalma
 * kayıtlar için) ve kullanıcı fark etmeden il olmayan bir değerle ilan
 * veriyordu. Pazaryeri şehir süzgeci o değerlerden üretiliyor: listede
 * "Cihaz konumu" diye bir şehir çıkardı.
 *
 * Ölçülen kural: alan `provinceName` ile doluyor — doluysa 81 ilden
 * biri, boşsa alan da BOŞ. Yanlış bir ili hazır seçmektense sordurmak.
 */

const ANKARA = {
  code: 6,
  name: 'Ankara',
  slug: 'ankara',
  searchName: 'ankara',
  latitude: 39.9208,
  longitude: 32.8541,
  isActive: true,
};

vi.mock('@/services/content/provinces', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/content/provinces')>()),
  fetchProvinces: vi.fn(),
}));

function ac() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <MemoryRouter>
            <NewListingPage />
          </MemoryRouter>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function sehirAlani() {
  return screen.getByLabelText(/Şehir/) as HTMLSelectElement;
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchProvinces).mockResolvedValue({ items: [ANKARA], source: 'db' });
});

describe('yeni ilan — şehir alanı', () => {
  it('il seçilmişse o ille açılıyor', async () => {
    localStorage.setItem(
      'astrohub:location',
      JSON.stringify({ source: 'city', cityId: 'ankara' })
    );

    ac();

    await waitFor(() => expect(sehirAlani().value).toBe('Ankara'));
  });

  it('cihaz konumu ile eşleşmiyorsa alan boş açılıyor', async () => {
    /* Sınır ötesi ya da liste okunamamış: etiket "Cihaz konumu". */
    localStorage.setItem(
      'astrohub:location',
      JSON.stringify({
        source: 'device',
        latitude: 41.01,
        longitude: 28.98,
        label: 'Cihaz konumu',
      })
    );

    ac();

    await waitFor(() => expect(sehirAlani()).toBeInTheDocument());
    expect(sehirAlani().value).toBe('');
    expect(screen.queryByText(/listede yok/)).not.toBeInTheDocument();
  });

  it('etiket ilçe taşısa bile alana yalnızca il adı giriyor', async () => {
    localStorage.setItem(
      'astrohub:location',
      JSON.stringify({
        source: 'device',
        latitude: 39.86,
        longitude: 32.84,
        label: 'Ankara / Çankaya',
        provinceName: 'Ankara',
        districtName: 'Çankaya',
      })
    );

    ac();

    await waitFor(() => expect(sehirAlani().value).toBe('Ankara'));
    /* Etiketin tamamı alana girseydi seçici onu "(listede yok)" diye
       koruyacaktı — o seçeneğin YOKLUĞU asıl ölçüm. */
    expect(screen.queryByText(/listede yok/)).not.toBeInTheDocument();
  });
});
