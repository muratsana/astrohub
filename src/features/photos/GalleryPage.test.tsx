import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GalleryPage } from './GalleryPage';
import { photos } from './data';

function renderGallery() {
  return render(
    <MemoryRouter>
      <GalleryPage />
    </MemoryRouter>
  );
}

describe('GalleryPage (§7.2)', () => {
  it('başlığı, yükleme CTA’sını ve tüm kartları gösterir', () => {
    renderGallery();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Fotoğraflar' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /fotoğraf yükle/i })
    ).toHaveAttribute('href', '/fotograflar/yukle');
    // Her fotoğraf için bir kart bağlantısı
    const cards = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/fotograf/'));
    expect(cards.length).toBe(photos.length);
  });

  it('arama kutusu sonuçları daraltır', () => {
    renderGallery();
    fireEvent.change(screen.getByLabelText(/fotoğraf ara/i), {
      target: { value: 'rozet' },
    });
    const cards = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/fotograf/'));
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('href', '/fotograf/rozet-bulutsusu-sho');
  });

  it('eşleşme yoksa boş durum mesajı gösterir', () => {
    renderGallery();
    fireEvent.change(screen.getByLabelText(/fotoğraf ara/i), {
      target: { value: 'olmayan-hedef-xyz' },
    });
    expect(screen.getByText(/eşleşen fotoğraf bulunamadı/i)).toBeInTheDocument();
  });
});
