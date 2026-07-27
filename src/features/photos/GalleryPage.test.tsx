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

/** Kart bağlantılarını toplar (künye satırları da aynı bağlantının içinde). */
function photoLinks() {
  return screen
    .getAllByRole('link')
    .filter((a) => a.getAttribute('href')?.startsWith('/fotograf/'));
}

describe('GalleryPage (§7.2)', () => {
  it('başlığı, kayıt açma CTA’sını ve tüm karoları gösterir', () => {
    renderGallery();
    expect(
      screen.getByRole('heading', { level: 1, name: /kayıt arşivi/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /kayıt aç/i })).toHaveAttribute(
      'href',
      '/galeri/yukle'
    );
    expect(photoLinks()).toHaveLength(photos.length);
  });

  it('sonuç sayacını canlı bildirir', () => {
    renderGallery();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${photos.length} / ${photos.length} kayıt`
    );
  });

  it('arama kutusu sonuçları daraltır', () => {
    renderGallery();
    fireEvent.change(screen.getByLabelText(/^ara$/i), {
      target: { value: 'rozet' },
    });
    const cards = photoLinks();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toHaveAttribute('href', '/fotograf/rozet-bulutsusu-sho');
  });

  it('eşleşme yoksa boş durum mesajı gösterir', () => {
    renderGallery();
    fireEvent.change(screen.getByLabelText(/^ara$/i), {
      target: { value: 'olmayan-hedef-xyz' },
    });
    expect(screen.getByText(/eşleşen kayıt yok/i)).toBeInTheDocument();
  });

  it('künyeyi karo üzerinde her zaman gösterir', () => {
    renderGallery();
    // Yön kararı: teknik veri hover'da açılmaz, kalıcıdır.
    // Her kayıtta üretici ve palet bulunur.
    for (const card of photoLinks()) {
      expect(card).toHaveTextContent('@');
    }
  });

  it('Bortle ölçümü olan kayıtta gökyüzü sınıfını da yazar', () => {
    renderGallery();
    // Ay/gezegen kayıtlarında Bortle anlamlı değildir ve boş bırakılır;
    // derin gökyüzü kayıtlarında künyede görünmelidir.
    const withBortle = photos.find((p) => p.location.bortle != null)!;
    const card = photoLinks().find(
      (a) => a.getAttribute('href') === `/fotograf/${withBortle.slug}`
    );
    expect(card).toHaveTextContent(`B${withBortle.location.bortle}`);
  });
});
