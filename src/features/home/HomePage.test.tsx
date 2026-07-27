import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';

/**
 * Ana sayfa duman testi — Rasathane Terminali bölüm sırası (§7.1 yeniden
 * yorumu): bu gece → son kayıtlar → manifesto → etkinlik → gökyüzü →
 * araçlar → eğitim.
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
  it('sayfayı "Bu Gece" paneliyle açar', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: /bu gece/i })
    ).toBeInTheDocument();
  });

  it('gerçek efemeris hesabından karanlık penceresi gösterir', () => {
    renderHome();
    // Değer uydurulmuyor: "Astr. karanlık" okuması ya bir saat ya da
    // "yok" içerir — her iki durumda da hesaplanmış bir sonuçtur.
    const readouts = screen.getAllByText(/astr\. karanlık/i);
    expect(readouts.length).toBeGreaterThan(0);
  });

  it('hava servisi bağlanmadığı için seeing değerini uydurmaz', () => {
    renderHome();
    const seeing = screen.getByText(/seeing \/ bulut/i).closest('div');
    expect(within(seeing!).getByText('—')).toBeInTheDocument();
  });

  it('son kayıtlar bölümünü künyeli karolarla gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /son kayıtlar/i })
    ).toBeInTheDocument();
    // Künye her karoda görünür (yön kararı): katalog kodu kart üzerinde.
    expect(screen.getAllByText(/IC 434/).length).toBeGreaterThan(0);
  });

  it('manifesto şeridini ve birincil CTA’yı gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /her karenin/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kayıt aç/i })).toHaveAttribute(
      'href',
      '/fotograflar/yukle'
    );
  });

  it('etkinlikleri tablo olarak listeler', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /yaklaşan etkinlikler/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /tarih/i })).toBeInTheDocument();
  });

  it('karanlık gökyüzü, araçlar ve eğitim bölümlerini içerir', () => {
    renderHome();
    for (const name of [/karanlık gökyüzü/i, /^araçlar$/i, /^eğitim$/i]) {
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
  });
});
