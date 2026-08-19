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
    collectionId: null,
    collectionName: null,
    collections: [],
    saved: false,
    canSave: true,
    loading: false,
    busy: false,
    error: null,
    moveTo: vi.fn(),
    remove: vi.fn(),
    createAndMove: vi.fn(),
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
  it('kaydedilmemişken "Koleksiyona ekle" yazar', () => {
    ciz({ saved: false });
    expect(screen.getByText('Koleksiyona ekle')).toBeTruthy();
    // İndirmeyle karışacak sade "Kaydet" düğmesi olmamalı.
    expect(screen.queryByRole('button', { name: 'Kaydet' })).toBeNull();
  });

  it('kaydedilmişken koleksiyon adını gösterir', () => {
    ciz({
      saved: true,
      collectionId: 'c-1',
      collectionName: 'Kuyrukluyıldızlar',
    });
    expect(screen.getByText('Koleksiyonda: Kuyrukluyıldızlar')).toBeTruthy();
    expect(
      screen.getByLabelText('Koleksiyon değiştir: Kuyrukluyıldızlar')
    ).toBeTruthy();
  });

  it('giriş yapılmamışsa düz metin de koleksiyon der', () => {
    ciz({ canSave: false });
    expect(screen.getByText('Koleksiyona kaydet')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
