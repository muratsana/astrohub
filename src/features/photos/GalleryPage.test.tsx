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
  it('başlığı, yükleme CTA’sını ve tüm karoları gösterir', () => {
    renderGallery();
    expect(
      screen.getByRole('heading', { level: 1, name: /fotoğraf galerisi/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /fotoğraf yükle/i })).toHaveAttribute(
      'href',
      '/galeri/yukle'
    );
    expect(photoLinks()).toHaveLength(photos.length);
  });

  it('filtre yokken yalnızca toplamı bildirir', () => {
    // "48 / 48" hiçbir bilgi taşımıyordu; filtre uygulanmadan kesir
    // gösterilmez (bkz. ToolBar → ResultCount).
    renderGallery();
    expect(screen.getByRole('status')).toHaveTextContent(
      `${photos.length} fotoğraf`
    );
    expect(screen.getByRole('status').textContent).not.toContain('/');
  });

  it('filtre uygulanınca sayacı kesirli gösterir', () => {
    renderGallery();
    fireEvent.change(screen.getByLabelText(/^ara$/i), {
      target: { value: 'rozet' },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      `1 / ${photos.length} fotoğraf`
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

  it('her karoda tür ailesi rozeti gösterir', () => {
    renderGallery();
    // Dört aileden en az biri her zaman görünür olmalı.
    const labels = ['Derin Uzay', 'Güneş Sistemi', 'Takımyıldız', 'Gece Manzarası'];
    const found = labels.filter((l) => screen.queryAllByText(l).length > 0);
    expect(found.length).toBeGreaterThan(0);
  });

  it('aile filtresi sonuçları daraltır', () => {
    renderGallery();
    const before = photoLinks().length;
    fireEvent.click(screen.getByRole('tab', { name: 'Güneş Sistemi' }));
    const after = photoLinks().length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  it('liste görünümüne geçilebilir', () => {
    renderGallery();
    fireEvent.click(screen.getByRole('button', { name: /liste görünümü/i }));
    expect(
      screen.getByRole('button', { name: /liste görünümü/i })
    ).toHaveAttribute('aria-pressed', 'true');
    // Karo sayısı görünümden bağımsız aynı kalmalı.
    expect(photoLinks()).toHaveLength(photos.length);
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
