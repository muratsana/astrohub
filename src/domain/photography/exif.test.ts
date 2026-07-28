import { describe, it, expect } from 'vitest';
import {
  parseExif,
  dmsToDecimal,
  exifDateToIso,
  formatExposure,
  cameraLabel,
} from './exif';

/* ══════════════════════ Test JPEG üreteci ══════════════════════ */

/**
 * Gerçek bir JPEG'in EXIF bloğunu elle kuruyoruz.
 *
 * Hazır bir örnek dosya commit etmek yerine üretmenin nedeni: testin neyi
 * doğruladığı okunabilir kalsın. Aşağıdaki yapı gerçek dosyalardakiyle
 * aynıdır — SOI, APP1, "Exif\0\0", TIFF başlığı, IFD0, ExifIFD, GPS IFD.
 */
interface TagSpec {
  tag: number;
  type: number;
  values: number[] | string;
}

function buildJpegWithExif(options: {
  ifd0: TagSpec[];
  exif?: TagSpec[];
  gps?: TagSpec[];
  littleEndian?: boolean;
}): ArrayBuffer {
  const le = options.littleEndian ?? true;

  // Bölüm 1: değer alanları IFD'lerden sonra gelir; önce boyutları hesapla.
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 10: 8 };

  /*
   * RATIONAL değerleri testte [pay, payda, …] düz dizisi olarak veriliyor;
   * EXIF'te ise bir RATIONAL tek bir değerdir (8 bayt). Sayımı ikiye bölmek
   * bu yüzden şart — ilk sürümde bölünmüyordu ve ayrıştırıcı tek poz süresi
   * yerine iki elemanlı dizi görüyordu.
   */
  const valueCount = (spec: TagSpec) => {
    if (typeof spec.values === 'string') return spec.values.length + 1;
    return spec.type === 5 || spec.type === 10
      ? spec.values.length / 2
      : spec.values.length;
  };

  const entrySize = (spec: TagSpec) => typeSize[spec.type] * valueCount(spec);

  const ifdSize = (specs: TagSpec[]) => 2 + specs.length * 12 + 4;

  const ifd0Specs = [...options.ifd0];
  const exifSpecs = options.exif ?? [];
  const gpsSpecs = options.gps ?? [];

  // Pointer tag'leri IFD0'a eklenir (değerleri sonra doldurulacak).
  const hasExif = exifSpecs.length > 0;
  const hasGps = gpsSpecs.length > 0;
  if (hasExif) ifd0Specs.push({ tag: 0x8769, type: 4, values: [0] });
  if (hasGps) ifd0Specs.push({ tag: 0x8825, type: 4, values: [0] });

  const ifd0Offset = 8;
  const exifOffset = ifd0Offset + ifdSize(ifd0Specs);
  const gpsOffset = exifOffset + (hasExif ? ifdSize(exifSpecs) : 0);
  const dataStart = gpsOffset + (hasGps ? ifdSize(gpsSpecs) : 0);

  // Pointer değerlerini gerçek offset'lerle güncelle.
  for (const spec of ifd0Specs) {
    if (spec.tag === 0x8769) spec.values = [exifOffset];
    if (spec.tag === 0x8825) spec.values = [gpsOffset];
  }

  const totalDataSize = [...ifd0Specs, ...exifSpecs, ...gpsSpecs]
    .filter((s) => entrySize(s) > 4)
    .reduce((sum, s) => sum + entrySize(s), 0);

  const tiffSize = dataStart + totalDataSize;
  const tiff = new DataView(new ArrayBuffer(tiffSize));

  // TIFF başlığı
  tiff.setUint16(0, le ? 0x4949 : 0x4d4d, false);
  tiff.setUint16(2, 42, le);
  tiff.setUint32(4, ifd0Offset, le);

  let dataCursor = dataStart;

  const writeIfd = (specs: TagSpec[], at: number, nextIfd = 0) => {
    tiff.setUint16(at, specs.length, le);
    specs.forEach((spec, i) => {
      const entry = at + 2 + i * 12;
      const count = valueCount(spec);
      tiff.setUint16(entry, spec.tag, le);
      tiff.setUint16(entry + 2, spec.type, le);
      tiff.setUint32(entry + 4, count, le);

      const size = entrySize(spec);
      const target = size <= 4 ? entry + 8 : dataCursor;
      if (size > 4) {
        tiff.setUint32(entry + 8, dataCursor, le);
        dataCursor += size;
      }

      if (typeof spec.values === 'string') {
        for (let c = 0; c < spec.values.length; c++) {
          tiff.setUint8(target + c, spec.values.charCodeAt(c));
        }
        tiff.setUint8(target + spec.values.length, 0);
      } else if (spec.type === 3) {
        spec.values.forEach((v, k) => tiff.setUint16(target + k * 2, v, le));
      } else if (spec.type === 4) {
        spec.values.forEach((v, k) => tiff.setUint32(target + k * 4, v, le));
      } else if (spec.type === 5) {
        // RATIONAL: pay/payda çiftleri düz dizi olarak verilir
        for (let k = 0; k * 2 < spec.values.length; k++) {
          tiff.setUint32(target + k * 8, spec.values[k * 2], le);
          tiff.setUint32(target + k * 8 + 4, spec.values[k * 2 + 1], le);
        }
      }
    });
    tiff.setUint32(at + 2 + specs.length * 12, nextIfd, le);
  };

  writeIfd(ifd0Specs, ifd0Offset);
  if (hasExif) writeIfd(exifSpecs, exifOffset);
  if (hasGps) writeIfd(gpsSpecs, gpsOffset);

  // JPEG sarmalayıcı: SOI + APP1(Exif\0\0 + TIFF) + EOI
  const app1Payload = 6 + tiffSize;
  const jpeg = new Uint8Array(2 + 2 + 2 + app1Payload + 2);
  const jv = new DataView(jpeg.buffer);
  jv.setUint16(0, 0xffd8, false); // SOI
  jv.setUint16(2, 0xffe1, false); // APP1
  jv.setUint16(4, 2 + app1Payload, false); // segment uzunluğu
  jpeg.set([0x45, 0x78, 0x69, 0x66, 0x00, 0x00], 6); // "Exif\0\0"
  jpeg.set(new Uint8Array(tiff.buffer), 12);
  jv.setUint16(12 + tiffSize, 0xffd9, false); // EOI

  return jpeg.buffer;
}

/** RATIONAL değerleri düz [pay, payda, …] dizisi olarak verilir. */
const rational = (...pairs: [number, number][]) => pairs.flat();

/* ══════════════════════ Testler ══════════════════════ */

describe('EXIF ayrıştırma', () => {
  it('temel kamera alanlarını okur', () => {
    const buffer = buildJpegWithExif({
      ifd0: [
        { tag: 0x010f, type: 2, values: 'Canon' },
        { tag: 0x0110, type: 2, values: 'Canon EOS Ra' },
        { tag: 0x0112, type: 3, values: [1] },
      ],
      exif: [
        { tag: 0x829a, type: 5, values: rational([1, 250]) },
        { tag: 0x829d, type: 5, values: rational([28, 10]) },
        { tag: 0x8827, type: 3, values: [1600] },
        { tag: 0x920a, type: 5, values: rational([135, 1]) },
        { tag: 0x9003, type: 2, values: '2026:01:18 22:14:03' },
        { tag: 0xa434, type: 2, values: 'Samyang 135mm F2' },
      ],
    });

    const exif = parseExif(buffer);
    expect(exif).not.toBeNull();
    expect(exif!.make).toBe('Canon');
    expect(exif!.model).toBe('Canon EOS Ra');
    expect(exif!.lens).toBe('Samyang 135mm F2');
    expect(exif!.exposureSeconds).toBeCloseTo(1 / 250, 6);
    expect(exif!.fNumber).toBeCloseTo(2.8, 6);
    expect(exif!.iso).toBe(1600);
    expect(exif!.focalLength).toBe(135);
    expect(exif!.capturedAt).toBe('2026-01-18T22:14:03');
    expect(exif!.orientation).toBe(1);
    expect(exif!.hasGps).toBe(false);
  });

  it('büyük-endian (MM) dosyaları da okur', () => {
    const buffer = buildJpegWithExif({
      littleEndian: false,
      ifd0: [{ tag: 0x010f, type: 2, values: 'Nikon' }],
      exif: [{ tag: 0x8827, type: 3, values: [800] }],
    });

    const exif = parseExif(buffer);
    expect(exif!.make).toBe('Nikon');
    expect(exif!.iso).toBe(800);
  });

  it('GPS varsa ayrı alanda döndürür ve bayrağı kaldırır (§15.3)', () => {
    const buffer = buildJpegWithExif({
      ifd0: [{ tag: 0x010f, type: 2, values: 'Sony' }],
      gps: [
        { tag: 0x0001, type: 2, values: 'N' },
        { tag: 0x0002, type: 5, values: rational([36, 1], [49, 1], [30, 1]) },
        { tag: 0x0003, type: 2, values: 'E' },
        { tag: 0x0004, type: 5, values: rational([30, 1], [20, 1], [0, 1]) },
      ],
    });

    const exif = parseExif(buffer)!;
    expect(exif.hasGps).toBe(true);
    expect(exif.gps!.latitude).toBeCloseTo(36.825, 4);
    expect(exif.gps!.longitude).toBeCloseTo(30.3333, 3);
  });

  it('güney/batı yarımküreyi negatif işaretler', () => {
    const buffer = buildJpegWithExif({
      ifd0: [{ tag: 0x010f, type: 2, values: 'Sony' }],
      gps: [
        { tag: 0x0001, type: 2, values: 'S' },
        { tag: 0x0002, type: 5, values: rational([33, 1], [0, 1], [0, 1]) },
        { tag: 0x0003, type: 2, values: 'W' },
        { tag: 0x0004, type: 5, values: rational([70, 1], [30, 1], [0, 1]) },
      ],
    });

    const exif = parseExif(buffer)!;
    expect(exif.gps!.latitude).toBeCloseTo(-33, 6);
    expect(exif.gps!.longitude).toBeCloseTo(-70.5, 6);
  });

  it('EXIF yoksa null döner', () => {
    // Yalnızca SOI + EOI
    const plain = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    expect(parseExif(plain.buffer)).toBeNull();
  });

  it('JPEG olmayan veride null döner, hata fırlatmaz', () => {
    const notJpeg = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]);
    expect(() => parseExif(notJpeg.buffer)).not.toThrow();
    expect(parseExif(notJpeg.buffer)).toBeNull();
  });

  it('kesilmiş dosyada çökmez', () => {
    const buffer = buildJpegWithExif({
      ifd0: [{ tag: 0x010f, type: 2, values: 'Canon' }],
      exif: [{ tag: 0x8827, type: 3, values: [400] }],
    });
    const truncated = buffer.slice(0, 20);
    expect(() => parseExif(truncated)).not.toThrow();
  });

  it('boş buffer’da null döner', () => {
    expect(parseExif(new ArrayBuffer(0))).toBeNull();
  });
});

describe('GPS dönüşümü', () => {
  it('derece/dakika/saniyeyi ondalığa çevirir', () => {
    expect(dmsToDecimal([41, 0, 49.2], 'N')).toBeCloseTo(41.0137, 4);
  });

  it('eksik dizide null döner', () => {
    expect(dmsToDecimal([41, 0], 'N')).toBeNull();
    expect(dmsToDecimal([], 'N')).toBeNull();
  });
});

describe('tarih dönüşümü', () => {
  it('EXIF biçimini ISO 8601’e çevirir', () => {
    expect(exifDateToIso('2026:01:18 22:14:03')).toBe('2026-01-18T22:14:03');
  });

  it('saat dilimi eklemez — EXIF dilim taşımaz', () => {
    expect(exifDateToIso('2026:01:18 22:14:03')).not.toContain('Z');
  });

  it('geçersiz biçimde undefined döner', () => {
    expect(exifDateToIso('18/01/2026')).toBeUndefined();
    expect(exifDateToIso('2026:13:45 99:99:99')).toBeUndefined();
    expect(exifDateToIso('')).toBeUndefined();
  });
});

describe('sunum yardımcıları', () => {
  it('kısa pozu kesir olarak yazar', () => {
    expect(formatExposure(1 / 250)).toBe('1/250 sn');
  });

  it('uzun pozu saniye ve dakika olarak yazar', () => {
    expect(formatExposure(30)).toBe('30 sn');
    expect(formatExposure(300)).toBe('5 dk');
  });

  it('geçersiz değerde tire döner', () => {
    expect(formatExposure(undefined)).toBe('—');
    expect(formatExposure(0)).toBe('—');
    expect(formatExposure(Number.NaN)).toBe('—');
  });

  it('kamera adında üreticiyi tekrarlamaz', () => {
    expect(cameraLabel({ make: 'Canon', model: 'Canon EOS Ra', hasGps: false })).toBe(
      'Canon EOS Ra'
    );
    expect(cameraLabel({ make: 'ZWO', model: 'ASI2600MC', hasGps: false })).toBe(
      'ZWO ASI2600MC'
    );
    expect(cameraLabel({ hasGps: false })).toBeUndefined();
  });
});
