import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThumbnailKadraj } from './ThumbnailKadraj';
import { VARSAYILAN_KADRAJ } from '@/domain/profile/kadraj';

/**
 * KART KADRAJI KONTROLÜ — erişilebilir kaydırıcılar (C07, C15).
 *
 * KadrajEditoru'nun tuval sürüklemesi klavyeyle kullanılamıyordu; burada
 * kaydırıcılar ASIL denetim. Bu test üç eksenin de birer `range` girişi
 * olduğunu ve değişimin normalize bir kadraj yaydığını sabitliyor.
 */
afterEach(() => {
  vi.unstubAllGlobals();
});

function file() {
  return new File([new Uint8Array(8)], 'gece.jpg', { type: 'image/jpeg' });
}

describe('ThumbnailKadraj (C07/C15)', () => {
  it('createImageBitmap yoksa zarif bir not gösterir', () => {
    vi.stubGlobal('createImageBitmap', undefined);
    render(
      <ThumbnailKadraj
        file={file()}
        kadraj={VARSAYILAN_KADRAJ}
        onChange={() => {}}
      />
    );
    expect(screen.getByText(/otomatik seçilecek/i)).toBeTruthy();
  });

  it('üç eksende erişilebilir kaydırıcı sunar ve değişim kadraj yayar', async () => {
    vi.stubGlobal('createImageBitmap', () =>
      Promise.resolve({ width: 1000, height: 800, close: () => {} })
    );
    const degisim = vi.fn();
    render(
      <ThumbnailKadraj
        file={file()}
        kadraj={VARSAYILAN_KADRAJ}
        onChange={degisim}
      />
    );

    // Bitmap yüklenince fallback yerine kaydırıcılar geliyor.
    const yakin = await screen.findByRole('slider', { name: 'Yakınlaştırma' });
    expect(screen.getByRole('slider', { name: 'Yatay' })).toBeTruthy();
    expect(screen.getByRole('slider', { name: 'Dikey' })).toBeTruthy();

    fireEvent.change(yakin, { target: { value: '1.5' } });
    await waitFor(() => expect(degisim).toHaveBeenCalled());
    const sonKadraj = degisim.mock.calls.at(-1)![0];
    expect(sonKadraj.zoom).toBeCloseTo(1.5, 5);
    // Normalize edilmiş bir kadraj dönmeli (panX/panY sayı).
    expect(typeof sonKadraj.panX).toBe('number');
    expect(typeof sonKadraj.panY).toBe('number');
  });
});
