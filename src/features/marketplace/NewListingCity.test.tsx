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
 *
 * ══════════════════════════════════════════════════════════════════════
 * ALAN AÇILIR LİSTEDEN ARAMA KUTUSUNA GEÇTİ
 *
 * Testler yeniden yazıldı ama ÖLÇÜLEN KURAL AYNI. Form artık il ve
 * ilçeyi tek bir `LocationTypeahead` ile soruyor; seçim yapılmışken
 * kutu yerine bir özet satırı ("Ankara · il geneli"), yapılmamışken
 * arama kutusu görünüyor. İddialar bu iki duruma bakıyor.
 *
 * Eski sürümün ölçtüğü "(listede yok)" seçeneği artık YOK — arama
 * kutusu bilinmeyen bir değeri seçenek olarak sunmuyor, dolayısıyla
 * "Cihaz konumu" gibi bir metin forma hiç giremiyor. Kuralın kendisi
 * korunuyor: doldurma yalnızca `provinceName` üzerinden.
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

/** Seçim yapılmamışken görünen arama kutusu; seçim varsa `null`. */
function aramaKutusu() {
  return screen.queryByRole('searchbox');
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

    /* Seçim dolu: kutu yerine özet satırı ve içinde il adı. */
    await waitFor(() => expect(screen.getByText('Ankara')).toBeInTheDocument());
    expect(aramaKutusu()).not.toBeInTheDocument();
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

    /* Seçim yok: arama kutusu duruyor ve "Cihaz konumu" hiçbir yerde
       bir konum değeri olarak görünmüyor. */
    await waitFor(() => expect(aramaKutusu()).toBeInTheDocument());
    expect(aramaKutusu()).toHaveValue('');
    expect(
      screen.queryByRole('button', { name: /değiştir/i })
    ).not.toBeInTheDocument();
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

    await waitFor(() => expect(screen.getByText('Ankara')).toBeInTheDocument());
    /* Etiketin tamamı alana girseydi özet satırında "Ankara / Çankaya"
       yazardı. İlçe cihaz konumundan ÖN DOLDURULMUYOR: `districtName`
       bir tahmin (en yakın merkez, 40 km'ye kadar) ve kullanıcının
       doğrulamadığı bir adresi ilana yazmak olurdu. */
    expect(screen.queryByText('Ankara / Çankaya')).not.toBeInTheDocument();
    expect(screen.getByText('il geneli')).toBeInTheDocument();
  });
});
