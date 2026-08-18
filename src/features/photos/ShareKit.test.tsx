import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ShareKit } from './ShareKit';
import type { AstroPhoto } from './types';

const AUTH = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock('@/features/auth/AuthContext', () => ({
  useAuth: () => ({ user: AUTH.user }),
}));

function foto(over: Partial<AstroPhoto> = {}): AstroPhoto {
  return {
    id: 'p1',
    ownerId: 'u1',
    slug: 'orion',
    title: 'Orion',
    target: { name: 'Orion Bulutsusu', catalog: 'M 42', constellation: 'Orion' },
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
  vi.unstubAllGlobals();
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
    fireEvent.click(screen.getByRole('button', { name: 'Paylaşım kiti hazırla' }));
    expect(screen.getByText(/Orion Bulutsusu \(M 42\)/)).toBeTruthy();
    expect(screen.getByText(/RC8 · ASI2600MM · EQ6/)).toBeTruthy();
  });

  it('ekipman kapatılınca künyeden çıkıyor (D10)', () => {
    AUTH.user = { id: 'u1' };
    render(<ShareKit photo={foto()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paylaşım kiti hazırla' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Ekipman' }));
    expect(screen.queryByText(/RC8/)).toBeNull();
  });

  it('kopyala panoya yazıyor (D08)', () => {
    AUTH.user = { id: 'u1' };
    const yaz = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText: yaz } });
    render(<ShareKit photo={foto()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Paylaşım kiti hazırla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Künyeyi kopyala' }));
    expect(yaz).toHaveBeenCalledOnce();
    expect(yaz.mock.calls[0][0]).toContain('Orion Bulutsusu (M 42)');
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
    fireEvent.click(screen.getByRole('button', { name: 'Paylaşım kiti hazırla' }));
    fireEvent.click(screen.getByRole('button', { name: 'caption.txt indir' }));
    expect(indirilen[0]).toBe('astrohub-orion-caption.txt');
  });
});
