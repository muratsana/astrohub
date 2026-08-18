import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * KART KADRAJINI YENİDEN DÜZENLEME — versiyonlu yol + eski silme
 * (C09, C11, C12).
 */
const kayit = {
  uploads: [] as { path: string; upsert?: boolean }[],
  removed: [] as string[],
  updated: null as Record<string, unknown> | null,
  uploadError: null as { message: string } | null,
  updateError: null as { message: string } | null,
};

const supabase = {
  from: () => ({
    update: (patch: Record<string, unknown>) => ({
      eq: async () => {
        kayit.updated = patch;
        return { error: kayit.updateError };
      },
    }),
  }),
  storage: {
    from: () => ({
      upload: async (path: string, _blob: unknown, opts?: { upsert?: boolean }) => {
        kayit.uploads.push({ path, upsert: opts?.upsert });
        return { error: kayit.uploadError };
      },
      remove: async (paths: string[]) => {
        kayit.removed.push(...paths);
        return { error: null };
      },
    }),
  },
};

vi.mock('@/services/supabase/client', () => ({
  getSupabase: () => Promise.resolve(supabase),
}));
vi.mock('@/domain/profile/avatar', () => ({
  renderKadrajBlob: async () => new Blob([new Uint8Array(400)]),
}));

import {
  thumbPathFromUrl,
  updateThumbCrop,
  versionedThumbPath,
} from './thumbCrop';

afterEach(() => {
  kayit.uploads = [];
  kayit.removed = [];
  kayit.updated = null;
  kayit.uploadError = null;
  kayit.updateError = null;
});

function file() {
  return new File([new Uint8Array(8)], 'k.jpg', { type: 'image/jpeg' });
}

describe('versionedThumbPath (C11)', () => {
  it('zaman damgalı, kullanıcı ve fotoğraf altında', () => {
    expect(versionedThumbPath('u1', 'p1', 1700000000000)).toBe(
      'u1/p1/thumb-1700000000000.jpg'
    );
  });
});

describe('thumbPathFromUrl', () => {
  it('genel adresten yolu çıkarır', () => {
    expect(
      thumbPathFromUrl('https://x.supabase.co/storage/v1/object/public/photos/u1/p1/thumb-9.jpg')
    ).toBe('u1/p1/thumb-9.jpg');
  });
  it('işaretsiz/boş adreste null', () => {
    expect(thumbPathFromUrl(undefined)).toBeNull();
    expect(thumbPathFromUrl('https://baska/y.jpg')).toBeNull();
  });
});

describe('updateThumbCrop (C09, C11, C12)', () => {
  it('versiyonlu yol yazar, satırı bağlar, eski thumb\'ı siler', async () => {
    const kadraj = { zoom: 1.3, panX: 0.1, panY: -0.2 };
    const sonuc = await updateThumbCrop({
      photoId: 'p1',
      userId: 'u1',
      sourceFile: file(),
      kadraj,
      oldThumbPath: 'u1/p1/thumb.jpg',
      now: 1700000000000,
    });

    const yeni = 'u1/p1/thumb-1700000000000.jpg';
    expect(sonuc.thumbPath).toBe(yeni);
    // C11: yeni yola, üstüne yazmadan (upsert:false).
    expect(kayit.uploads).toEqual([{ path: yeni, upsert: false }]);
    // C09: satır yeni yola ve kadraja bağlandı.
    expect(kayit.updated).toEqual({ thumb_path: yeni, thumb_crop: kadraj });
    // C12: eski türev silindi, yeni asla değil.
    expect(kayit.removed).toEqual(['u1/p1/thumb.jpg']);
  });

  it('satır güncellenemezse yeni nesneyi geri alır', async () => {
    kayit.updateError = { message: 'db düştü' };
    await expect(
      updateThumbCrop({
        photoId: 'p1',
        userId: 'u1',
        sourceFile: file(),
        kadraj: { zoom: 1, panX: 0, panY: 0 },
        oldThumbPath: 'u1/p1/thumb.jpg',
        now: 1,
      })
    ).rejects.toThrow('db düştü');
    // Yeni nesne temizlendi, eski dosyaya DOKUNULMADI.
    expect(kayit.removed).toEqual(['u1/p1/thumb-1.jpg']);
  });
});
