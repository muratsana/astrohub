import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { PhotoViewer } from './PhotoViewer';
import { photos } from './data';
import { COZUM_YOK, type AstroPhoto } from './types';

/**
 * GÖRÜNTÜLEYİCİ — Faz 1.2 görsel boru hattının görünen ucu.
 *
 * Bu testlerin varlık sebebi somut bir hata: detay sayfası her fotoğraf
 * için yer tutucu gradyan çiziyor, `photo.image.url` alanına hiç
 * bakmıyordu. Galeri kartında görünen kare, tıklayınca açılan sayfada
 * kayboluyordu ve köşedeki "Faz 1.2'de" rozeti bunu bir eksiklik gibi
 * göstererek gizliyordu.
 */
const withImage = photos.find((p) => p.image?.url)!;

function withoutImage(): AstroPhoto {
  return { ...withImage, image: undefined };
}

function renderViewer(photo: AstroPhoto) {
  return render(
    <MemoryRouter>
      <PhotoViewer photo={photo} />
    </MemoryRouter>
  );
}

describe('PhotoViewer · görsel', () => {
  it('görseli olan kayıtta gerçek fotoğrafı çiziyor', () => {
    renderViewer(withImage);
    const img = screen.getByRole('img', {
      name: new RegExp(withImage.title, 'i'),
    });
    expect(img).toHaveAttribute('src', withImage.image!.url);
  });

  /*
   * Rozet bir SÖZ veriyordu ve sözün karşılığı zaten yapılmıştı. Geri
   * gelirse, çalışan bir özelliğin üstüne "yapılmadı" yazmış oluruz.
   */
  it('"Faz 1.2" rozetini artık göstermiyor', () => {
    renderViewer(withImage);
    expect(screen.queryByText(/faz 1\.2/i)).not.toBeInTheDocument();
  });

  it('görseli olmayan kayıtta yer tutucuya düşüyor, çökmüyor', () => {
    renderViewer(withoutImage());
    expect(
      screen.queryByRole('button', { name: /büyüt/i })
    ).not.toBeInTheDocument();
  });

  it('gösterim kopyasının piksel ölçüsünü künyeliyor', () => {
    renderViewer({ ...withImage, pixels: { width: 2048, height: 1365 } });
    expect(screen.getByText('2048 × 1365 px')).toBeInTheDocument();
  });
});

describe('PhotoViewer · tam çözünürlük', () => {
  it('tıklayınca tam ekran açılıyor ve Escape kapatıyor', () => {
    renderViewer({ ...withImage, pixels: { width: 2048, height: 1365 } });

    fireEvent.click(screen.getByRole('button', { name: /büyüt/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  /*
   * ASIL KURAL. 1:1 kipi görseli DOĞAL boyutunda çiziyor; o boyut
   * bilinmiyorsa büyütme yapmak, bulanık bir görüntüyü "tam çözünürlük"
   * diye sunmak olurdu — kaldırdığımız rozetin hatasının tersi.
   */
  it('piksel ölçüsü bilinmiyorsa 1:1 seçeneği sunulmuyor', () => {
    renderViewer({ ...withImage, pixels: undefined });
    fireEvent.click(screen.getByRole('button', { name: /büyüt/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /1:1 göster/i })
    ).not.toBeInTheDocument();
  });

  it('ölçü biliniyorsa 1:1 ile sığdır arasında geçiş yapılıyor', () => {
    renderViewer({ ...withImage, pixels: { width: 2048, height: 1365 } });
    fireEvent.click(screen.getByRole('button', { name: /büyüt/i }));

    const zoom = screen.getByRole('button', { name: /1:1 göster/i });
    fireEvent.click(zoom);
    expect(
      screen.getByRole('button', { name: /ekrana sığdır/i })
    ).toBeInTheDocument();
  });
});

describe('PhotoViewer · alan çözümü katmanı', () => {
  const cozulmus: AstroPhoto = {
    ...withImage,
    pixels: { width: 2048, height: 1365 },
    solve: {
      ...COZUM_YOK,
      durum: 'cozuldu',
      raDeg: 10.68,
      decDeg: 41.27,
      rotationDeg: 12.5,
      scaleArcsecPx: 1.8,
      fieldWidthDeg: 1.02,
      fieldHeightDeg: 0.68,
      provider: 'astrometry.net',
    },
  };

  it('çözülmüş kayıtta katman düğmesi çıkıyor ve kapalı başlıyor', () => {
    renderViewer(cozulmus);
    const button = screen.getByRole('button', { name: /alan çözümü/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');
  });

  it('düğme katmanı açıp kapatıyor', () => {
    renderViewer(cozulmus);
    const button = screen.getByRole('button', { name: /alan çözümü/i });

    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  /*
   * Çözüm YOKKEN düğme hiç çizilmemeli: basılınca hiçbir şey olmayan bir
   * düğme, kullanıcıya özelliğin bozuk olduğunu söyler.
   */
  it('çözümü olmayan kayıtta katman düğmesi yok', () => {
    renderViewer(withImage);
    expect(
      screen.queryByRole('button', { name: /alan çözümü/i })
    ).not.toBeInTheDocument();
  });

  it('kuyruktaki kayıtta düğme değil bekleme cümlesi gösteriliyor', () => {
    renderViewer({
      ...withImage,
      solve: { ...COZUM_YOK, durum: 'kuyrukta' },
    });
    expect(screen.getByText(/alan çözümü sırada/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /alan çözümü/i })
    ).not.toBeInTheDocument();
  });
});
