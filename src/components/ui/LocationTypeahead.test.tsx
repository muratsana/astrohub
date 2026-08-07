import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { DistrictWithProvince } from '@/services/content/districts';

/**
 * KONUM ARAMA KUTUSU — kullanıcının gerçekten yaşadığı akış.
 *
 * Ölçülen şey listeleme değil (`districtSearch.test.ts` sıralamayı zaten
 * ölçüyor); burada ölçülen ETKİLEŞİM: yazınca öneri geliyor mu, seçim
 * İL VE İLÇEYİ BİRLİKTE mi dolduruyor, ve liste inmezse kullanıcı bunu
 * öğreniyor mu.
 */
const veri = vi.hoisted(() => ({
  liste: [] as DistrictWithProvince[],
  hata: false,
}));

vi.mock('@/services/content/districts', async () => {
  const gercek =
    await vi.importActual<typeof import('@/services/content/districts')>(
      '@/services/content/districts'
    );
  return {
    ...gercek,
    fetchAllDistricts: () =>
      veri.hata ? Promise.resolve([]) : Promise.resolve(veri.liste),
  };
});

const { LocationTypeahead } = await import('./LocationTypeahead');

function ilce(name: string, provinceName: string): DistrictWithProvince {
  return {
    name,
    provinceName,
    provinceCode: 6,
    slug: `${provinceName}-${name}`.toLowerCase(),
    searchName: name.toLowerCase(),
    latitude: null,
    longitude: null,
  };
}

beforeEach(() => {
  veri.liste = [
    ilce('Gölbaşı', 'Ankara'),
    ilce('Gölbaşı', 'Adıyaman'),
    ilce('Çankaya', 'Ankara'),
  ];
  veri.hata = false;
});

function ciz(props: Partial<Parameters<typeof LocationTypeahead>[0]> = {}) {
  const onSelect = vi.fn();
  const onClear = vi.fn();
  render(
    <LocationTypeahead
      id="t"
      city=""
      district=""
      onSelect={onSelect}
      onClear={onClear}
      {...props}
    />
  );
  return { onSelect, onClear };
}

describe('LocationTypeahead', () => {
  it('yazılan metne göre öneri gösteriyor', async () => {
    ciz();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'gölb' },
    });

    await waitFor(() => {
      expect(screen.getAllByText('Gölbaşı')).toHaveLength(2);
    });
    // İki Gölbaşı'nı ayıran tek şey il adı — o yüzden her satırda var.
    expect(screen.getByText('Ankara')).toBeInTheDocument();
    expect(screen.getByText('Adıyaman')).toBeInTheDocument();
  });

  it('Türkçe harf katlaması ile de buluyor', async () => {
    ciz();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'golbasi' },
    });
    await waitFor(() => {
      expect(screen.getAllByText('Gölbaşı')).toHaveLength(2);
    });
  });

  it('seçim İL VE İLÇEYİ birlikte bildiriyor', async () => {
    /* Ayrı bildirseydi, kullanıcının seçtiği ilçenin ilinden farklı bir
       il seçili kalabilirdi: form geçerli görünür, veri saçma olurdu. */
    const { onSelect } = ciz();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'çankaya' },
    });
    await waitFor(() => screen.getByText('Çankaya'));

    fireEvent.click(screen.getByText('Çankaya'));
    expect(onSelect).toHaveBeenCalledWith({
      city: 'Ankara',
      district: 'Çankaya',
    });
  });

  it('seçim yapıldığında kutu yerine özet gösteriyor', () => {
    ciz({ city: 'Ankara', district: 'Gölbaşı' });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    expect(screen.getByText('Gölbaşı')).toBeInTheDocument();
    expect(screen.getByText('Ankara')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /değiştir/i })
    ).toBeInTheDocument();
  });

  it('"Değiştir" seçimi temizliyor', () => {
    const { onClear } = ciz({ city: 'Ankara', district: 'Gölbaşı' });
    fireEvent.click(screen.getByRole('button', { name: /değiştir/i }));
    expect(onClear).toHaveBeenCalled();
  });

  it('eşleşme yoksa bunu söylüyor', async () => {
    ciz();
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'zzzz' },
    });
    await waitFor(() => {
      expect(screen.getByText(/eşleşen ilçe yok/i)).toBeInTheDocument();
    });
  });

  it('liste inmezse sessiz kalmıyor', async () => {
    // Boş bir öneri listesi göstermek, kullanıcının yazdığı ilçenin var
    // olmadığı izlenimini verirdi — oysa sorun bağlantıda.
    veri.hata = true;
    ciz();
    fireEvent.focus(screen.getByRole('searchbox'));
    await waitFor(() => {
      expect(screen.getByText(/yüklenemedi/i)).toBeInTheDocument();
    });
  });
});
