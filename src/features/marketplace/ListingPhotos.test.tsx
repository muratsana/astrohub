import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ListingPhotos } from './ListingPhotos';
import { listings } from './data';
import type { Listing } from './data';

/**
 * İLAN FOTOĞRAFLARI.
 *
 * Test ortamında Supabase yapılandırılmamış: oturum yok, `isOwner`
 * false, yükleme yolu hiç kurulmuyor. Ölçülen şey ziyaretçinin gördüğü
 * durum. Yazma yolu RLS'te (0038) ve tetikleyicide korunuyor.
 */
const base = listings[0];

function renderPhotos(listing: Listing) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ListingPhotos listing={listing} />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('ListingPhotos · fotoğraf yokken', () => {
  /*
   * ASIL DEĞİŞİKLİK. Eskiden HER ilan yıldız alanı çizip altına "medya
   * pipeline'ı (Faz 1.2) bağlandığında açılacak" yazıyordu — boru hattı
   * çoktan bağlanmıştı, eksik olan ilan tarafıydı. O cümle artık yok.
   */
  it('artık "pipeline bağlandığında açılacak" demiyor', () => {
    renderPhotos(base);
    expect(screen.queryByText(/pipeline/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Faz 1\.2/i)).not.toBeInTheDocument();
  });

  it('yer tutucunun temsilî olduğunu dürüstçe söylüyor', () => {
    renderPhotos(base);
    expect(screen.getByText(/temsilî/i)).toBeInTheDocument();
  });

  /*
   * Oturumsuz ziyaretçiye yükleme denetimi gösterilmemeli: sunucunun
   * reddedeceği bir düğme, anlamsız bir hata mesajından başka bir şey
   * üretmez.
   */
  it('sahibi olmayana yükleme denetimi çizilmiyor', () => {
    renderPhotos(base);
    expect(
      screen.queryByRole('button', { name: /fotoğraf ekle/i })
    ).not.toBeInTheDocument();
  });
});

describe('ListingPhotos · tohum ilan', () => {
  /*
   * Tohum kayıtlarda `id` yok; fotoğraf satırı yabancı anahtarla gerçek
   * bir ilana bağlı. Kimliksiz ilanda yükleme hiç denenmemeli.
   */
  it('kimliksiz ilanda çökmüyor', () => {
    expect(() => renderPhotos({ ...base, id: undefined })).not.toThrow();
  });

  it('kimliksiz ilanda yükleme denetimi yok', () => {
    renderPhotos({ ...base, id: undefined, sellerId: undefined });
    expect(
      screen.queryByRole('button', { name: /fotoğraf ekle/i })
    ).not.toBeInTheDocument();
  });
});

describe('ListingPhotos · sahiplik', () => {
  /*
   * Sahiplik `seller.username` ile değil `sellerId` ile soruluyor:
   * kullanıcı adı bir görüntü adı ve değişebilir. Burada oturum yok, o
   * yüzden eşleşen bir sellerId bile sahiplik vermiyor — asıl sınır
   * oturumdaki kimlik.
   */
  it('oturum yokken sellerId tek başına sahiplik vermiyor', async () => {
    renderPhotos({ ...base, id: 'x', sellerId: 'birisi' });
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /fotoğraf ekle/i })
      ).not.toBeInTheDocument();
    });
  });
});
