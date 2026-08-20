import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShareKit } from './ShareKit';
import type { AstroPhoto } from './types';

const AUTH = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: AUTH.user }),
}));

const GORSEL = vi.hoisted(() => ({
  calls: [] as { format: string; watermark?: string }[],
  annotatedCagrildi: 0,
}));
vi.mock('@/domain/photography/shareImage', async (gercek) => ({
  ...(await gercek<typeof import('@/domain/photography/shareImage')>()),
  renderShareImage: async (
    _src: Blob,
    opts: { format: string; watermark?: string }
  ) => {
    GORSEL.calls.push({ format: opts.format, watermark: opts.watermark });
    return new Blob(['jpg'], { type: 'image/jpeg' });
  },
}));
/* Alan çözümü katalog hook'ları ve annotatedBlob taklit ediliyor: ölçülen
   şey kaynak seçimi (D11), katalog sorgusu değil. cozumGeometrisi truthy
   dönüyor ki 'cozuldu' yalnızca solve.durum'a bağlı kalsın. */
vi.mock('@/services/content/fieldObjects', () => ({
  cozumGeometrisi: () => ({ raDeg: 0, decDeg: 0 }),
  useAlandakiCisimler: () => ({ data: [] }),
}));
vi.mock('@/services/content/fieldStars', () => ({
  useAlandakiYildizlar: () => ({ data: [] }),
  YILDIZ_ATFI: '',
}));
vi.mock('./annotatedExport', () => ({
  annotatedBlob: async () => {
    GORSEL.annotatedCagrildi += 1;
    return new Blob(['annotated'], { type: 'image/jpeg' });
  },
}));

function foto(over: Partial<AstroPhoto> = {}): AstroPhoto {
  return {
    id: 'p1',
    ownerId: 'u1',
    slug: 'orion',
    title: 'Orion',
    target: {
      name: 'Orion Bulutsusu',
      catalog: 'M 42',
      constellation: 'Orion',
    },
    type: 'deep-sky',
    user: { username: 'muratsana', displayName: 'Murat' },
    description: '',
    gradient: '',
    capturedAt: '2026-01-12',
    location: { label: 'Antalya', visibility: 'region' },
    setup: { optic: 'RC8', camera: 'ASI2600MM', mount: 'EQ6' },
    exposures: [{ filter: 'Ha', frames: 24, exposureSeconds: 300 }],
    palette: 'SHO',
    versions: [],
    calibration: { darks: 0, flats: 0, bias: 0, darkFlats: 0 },
    processing: { software: [], aiDeclared: false },
    solve: { durum: 'yok' } as AstroPhoto['solve'],
    license: 'CC',
    likes: 0,
    comments: 0,
    rating: { toplam: 0, sayi: 0 },
    editorsPick: false,
    ...over,
  } as AstroPhoto;
}

afterEach(() => {
  AUTH.user = null;
  GORSEL.calls = [];
  GORSEL.annotatedCagrildi = 0;
  vi.unstubAllGlobals();
});

const fotoGorselli = () =>
  foto({
    image: {
      url: 'https://cdn.test/display.jpg',
      credit: 'x',
      licence: 'CC',
    },
  });

describe('ShareKit (D01, D02, D08, D09, D10)', () => {
  it('sahibi olmayana hiç çizilmiyor (D01)', () => {
    AUTH.user = { id: 'baskasi' };
    const { container } = render(<ShareKit photo={foto()} />);
    expect(container.textContent).toBe('');
  });

  it('sahibine hazırla açıp künye gösteriyor (D02, D06)', () => {
    AUTH.user = { id: 'u1' };
    render(<ShareKit photo={foto()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    expect(screen.getByText(/Orion Bulutsusu \(M 42\)/)).toBeTruthy();
    expect(screen.getByText(/RC8 · ASI2600MM · EQ6/)).toBeTruthy();
    expect(screen.getByText(/\/fotograf\/orion/)).toBeTruthy();
  });

  it('ekipman kapatılınca künyeden çıkıyor (D10)', () => {
    AUTH.user = { id: 'u1' };
    render(<ShareKit photo={foto()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ekipman' }));
    expect(screen.queryByText(/RC8/)).toBeNull();
  });

  it('kopyala panoya yazıyor (D08)', () => {
    AUTH.user = { id: 'u1' };
    const yaz = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: yaz } });
    render(<ShareKit photo={foto()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Künyeyi kopyala' }));
    expect(yaz).toHaveBeenCalledOnce();
    expect(yaz.mock.calls[0][0]).toContain('Orion Bulutsusu (M 42)');
    expect(yaz.mock.calls[0][0]).toContain('/fotograf/orion');
  });

  it('caption.txt indiriyor (D09)', () => {
    AUTH.user = { id: 'u1' };
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    const indirilen: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      indirilen.push(this.download);
    });
    render(<ShareKit photo={foto()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'caption.txt indir' }));
    expect(indirilen[0]).toBe('astrohub-orion-caption.txt');
  });

  it('feed görselini watermark ile üretip indiriyor (D03, D13)', async () => {
    AUTH.user = { id: 'u1' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Blob(['x'])))
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    const indirilen: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      indirilen.push(this.download);
    });
    render(<ShareKit photo={fotoGorselli()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Feed görseli (4:5)' }));

    await screen.findByRole('button', { name: 'Feed görseli (4:5)' });
    await vi.waitFor(() => expect(GORSEL.calls.length).toBe(1));
    expect(GORSEL.calls[0]).toEqual({
      format: 'feed',
      watermark: '@muratsana',
    });
    await vi.waitFor(() =>
      expect(indirilen).toContain('astrohub-orion-feed.jpg')
    );
  });

  it('watermark kapatılınca story görseli filigransız (D04, D13)', async () => {
    AUTH.user = { id: 'u1' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Blob(['x'])))
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareKit photo={fotoGorselli()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('checkbox', { name: /filigranı/ }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Story görseli (9:16)' })
    );
    await vi.waitFor(() => expect(GORSEL.calls.length).toBe(1));
    expect(GORSEL.calls[0]).toEqual({ format: 'story', watermark: undefined });
  });

  const solvedFoto = () =>
    foto({
      image: {
        url: 'https://cdn.test/display.jpg',
        credit: 'x',
        licence: 'CC',
      },
      solve: {
        durum: 'cozuldu',
        rotationDeg: 0,
        fieldWidthDeg: 1,
      } as AstroPhoto['solve'],
    });

  it('çözülmemişte kaynak seçimi yok; çözülünce annotated seçilebilir (D11)', async () => {
    AUTH.user = { id: 'u1' };
    // Çözülmemiş: radio grubu yok.
    const { unmount } = render(<ShareKit photo={fotoGorselli()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    expect(screen.queryByRole('radiogroup', { name: 'Kaynak' })).toBeNull();
    unmount();

    // Çözülmüş: "Alan çözümlü" seçilince kaynak annotatedBlob'dan geliyor.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Blob(['x'])))
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<ShareKit photo={solvedFoto()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Alan çözümlü' }));
    fireEvent.click(screen.getByRole('button', { name: 'Feed görseli (4:5)' }));
    await vi.waitFor(() => expect(GORSEL.annotatedCagrildi).toBe(1));
  });

  it('tek ZIP paketi feed+story+caption indiriyor (D12)', async () => {
    AUTH.user = { id: 'u1' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(new Blob(['x'])))
    );
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn(),
    });
    const indirilen: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      indirilen.push(this.download);
    });
    render(<ShareKit photo={fotoGorselli()} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Paylaşım kiti hazırla' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tek ZIP indir' }));
    // Feed ve story üretildi, paket indirildi.
    await vi.waitFor(() => expect(GORSEL.calls.length).toBe(2));
    await vi.waitFor(() =>
      expect(indirilen).toContain('astrohub-orion-paylasim.zip')
    );
  });
});
