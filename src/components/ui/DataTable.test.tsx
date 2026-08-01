import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { DataTable, type Column } from './DataTable';

/**
 * TABLO GÖRÜNÜMÜ (§7.3).
 *
 * Testin koruduğu asıl şey SIRALAMANIN NEREDE TUTULDUĞU: başlıklar
 * motorun sıralama değerini değiştirmeli, kendi iç durumunu değil.
 * Tablo kendi sıralamasını tutsaydı ızgaraya geçen kullanıcı
 * sıralamasını kaybeder ve URL'deki `?sirala=` ile başlıktaki ok farklı
 * şeyler söylerdi.
 */

interface Satir {
  slug: string;
  ad: string;
  fiyat: number;
  sehir: string;
}

const ROWS: Satir[] = [
  { slug: 'a', ad: 'Refraktör', fiyat: 48500, sehir: 'Ankara' },
  { slug: 'b', ad: 'Montür', fiyat: 22000, sehir: 'İzmir' },
];

const COLUMNS: Column<Satir>[] = [
  { key: 'ad', header: 'İlan', cell: (r) => r.ad, alwaysVisible: true },
  {
    key: 'fiyat',
    header: 'Fiyat',
    numeric: true,
    cell: (r) => r.fiyat,
    sort: { asc: 'ucuz', desc: 'pahali' },
  },
  { key: 'sehir', header: 'Şehir', cell: (r) => r.sehir },
];

function setViewport(narrow: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: narrow,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
  );
}

function renderTable(
  props: Partial<Parameters<typeof DataTable<Satir>>[0]> = {}
) {
  return render(
    <MemoryRouter>
      <DataTable
        rows={ROWS}
        columns={COLUMNS}
        rowKey={(r) => r.slug}
        rowHref={(r) => `/ilan/${r.slug}`}
        {...props}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  setViewport(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DataTable — sıralama', () => {
  it('başlık motorun sıralama değerini değiştiriyor', () => {
    const onChange = vi.fn();
    renderTable({ sort: { value: 'yeni', onChange } });
    fireEvent.click(screen.getByRole('button', { name: /Fiyat/ }));
    expect(onChange).toHaveBeenCalledWith('ucuz');
  });

  it('aktif sütuna tekrar basmak yönü çeviriyor', () => {
    const onChange = vi.fn();
    renderTable({ sort: { value: 'ucuz', onChange } });
    fireEvent.click(screen.getByRole('button', { name: /Fiyat/ }));
    expect(onChange).toHaveBeenCalledWith('pahali');
  });

  /* Yön görünmezse başlık tıklayınca ne olacağını söylemiyor demektir. */
  it('yön aria-sort ile duyuruluyor', () => {
    renderTable({ sort: { value: 'ucuz', onChange: vi.fn() } });
    const fiyat = screen
      .getAllByRole('columnheader')
      .find((th) => th.textContent?.includes('Fiyat'));
    expect(fiyat).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sıralanamayan sütun düğme değil', () => {
    renderTable({ sort: { value: 'ucuz', onChange: vi.fn() } });
    expect(
      screen.queryByRole('button', { name: /Şehir/ })
    ).not.toBeInTheDocument();
  });

  /* Sıralama verilmediğinde hiçbir başlık tıklanabilir olmamalı. */
  it('sıralama bağlanmadıysa başlıklar düz metin', () => {
    renderTable();
    expect(
      screen.queryByRole('button', { name: /Fiyat/ })
    ).not.toBeInTheDocument();
  });
});

describe('DataTable — sütun ve yoğunluk', () => {
  it('sütun gizlenebiliyor ve tercih saklanıyor', () => {
    const { unmount } = renderTable({ preferenceKey: 'test' });
    fireEvent.click(screen.getByRole('button', { name: 'Sütunlar' }));
    fireEvent.click(screen.getByLabelText('Şehir'));

    expect(
      screen.queryByRole('columnheader', { name: /Şehir/ })
    ).not.toBeInTheDocument();

    unmount();
    renderTable({ preferenceKey: 'test' });
    expect(
      screen.queryByRole('columnheader', { name: /Şehir/ })
    ).not.toBeInTheDocument();
  });

  /* Kimlik sütunu kapatılırsa satırın hangi kayıt olduğu okunamaz. */
  it('kimlik sütunu kapatılamıyor', () => {
    renderTable({ preferenceKey: 'test' });
    fireEvent.click(screen.getByRole('button', { name: 'Sütunlar' }));
    expect(screen.getByLabelText('İlan')).toBeDisabled();
  });

  it('yoğunluk seçimi işaretleniyor', () => {
    renderTable({ preferenceKey: 'test' });
    const grup = screen.getByRole('group', { name: 'Satır yoğunluğu' });
    fireEvent.click(within(grup).getByText('Sık'));
    expect(within(grup).getByText('Sık')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  /* Tercihi saklayamayacağımız bir ayarı sunmak, kullanıcıya her
     ziyarette aynı işi yaptırmak olurdu. */
  it('anahtar verilmezse kontroller çizilmiyor', () => {
    renderTable();
    expect(
      screen.queryByRole('button', { name: 'Sütunlar' })
    ).not.toBeInTheDocument();
  });
});

describe('DataTable — mobil', () => {
  beforeEach(() => setViewport(true));

  /* Yatay kaydırmalı tablo telefonda okunmuyor: kullanıcı başlığı
     kaybediyor ve hangi sayının hangi sütuna ait olduğunu göremiyor. */
  it('tablo yerine etiket-değer listesi çiziliyor', () => {
    renderTable();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByText('Refraktör')).toBeInTheDocument();
    /* Değer etiketiyle birlikte: sayı tek başına anlamsız. */
    expect(screen.getAllByText('Fiyat').length).toBe(ROWS.length);
  });

  it('satır bağlantısı mobilde de duruyor', () => {
    renderTable();
    expect(screen.getByRole('link', { name: 'Refraktör' })).toHaveAttribute(
      'href',
      '/ilan/a'
    );
  });
});

describe('DataTable — boş durum', () => {
  it('kayıt yokken mesaj çiziliyor', () => {
    renderTable({ rows: [], empty: 'Eşleşen ilan yok' });
    expect(screen.getByText('Eşleşen ilan yok')).toBeInTheDocument();
  });
});
