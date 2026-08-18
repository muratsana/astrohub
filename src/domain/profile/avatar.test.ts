import { describe, expect, it } from 'vitest';
import {
  avatarCropAfterDrag,
  avatarCropAfterZoom,
  avatarSourceRect,
  avatarStageFit,
  avatarStoragePath,
  cleanAvatarCrop,
} from './avatar';

describe('avatar crop', () => {
  it('landscape görselde kare FOVu yatay eksende kaydırır', () => {
    expect(
      avatarSourceRect({ width: 4000, height: 2000 }, { zoom: 1, panX: 1, panY: 0 })
    ).toEqual({ x: 2000, y: 0, size: 2000 });
  });

  it('zoom arttıkça kaynak karesi küçülür', () => {
    expect(
      avatarSourceRect({ width: 3000, height: 3000 }, { zoom: 3, panX: 0, panY: 0 })
    ).toEqual({ x: 1000, y: 1000, size: 1000 });
  });

  it('geçersiz kontrolleri güvenli aralığa çeker', () => {
    expect(cleanAvatarCrop({ zoom: 99, panX: -4, panY: Number.NaN })).toEqual({
      zoom: 4,
      panX: -1,
      panY: 0,
    });
  });
});

describe('avatarStoragePath', () => {
  it('sahipliği yolun ilk klasöründe tutar', () => {
    expect(avatarStoragePath('u1', 123)).toBe('u1/avatar-123.jpg');
  });
});

/**
 * DOĞRUDAN KADRAJ — SAHNE GEOMETRİSİ.
 *
 * Bu üç fonksiyon tuvalde sürükleme ve yakınlaştırmanın altında duruyor;
 * hatası "fotoğraf parmağın altından kayıyor" şeklinde görünür ve
 * gözle ayıklanması zordur. Saf oldukları için burada tarayıcısız
 * ölçülüyorlar.
 */
describe('avatarStageFit', () => {
  it('yatay fotoğrafı sığdırıp dikeyde ortalar', () => {
    expect(avatarStageFit({ width: 4000, height: 2000 }, 320)).toEqual({
      scale: 0.08,
      offsetX: 0,
      offsetY: 80,
    });
  });

  it('kare fotoğrafta boşluk bırakmaz', () => {
    expect(avatarStageFit({ width: 1000, height: 1000 }, 320)).toEqual({
      scale: 0.32,
      offsetX: 0,
      offsetY: 0,
    });
  });
});

describe('avatarCropAfterDrag', () => {
  it('sürükleme kadar kayar ve sürüklenen yönde kalır', () => {
    /* 4000×2000'de zoom 1 => kare 2000, gidilecek yatay yer 2000 px,
       yarısı 1000. 500 px sağa sürüklemek panX'i 0.5 yapar. */
    const next = avatarCropAfterDrag(
      { width: 4000, height: 2000 },
      { zoom: 1, panX: 0, panY: 0 },
      500,
      0
    );
    expect(next.panX).toBeCloseTo(0.5, 5);
    expect(next.panY).toBe(0);
  });

  it('kenara dayandığında taşmıyor', () => {
    const next = avatarCropAfterDrag(
      { width: 4000, height: 2000 },
      { zoom: 1, panX: 0.9, panY: 0 },
      99999,
      0
    );
    expect(next.panX).toBe(1);
  });

  /*
   * KARE FOTOĞRAFTA ZOOM 1: gidilecek yer YOK. Bölen sıfır olduğu için
   * korumasız bir hesap `Infinity` üretir, `cleanAvatarCrop` onu sonlu
   * bulmayıp 0'a çeker ve kadraj sessizce sıfırlanırdı.
   */
  it('gidilecek yer yokken kadrajı bozmuyor', () => {
    const next = avatarCropAfterDrag(
      { width: 1000, height: 1000 },
      { zoom: 1, panX: 0, panY: 0 },
      120,
      -80
    );
    expect(next).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });
});

describe('avatarCropAfterZoom', () => {
  it('oranı uygular', () => {
    expect(avatarCropAfterZoom({ zoom: 2, panX: 0, panY: 0 }, 1.5).zoom).toBeCloseTo(3);
  });

  it('sınırların dışına çıkmıyor', () => {
    expect(avatarCropAfterZoom({ zoom: 3, panX: 0, panY: 0 }, 10).zoom).toBe(4);
    expect(avatarCropAfterZoom({ zoom: 1.2, panX: 0, panY: 0 }, 0.01).zoom).toBe(1);
  });

  /* Geçersiz oran (0, negatif, NaN) kadrajı SIFIRLAMAMALI: kıstırma
     ilk karede iki parmağın mesafesi henüz ölçülmemişken 0 üretebilir. */
  it('geçersiz oranı yok sayıyor', () => {
    expect(avatarCropAfterZoom({ zoom: 2.5, panX: 0, panY: 0 }, 0).zoom).toBe(2.5);
    expect(
      avatarCropAfterZoom({ zoom: 2.5, panX: 0, panY: 0 }, Number.NaN).zoom
    ).toBe(2.5);
  });
});
