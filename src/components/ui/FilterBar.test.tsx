import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { FilterBar, FilterCell } from './FilterBar';
import { ActiveFilters } from './ActiveFilters';

/**
 * MOBİL FİLTRE ÇEKMECESİ (§7.1) ve GÖRÜNÜR AKTİF FİLTRELER.
 *
 * Testin koruduğu iki şey:
 *
 * 1. ÇOCUKLAR TEK KEZ ÇİZİLİYOR. En ucuz çözüm `hidden sm:grid` + ikinci
 *    bir kopya olurdu; kontroller `id` taşıdığı için bu, DOM'da çift
 *    `id` demekti — etiket yanlış alana bağlanır ve erişilebilirlik
 *    kapısı bunu "adlandırılmış" gördüğü için yakalamazdı.
 * 2. GİZLENEN FİLTRE SAYILIYOR. Çekmece kapalıyken kaç filtrenin açık
 *    olduğu düğmede yazmazsa, kullanıcı kısa listenin sebebini göremez.
 */

function setViewport(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches,
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

function renderBar(activeCount = 0) {
  return render(
    <FilterBar activeCount={activeCount}>
      <FilterCell label="Şehir" htmlFor="t-city">
        <select id="t-city">
          <option>Ankara</option>
        </select>
      </FilterCell>
    </FilterBar>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.style.overflow = '';
});

describe('FilterBar — geniş ekran', () => {
  beforeEach(() => setViewport(false));

  it('filtreler doğrudan görünüyor, çekmece düğmesi yok', () => {
    renderBar();
    expect(screen.getByLabelText('Şehir')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Filtreler/ })
    ).not.toBeInTheDocument();
  });

  it('fazla filtreleri tek açılır panelde topluyor', () => {
    const { container } = render(
      <FilterBar activeCount={2} primaryCount={2}>
        <FilterCell label="Ara" htmlFor="wide-search">
          <input id="wide-search" />
        </FilterCell>
        <FilterCell label="Şehir" htmlFor="wide-city">
          <select id="wide-city"><option>Ankara</option></select>
        </FilterCell>
        <FilterCell label="Tür" htmlFor="wide-type">
          <select id="wide-type"><option>Webinar</option></select>
        </FilterCell>
      </FilterBar>
    );

    const details = container.querySelector('details');
    expect(details).not.toBeNull();
    expect(within(details!).getByLabelText('Tür')).toBeInTheDocument();
    expect(details).not.toHaveAttribute('open');

    fireEvent.click(screen.getByText('Filtreler', { selector: 'summary' }));
    expect(details).toHaveAttribute('open');
  });
});

describe('FilterBar — dar ekran', () => {
  beforeEach(() => setViewport(true));

  it('filtreler çekmeceye giriyor ve açılınca çiziliyor', () => {
    renderBar();
    /* Kapalıyken kontrol DOM'da yok — gizli değil, hiç yok. Gizli bir
       kopya `id` çakışması demekti. */
    expect(screen.queryByLabelText('Şehir')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Şehir')).toBeInTheDocument();
  });

  it('aktif filtre sayısı düğmede yazıyor', () => {
    renderBar(3);
    expect(
      screen.getByRole('button', { name: /Filtreler/ })
    ).toHaveTextContent('3');
  });

  it('sayı sıfırken rozet çizilmiyor', () => {
    renderBar(0);
    expect(
      screen.getByRole('button', { name: /Filtreler/ }).textContent
    ).toBe('Filtreler');
  });

  it('Escape kapatıyor', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('"Sonuçları gör" kapatıyor', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Sonuçları gör' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /* Arkadaki liste kaymamalı: çekmece açıkken sayfa kaydırılırsa
     kullanıcı filtreyi kapatmadan içeriği kaybeder. */
  it('açıkken sayfa kaydırması kilitleniyor, kapanınca çözülüyor', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('çekmece diyalog olarak adlandırılmış', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Filtreler');
  });
});

describe('ActiveFilters', () => {
  const chips = [
    { param: 'q', value: 'm31', label: '"m31"' },
    { param: 'sehir', value: 'Ankara', label: 'Ankara' },
  ];

  it('her chip kaldırma eylemiyle adlandırılıyor', () => {
    const onRemove = vi.fn();
    render(
      <ActiveFilters chips={chips} onRemove={onRemove} onClearAll={vi.fn()} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Ankara filtresini kaldır' })
    );
    expect(onRemove).toHaveBeenCalledWith(chips[1]);
  });

  it('filtre yokken hiçbir şey çizilmiyor', () => {
    const { container } = render(
      <ActiveFilters chips={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  /* Tek filtrede "tümünü temizle" kısayol değil, ikinci bir yoldur;
     gürültü ekler. */
  it('"Tümünü temizle" yalnızca birden fazla filtrede çıkıyor', () => {
    const { rerender } = render(
      <ActiveFilters
        chips={[chips[0]]}
        onRemove={vi.fn()}
        onClearAll={vi.fn()}
      />
    );
    expect(screen.queryByText('Tümünü temizle')).not.toBeInTheDocument();

    rerender(
      <ActiveFilters chips={chips} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText('Tümünü temizle')).toBeInTheDocument();
  });
});
