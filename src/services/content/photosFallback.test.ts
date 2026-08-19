import { describe, expect, it } from 'vitest';
import { fetchPhotos } from './photos';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * GALERİ, ŞEMA GERİDE KALDIĞINDA DA AÇILIR.
 *
 * CANLI OLAY: `thumb_crop` kolonu ve `photo_capture_sessions` tablosu koda
 * girdi ama migration prod'a uygulanmamıştı. PostgREST bütün sorguyu
 * reddetti ve galeri "bağlantı kurulamadı" dedi — eksik olan yalnızca iki
 * isteğe bağlı alandı, sayfanın tamamı gitti.
 *
 * Artık ilk deneme yeni alanlarla, şema eksikse ikinci deneme çekirdekle
 * yapılıyor: kadraj ve oturumlar boş kalır, galeri açılır.
 */
const SATIR = {
  id: 'p1',
  slug: 'orion',
  title: 'Orion',
  description: null,
  photo_type: 'deep-sky',
  palette: 'RGB',
  captured_at: '2026-07-10',
  published_at: '2026-07-11',
  target_label: 'M 42',
  location_label: 'Antalya',
  location_visibility: 'region',
  bortle: 4,
  sqm: null,
  license: 'CC',
  ai_declared: false,
  like_count: 0,
  comment_count: 0,
  display_path: 'u/p/display.jpg',
  thumb_path: 'u/p/thumb.jpg',
  width: 100,
  height: 100,
  setup_text: null,
  profiles: { username: 'murat', display_name: 'Murat' },
  celestial_objects: null,
  photo_exposures: [],
  photo_versions: [],
};

/** Sorgu zincirini taklit eden en küçük istemci. */
function client(opts: {
  yeniAlanlarHata?: { code?: string; message: string };
}): SupabaseClient {
  const secimler: string[] = [];
  const zincir = (secim: string) => {
    const sonuc = {
      eq: () => sonuc,
      is: () => sonuc,
      order: () => sonuc,
      limit: async () => {
        const yeni =
          secim.includes('thumb_crop') || secim.includes('photo_capture_sessions');
        if (yeni && opts.yeniAlanlarHata) {
          return { data: null, error: opts.yeniAlanlarHata };
        }
        return { data: [SATIR], error: null };
      },
    };
    return sonuc;
  };
  return {
    from: () => ({
      select: (secim: string) => {
        secimler.push(secim);
        return zincir(secim);
      },
    }),
    _secimler: secimler,
  } as unknown as SupabaseClient;
}

describe('fetchPhotos — şema geride kalınca çekirdeğe düşer', () => {
  it('normalde yeni alanlarla okur', async () => {
    const c = client({});
    const photos = await fetchPhotos(c);
    expect(photos).toHaveLength(1);
    const secimler = (c as unknown as { _secimler: string[] })._secimler;
    expect(secimler).toHaveLength(1);
    expect(secimler[0]).toContain('thumb_crop');
    expect(secimler[0]).toContain('photo_capture_sessions');
  });

  it('kolon/tablo yoksa çekirdek alanlarla yeniden dener ve galeriyi açar', async () => {
    const c = client({
      yeniAlanlarHata: {
        code: 'PGRST204',
        message:
          "Could not find the 'thumb_crop' column of 'astro_photos' in the schema cache",
      },
    });
    const photos = await fetchPhotos(c);
    // Galeri boş dönmüyor, hata fırlatmıyor.
    expect(photos).toHaveLength(1);
    expect(photos[0].slug).toBe('orion');
    // Kadraj yok ama tarih eski tek alandan türedi.
    expect(photos[0].thumbCrop).toBeUndefined();
    expect(photos[0].captureSessions).toEqual([
      { id: 'captured-p1', startsOn: '2026-07-10', endsOn: null },
    ]);

    const secimler = (c as unknown as { _secimler: string[] })._secimler;
    expect(secimler).toHaveLength(2);
    expect(secimler[1]).not.toContain('thumb_crop');
    expect(secimler[1]).not.toContain('photo_capture_sessions');
    expect(secimler[1]).not.toContain('session_id');
  });

  it('şemayla ilgisiz hatayı yutmaz', async () => {
    const c = client({
      yeniAlanlarHata: { code: '08006', message: 'connection failure' },
    });
    await expect(fetchPhotos(c)).rejects.toThrow('connection failure');
  });
});
