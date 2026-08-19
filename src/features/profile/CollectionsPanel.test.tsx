import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CollectionsPanel } from './CollectionsPanel';
import type { CollectionsManagerState } from '@/services/content/collections';

const MANAGER = vi.hoisted(() => ({ value: {} as CollectionsManagerState }));

vi.mock('@/services/content/collections', () => ({
  useCollectionsManager: () => MANAGER.value,
}));

function renderPanel() {
  MANAGER.value = {
    canManage: true,
    loading: false,
    busy: false,
    error: null,
    refresh: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    removeCollection: vi.fn(),
    movePhoto: vi.fn(),
    removePhoto: vi.fn(),
    collections: [
      {
        id: 'c-1',
        name: 'Nebulalar',
        slug: 'nebulalar',
        isPublic: false,
        createdAt: '2026-08-01',
        updatedAt: '2026-08-01',
        photos: [
          {
            photoId: 'p-1',
            slug: 'lobster-claw-nebula-kqz',
            title: 'Lobster Claw Nebula',
            thumbPath: null,
            username: 'muratsana',
            displayName: 'Murat Sana',
            palette: 'LRGB',
            filters: 'Ha, OIII',
            fovWidthDeg: 2.1,
            fovHeightDeg: 1.4,
            addedAt: '2026-08-19',
          },
          {
            photoId: 'p-2',
            slug: 'ztf-2023',
            title: 'Comet ZTF-2023',
            thumbPath: null,
            username: 'uygaraknastro',
            displayName: 'Uygar Akın',
            palette: 'RGB',
            filters: 'RGB',
            fovWidthDeg: 4,
            fovHeightDeg: 2.5,
            addedAt: '2026-08-18',
          },
        ],
      },
    ],
  };

  return render(
    <MemoryRouter>
      <CollectionsPanel />
    </MemoryRouter>
  );
}

describe('CollectionsPanel', () => {
  it('koleksiyon fotoğraflarında kullanıcı, palet, FOV ve filtre sütunlarını gösterir', () => {
    renderPanel();

    expect(screen.getByRole('link', { name: '@muratsana' })).toHaveAttribute(
      'href',
      '/profil/muratsana'
    );
    expect(screen.getByText('LRGB')).toBeTruthy();
    expect(screen.getByText('2.10° × 1.40°')).toBeTruthy();
    expect(screen.getByText('Ha, OIII')).toBeTruthy();
  });

  it('filtre sütun başlığından sıralar', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    let rows = screen.getByRole('table').querySelectorAll('tbody tr');

    expect(rows[0]?.textContent).toContain('Lobster Claw Nebula');
    fireEvent.click(screen.getByRole('button', { name: /Filtreler/ }));
    rows = screen.getByRole('table').querySelectorAll('tbody tr');
    expect(rows[0]?.textContent).toContain('Comet ZTF-2023');
  });
});
