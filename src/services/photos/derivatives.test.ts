import { afterEach, describe, expect, it, vi } from 'vitest';

const kayit = {
  upserts: [] as { row: Record<string, unknown>; opts: unknown }[],
  configured: true,
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () =>
    kayit.configured
      ? Promise.resolve({
          from: () => ({
            upsert: async (row: Record<string, unknown>, opts: unknown) => {
              kayit.upserts.push({ row, opts });
              return { error: null };
            },
          }),
        })
      : null,
}));

import {
  recordDerivative,
  ttlFromNow,
  SOCIAL_DERIVATIVE_TTL_DAYS,
} from './derivatives';

afterEach(() => {
  kayit.upserts = [];
  kayit.configured = true;
});

describe('recordDerivative (X01)', () => {
  it('türevi yol+bucket üzerinden idempotent kaydeder', async () => {
    recordDerivative({
      photoId: 'p1',
      kind: 'thumb',
      storagePath: 'u/p/thumb-abc.jpg',
      contentKey: 'abc',
      bytes: 1234,
    });
    await vi.waitFor(() => expect(kayit.upserts.length).toBe(1));
    expect(kayit.upserts[0].row).toMatchObject({
      photo_id: 'p1',
      kind: 'thumb',
      bucket: 'photos',
      storage_path: 'u/p/thumb-abc.jpg',
      content_key: 'abc',
      bytes: 1234,
    });
    // Aynı yol ikinci kez kaydedilirse üzerine yazılmalı (üretim idempotent).
    expect(kayit.upserts[0].opts).toEqual({ onConflict: 'bucket,storage_path' });
  });

  it('TTL verilmezse kalıcı türev (expires_at null)', async () => {
    recordDerivative({ photoId: 'p1', kind: 'display', storagePath: 'u/p/d.jpg' });
    await vi.waitFor(() => expect(kayit.upserts.length).toBe(1));
    expect(kayit.upserts[0].row.expires_at).toBeNull();
  });

  it('TTL verilirse expires_at yazılır (X05)', async () => {
    const son = ttlFromNow(SOCIAL_DERIVATIVE_TTL_DAYS, Date.parse('2026-08-01T00:00:00Z'));
    recordDerivative({
      photoId: 'p1',
      kind: 'feed',
      storagePath: 'u/p/feed.jpg',
      expiresAt: son,
    });
    await vi.waitFor(() => expect(kayit.upserts.length).toBe(1));
    expect(kayit.upserts[0].row.expires_at).toBe('2026-08-31T00:00:00.000Z');
  });

  it('supabase yapılandırılmamışsa sessizce geçer', () => {
    kayit.configured = false;
    expect(() =>
      recordDerivative({ photoId: 'p', kind: 'thumb', storagePath: 'x' })
    ).not.toThrow();
    expect(kayit.upserts).toEqual([]);
  });
});

describe('ttlFromNow (X05)', () => {
  it('gün sayısını mutlak zamana çevirir', () => {
    const t = ttlFromNow(30, Date.parse('2026-01-01T00:00:00Z'));
    expect(t.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });
});
