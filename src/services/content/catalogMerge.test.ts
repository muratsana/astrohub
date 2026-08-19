import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * KATALOG BİRLEŞTİRME SERVİSİ (F03, F04, F08).
 *
 * Canlıda ölçüldü: 1.186 modelde 21 mükerrer grup var
 * (`sky-watcher-eq6-r-pro` ↔ `sw-eq6r-pro` gibi). Birleştirme ve geri
 * alma prod'da uçtan uca doğrulandı; bu testler istemci sözleşmesini
 * sabitliyor.
 */
const kayit = {
  rpc: [] as { fn: string; args: unknown }[],
  rpcSonuc: null as unknown,
  rpcHata: null as { message: string } | null,
  tablo: [] as unknown[],
};

const supabase = {
  rpc: async (fn: string, args: unknown) => {
    kayit.rpc.push({ fn, args });
    return { data: kayit.rpcSonuc, error: kayit.rpcHata };
  },
  from: () => ({
    select: () => ({
      /* `.order()` hem doğrudan await edilebiliyor hem `.limit()`
         zincirlenebiliyor: iki çağrı yeri de aynı mock'u kullansın. */
      order: () =>
        Object.assign(Promise.resolve({ data: kayit.tablo, error: null }), {
          limit: async () => ({ data: kayit.tablo, error: null }),
        }),
    }),
  }),
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => Promise.resolve(supabase),
}));

import {
  fetchDuplicateCandidates,
  fetchMergeLog,
  mergeModels,
  totalMovedRefs,
  unmergeModels,
} from './catalogMerge';

afterEach(() => {
  kayit.rpc = [];
  kayit.rpcSonuc = null;
  kayit.rpcHata = null;
  kayit.tablo = [];
});

describe('fetchDuplicateCandidates (F03)', () => {
  it('aday gruplarını döndürür', async () => {
    kayit.tablo = [
      {
        anahtar: 'skywatchereq6rpro',
        adet: 2,
        sluglar: ['sky-watcher-eq6-r-pro', 'sw-eq6r-pro'],
        idler: ['id1', 'id2'],
      },
    ];
    const adaylar = await fetchDuplicateCandidates();
    expect(adaylar).toHaveLength(1);
    expect(adaylar[0].sluglar).toContain('sw-eq6r-pro');
  });
});

describe('mergeModels / unmergeModels (F03, F08)', () => {
  it('birleştirmeyi RPC ile yapar ve günlük kimliği döndürür', async () => {
    kayit.rpcSonuc = 'log-1';
    const id = await mergeModels('sw-eq6r-pro', 'sky-watcher-eq6-r-pro');
    expect(id).toBe('log-1');
    expect(kayit.rpc[0]).toEqual({
      fn: 'merge_equipment_models',
      args: {
        kaynak_slug: 'sw-eq6r-pro',
        hedef_slug: 'sky-watcher-eq6-r-pro',
      },
    });
  });

  it('geri alma günlük kimliğiyle çağrılır', async () => {
    kayit.rpcSonuc = true;
    expect(await unmergeModels('log-1')).toBe(true);
    expect(kayit.rpc[0]).toEqual({
      fn: 'unmerge_equipment_model',
      args: { log_id: 'log-1' },
    });
  });

  it('zaten geri alınmış birleştirme false döner', async () => {
    kayit.rpcSonuc = false;
    expect(await unmergeModels('log-1')).toBe(false);
  });

  it('yetkisiz çağrı hatayı yutmaz', async () => {
    kayit.rpcHata = { message: 'Katalog birlestirme yalnizca yoneticiye acik.' };
    await expect(mergeModels('a', 'b')).rejects.toThrow('yoneticiye acik');
  });
});

describe('fetchMergeLog / totalMovedRefs (F08)', () => {
  it('günlüğü okur ve geri alınma durumunu taşır', async () => {
    kayit.tablo = [
      {
        id: 'log-1',
        source_slug: 'sw-eq6r-pro',
        canonical_slug: 'sky-watcher-eq6-r-pro',
        moved_refs: { 'astro_photos.mount_id': 3, 'listings.model_id': 1 },
        merged_at: '2026-08-19T00:00:00Z',
        undone_at: null,
      },
    ];
    const [kayitlar] = await fetchMergeLog();
    expect(kayitlar.sourceSlug).toBe('sw-eq6r-pro');
    expect(kayitlar.undoneAt).toBeNull();
    expect(totalMovedRefs(kayitlar)).toBe(4);
  });

  it('referans taşınmamışsa toplam sıfır', () => {
    expect(
      totalMovedRefs({
        id: 'x',
        sourceSlug: 'a',
        canonicalSlug: 'b',
        movedRefs: {},
        mergedAt: '',
        undoneAt: null,
      })
    ).toBe(0);
  });
});
