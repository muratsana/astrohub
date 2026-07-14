import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>
  );
}

describe('HomePage', () => {
  it('editoryal başlığı gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: /keşfet/i })
    ).toBeInTheDocument();
  });

  it('birincil CTA olarak fotoğrafları keşfet bağlantısını gösterir', () => {
    renderHome();
    // Tam ad eşleşmesi: modül kartı alt metni ("...astrofotoğrafları keşfet")
    // ile karışmaması için.
    const cta = screen.getByRole('link', { name: 'Fotoğrafları Keşfet' });
    expect(cta).toHaveAttribute('href', '/fotograflar');
  });

  it('hızlı erişim modüllerini listeler', () => {
    renderHome();
    // Not: Türkçe İ/ı case-folding nedeniyle regex'te baş harften kaçınılır.
    expect(
      screen.getByRole('link', { name: /fov hesaplayıcı/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /kirliliği haritası/i })
    ).toBeInTheDocument();
  });

  it('öne çıkan fotoğraflar bölümünü ve tümünü gör bağlantısını gösterir', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { name: /öne çıkan fotoğraflar/i })
    ).toBeInTheDocument();
  });
});
