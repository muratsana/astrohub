import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { primaryNav } from '@/app/navigation';

/**
 * Ana sayfa duman testi — bölüm sırası:
 * hero → bu gece → galeri → etkinlik → gökyüzü → haber/yazı → araçlar.
 */
function renderHome() {
  return render(
    <MemoryRouter>
      <ThemeProvider>
        <LocationProvider>
          <HomePage />
        </LocationProvider>
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('hero sloganını h1 olarak gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: /kaydet/i })
    ).toBeInTheDocument();
  });

  it('hero’da beş modül mockup’ı bulunur', () => {
    renderHome();
    const list = screen.getByRole('list', { name: /astrohub modülleri/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('hero mockup’ları gerçek modül sayfalarına bağlanır', () => {
    renderHome();
    const list = screen.getByRole('list', { name: /astrohub modülleri/i });
    const hrefs = within(list)
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'));

    // Her mockup bağlantısı üst menüde de bulunan bir modüle gitmeli.
    const navPaths = primaryNav.map((i) => i.to);
    for (const href of hrefs) {
      expect(navPaths).toContain(href);
    }
  });

  it('hero’dan sonra "Bu Gece" panelini gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /^bu gece$/i })
    ).toBeInTheDocument();
  });

  it('hava servisi bağlanmadığı için seeing değerini uydurmaz', () => {
    renderHome();
    const seeing = screen.getByText(/seeing \/ bulut/i).closest('div');
    expect(within(seeing!).getByText('—')).toBeInTheDocument();
  });

  it('galeri şeridini künyeli karolarla gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /galeriden son yüklenenler/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/IC 434/).length).toBeGreaterThan(0);
  });

  it('etkinlikleri tablo olarak listeler', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /yaklaşan etkinlikler/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /tarih/i })
    ).toBeInTheDocument();
  });

  it('karanlık gökyüzü, haberler, yazılar ve araçlar bölümlerini içerir', () => {
    renderHome();
    for (const name of [
      /karanlık gökyüzü/i,
      /^haberler$/i,
      /^yazılar$/i,
      /^araçlar$/i,
    ]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });
});
