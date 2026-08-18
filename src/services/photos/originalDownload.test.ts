import { afterEach, describe, expect, it, vi } from 'vitest';

const kayit = {
  row: null as { original_path: string | null } | null,
  rowError: null as { message: string } | null,
  signed: { calls: [] as { path: string; opts: unknown }[], url: 'https://x/signed?download=a' as string | null },
};

const supabase = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: kayit.row, error: kayit.rowError }),
      }),
    }),
  }),
  storage: {
    from: () => ({
      createSignedUrl: async (path: string, _exp: number, opts: unknown) => {
        kayit.signed.calls.push({ path, opts });
        return kayit.signed.url
          ? { data: { signedUrl: kayit.signed.url }, error: null }
          : { data: null, error: { message: 'yok' } };
      },
    }),
  },
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => Promise.resolve(supabase),
}));

import { ownerOriginalDownloadUrl } from './originalDownload';

afterEach(() => {
  kayit.row = null;
  kayit.rowError = null;
  kayit.signed.calls = [];
  kayit.signed.url = 'https://x/signed?download=a';
});

describe('ownerOriginalDownloadUrl (X04)', () => {
  it('original_path\'ten download seçenekli imzalı adres üretir', async () => {
    kayit.row = { original_path: 'u1/p1/original.jpg' };
    const url = await ownerOriginalDownloadUrl('p1', 'astrohub-orijinal.jpg');
    expect(url).toBe('https://x/signed?download=a');
    expect(kayit.signed.calls[0]).toEqual({
      path: 'u1/p1/original.jpg',
      opts: { download: 'astrohub-orijinal.jpg' },
    });
  });

  it('satır okunamıyorsa (RLS/başkası) null döner, imza istenmez', async () => {
    kayit.row = null;
    kayit.rowError = { message: 'not found' };
    const url = await ownerOriginalDownloadUrl('p1');
    expect(url).toBeNull();
    expect(kayit.signed.calls).toEqual([]);
  });

  it('orijinal arşivlenmemişse (path yok) null döner', async () => {
    kayit.row = { original_path: null };
    expect(await ownerOriginalDownloadUrl('p1')).toBeNull();
    expect(kayit.signed.calls).toEqual([]);
  });
});
