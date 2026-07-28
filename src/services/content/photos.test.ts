import { describe, expect, it } from 'vitest';
import { cityFromLabel, mapPhotoRow } from './photos';

/**
 * Eşleyici testleri.
 *
 * Buradaki asıl koruma "eksik alan uydurulmuyor mu" sorusu. Tohum katalog
 * dolu kayıtlar taşıyor; veritabanı kayıtları taşımayabiliyor. Eşleyici
 * boşluğu bir tohum değeriyle doldurursa arayüz olmayan bir künyeyi var
 * gösterir ve kullanıcı kendi fotoğrafının künyesine güvenir.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
function row(over: Record<string, unknown> = {}): any {
  return {
    slug: 'm31-test',
    title: 'Andromeda',
    description: 'Deneme',
    photo_type: 'deep-sky',
    palette: 'LRGB',
    captured_at: '2026-07-10',
    published_at: '2026-07-12T20:00:00Z',
    target_label: null,
    location_label: 'Saklıkent, Antalya',
    location_visibility: 'approximate',
    bortle: 3,
    sqm: '21.5',
    license: 'CC BY-NC 4.0',
    ai_declared: false,
    like_count: 12,
    comment_count: 3,
    display_path: 'kullanici/m31.jpg',
    thumb_path: 'kullanici/m31-thumb.jpg',
    setup_text: {},
    profiles: { username: 'mert_astro', display_name: 'Mert Yılmaz' },
    celestial_objects: {
      name: 'Andromeda Galaksisi',
      catalog: 'M 31',
      constellation: 'Andromeda',
    },
    photo_exposures: [],
    photo_versions: [],
    ...over,
  };
}

describe('cityFromLabel', () => {
  it('etiketin son parçasını şehir sayar', () => {
    expect(cityFromLabel('Saklıkent, Antalya')).toBe('Antalya');
  });

  it('virgülsüz etikette etiketin kendisini kullanır', () => {
    expect(cityFromLabel('Antalya')).toBe('Antalya');
  });

  it('etiket yoksa uydurmaz', () => {
    // Boş bırakmak filtre listesinde adsız bir seçenek üretiyordu;
    // "Bilinmiyor" en azından doğru.
    expect(cityFromLabel(null)).toBe('Bilinmiyor');
    expect(cityFromLabel('')).toBe('Bilinmiyor');
  });
});

describe('mapPhotoRow', () => {
  it('katalog nesnesinden kanonik hedefi alır', () => {
    const photo = mapPhotoRow(row());
    expect(photo.target).toEqual({
      name: 'Andromeda Galaksisi',
      catalog: 'M 31',
      constellation: 'Andromeda',
    });
  });

  it('katalog bağı yoksa kullanıcının etiketine düşer', () => {
    const photo = mapPhotoRow(
      row({ celestial_objects: null, target_label: 'Barnard 33' })
    );
    expect(photo.target.catalog).toBe('Barnard 33');
    expect(photo.target.constellation).toBe('');
  });

  it('yılı çekim tarihinden türetir', () => {
    expect(mapPhotoRow(row()).year).toBe(2026);
  });

  it('çekim tarihi yoksa yayın tarihine düşer', () => {
    // Eski taramalarda çekim tarihi bilinmiyor olabiliyor; kaydı
    // yılsız bırakmak galeri yıl filtresinden düşürürdü.
    const photo = mapPhotoRow(row({ captured_at: null }));
    expect(photo.year).toBe(2026);
  });

  it('bilinmeyen fotoğraf tipini güvenli varsayılana çeker', () => {
    expect(mapPhotoRow(row({ photo_type: 'uydurma' })).type).toBe('deep-sky');
  });

  it('bilinmeyen konum görünürlüğünü gizliye çeker', () => {
    // Tanınmayan bir değeri "exact" saymak konumu ifşa ederdi; şüphede
    // en kapalı seçenek doğru olan (§15.3).
    expect(mapPhotoRow(row({ location_visibility: 'saçma' })).location.visibility).toBe(
      'hidden'
    );
  });

  it('pozlamaları position sırasına göre dizer', () => {
    const photo = mapPhotoRow(
      row({
        photo_exposures: [
          { filter: 'OIII', frames: 30, exposure_seconds: '180', position: 2 },
          { filter: 'Ha', frames: 40, exposure_seconds: '300', position: 1 },
        ],
      })
    );
    expect(photo.exposures.map((e) => e.filter)).toEqual(['Ha', 'OIII']);
    expect(photo.exposures[0].exposureSeconds).toBe(300);
  });

  it('sürümleri position sırasına göre dizer', () => {
    const photo = mapPhotoRow(
      row({
        photo_versions: [
          { id: 'b', label: 'v2', kind: 'yeniden-isleme', note: null, palette: null, published_at: null, position: 2 },
          { id: 'a', label: 'v1', kind: 'ilk', note: 'ilk', palette: 'RGB', published_at: '2026-07-01', position: 1 },
        ],
      })
    );
    expect(photo.versions?.map((v) => v.label)).toEqual(['v1', 'v2']);
  });

  it('sürüm yoksa alanı hiç kurmaz', () => {
    expect(mapPhotoRow(row()).versions).toBeUndefined();
  });

  it('yazılım listesi yoksa boş bırakır, uydurmaz', () => {
    // Tohum kayıtlarda "PixInsight" yazıyor. Veritabanı kaydında yoksa
    // oradan kopyalamak, kullanıcının kullanmadığı bir yazılımı künyeye
    // yazmak olurdu.
    expect(mapPhotoRow(row()).processing.software).toEqual([]);
  });

  it('setup_text içindeki künyeyi okur', () => {
    const photo = mapPhotoRow(
      row({
        setup_text: {
          optic: 'TS 130 APO',
          camera: 'ASI2600MM Pro',
          mount: 'EQ6-R Pro',
          filter: 'Antlia 3nm',
          software: 'PixInsight, Photoshop',
          darks: 25,
        },
      })
    );
    expect(photo.setup.optic).toBe('TS 130 APO');
    expect(photo.setup.filters).toBe('Antlia 3nm');
    expect(photo.processing.software).toEqual(['PixInsight', 'Photoshop']);
    expect(photo.calibration?.darks).toBe(25);
  });

  it('profil yoksa kaydı düşürmez', () => {
    // RLS profili gizleyebilir ya da kullanıcı silinmiş olabilir.
    // Fotoğrafı hiç göstermemek, sahipsiz göstermekten kötü.
    const photo = mapPhotoRow(row({ profiles: null }));
    expect(photo.user.username).toBe('bilinmiyor');
    expect(photo.slug).toBe('m31-test');
  });

  it('görsel yolu yoksa image alanını kurmaz', () => {
    // `image` tanımsızsa kart kendi yıldız alanını çiziyor; boş bir url
    // kırık görsel ikonu gösterirdi.
    const photo = mapPhotoRow(row({ display_path: null, thumb_path: null }));
    expect(photo.image).toBeUndefined();
  });
});
