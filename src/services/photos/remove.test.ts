import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * FOTOĞRAF SİLME — SIRA VE KAPSAM.
 *
 * İki şey ölçülüyor, ikisi de "silindi" kelimesinin ne anlama geldiğiyle
 * ilgili:
 *
 *   1. KAPSAM — gösterim, küçük kopya, orijinal ve HER İŞLEME SÜRÜMÜ
 *      gidiyor mu. Kolonları tek tek okuyan bir silme sürümleri
 *      kaçırırdı: kullanıcı fotoğrafı siler, revizyonları bucket'ta
 *      kalırdı. Klasör listelendiği için sayı önemsiz.
 *
 *   2. SIRA — dosyalar önce. `photos` bucket'ı genel; satırı silip
 *      dosyayı bırakmak, "sildim" diyen kullanıcının karesinin adresi
 *      bilen herkese açık kalması demek. Dosya temizliği düşerse satıra
 *      HİÇ dokunulmuyor; yarım silinmiş kayıt bırakmaktansa hata verip
 *      durmak.
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
  /** Çağrı sırası: 'remove:<bucket>' ve 'delete-row'. */
  order: [] as string[],
};

const supabase = {
  from: () => ({
    delete: () => ({
      eq: async (_column: string, value: string) => {
        state.order.push('delete-row');
        state.deletedRows.push(value);
        return { error: null };
      },
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

const { deletePhoto } = await import('./remove');

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
  state.order = [];
});

describe('deletePhoto', () => {
  it('iki bucket altındaki bütün dosyaları ve satırı siliyor', async () => {
    await deletePhoto({ userId: USER, photoId: PHOTO });

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

    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed[0].paths).toHaveLength(40);
  });

  it('satırı dosyalardan SONRA siliyor', async () => {
    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.order).toEqual([
      'remove:photos',
      'remove:photo-originals',
      'delete-row',
    ]);
  });

  it('dosya silme düşerse satıra dokunmuyor', async () => {
    state.removeError = { message: 'depolama yanıt vermedi' };

    await expect(
      deletePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow('depolama yanıt vermedi');

    /* ASIL BEKLENTİ: yarım silinmiş kayıt yok. Satır dursun ki kullanıcı
       tekrar denesin; dosyası duran bir kaydı listeden düşürmek, silindi
       sanılan ama indirilebilir bir görsel bırakırdı. */
    expect(state.deletedRows).toEqual([]);
  });

  it('klasör okunamazsa hiçbir şey silmiyor', async () => {
    state.listError = { message: 'liste alınamadı' };

    await expect(
      deletePhoto({ userId: USER, photoId: PHOTO })
    ).rejects.toThrow('liste alınamadı');

    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([]);
  });

  it('klasör boşsa satır yine siliniyor', async () => {
    /* Dosyaları zaten gitmiş bir kayıt (yarım kalmış eski yükleme)
       silinemez hâle gelmemeli. */
    state.listing = { photos: [], 'photo-originals': [] };

    await deletePhoto({ userId: USER, photoId: PHOTO });

    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([PHOTO]);
  });
});
