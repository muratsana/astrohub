import { describe, expect, it } from 'vitest';
import {
  buildMonthlySelection,
  latestMonthWithPhotos,
  monthKey,
  monthlySelectionScore,
} from './monthlySelection';
import type { AstroPhoto } from './types';

const base: AstroPhoto = {
  slug: 'ornek',
  title: 'Örnek Fotoğraf',
  target: { name: 'M 31', catalog: 'M 31', constellation: 'Andromeda' },
  type: 'deep-sky',
  user: { username: 'astro', displayName: 'Astro' },
  description: 'Test kaydı.',
  gradient: 'linear-gradient(#000, #111)',
  capturedAt: '2026-01-10',
  location: { label: 'Antalya', visibility: 'region', bortle: 3 },
  setup: { optic: '80mm apo', camera: 'CMOS', mount: 'EQ' },
  exposures: [],
  palette: 'RGB',
  processing: { software: [] },
  license: 'Test',
  solve: {
    durum: 'yok',
    raDeg: null,
    decDeg: null,
    rotationDeg: null,
    scaleArcsecPx: null,
    fieldWidthDeg: null,
    fieldHeightDeg: null,
    parity: null,
    provider: null,
    error: null,
  },
  likes: 0,
  comments: 0,
  rating: { toplam: 0, sayi: 0 },
  year: 2026,
  city: 'Antalya',
};

function photo(patch: Partial<AstroPhoto>): AstroPhoto {
  return { ...base, ...patch };
}

describe('monthlySelection', () => {
  it('ISO tarihinden ay anahtarı çıkarır', () => {
    expect(monthKey('2026-08-03')).toBe('2026-08');
    expect(monthKey('yanlis')).toBeNull();
  });

  it('fotoğraf olan en yeni ayı seçer', () => {
    expect(
      latestMonthWithPhotos([
        photo({ capturedAt: '2025-12-31' }),
        photo({ capturedAt: '2026-02-01' }),
        photo({ capturedAt: '2026-01-01' }),
      ])
    ).toBe('2026-02');
  });

  it('puanı oy, etkileşim ve editör işaretinden üretir', () => {
    const low = monthlySelectionScore(
      photo({ likes: 10, comments: 1, rating: { toplam: 0, sayi: 0 } })
    );
    const high = monthlySelectionScore(
      photo({
        likes: 120,
        comments: 20,
        rating: { toplam: 45, sayi: 5 },
        editorsPick: true,
      })
    );

    expect(high.score).toBeGreaterThan(low.score);
    expect(high.parts.rating).toBeGreaterThan(0);
    expect(high.parts.editor).toBe(10);
  });

  it('yalnız seçili ayın kayıtlarını sıralar', () => {
    const selection = buildMonthlySelection(
      [
        photo({ slug: 'eski', title: 'Eski', capturedAt: '2026-01-01', likes: 400 }),
        photo({ slug: 'orta', title: 'Orta', capturedAt: '2026-02-01', likes: 10 }),
        photo({ slug: 'iyi', title: 'İyi', capturedAt: '2026-02-02', likes: 300 }),
      ],
      { month: '2026-02', limit: 1 }
    );

    expect(selection?.items).toHaveLength(1);
    expect(selection?.items[0].photo.slug).toBe('iyi');
  });

  it('ay bulunamazsa boş sonuç döner', () => {
    expect(buildMonthlySelection([], { month: null })).toBeNull();
  });
});
