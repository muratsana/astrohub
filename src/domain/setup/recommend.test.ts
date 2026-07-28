import { describe, expect, it } from 'vitest';
import {
  PHOTO_PAYLOAD_FACTOR,
  pixelScale,
  recommendCameras,
  recommendMounts,
  recommendOptics,
  samplingScore,
  samplingVerdict,
} from './recommend';
import type { EquipmentModel } from '@/features/equipment/data';

function camera(
  slug: string,
  pixelUm?: string,
  resolution?: string
): EquipmentModel {
  return {
    slug,
    brand: 'Test',
    model: slug,
    category: 'astro-kamera',
    specs: {
      ...(pixelUm ? { Piksel: pixelUm } : {}),
      ...(resolution ? { Çözünürlük: resolution } : {}),
    },
  };
}

function mount(slug: string, payload?: string): EquipmentModel {
  return {
    slug,
    brand: 'Test',
    model: slug,
    category: 'montur',
    specs: payload ? { 'Yük kapasitesi': payload } : {},
  };
}

function optic(slug: string, focal?: string, aperture?: string): EquipmentModel {
  return {
    slug,
    brand: 'Test',
    model: slug,
    category: 'optik-tup',
    specs: {
      ...(focal ? { Odak: focal } : {}),
      ...(aperture ? { Açıklık: aperture } : {}),
    },
  };
}

describe('pixelScale', () => {
  it('bilinen bir örneği doğru hesaplar', () => {
    // 3.76 µm piksel, 550 mm odak → 206.265 × 3.76 / 550 ≈ 1.41″/px
    expect(pixelScale(3.76, 550)).toBeCloseTo(1.41, 2);
  });
});

describe('samplingVerdict', () => {
  it('seeing/3 – seeing/2 aralığını uygun sayar', () => {
    expect(samplingVerdict(1.2, 3)).toBe('uygun');
    expect(samplingVerdict(1.0, 3)).toBe('uygun');
    expect(samplingVerdict(1.5, 3)).toBe('uygun');
  });

  it('aralığın üstü az örnekleme, altı gereksiz büyütme', () => {
    expect(samplingVerdict(2.4, 3)).toBe('yetersiz');
    expect(samplingVerdict(0.4, 3)).toBe('aşırı');
  });
});

describe('samplingScore', () => {
  it('aralığın içinde tam puan verir', () => {
    expect(samplingScore(1.2, 3)).toBe(1);
  });

  it('uzaklaştıkça düşer ama sert eşik kullanmaz', () => {
    // 1.51 ile 1.49 arasında uçurum olmamalı — sert eşik anlamsız bir
    // ayrım üretirdi.
    const justOutside = samplingScore(1.55, 3);
    expect(justOutside).toBeLessThan(1);
    expect(justOutside).toBeGreaterThan(0.8);
  });

  it('çok uzakta sıfıra iner, negatife düşmez', () => {
    expect(samplingScore(20, 3)).toBe(0);
  });
});

describe('recommendCameras', () => {
  const context = { focalLengthMm: 550, seeingArcsec: 3 };

  it('örneklemesi uygun olanı öne alır', () => {
    const result = recommendCameras(
      [camera('kaba', '9 µm'), camera('uygun', '3.76 µm')],
      context
    );
    expect(result.ranked[0].model.slug).toBe('uygun');
    expect(result.ranked[0].reasons[0]).toContain('uygun');
  });

  it('piksel boyutu olmayanı PUANLAMAZ, ayrı listeye koyar', () => {
    // Projenin kuralı: eksik veriyi ortalamayla doldurmak, olmayan bir
    // bilgiye güven vermek olur.
    const result = recommendCameras([camera('bilinmiyor')], context);
    expect(result.ranked).toHaveLength(0);
    expect(result.insufficient.map((m) => m.slug)).toEqual(['bilinmiyor']);
  });

  it('odak bilinmiyorsa hiçbir adayı puanlamaz', () => {
    const result = recommendCameras([camera('a', '3.76 µm')], {
      seeingArcsec: 3,
    });
    expect(result.ranked).toHaveLength(0);
    expect(result.insufficient).toHaveLength(1);
  });

  it('sensör görüntü çemberine sığmıyorsa uyarır ve geriye düşürür', () => {
    // 3.76 µm × 9576 px ≈ 36 mm genişlik → köşegen ~43 mm
    const big = camera('buyuk', '3.76 µm', '9576 x 6388');
    const small = camera('kucuk', '3.76 µm', '3008 x 3008');
    const result = recommendCameras([big, small], {
      ...context,
      imageCircleMm: 22,
    });

    expect(result.ranked[0].model.slug).toBe('kucuk');
    const bigResult = result.ranked.find((r) => r.model.slug === 'buyuk')!;
    expect(bigResult.warnings.join(' ')).toContain('vinyetleme');
  });

  it('sensör ölçüsü yoksa puana dokunmaz ama bunu yazar', () => {
    // "Sığar" demek de "sığmaz" demek de uydurma olurdu.
    const result = recommendCameras([camera('a', '3.76 µm')], {
      ...context,
      imageCircleMm: 22,
    });
    expect(result.ranked[0].score).toBe(samplingScore(pixelScale(3.76, 550), 3));
    expect(result.ranked[0].warnings.join(' ')).toContain('kontrol edilemedi');
  });
});

describe('recommendMounts', () => {
  it('beyan edilen kapasiteyi fotoğraf katsayısıyla düşürür', () => {
    const result = recommendMounts([mount('a', '20 kg')], {
      loadKg: 8,
      seeingArcsec: 3,
    });
    // 20 × 0.6 = 12 kg
    expect(result.ranked[0].reasons[0]).toContain('12.0 kg');
    expect(PHOTO_PAYLOAD_FACTOR).toBe(0.6);
  });

  it('kapasiteyi aşan montürü en sona atar ve uyarır', () => {
    const result = recommendMounts(
      [mount('kucuk', '10 kg'), mount('yeterli', '20 kg')],
      { loadKg: 8, seeingArcsec: 3 }
    );
    expect(result.ranked[0].model.slug).toBe('yeterli');
    expect(result.ranked.at(-1)!.model.slug).toBe('kucuk');
    expect(result.ranked.at(-1)!.warnings.join(' ')).toContain('aşıyor');
  });

  it('aşırı büyük kapasiteyi de ideal saymaz', () => {
    // %80 pay genelde gereksiz ağır ve pahalı bir montür demek.
    const result = recommendMounts(
      [mount('dengeli', '20 kg'), mount('devasa', '60 kg')],
      { loadKg: 8, seeingArcsec: 3 }
    );
    expect(result.ranked[0].model.slug).toBe('dengeli');
    const huge = result.ranked.find((r) => r.model.slug === 'devasa')!;
    expect(huge.warnings.join(' ')).toContain('Kapasite fazlası');
  });

  it('kapasitesi bilinmeyeni puanlamaz', () => {
    const result = recommendMounts([mount('bilinmiyor')], {
      loadKg: 8,
      seeingArcsec: 3,
    });
    expect(result.insufficient).toHaveLength(1);
  });
});

describe('recommendOptics', () => {
  it('kamera pikseline göre odak sıralar', () => {
    const result = recommendOptics(
      [optic('uzun', '2350 mm', '279 mm'), optic('kisa', '550 mm', '100 mm')],
      3.76,
      { seeingArcsec: 3 }
    );
    expect(result.ranked[0].model.slug).toBe('kisa');
    expect(result.ranked[0].reasons.join(' ')).toContain('f/5.5');
  });

  it('piksel bilinmiyorsa hiçbir optiği puanlamaz', () => {
    const result = recommendOptics([optic('a', '550 mm')], undefined, {
      seeingArcsec: 3,
    });
    expect(result.ranked).toHaveLength(0);
    expect(result.insufficient).toHaveLength(1);
  });
});
