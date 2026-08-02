import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LocationProvider, useLocationContext } from './LocationContext';
import { fetchProvinces } from '@/services/content/provinces';
import { fetchDistricts, type District } from '@/services/content/districts';

/**
 * CİHAZ KONUMU İLÇE ADIYLA ETİKETLENİYOR MU (§4.1, madde 1.2).
 *
 * `nearestDistrict` ve 40 km sınırı `districts.test.ts`te ölçülüyor —
 * orası SAF fonksiyonun testi. Burada ölçülen şey başka: o fonksiyonun
 * cihaz konumu dalına BAĞLI olduğu. Uzun süre yazılmış ama bağlanmamıştı;
 * yani birim testleri geçiyor, kullanıcı hâlâ yalnızca il adını görüyordu.
 *
 * Korunan davranışlar:
 *   1. İl adı ilçeyi BEKLEMİYOR — iki hamlede yazılıyor
 *   2. Sınırın ötesinde ilçe adı YAZILMIYOR (sessizce yanlış ilçe yok)
 *   3. İlçe okunamazsa il adı yerinde kalıyor
 *   4. Geç gelen etiket, kullanıcının araya giren seçimini EZMİYOR
 */

vi.mock('@/services/content/provinces', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/content/provinces')>()),
  fetchProvinces: vi.fn(),
}));

vi.mock('@/services/content/districts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/content/districts')>()),
  fetchDistricts: vi.fn(),
}));

const ANKARA = {
  code: 6,
  name: 'Ankara',
  slug: 'ankara',
  searchName: 'ankara',
  latitude: 39.9208,
  longitude: 32.8541,
  isActive: true,
};

/** Cihazın bulunduğu nokta — Çankaya'ya birkaç km, il merkezine yakın. */
const CIHAZ = { latitude: 39.8609, longitude: 32.8417 };

function ilce(name: string, latitude: number, longitude: number): District {
  return {
    provinceCode: 6,
    name,
    slug: name.toLocaleLowerCase('tr'),
    searchName: name.toLocaleLowerCase('tr'),
    latitude,
    longitude,
  };
}

function Prob() {
  const { location, requestDeviceLocation, setCity } = useLocationContext();
  return (
    <>
      <button onClick={requestDeviceLocation}>konum al</button>
      <button onClick={() => setCity('ankara')}>il seç</button>
      <p data-testid="etiket">{location.label}</p>
      <p data-testid="ilce">{location.districtName ?? '—'}</p>
    </>
  );
}

function konumVer() {
  vi.stubGlobal('navigator', {
    ...navigator,
    geolocation: {
      getCurrentPosition: (ok: PositionCallback) =>
        ok({ coords: CIHAZ } as unknown as GeolocationPosition),
    },
    /* Permissions API taklit edilmiyor: otomatik alma dalı kapalı kalsın,
       ölçülen şey düğmeye basıldığındaki akış olsun. */
    permissions: undefined,
  });
}

beforeEach(() => {
  localStorage.clear();
  vi.mocked(fetchProvinces).mockResolvedValue({ items: [ANKARA], source: 'db' });
  konumVer();
});

async function calistir() {
  render(
    <LocationProvider>
      <Prob />
    </LocationProvider>
  );
  fireEvent.click(screen.getByText('konum al'));
}

describe('cihaz konumu — ilçe etiketi', () => {
  it('en yakın ilçeyi il adının yanına yazıyor', async () => {
    vi.mocked(fetchDistricts).mockResolvedValue([
      ilce('Çankaya', 39.8609, 32.8417),
      ilce('Polatlı', 39.5842, 32.147),
    ]);

    await calistir();

    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara / Çankaya')
    );
    expect(screen.getByTestId('ilce')).toHaveTextContent('Çankaya');
  });

  it('il adını ilçe isteğini beklemeden yazıyor', async () => {
    let ilceleriVer: (v: District[]) => void = () => {};
    vi.mocked(fetchDistricts).mockReturnValue(
      new Promise<District[]>((resolve) => {
        ilceleriVer = resolve;
      })
    );

    await calistir();

    /* İlçe isteği HÂLÂ AÇIK ve il adı ekranda: iki hamlenin sebebi bu. */
    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara')
    );
    expect(screen.getByTestId('ilce')).toHaveTextContent('—');

    ilceleriVer([ilce('Çankaya', 39.8609, 32.8417)]);
    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara / Çankaya')
    );
  });

  it('en yakın merkez 40 km sınırının ötesindeyse ilçe yazmıyor', async () => {
    /* Tek aday Polatlı: cihaza ~65 km. En yakın O ama "orada" demek değil. */
    vi.mocked(fetchDistricts).mockResolvedValue([
      ilce('Polatlı', 39.5842, 32.147),
    ]);

    await calistir();

    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara')
    );
    expect(screen.getByTestId('etiket')).not.toHaveTextContent('Polatlı');
    expect(screen.getByTestId('ilce')).toHaveTextContent('—');
  });

  it('ilçe listesi okunamazsa il adı yerinde kalıyor', async () => {
    vi.mocked(fetchDistricts).mockRejectedValue(new Error('ağ'));

    await calistir();

    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara')
    );
    expect(screen.getByTestId('ilce')).toHaveTextContent('—');
  });

  it('araya giren elle seçimi geç gelen ilçe etiketi ezmiyor', async () => {
    let ilceleriVer: (v: District[]) => void = () => {};
    vi.mocked(fetchDistricts).mockReturnValue(
      new Promise<District[]>((resolve) => {
        ilceleriVer = resolve;
      })
    );

    await calistir();
    await waitFor(() =>
      expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara')
    );

    /* Kullanıcı ilçe cevabı gelmeden elle il seçiyor: kaynak artık 'city'. */
    fireEvent.click(screen.getByText('il seç'));
    ilceleriVer([ilce('Çankaya', 39.8609, 32.8417)]);

    await waitFor(() => expect(fetchDistricts).toHaveBeenCalled());
    expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara');
    expect(screen.getByTestId('etiket')).not.toHaveTextContent('Çankaya');
  });

  it('ilçe adı yenilemeden sonra da duruyor', async () => {
    vi.mocked(fetchDistricts).mockResolvedValue([
      ilce('Çankaya', 39.8609, 32.8417),
    ]);

    const { unmount } = render(
      <LocationProvider>
        <Prob />
      </LocationProvider>
    );
    fireEvent.click(screen.getByText('konum al'));
    await waitFor(() =>
      expect(screen.getByTestId('ilce')).toHaveTextContent('Çankaya')
    );
    unmount();

    /* Yeniden kurulum = sayfa yenilemesi. Etiket depodan geri geliyor ve
       `districtName` ONUNLA TUTARLI dönüyor — ayrı alan bunun için var. */
    render(
      <LocationProvider>
        <Prob />
      </LocationProvider>
    );
    expect(screen.getByTestId('etiket')).toHaveTextContent('Ankara / Çankaya');
    expect(screen.getByTestId('ilce')).toHaveTextContent('Çankaya');
  });
});
