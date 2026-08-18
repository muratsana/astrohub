import { afterEach, describe, expect, it, vi } from 'vitest';

const kayit = { inserts: [] as Record<string, unknown>[], configured: true };

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () =>
    kayit.configured
      ? Promise.resolve({
          from: () => ({
            insert: async (row: Record<string, unknown>) => {
              kayit.inserts.push(row);
              return { error: null };
            },
          }),
        })
      : null,
}));

import { logDownload } from './downloadMetrics';

afterEach(() => {
  kayit.inserts = [];
  kayit.configured = true;
});

describe('logDownload (X06)', () => {
  it('tür ve fotoğraf kimliğini kaydeder, kullanıcı kimliği yazmaz', async () => {
    logDownload('feed', 'p1');
    await vi.waitFor(() => expect(kayit.inserts.length).toBe(1));
    expect(kayit.inserts[0]).toEqual({ kind: 'feed', photo_id: 'p1' });
    // Gizlilik: satırda user_id yok.
    expect('user_id' in kayit.inserts[0]).toBe(false);
  });

  it('fotoğraf kimliği yoksa null yazar', async () => {
    logDownload('caption');
    await vi.waitFor(() => expect(kayit.inserts.length).toBe(1));
    expect(kayit.inserts[0]).toEqual({ kind: 'caption', photo_id: null });
  });

  it('supabase yapılandırılmamışsa sessizce hiçbir şey yapmaz', () => {
    kayit.configured = false;
    expect(() => logDownload('foto', 'p1')).not.toThrow();
    expect(kayit.inserts).toEqual([]);
  });
});
