import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HeroSection } from './HeroSection';
import { PreviewEditorProvider } from '@/features/preview-editor/PreviewEditorContext';
import { defaultHeroSlides } from '@/features/home/hero/slides';

/**
 * HERO CAROUSEL DAVRANIŞI (Faz 3.3 / §6.3).
 *
 * Okların metnin üstüne binmesi bir YERLEŞİM sorunu ve burada
 * ölçülemez — jsdom düzen hesabı yapmaz, her şey 0×0 döner. Onu
 * `scripts/check-viewports.mjs` gerçek tarayıcıda ölçüyor ve kural
 * `test:all` zincirinde.
 *
 * Burada ölçülen şey DAVRANIŞ: kaydırma, otomatik geçişin durdurulması
 * ve duraklamanın hangi olayla kalkıp hangisiyle kalktığı.
 */

/* Slaytlar `PreviewEditorContext`ten geliyor; sağlayıcısız render
   hemen fırlatıyor. Üretimde sağlayıcı uygulama kökünde. */
const wrap = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PreviewEditorProvider>
          <HeroSection />
        </PreviewEditorProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const TOTAL = defaultHeroSlides.length + 1;

/** Belirli bir slaydın göründüğünü sayaçtan okur ("01 / 05"). */
function slaytNo(container: HTMLElement): string {
  const sayac = container.querySelector('.tabular');
  return (sayac?.textContent ?? '').replace(/\s+/g, '');
}

function kaydir(bolge: Element, baslangic: number, bitis: number) {
  fireEvent.touchStart(bolge, { changedTouches: [{ clientX: baslangic }] });
  fireEvent.touchEnd(bolge, { changedTouches: [{ clientX: bitis }] });
}

beforeEach(() => {
  vi.useFakeTimers();
  /* `matchMedia` jsdom'da yok; hareket azaltma KAPALI varsayılıyor ki
     otomatik geçiş kurulsun ve durdurma düğmesi ölçülebilsin. */
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() })
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('dokunma kaydırması', () => {
  it('sola kaydırınca sonraki slayta geçiyor', () => {
    const { container } = wrap();
    const bolge = container.querySelector('section')!;
    expect(slaytNo(container)).toBe(`01/${String(TOTAL).padStart(2, '0')}`);

    kaydir(bolge, 300, 200);
    expect(slaytNo(container)).toBe(`02/${String(TOTAL).padStart(2, '0')}`);
  });

  it('sağa kaydırınca önceki slayta geçiyor ve başa sarıyor', () => {
    const { container } = wrap();
    const bolge = container.querySelector('section')!;

    /* İlk slayttan geriye gitmek son slayta sarmalı; sarmasaydı
       kullanıcı ilk slaytta kilitli kalırdı. */
    kaydir(bolge, 200, 300);
    expect(slaytNo(container)).toBe(
      `${String(TOTAL).padStart(2, '0')}/${String(TOTAL).padStart(2, '0')}`
    );
  });

  /*
   * EŞİK ÖNEMLİ. Parmak dikey kaydırırken doğal olarak 20–30px yatay
   * salınıyor. Eşik olmasaydı sayfayı aşağı kaydırmaya çalışan kullanıcı
   * farkında olmadan slayt değiştirirdi.
   */
  it('eşiğin altındaki küçük yatay hareket slaytı değiştirmiyor', () => {
    const { container } = wrap();
    const bolge = container.querySelector('section')!;

    kaydir(bolge, 300, 270);
    expect(slaytNo(container)).toBe(`01/${String(TOTAL).padStart(2, '0')}`);
  });
});

describe('otomatik geçişi durdurma', () => {
  it('düğmeye basmadan otomatik geçiyor', () => {
    const { container } = wrap();
    act(() => void vi.advanceTimersByTime(7000));
    expect(slaytNo(container)).toBe(`02/${String(TOTAL).padStart(2, '0')}`);
  });

  it('durdurma düğmesi otomatik geçişi kesiyor', () => {
    const { container } = wrap();
    fireEvent.click(screen.getByRole('button', { name: /geçişini durdur/i }));

    act(() => void vi.advanceTimersByTime(21000));
    expect(slaytNo(container)).toBe(`01/${String(TOTAL).padStart(2, '0')}`);
  });

  it('durdurulduğunda düğme durumu duyuruluyor ve geri açılabiliyor', () => {
    wrap();
    const durdur = screen.getByRole('button', { name: /geçişini durdur/i });
    expect(durdur).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(durdur);
    const baslat = screen.getByRole('button', { name: /geçişini başlat/i });
    expect(baslat).toHaveAttribute('aria-pressed', 'true');
  });

  /*
   * ASIL TUZAK. Fare duraklaması ile kullanıcının kararı AYRI
   * değişkenler. Tek değişkende tutulsaydı, durdur düğmesine basan biri
   * fareyi hero'dan çekince gösteri yeniden başlardı — yani düğme
   * çalışmıyormuş gibi görünürdü.
   */
  it('durdurulduktan sonra fare çekilince yeniden başlamıyor', () => {
    const { container } = wrap();
    const bolge = container.querySelector('section')!;

    fireEvent.mouseEnter(bolge);
    fireEvent.click(screen.getByRole('button', { name: /geçişini durdur/i }));
    fireEvent.mouseLeave(bolge);

    act(() => void vi.advanceTimersByTime(21000));
    expect(slaytNo(container)).toBe(`01/${String(TOTAL).padStart(2, '0')}`);
  });

  it('durdurma düğmesi slayt sekmelerinin dışında', () => {
    /* İçinde olsaydı ekran okuyucu onu altıncı bir slayt sanardı. */
    const sekmeler = screen.queryAllByRole('tab');
    expect(sekmeler).toHaveLength(0);
    wrap();
    expect(screen.getAllByRole('tab')).toHaveLength(TOTAL);
    expect(
      screen
        .getByRole('button', { name: /geçişini durdur/i })
        .closest('[role="tablist"]')
    ).toBeNull();
  });
});

describe('hareket azaltma tercihi', () => {
  it('reduce açıkken otomatik geçiş hiç kurulmuyor', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn() })
    );
    const { container } = wrap();
    act(() => void vi.advanceTimersByTime(21000));
    expect(slaytNo(container)).toBe(`01/${String(TOTAL).padStart(2, '0')}`);
  });
});
