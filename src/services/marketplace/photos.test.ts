import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * İLAN FOTOĞRAF SERVİSİ — limit ve sıralama (A07, A09).
 */
const updates: { id: string; position: number }[] = [];

const supabase = {
  from: (table: string) => {
    void table;
    return {
      update: (patch: { position: number }) => ({
        eq: async (_col: string, id: string) => {
          updates.push({ id, position: patch.position });
          return { error: null };
        },
      }),
    };
  },
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => Promise.resolve(supabase),
}));

import {
  LISTING_PHOTO_LIMIT,
  reorderListingPhotos,
} from './photos';

afterEach(() => {
  updates.length = 0;
});

describe('LISTING_PHOTO_LIMIT (A07)', () => {
  it('ilan başına en fazla 5', () => {
    expect(LISTING_PHOTO_LIMIT).toBe(5);
  });
});

describe('reorderListingPhotos (A09)', () => {
  it('her fotoğrafın position\'ını yeni sıradaki indeksine yazar', async () => {
    await reorderListingPhotos(['c', 'a', 'b']);
    expect(updates).toEqual([
      { id: 'c', position: 0 },
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
    ]);
  });

  it('boş sırada hiçbir yazma yapmaz', async () => {
    await reorderListingPhotos([]);
    expect(updates).toEqual([]);
  });
});
