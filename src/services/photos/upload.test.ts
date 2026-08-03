import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * YÜKLEME AKIŞININ TELAFİSİ (T-502).
 *
 * Test edilen tek şey var ve o da en pahalı hata sınıfı: YARIM KALAN
 * YÜKLEMENİN GERİDE BIRAKTIĞI ÇÖP. Eski akış hata durumunda yalnızca
 * taslak satırı siliyordu; o ana kadar yüklenmiş nesneler bucket'ta
 * kalıyordu — hiçbir satırın işaret etmediği, arayüzde görünmeyen, ama
 * depolama kotasını yiyen dosyalar. Kullanıcı yeniden denedikçe
 * çoğalıyorlardı ve kimse görmüyordu.
 *
 * Sahte istemci gerçek zincirin biçimini taklit ediyor; amaç Supabase'i
 * test etmek değil, HANGİ TEMİZLİK ÇAĞRILARININ yapıldığını görmek.
 */

const state = {
  uploadFails: new Set<string>(),
  removed: [] as { bucket: string; paths: string[] }[],
  deletedRows: [] as string[],
  insertedRows: 0,
  /** `astro_photos` insert yükü — alanların gerçekten yazıldığını görmek için. */
  photoInsert: null as Record<string, unknown> | null,
  exposureError: null as { message: string } | null,
  updateError: null as { message: string } | null,
};

const PHOTO_ID = 'photo-1';

function tableApi(table: string) {
  return {
    insert(rows: unknown) {
      if (table === 'astro_photos') {
        state.insertedRows++;
        state.photoInsert = rows as Record<string, unknown>;
        return {
          select: () => ({
            single: async () => ({ data: { id: PHOTO_ID }, error: null }),
          }),
        };
      }
      void rows;
      return Promise.resolve({ error: state.exposureError });
    },
    update() {
      return {
        eq: async () => ({ error: state.updateError }),
      };
    },
    delete() {
      return {
        eq: async (_column: string, value: string) => {
          state.deletedRows.push(value);
          return { error: null };
        },
      };
    },
  };
}

const supabase = {
  from: (table: string) => tableApi(table),
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string) =>
        state.uploadFails.has(path)
          ? { error: { message: `yüklenemedi: ${path}` } }
          : { error: null },
      remove: async (paths: string[]) => {
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

/*
 * Küçültme canvas istiyor; jsdom'da yok. Ölçü hesabı ve yol üretimi
 * (`storagePath`, `extensionOf`) GERÇEK kalıyor — testin doğruladığı
 * yolların üretimi de akışın parçası.
 */
vi.mock('@/domain/photography/resize', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/domain/photography/resize')
  >();
  return {
    ...actual,
    renderResized: async (_file: File, maxEdge: number) => ({
      blob: new Blob([new Uint8Array(1000)]),
      size: { width: maxEdge, height: maxEdge },
    }),
    encodeWithinBudget: async () => ({
      blob: new Blob([new Uint8Array(2000)]),
      size: { width: 100, height: 100 },
      withinBudget: true,
    }),
  };
});

import { uploadPhoto } from './upload';

/** Geçerli JPEG başlığı taşıyan sahte dosya. */
function jpegFile(name = 'gece.jpg', extra = 4096): File {
  const head = new Uint8Array(extra);
  head.set([0xff, 0xd8, 0xff, 0xe0]);
  return new File([head], name, { type: 'image/jpeg' });
}

const input = {
  file: jpegFile(),
  userId: 'user-1',
  slug: 'gece',
  title: 'Gece',
  photoType: 'deep-sky',
  copyrightConfirmed: true,
};

const DISPLAY = 'user-1/photo-1/display.jpg';
const THUMB = 'user-1/photo-1/thumb.jpg';
const ORIGINAL = 'user-1/photo-1/original.jpg';

beforeEach(() => {
  state.uploadFails = new Set();
  state.removed = [];
  state.deletedRows = [];
  state.insertedRows = 0;
  state.photoInsert = null;
  state.exposureError = null;
  state.updateError = null;
});

describe('uploadPhoto — başarılı akış', () => {
  it('yolları sahibinin klasörüne kurar ve hiçbir şeyi geri almaz', async () => {
    const result = await uploadPhoto(input);

    expect(result.photoId).toBe(PHOTO_ID);
    expect(result.displayPath).toBe(DISPLAY);
    expect(result.thumbPath).toBe(THUMB);
    expect(result.originalPath).toBe(ORIGINAL);
    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([]);
  });

  it('saklanan baytları bildirir — seçilen dosyanın boyunu değil', async () => {
    const result = await uploadPhoto({ ...input, file: jpegFile('a.jpg', 50_000) });
    // 1000 (display) + 1000 (thumb) + 50.000 (arşiv, bütçe altında olduğu
    // için dosyanın kendisi) — seçilen dosyanın boyu tek başına değil.
    expect(result.storedBytes).toBe(52_000);
  });
});

describe('uploadPhoto — yarım kalan yükleme', () => {
  /*
   * ASIL KORUNAN DURUM. İki kopya paralel yükleniyor; biri geçip diğeri
   * düştüğünde geçen kopya bucket'ta kalıyordu.
   */
  it('küçük resim düşerse yüklenmiş gösterim kopyasını da siler', async () => {
    state.uploadFails.add(THUMB);

    await expect(uploadPhoto(input)).rejects.toThrow(/yüklenemedi/);

    const photos = state.removed.find((r) => r.bucket === 'photos');
    expect(photos?.paths).toEqual([DISPLAY]);
    expect(state.deletedRows).toEqual([PHOTO_ID]);
  });

  it('gösterim kopyası düşerse küçük resmi de siler', async () => {
    state.uploadFails.add(DISPLAY);

    await expect(uploadPhoto(input)).rejects.toThrow(/yüklenemedi/);

    const photos = state.removed.find((r) => r.bucket === 'photos');
    expect(photos?.paths).toEqual([THUMB]);
    expect(state.deletedRows).toEqual([PHOTO_ID]);
  });

  /*
   * Satır güncellemesi en son adım: buraya gelindiğinde ÜÇ nesne de
   * yüklenmiş oluyor. Hepsi geri alınmalı, yoksa üç sahipsiz dosya kalır.
   */
  it('son adım düşerse üç nesnenin üçünü de geri alır', async () => {
    state.updateError = { message: 'satır güncellenemedi' };

    await expect(uploadPhoto(input)).rejects.toThrow(/güncellenemedi/);

    const photos = state.removed.find((r) => r.bucket === 'photos');
    const originals = state.removed.find((r) => r.bucket === 'photo-originals');
    expect(photos?.paths.sort()).toEqual([DISPLAY, THUMB].sort());
    expect(originals?.paths).toEqual([ORIGINAL]);
    expect(state.deletedRows).toEqual([PHOTO_ID]);
  });

  /*
   * Arşiv kopyası yükleme HATASI akışı durdurmuyor: gösterilecek kopyalar
   * zaten yüklendi ve kullanıcının emeğini bir arşivleme hatası yüzünden
   * çöpe atmak orantısız. Eksiklik `originalPath`'in boş kalmasıyla
   * görünür.
   */
  it('arşiv kopyası düşerse akış devam eder, geri alma yapılmaz', async () => {
    state.uploadFails.add(ORIGINAL);

    const result = await uploadPhoto(input);

    expect(result.originalPath).toBeNull();
    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([]);
  });
});

describe('uploadPhoto — biçim denetimi', () => {
  /*
   * Denetim satır AÇILMADAN önce: eskiden bu dosya akışın ortasında,
   * küçültme aşamasında patlıyordu ve o noktada zaten bir taslak satır
   * açılmış oluyordu.
   */
  it('görüntü olmayan dosyada hiç satır açmaz', async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0])], 'gece.jpg', {
      type: 'image/jpeg',
    });

    await expect(uploadPhoto({ ...input, file: pdf })).rejects.toThrow(
      /içeriği görüntü değil/
    );
    expect(state.insertedRows).toBe(0);
    expect(state.removed).toEqual([]);
  });
});

describe('uploadPhoto — poz künyesi', () => {
  /*
   * Poz bilgisi künyenin bir ayrıntısı; yazılamaması yüklenmiş fotoğrafın
   * tamamını götürmemeli. Ama sessizce de yutulmamalı — kullanıcı girdiği
   * veriyi kaybettiğini bilmeli.
   */
  it('poz kaydı düşse bile fotoğraf ayakta kalır ama bildirilir', async () => {
    state.exposureError = { message: 'poz yazılamadı' };

    const result = await uploadPhoto({
      ...input,
      exposures: [{ filter: 'L', frames: 30, exposureSeconds: 120 }],
    });

    expect(result.photoId).toBe(PHOTO_ID);
    expect(result.exposuresSaved).toBe(false);
    expect(state.removed).toEqual([]);
    expect(state.deletedRows).toEqual([]);
  });

  it('poz kaydı geçtiğinde bayrak doğru', async () => {
    const result = await uploadPhoto({
      ...input,
      exposures: [{ filter: 'L', frames: 30, exposureSeconds: 120 }],
    });
    expect(result.exposuresSaved).toBe(true);
  });
});

describe('uploadPhoto — telif beyanı satıra yazılıyor', () => {
  /*
   * BU TESTİN SEBEBİ ÜRETİMDE YAŞANDI. Onay kutusu sihirbazın yerel
   * durumunda tutuluyor, "Yayımla" düğmesini kilitliyor ve oraya kadar
   * her şey doğru görünüyordu — ama değer `astro_photos` satırına HİÇ
   * yazılmıyordu.
   *
   * Sonuç sessiz değildi, ama hatanın çıktığı yer sebebinden çok uzaktı:
   * dosyalar yükleniyor, satır açılıyor, sonra yayın adımı
   * `astro_photos_publish_requires_copyright` kısıtına takılıyor ve
   * fotoğraf sonsuza kadar taslakta kalıyordu. Kullanıcının gördüğü
   * tek şey, üç kez denenip yayımlanmayan bir fotoğraftı.
   */
  it('onay verildiğinde satıra true yazıyor', async () => {
    await uploadPhoto({ ...input, copyrightConfirmed: true });
    expect(state.photoInsert?.copyright_confirmed).toBe(true);
  });

  /*
   * Onaysız yükleme taslak olarak GEÇERLİ — kullanıcı fotoğrafı
   * yükleyip beyanı sonra verebilir. Bu yüzden burada `false` yazılıyor;
   * varsayılanı `true`ya çekmek, verilmemiş bir beyanı verilmiş
   * saymak olurdu.
   */
  it('onay verilmediğinde false yazıyor — sessizce doğruya çekmiyor', async () => {
    await uploadPhoto({ ...input, copyrightConfirmed: false });
    expect(state.photoInsert?.copyright_confirmed).toBe(false);
  });
});

describe('uploadPhoto — indirme tercihleri', () => {
  it('varsayılan olarak indirmeyi kapatır, watermark şartını açık bırakır', async () => {
    await uploadPhoto(input);

    expect(state.photoInsert?.allow_download).toBe(false);
    expect(state.photoInsert?.watermark_required).toBe(true);
  });

  it('kullanıcının indirme ve watermark tercihini satıra yazar', async () => {
    await uploadPhoto({
      ...input,
      allowDownload: true,
      watermarkRequired: false,
    });

    expect(state.photoInsert?.allow_download).toBe(true);
    expect(state.photoInsert?.watermark_required).toBe(false);
  });
});
