import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * FOTOĞRAF KALDIRMA — İKİ AYRI İŞLEM.
 *
 * FAZ 3'ten sonra "sil" tek bir şey değil:
 *
 *   `deletePhoto`  → SOFT DELETE. `deleted_at` yazılıyor, DOSYALARA HİÇ
 *                    DOKUNULMUYOR. Kayıt public'ten ve kotadan düşüyor
 *                    ama geri alınabiliyor — dosyalar silinseydi geri
 *                    gelen kayıt boş bir çerçeve olurdu.
 *
 *   `purgePhoto`   → KALICI. Yalnızca admin (RLS'te
 *                    `astro_photos_hard_delete_admin` kısıtlayıcı
 *                    politikası). Dosyalar önce, satır sonra.
 *
 * ── SIRA NEDEN HÂLÂ "ÖNCE DOSYALAR" ───────────────────────────────────
 *
 * `photos` bucket'ı genel. Satırı silip dosyayı bırakmak, "sildim" diyen
 * kullanıcının karesinin adresi bilen herkese açık kalması demek. Dosya
 * temizliği düşerse satıra hiç dokunulmuyor.
 *
 * ── SIFIR SATIR SESSİZ GEÇMEMELİ ──────────────────────────────────────
 *
 * Ölçülen asıl regresyon bu: PostgREST sıfır satır etkilendiğinde hata
 * DÖNDÜRMÜYOR. Kısıtlayıcı politika devreye girdiğinde eski kod
 * "başarılı" diyordu. Her iki fonksiyon da artık boş sonucu hataya
 * çeviriyor.
 *
 * Sahte istemci gerçek zincirin biçimini taklit ediyor; amaç Supabase'i
 * test etmek değil, hangi çağrıların hangi sırayla yapıldığını görmek.
 */

const state = {
  /** Klasör içeriği — bucket adına göre. */
  listing: {} as Record<string, { name: string }[]>,
  listError: null as { message: string } | null,
  removeError: null as { message: string } | null,
  removed: [] as { bucket: string; paths: string[] }[],
  deletedRows: [] as string[],
  /** Soft delete / geri alma yazmaları. */
  updates: [] as { id: string; deleted_at: string | null }[],
  /** RLS'in isteği süzdüğü durumu taklit eder: dönen satır yok. */
  rlsBlocks: false,
  /** Çağrı sırası: 'remove:<bucket>', 'delete-row', 'update-row'. */
  order: [] as string[],
};

function sonuc(ids: string[]) {
  return { data: state.rlsBlocks ? [] : ids.map((id) => ({ id })), error: null };
}

const supabase = {
  from: () => ({
    delete: () => ({
      eq: (_column: string, value: string) => ({
        select: async () => {
          state.order.push('delete-row');
          if (!state.rlsBlocks) state.deletedRows.push(value);
          return sonuc([value]);
        },
      }),
    }),
    update: (patch: { deleted_at: string | null }) => ({
      eq: (_column: string, value: string) => ({
        select: async () => {
          state.order.push('update-row');
          if (!state.rlsBlocks) {
            state.updates.push({ id: value, deleted_at: patch.deleted_at });
          }
          return sonuc([value]);
        },
      }),
    }),
  }),
  storage: {
    from: (bucket: string) => ({
      list: async () =>
        state.listError
          ? { data: null, error: state.listError }
          : { data: state.listing[bucket] ?? [], error: null },
      remove: async (paths: string[]) => {
        state.order.push(`remove:${bucket}`);
        if (state.removeError) return { error: state.removeError };
        state.removed.push({ bucket, paths });
        return { error: null };
      },
    }),
  },
};

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => Promise.resolve(supabase),
}));

const { deletePhoto, restorePhoto, purgePhoto } = await import('./remove');

const USER = 'user-1';
const PHOTO = 'photo-1';
const KLASOR = `${USER}/${PHOTO}`;

beforeEach(() => {
  state.listing = {
    photos: [
      { name: 'display.jpg' },
      { name: 'thumb.jpg' },
      { name: 'v-abc.jpg' },
      { name: 'v-def.jpg' },
    ],
    'photo-originals': [{ name: 'original.tif' }],
  };
  state.listError = null;
  state.removeError = null;
  state.removed = [];
  state.deletedRows = [];
  state.updates = [];
  state.rlsBlocks = false;
  state.order = [];
});

describe('deletePhoto — soft delete', () => {
  it('deleted_at yazıyor', async () => {
    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].id).toBe(PHOTO);
    expect(state.updates[0].deleted_at).not.toBeNull();
  });

  it('DOSYALARA DOKUNMUYOR — geri alınabilmesi buna bağlı', async () => {
    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed).toEqual([]);
    expect(state.order).toEqual(['update-row']);
  });

  it('satırı kalıcı silmiyor', async () => {
    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.deletedRows).toEqual([]);
  });

  it('RLS süzerse sessizce başarılı dönmüyor', async () => {
    state.rlsBlocks = true;

    await expect(
      deletePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow(/bulunamadı ya da yetki yok/);
  });
});

describe('restorePhoto', () => {
  it('deleted_at alanını null yapıyor', async () => {
    await restorePhoto(PHOTO);

    expect(state.updates).toEqual([{ id: PHOTO, deleted_at: null }]);
  });

  it('RLS süzerse hata veriyor', async () => {
    state.rlsBlocks = true;

    await expect(restorePhoto(PHOTO)).rejects.toThrow(
      /geri alınamadı/
    );
  });
});

describe('purgePhoto — kalıcı silme', () => {
  it('iki bucket altındaki bütün dosyaları ve satırı siliyor', async () => {
    await purgePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed).toEqual([
      {
        bucket: 'photos',
        paths: [
          `${KLASOR}/display.jpg`,
          `${KLASOR}/thumb.jpg`,
          `${KLASOR}/v-abc.jpg`,
          `${KLASOR}/v-def.jpg`,
        ],
      },
      { bucket: 'photo-originals', paths: [`${KLASOR}/original.tif`] },
    ]);
    expect(state.deletedRows).toEqual([PHOTO]);
  });

  it('sürüm sayısı ne olursa olsun hepsi gidiyor', async () => {
    state.listing.photos = Array.from({ length: 40 }, (_, i) => ({
      name: `v-${i}.jpg`,
    }));

    await purgePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed[0].paths).toHaveLength(40);
  });

  it('satırı dosyalardan SONRA siliyor', async () => {
    await purgePhoto({ userId: USER, photoId: PHOTO });

    expect(state.order).toEqual([
      'remove:photos',
      'remove:photo-originals',
      'delete-row',
    ]);
  });

  it('dosya silme düşerse satıra dokunmuyor', async () => {
    state.removeError = { message: 'depolama yanıt vermedi' };

    await expect(
      purgePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow('depolama yanıt vermedi');

    expect(state.deletedRows).toEqual([]);
  });

  it('klasör okunamazsa hiçbir şey silmiyor', async () => {
    state.listError = { message: 'liste alınamadı' };

    await expect(
      purgePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow('liste alınamadı');

    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([]);
  });

  it('klasör boşsa satır yine siliniyor', async () => {
    /* Dosyaları zaten gitmiş bir kayıt (yarım kalmış eski yükleme)
       silinemez hâle gelmemeli. */
    state.listing = { photos: [], 'photo-originals': [] };

    await purgePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([PHOTO]);
  });

  it('RLS satırı süzerse — moderatör denemesi — hata veriyor', async () => {
    state.rlsBlocks = true;

    await expect(
      purgePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow(/yalnızca yöneticilere açık/);
  });
});
