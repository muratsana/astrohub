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
  /** Kalıcı silme — FAZ 3'ten sonra geri alma yolunda BEKLENMİYOR. */
  deletedRows: [] as string[],
  deletedByTable: [] as { table: string; column: string; value: string }[],
  /** Geri almanın taslağı kaldırma biçimi: `deleted_at` yazması. */
  softDeletedRows: [] as string[],
  insertedRows: 0,
  /** `astro_photos` insert yükü — alanların gerçekten yazıldığını görmek için. */
  photoInsert: null as Record<string, unknown> | null,
  exposureError: null as { message: string } | null,
  updateError: null as { message: string } | null,
  /** Son yazılan pozlama satırları — session_id bağını görmek için. */
  exposureInsert: null as Record<string, unknown>[] | null,
  /** Son yazılan çekim oturumu satırları. */
  sessionInsert: null as Record<string, unknown>[] | null,
  sessionError: null as { message: string } | null,
  /** Depoya yapılan tüm yüklemeler — bucket yönlendirme ve upsert için. */
  uploads: [] as { bucket: string; path: string; upsert?: boolean }[],
  /** astro_photos'a yazılan yol/kadraj güncellemesi. */
  photoUpdate: null as Record<string, unknown> | null,
  /** Şema kodun gerisinde: yeni kolonlar henüz yok (canlı olay). */
  thumbCropKolonuYok: false,
  sessionIdKolonuYok: false,
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
      if (table === 'photo_capture_sessions') {
        const satirlar = rows as Record<string, unknown>[];
        state.sessionInsert = satirlar;
        return {
          // insert(...).select('id') — dönen id'ler gönderilen sırayla.
          select: async () => ({
            data: state.sessionError
              ? null
              : satirlar.map((_r, i) => ({ id: `sess-${i}` })),
            error: state.sessionError,
          }),
        };
      }
      if (table === 'photo_exposures') {
        const satirlar = rows as Record<string, unknown>[];
        /* Şema geride: `session_id` taşıyan insert reddediliyor. */
        if (
          state.sessionIdKolonuYok &&
          satirlar.some((r) => 'session_id' in r)
        ) {
          return Promise.resolve({
            error: {
              code: 'PGRST204',
              message:
                "Could not find the 'session_id' column of 'photo_exposures' in the schema cache",
            },
          });
        }
        state.exposureInsert = satirlar;
        return Promise.resolve({ error: state.exposureError });
      }
      void rows;
      return Promise.resolve({ error: state.exposureError });
    },
    update(patch: unknown) {
      const yama = (patch ?? {}) as Record<string, unknown>;
      /* Yol/kadraj yazan güncelleme (deleted_at olmayan) yakalanıyor. */
      if (!('deleted_at' in yama)) state.photoUpdate = yama;
      return {
        eq: async (_column: string, value: string) => {
          /* Şema geride kaldığında PostgREST'in verdiği hata taklit
             ediliyor: `thumb_crop` taşıyan güncelleme reddediliyor. */
          if (state.thumbCropKolonuYok && 'thumb_crop' in yama) {
            return {
              error: {
                code: 'PGRST204',
                message:
                  "Could not find the 'thumb_crop' column of 'astro_photos' in the schema cache",
              },
            };
          }
          /* Geri alma taslağı `deleted_at` yazarak kaldırıyor; normal
             akıştaki güncellemelerden bu alanla ayrılıyor. */
          if ('deleted_at' in yama && yama.deleted_at !== null) {
            state.softDeletedRows.push(value);
          }
          return { error: state.updateError };
        },
      };
    },
    delete() {
      return {
        eq: async (column: string, value: string) => {
          state.deletedRows.push(value);
          state.deletedByTable.push({ table, column, value });
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
      upload: async (
        path: string,
        _body: unknown,
        options?: { upsert?: boolean; contentType?: string }
      ) => {
        state.uploads.push({ bucket, path, upsert: options?.upsert });
        return state.uploadFails.has(path)
          ? { error: { message: `yüklenemedi: ${path}` } }
          : { error: null };
      },
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
  const actual =
    await importOriginal<typeof import('@/domain/photography/resize')>();
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

/* Kadraj render'ı canvas istiyor; jsdom'da yok. Kadraj seçildiğinde
   çağrıldığını ve blob döndürdüğünü taklit ediyoruz. */
const KADRAJ = vi.hoisted(() => ({ cagrildi: 0, dussun: false }));
vi.mock('@/domain/profile/avatar', () => ({
  renderKadrajBlob: async () => {
    KADRAJ.cagrildi += 1;
    if (KADRAJ.dussun) throw new Error('kadraj render düştü');
    return new Blob([new Uint8Array(500)]);
  },
}));

import { updatePhotoMetadata, uploadPhoto } from './upload';

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
  palette: 'RGB',
  objectId: 'object-1',
  targetLabel: 'M 31 — Andromeda Galaxy',
  copyrightConfirmed: true,
};

const DISPLAY = 'user-1/photo-1/display.jpg';
const THUMB = 'user-1/photo-1/thumb.jpg';
const ORIGINAL = 'user-1/photo-1/original.jpg';

beforeEach(() => {
  state.uploadFails = new Set();
  state.removed = [];
  state.deletedRows = [];
  state.deletedByTable = [];
  state.softDeletedRows = [];
  state.insertedRows = 0;
  state.photoInsert = null;
  state.exposureError = null;
  state.updateError = null;
  state.exposureInsert = null;
  state.sessionInsert = null;
  state.sessionError = null;
  state.uploads = [];
  state.photoUpdate = null;
  state.thumbCropKolonuYok = false;
  state.sessionIdKolonuYok = false;
  KADRAJ.cagrildi = 0;
  KADRAJ.dussun = false;
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
    const result = await uploadPhoto({
      ...input,
      file: jpegFile('a.jpg', 50_000),
    });
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
    expect(state.softDeletedRows).toEqual([PHOTO_ID]);
    expect(state.deletedRows).toEqual([]);
  });

  it('gösterim kopyası düşerse küçük resmi de siler', async () => {
    state.uploadFails.add(DISPLAY);

    await expect(uploadPhoto(input)).rejects.toThrow(/yüklenemedi/);

    const photos = state.removed.find((r) => r.bucket === 'photos');
    expect(photos?.paths).toEqual([THUMB]);
    expect(state.softDeletedRows).toEqual([PHOTO_ID]);
    expect(state.deletedRows).toEqual([]);
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
    expect(state.softDeletedRows).toEqual([PHOTO_ID]);
    expect(state.deletedRows).toEqual([]);
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
  it('katalog kaydı olmadan hiç satır açmaz', async () => {
    await expect(uploadPhoto({ ...input, objectId: null })).rejects.toThrow(
      /katalog kodu/
    );
    expect(state.insertedRows).toBe(0);
    expect(state.removed).toEqual([]);
  });

  /*
   * Denetim satır AÇILMADAN önce: eskiden bu dosya akışın ortasında,
   * küçültme aşamasında patlıyordu ve o noktada zaten bir taslak satır
   * açılmış oluyordu.
   */
  it('görüntü olmayan dosyada hiç satır açmaz', async () => {
    const pdf = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0])],
      'gece.jpg',
      {
        type: 'image/jpeg',
      }
    );

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

describe('uploadPhoto — çekim oturumları (C02–C05)', () => {
  it('oturumları yazar ve captured_at en erken güne eşitlenir', async () => {
    await uploadPhoto({
      ...input,
      capturedAt: '2026-01-12',
      captureSessions: [
        { id: 'c1', startsOn: '2026-01-12', endsOn: '2026-01-18' },
        { id: 'c2', startsOn: '2026-02-03', endsOn: null },
      ],
    });
    expect(state.sessionInsert).toHaveLength(2);
    expect(state.sessionInsert?.[0]).toMatchObject({
      photo_id: PHOTO_ID,
      starts_on: '2026-01-12',
      ends_on: '2026-01-18',
      position: 0,
    });
    // Tek gece: ends_on null.
    expect(state.sessionInsert?.[1]).toMatchObject({
      starts_on: '2026-02-03',
      ends_on: null,
    });
  });

  it('pozlama satırı istemci oturum kimliğinden DB kimliğine bağlanır (C05)', async () => {
    await uploadPhoto({
      ...input,
      captureSessions: [
        { id: 'c1', startsOn: '2026-01-12', endsOn: null },
        { id: 'c2', startsOn: '2026-02-03', endsOn: null },
      ],
      exposures: [
        { filter: 'L', frames: 30, exposureSeconds: 120, sessionId: 'c2' },
        { filter: 'R', frames: 20, exposureSeconds: 120 },
      ],
    });
    // c2 ikinci oturum → 'sess-1'; bağsız satır null.
    expect(state.exposureInsert?.[0]).toMatchObject({
      filter: 'L',
      session_id: 'sess-1',
    });
    expect(state.exposureInsert?.[1].session_id).toBeNull();
  });

  it('oturum yazımı düşse bile fotoğraf ayakta kalır', async () => {
    state.sessionError = { message: 'oturum yazılamadı' };
    const result = await uploadPhoto({
      ...input,
      captureSessions: [{ id: 'c1', startsOn: '2026-01-12', endsOn: null }],
      exposures: [
        { filter: 'L', frames: 30, exposureSeconds: 120, sessionId: 'c1' },
      ],
    });
    expect(result.photoId).toBe(PHOTO_ID);
    expect(state.removed).toEqual([]);
    // Eşleme kurulamadı → pozun session_id'si null, ama poz yine yazıldı.
    expect(state.exposureInsert?.[0].session_id).toBeNull();
  });
});

describe('uploadPhoto — kart (thumbnail) kadrajı (C07, C10)', () => {
  it('kadraj seçilince kadrajdan render eder ve thumb_crop yazar', async () => {
    await uploadPhoto({
      ...input,
      thumbCrop: { zoom: 1.4, panX: 0.2, panY: -0.1 },
    });
    expect(KADRAJ.cagrildi).toBe(1);
    expect(state.photoUpdate?.thumb_crop).toEqual({
      zoom: 1.4,
      panX: 0.2,
      panY: -0.1,
    });
  });

  it('varsayılan kadrajda (zoom 1, pan 0) otomatik thumb, thumb_crop null', async () => {
    await uploadPhoto({
      ...input,
      thumbCrop: { zoom: 1, panX: 0, panY: 0 },
    });
    expect(KADRAJ.cagrildi).toBe(0);
    expect(state.photoUpdate?.thumb_crop).toBeNull();
  });

  it("kadraj render düşerse otomatik thumb'a düşer, yükleme sürer", async () => {
    KADRAJ.dussun = true;
    const result = await uploadPhoto({
      ...input,
      thumbCrop: { zoom: 2, panX: 0.5, panY: 0.5 },
    });
    expect(result.photoId).toBe(PHOTO_ID);
    // Kadraj render'ı düştü → thumb_crop yazılmadı.
    expect(state.photoUpdate?.thumb_crop).toBeNull();
  });
});

describe('uploadPhoto — şema kodun gerisindeyken yükleme kırılmaz', () => {
  /*
   * CANLI OLAY: `thumb_crop` kolonu koda girdi ama migration prod'a
   * uygulanmamıştı. PostgREST bütün güncellemeyi reddetti ve YÜKLEME
   * TAMAMEN KIRILDI — dosyalar depoya yazılmış, satır yolsuz kalmıştı
   * ("Could not find the 'thumb_crop' column ... in the schema cache").
   *
   * Yollar olmadan kayıt işe yaramaz; kadraj olmadan yalnızca kart
   * otomatik ortalanır. Kadraj bu yüzden feda edilebilir, yollar değil.
   */
  it('thumb_crop kolonu yoksa kadrajsız kaydeder, yükleme tamamlanır', async () => {
    state.thumbCropKolonuYok = true;
    const result = await uploadPhoto({
      ...input,
      thumbCrop: { zoom: 1.4, panX: 0.2, panY: -0.1 },
    });

    expect(result.photoId).toBe(PHOTO_ID);
    // Yollar yazıldı, kadraj düşürüldü.
    expect(state.photoUpdate).toMatchObject({
      display_path: DISPLAY,
      thumb_path: THUMB,
    });
    expect('thumb_crop' in (state.photoUpdate ?? {})).toBe(false);
    // Geri alma tetiklenmedi: dosyalar duruyor.
    expect(state.removed).toEqual([]);
    expect(state.softDeletedRows).toEqual([]);
  });

  it('session_id kolonu yoksa pozlar bağsız yazılır, künye kaybolmaz', async () => {
    state.sessionIdKolonuYok = true;
    const result = await uploadPhoto({
      ...input,
      captureSessions: [{ id: 'c1', startsOn: '2026-01-12', endsOn: null }],
      exposures: [
        { filter: 'L', frames: 30, exposureSeconds: 120, sessionId: 'c1' },
      ],
    });

    expect(result.exposuresSaved).toBe(true);
    expect(state.exposureInsert?.[0]).toMatchObject({
      filter: 'L',
      frames: 30,
    });
    expect('session_id' in (state.exposureInsert?.[0] ?? {})).toBe(false);
  });
});

describe('uploadPhoto — orijinal değişmez ve türev sızıntısı yok (X02, X03)', () => {
  it('orijinal arşiv upsert:false ile yazılır (X02 değişmezlik)', async () => {
    await uploadPhoto({ ...input });
    const orijinal = state.uploads.find((u) => u.bucket === 'photo-originals');
    expect(orijinal).toBeTruthy();
    expect(orijinal?.upsert).toBe(false);
  });

  it("gösterim/thumb public bucket'a, ham dosya yalnız gizli bucket'a (X03)", async () => {
    await uploadPhoto({ ...input });
    // Public türevler (canvas'tan üretilmiş, EXIF'siz) 'photos' bucket'ında.
    const publicYollar = state.uploads
      .filter((u) => u.bucket === 'photos')
      .map((u) => u.path);
    expect(publicYollar.some((p) => p.endsWith('display.jpg'))).toBe(true);
    expect(publicYollar.some((p) => p.endsWith('thumb.jpg'))).toBe(true);
    // EXIF/GPS taşıyabilen ham dosya YALNIZCA gizli bucket'ta.
    const gizli = state.uploads.filter((u) => u.bucket === 'photo-originals');
    expect(gizli).toHaveLength(1);
    expect(
      state.uploads.some(
        (u) => u.bucket === 'photos' && u.path.includes('original')
      )
    ).toBe(false);
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

describe('updatePhotoMetadata — mevcut fotoğraf düzenleme', () => {
  it('görsel yollarına dokunmadan fotoğraf künyesini günceller', async () => {
    await updatePhotoMetadata({
      photoId: PHOTO_ID,
      title: 'Yeni Başlık',
      description: 'Yeni açıklama',
      photoType: 'deep-sky',
      palette: 'LRGB',
      capturedAt: '2026-08-01',
      city: 'Denizli',
      district: 'Beyağaç',
      copyrightConfirmed: true,
      license: 'Hakları sahibinde',
      allowDownload: true,
      watermarkRequired: false,
      aiDeclared: true,
      targetLabel: 'NGC 5907 — Splinter Galaxy',
      setup: {
        Optik: '130mm APO',
        Kamera: 'ZWO ASI2600MM Pro',
      },
      thumbCrop: { zoom: 1.4, panX: 0.1, panY: -0.2 },
      exposures: [{ filter: 'L', frames: 22, exposureSeconds: 180 }],
    });

    expect(state.uploads).toEqual([]);
    expect(state.photoUpdate).toMatchObject({
      title: 'Yeni Başlık',
      description: 'Yeni açıklama',
      photo_type: 'deep-sky',
      palette: 'LRGB',
      captured_at: '2026-08-01',
      city: 'Denizli',
      district: 'Beyağaç',
      location_label: 'Beyağaç / Denizli',
      allow_download: true,
      watermark_required: false,
      ai_declared: true,
      target_label: 'NGC 5907 — Splinter Galaxy',
      setup_text: {
        Optik: '130mm APO',
        Kamera: 'ZWO ASI2600MM Pro',
      },
      thumb_crop: { zoom: 1.4, panX: 0.1, panY: -0.2 },
    });
    expect(state.photoUpdate).not.toHaveProperty('display_path');
    expect(state.photoUpdate).not.toHaveProperty('thumb_path');
    expect(state.photoUpdate).not.toHaveProperty('original_path');
  });

  it('eski oturum ve pozlamaları temizleyip yeni satırları aynı kayda yazar', async () => {
    await updatePhotoMetadata({
      photoId: PHOTO_ID,
      title: 'Gece',
      photoType: 'deep-sky',
      palette: 'RGB',
      copyrightConfirmed: true,
      captureSessions: [
        { id: 'c1', startsOn: '2026-08-01', endsOn: null },
        { id: 'c2', startsOn: '2026-08-05', endsOn: '2026-08-07' },
      ],
      exposures: [
        { filter: 'L', frames: 20, exposureSeconds: 180, sessionId: 'c2' },
      ],
    });

    expect(state.deletedByTable).toEqual([
      { table: 'photo_exposures', column: 'photo_id', value: PHOTO_ID },
      { table: 'photo_capture_sessions', column: 'photo_id', value: PHOTO_ID },
    ]);
    expect(state.sessionInsert).toEqual([
      {
        photo_id: PHOTO_ID,
        starts_on: '2026-08-01',
        ends_on: null,
        position: 0,
      },
      {
        photo_id: PHOTO_ID,
        starts_on: '2026-08-05',
        ends_on: '2026-08-07',
        position: 1,
      },
    ]);
    expect(state.exposureInsert).toEqual([
      {
        photo_id: PHOTO_ID,
        filter: 'L',
        frames: 20,
        exposure_seconds: 180,
        position: 0,
        session_id: 'sess-1',
      },
    ]);
  });

  it('thumb_crop kolonu yoksa metadata kaydını kadrajsız tekrar dener', async () => {
    state.thumbCropKolonuYok = true;

    await updatePhotoMetadata({
      photoId: PHOTO_ID,
      title: 'Gece',
      photoType: 'deep-sky',
      palette: 'RGB',
      copyrightConfirmed: true,
      thumbCrop: { zoom: 1.2, panX: 0, panY: 0 },
    });

    expect(state.photoUpdate).toMatchObject({ title: 'Gece' });
    expect('thumb_crop' in (state.photoUpdate ?? {})).toBe(false);
  });
});
