import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DownloadChip } from './PhotoDetailPage';
import { photos } from './data';
import { COZUM_YOK, type AstroPhoto } from './types';

/**
 * İNDİRME MENÜSÜ — annotasyonsuz kopya indirilebilmeli (B02).
 *
 * Bu testin varlık sebebi: menüdeki "Fotoğraf (JPEG)" seçeneği
 * annotasyonsuz yayımlanan kopyayı `fetch` ile alıp aynı-kaynak blob
 * adresine çevirerek indiriyor. Farklı kaynaktaki bir `<a download>`
 * tarayıcı tarafından yok sayıldığından (G01 raporu) bu yol kırılırsa
 * düğme sessizce "indirmiyor" durumuna düşer — sözleşme bir testte
 * sabitlensin: annotasyonsuz seçim `image.url`i çekmeli ve dosya adı
 * "alan-cozumlu" ekini TAŞIMAMALI.
 */

/* Alan çözümü katalog sorguları menü açılınca kuruluyor; testte boş
   veri taklit ediliyor — ölçülen şey indirme yolu, katalog değil. */
vi.mock('@/services/content/fieldObjects', async () => {
  const gercek = await vi.importActual<
    typeof import('@/services/content/fieldObjects')
  >('@/services/content/fieldObjects');
  return {
    ...gercek,
    useAlandakiCisimler: () => ({ data: [] }),
  };
});
vi.mock('@/services/content/fieldStars', async () => {
  const gercek = await vi.importActual<
    typeof import('@/services/content/fieldStars')
  >('@/services/content/fieldStars');
  return {
    ...gercek,
    useAlandakiYildizlar: () => ({ data: [] }),
  };
});

const temel = photos.find((p) => p.image?.url)!;

function indirilebilirFoto(): AstroPhoto {
  return {
    ...temel,
    solve: COZUM_YOK,
    image: {
      url: 'https://ornek.test/gorsel/display.jpg',
      credit: 'Test',
      licence: 'CC BY-SA',
    },
    access: { allowDownload: true, watermarkRequired: false },
  };
}

function ekrandaCiz(photo: AstroPhoto) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <DownloadChip photo={photo} />
      </QueryClientProvider>
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DownloadChip — annotasyonsuz indirme (B02)', () => {
  it('indirme kapalıysa hiç görünmez', () => {
    const photo = indirilebilirFoto();
    photo.access = { allowDownload: false, watermarkRequired: false };
    ekrandaCiz(photo);
    expect(screen.queryByRole('button', { name: 'İndir' })).toBeNull();
  });

  it('"Fotoğraf (JPEG)" seçimi image.url\'i çeker ve blob\'a indirir', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(new Blob(['x'], { type: 'image/jpeg' })));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:sahte'),
      revokeObjectURL: vi.fn(),
    });

    const indirilenler: { href: string; download: string }[] = [];
    const gercekClick = HTMLAnchorElement.prototype.click;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
      function (this: HTMLAnchorElement) {
        indirilenler.push({ href: this.href, download: this.download });
      }
    );

    ekrandaCiz(indirilebilirFoto());
    fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Fotoğraf \(JPEG\)/ }));

    await waitFor(() => expect(indirilenler.length).toBe(1));
    expect(fetchMock).toHaveBeenCalledWith('https://ornek.test/gorsel/display.jpg');
    // Annotasyonsuz kopyanın adı "alan-cozumlu" ekini taşımamalı.
    expect(indirilenler[0].download).not.toContain('alan-cozumlu');
    expect(indirilenler[0].download).toMatch(/\.jpe?g$/i);
    expect(indirilenler[0].href).toBe('blob:sahte');
    void gercekClick;
  });

  it('alan çözümü yoksa "Alan çözümlü" seçeneği devre dışı', () => {
    ekrandaCiz(indirilebilirFoto());
    fireEvent.click(screen.getByRole('button', { name: 'İndir' }));
    const annotated = screen.getByRole('menuitem', {
      name: /Alan çözümlü/,
    }) as HTMLButtonElement;
    expect(annotated.disabled).toBe(true);
  });
});
