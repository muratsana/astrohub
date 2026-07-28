import { describe, expect, it } from 'vitest';
import {
  parseMeasure,
  parseResolution,
  sensorSizeMm,
  typedSpecs,
  remainingSpecs,
  formatTypedSpecs,
  mergeSpecs,
} from './specs';
import { equipment } from '@/features/equipment/data';

describe('parseMeasure', () => {
  it('birimi yok sayıp baştaki sayıyı okur', () => {
    expect(parseMeasure('100 mm')).toBe(100);
    expect(parseMeasure('3.76 µm')).toBe(3.76);
    expect(parseMeasure('17.7 kg')).toBe(17.7);
  });

  it('Türkçe ondalık virgülünü kabul eder', () => {
    expect(parseMeasure('3,76 µm')).toBe(3.76);
  });

  it('sayı yoksa uydurmaz', () => {
    expect(parseMeasure('Üçlü APO')).toBeNull();
    expect(parseMeasure('')).toBeNull();
    expect(parseMeasure(undefined)).toBeNull();
  });

  it('negatif değeri okur — soğutma sıcaklığı gibi alanlar için', () => {
    expect(parseMeasure('-35°C')).toBe(-35);
  });
});

describe('parseResolution', () => {
  it('× ve x ayırıcılarını kabul eder', () => {
    expect(parseResolution('6248×4176')).toEqual({ width: 6248, height: 4176 });
    expect(parseResolution('3008 x 3008')).toEqual({ width: 3008, height: 3008 });
  });

  it('tek sayıyı çözünürlük saymaz', () => {
    expect(parseResolution('6248')).toBeNull();
    expect(parseResolution('APS-C mono')).toBeNull();
  });
});

describe('sensorSizeMm', () => {
  it('piksel sayısı × piksel boyutundan türetir', () => {
    // 6248 × 3.76 µm = 23492.5 µm = 23.49 mm
    expect(sensorSizeMm('6248×4176', 3.76)).toEqual({
      widthMm: 23.49,
      heightMm: 15.7,
    });
  });

  it('iki girdiden biri eksikse türetmez', () => {
    expect(sensorSizeMm('6248×4176', null)).toBeNull();
    expect(sensorSizeMm(undefined, 3.76)).toBeNull();
  });
});

describe('typedSpecs', () => {
  it('optik tüp alanlarını ayırır', () => {
    const result = typedSpecs({
      Açıklık: '100 mm',
      Odak: '550 mm',
      'f/': '5.5',
      Tip: 'Üçlü APO',
    });

    expect(result.apertureMm).toBe(100);
    expect(result.focalLengthMm).toBe(550);
    expect(result.pixelSizeUm).toBeNull();
    expect(result.sensorWidthMm).toBeNull();
  });

  it('kamera alanlarında sensör boyutunu türetir', () => {
    const result = typedSpecs({
      Sensör: 'APS-C mono',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    });

    expect(result.pixelSizeUm).toBe(3.76);
    expect(result.sensorWidthMm).toBe(23.49);
    expect(result.sensorHeightMm).toBe(15.7);
  });

  it('montür alanlarını ayırır', () => {
    const result = typedSpecs({
      Tip: 'Ekvatoryal (GoTo)',
      'Yük kapasitesi': '20 kg',
      Ağırlık: '17.7 kg',
    });

    expect(result.payloadCapacityKg).toBe(20);
    expect(result.weightKg).toBe(17.7);
  });
});

describe('remainingSpecs', () => {
  it('typed kolona giden anahtarları çıkarır', () => {
    const rest = remainingSpecs({
      Açıklık: '100 mm',
      Odak: '550 mm',
      'f/': '5.5',
      Tip: 'Üçlü APO',
    });

    expect(rest).toEqual({ 'f/': '5.5', Tip: 'Üçlü APO' });
  });

  it('çözünürlüğü JSONB katmanında bırakır — gösterilen bir bilgi', () => {
    const rest = remainingSpecs({
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
    });

    expect(rest).toEqual({ Çözünürlük: '6248×4176' });
  });

  it('bilinmeyen anahtarı düşürmez', () => {
    const rest = remainingSpecs({ 'Yeni Alan': 'değer' });
    expect(rest).toEqual({ 'Yeni Alan': 'değer' });
  });
});

describe('formatTypedSpecs', () => {
  it('birimi geri ekler', () => {
    expect(
      formatTypedSpecs({ apertureMm: 100, focalLengthMm: 550 })
    ).toEqual({ Açıklık: '100 mm', Odak: '550 mm' });
  });

  it('gereksiz ondalık kuyruğu bırakmaz', () => {
    expect(formatTypedSpecs({ weightKg: 17.7 })).toEqual({ Ağırlık: '17.7 kg' });
    expect(formatTypedSpecs({ pixelSizeUm: 3.76 })).toEqual({ Piksel: '3.76 µm' });
  });

  it('null alanı hiç yazmaz — "—" gibi bir yer tutucu üretmez', () => {
    expect(formatTypedSpecs({ apertureMm: null, focalLengthMm: 550 })).toEqual({
      Odak: '550 mm',
    });
  });
});

describe('gidiş-dönüş', () => {
  /*
   * Asıl güvence bu: tohum verideki her spec, veritabanına yazılıp geri
   * okunduğunda aynı anahtar/değer kümesini vermeli. Ayrıştırma ile
   * biçimleme birbirinin tersi değilse, veritabanına geçen sayfa sessizce
   * farklı bir künye gösterir.
   */
  it('tüm tohum ekipmanı ayrıştırıp geri biçimlemek aynı specs verir', () => {
    for (const item of equipment) {
      const roundTripped = mergeSpecs(
        typedSpecs(item.specs),
        remainingSpecs(item.specs)
      );
      expect(roundTripped).toEqual(item.specs);
    }
  });
});
