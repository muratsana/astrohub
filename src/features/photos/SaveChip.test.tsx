import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { SaveChip } from './PhotoDetailPage';
import { photos } from './data';
import type { SavedState } from '@/services/content/collections';

/**
 * KAYDET SEMANTİĞİ — koleksiyon, indirme değil (B06).
 *
 * "Kaydet" tek başına indirme mi koleksiyon mu belirsizdi. Bu test,
 * düğmenin her durumda "koleksiyon" sözcüğünü taşıdığını ve indirmeyle
 * karışacak sade "Kaydet"e geri dönmediğini sabitliyor.
 */
const KAYDET_HALI = vi.hoisted(() => ({ value: {} as SavedState }));

vi.mock('@/services/content/collections', () => ({
  useSavedPhoto: () => KAYDET_HALI.value,
}));

const foto = photos[0];

function ciz(state: Partial<SavedState>) {
  KAYDET_HALI.value = {
    saved: false,
    canSave: true,
    busy: false,
    error: null,
    toggle: vi.fn(),
    ...state,
  };
  return render(
    <MemoryRouter>
      <SaveChip photo={{ ...foto, id: 'foto-1' }} />
    </MemoryRouter>
  );
}

describe('SaveChip — koleksiyon semantiği (B06)', () => {
  it('kaydedilmemişken "Koleksiyona kaydet" yazar', () => {
    ciz({ saved: false });
    expect(
      screen.getByRole('button', { name: 'Koleksiyona kaydet' })
    ).toBeTruthy();
    // İndirmeyle karışacak sade "Kaydet" düğmesi olmamalı.
    expect(screen.queryByRole('button', { name: 'Kaydet' })).toBeNull();
  });

  it('kaydedilmişken "Koleksiyonda" gösterir, aria "Koleksiyondan çıkar"', () => {
    ciz({ saved: true });
    const btn = screen.getByRole('button', { name: 'Koleksiyondan çıkar' });
    expect(btn.textContent).toBe('Koleksiyonda');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
  });

  it('giriş yapılmamışsa düz metin de koleksiyon der', () => {
    ciz({ canSave: false });
    expect(screen.getByText('Koleksiyona kaydet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
