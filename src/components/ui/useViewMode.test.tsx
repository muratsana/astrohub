import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useViewMode } from './useViewMode';
import {
  notifyPreferenceChange,
  setPreferenceAdapter,
} from './preferenceStore';

/**
 * GÖRÜNÜM TERCİHİ — YEREL VE HESAP (Faz 4).
 *
 * Ölçülen sıra: ilk kare `localStorage` (anında, titremesiz), hesap
 * satırı gelince onun üstüne yazıyor. Ters sıra özelliği anlamsız
 * kılardı — telefonda yapılan seçim masaüstüne hiç ulaşmazdı, çünkü
 * masaüstünde zaten bir yerel değer var.
 */

function Ekran() {
  const [mode, setMode] = useViewMode('test-modul');
  return (
    <>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode('list')}>listeye geç</button>
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  setPreferenceAdapter(null);
});

afterEach(() => {
  setPreferenceAdapter(null);
});

describe('useViewMode', () => {
  it('varsayılan ızgara', () => {
    render(<Ekran />);
    expect(screen.getByTestId('mode')).toHaveTextContent('grid');
  });

  it('yerel depodaki seçim ilk karede uygulanıyor', () => {
    localStorage.setItem('astrohub:view:test-modul', 'list');
    render(<Ekran />);
    expect(screen.getByTestId('mode')).toHaveTextContent('list');
  });

  it('seçim yerel depoya yazılıyor', () => {
    render(<Ekran />);
    fireEvent.click(screen.getByRole('button'));
    expect(localStorage.getItem('astrohub:view:test-modul')).toBe('list');
  });

  it('seçim HESABA da yazılıyor', () => {
    const yazilan: [string, string][] = [];
    setPreferenceAdapter({
      get: () => null,
      set: (k, v) => void yazilan.push([k, v]),
    });

    render(<Ekran />);
    fireEvent.click(screen.getByRole('button'));
    expect(yazilan).toEqual([['view:test-modul', 'list']]);
  });

  it('HESAP GELİNCE hesap kazanıyor — yerel değerin üstüne yazıyor', () => {
    localStorage.setItem('astrohub:view:test-modul', 'grid');
    render(<Ekran />);
    expect(screen.getByTestId('mode')).toHaveTextContent('grid');

    /* Ağ turu tamamlandı: satırlar geldi. */
    act(() => {
      setPreferenceAdapter({ get: () => 'list', set: () => {} });
      notifyPreferenceChange();
    });

    expect(screen.getByTestId('mode')).toHaveTextContent('list');
    /* Yerel depo da güncelleniyor ki bir sonraki açılışta ilk kare
       zaten doğru olsun. */
    expect(localStorage.getItem('astrohub:view:test-modul')).toBe('list');
  });

  it('hesaptaki TANIMSIZ değer görmezden geliniyor', () => {
    /* Tabloya elle yazılmış ya da kaldırılmış bir seçenek, arayüzü
       hiçbir dalı eşleşmeyen bir duruma düşürmemeli. */
    render(<Ekran />);
    act(() => {
      setPreferenceAdapter({ get: () => 'takvim', set: () => {} });
      notifyPreferenceChange();
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('grid');
  });

  it('adaptör yokken hiçbir şey değişmiyor', () => {
    render(<Ekran />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByTestId('mode')).toHaveTextContent('list');
  });
});
