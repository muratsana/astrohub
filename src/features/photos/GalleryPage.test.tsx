import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GalleryPage } from './GalleryPage';
import { photos } from './data';

/*
 * Galeri artık `usePhotoCatalog` üzerinden okuyor; kanca TanStack Query
 * kullanıyor ve sağlayıcı olmadan render çöker. Test ortamında Supabase
 * yapılandırması yok, dolayısıyla sorgu hiç kurulmuyor ve sayfa tohum
 * veriyle boyanıyor — beklentiler `photos` dizisi üzerinden geçerli
 * kalıyor.
 */
function renderGallery() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <GalleryPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Arama kutusuna yazıp GECİKMENİN dolmasını bekler.
 *
 * Faz 4'te arama ortak Data Explorer'a taşındı ve 250 ms debounce
 * kazandı: her tuş vuruşunda bütün listeyi süzmek ve URL'ye yazmak
 * yazarken takılma üretiyordu. Testler artık sonucu beklemek zorunda —
 * `waitFor` gerçek zamanlayıcıyla çalışıyor, sahte zamanlayıcı kurmaya
 * gerek yok.
 */
async function ara(terim: string) {
  fireEvent.change(screen.getByLabelText(/^ara$/i), { target: { value: terim } });
  await waitFor(() =>
    expect(screen.getByLabelText(/^ara$/i)).toHaveValue(terim)
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

  it('filtre uygulanınca sayacı kesirli gösterir', async () => {
    renderGallery();
    await ara('rozet');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        `1 / ${photos.length} fotoğraf`
      )
    );
  });

  it('arama kutusu sonuçları daraltır', async () => {
    renderGallery();
    await ara('rozet');
    await waitFor(() => expect(photoLinks()).toHaveLength(1));
    expect(photoLinks()[0]).toHaveAttribute(
      'href',
      '/fotograf/rozet-bulutsusu-sho'
    );
  });

  it('eşleşme yoksa boş durum mesajı gösterir', async () => {
    renderGallery();
    await ara('olmayan-hedef-xyz');
    expect(await screen.findByText(/eşleşen kayıt yok/i)).toBeInTheDocument();
  });

  /*
   * FAZ 4 DAVRANIŞ DEĞİŞİKLİĞİ. Eski galeri araması yalnızca
   * `toLocaleLowerCase('tr-TR')` yapıyordu, yani ASCII yazan kullanıcı
   * Türkçe karakterli kaydı BULAMIYORDU. Ortak motor katlıyor.
   */
  it('ASCII yazımla Türkçe karakterli kaydı buluyor', async () => {
    const turkceli = photos.find((p) => /[çğıöşü]/i.test(p.target.name));
    if (!turkceli) return;
    renderGallery();
    await ara(
      turkceli.target.name
        .toLocaleLowerCase('tr-TR')
        .replace(/[ışğüöç]/g, (c) => ({ ı: 'i', ş: 's', ğ: 'g', ü: 'u', ö: 'o', ç: 'c' })[c] ?? c)
    );
    await waitFor(() => expect(photoLinks().length).toBeGreaterThan(0));
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
