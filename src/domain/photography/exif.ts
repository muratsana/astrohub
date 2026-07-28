/**
 * EXIF OKUMA VE NORMALİZASYON (§10.3, §15.3).
 *
 * NEDEN DIŞ KÜTÜPHANE YOK
 * Hazır EXIF kütüphaneleri 20–60 kB'lık paketler ve hepsi bizim
 * kullanmayacağımız onlarca üretici-özel bloğu (MakerNote, XMP, IPTC)
 * ayrıştırıyor. Bizim ihtiyacımız sekiz alan: kamera, lens, poz, diyafram,
 * ISO, odak, çekim zamanı ve — mahremiyet açısından en kritiği — GPS.
 * Bunları okumak birkaç yüz satır; ilk yüklemeye 40 kB eklemekten iyi (§16.4).
 *
 * MAHREMİYET KURALI (§15.3)
 * GPS alanı ayrıştırılır ama **ayrı bir alanda** döndürülür ve `hasGps`
 * bayrağıyla işaretlenir. Çağıran taraf onu asla otomatik yayımlamaz;
 * kullanıcının açık onayı olmadan koordinat hiçbir yere yazılmaz. Ayrıştırıp
 * göstermemek bilinçli: kullanıcı dosyasında GPS olduğunu bilmeli — bilmediği
 * bir veriyi paylaşmama kararı veremez.
 *
 * KAPSAM: JPEG (APP1/TIFF). TIFF ve FITS dosyaları farklı yapıdadır; onlar
 * sunucu tarafındaki işleme hattına kalır (§10.2).
 */

/* ══════════════════════ Düşük seviye TIFF okuma ══════════════════════ */

const TAG = {
  MAKE: 0x010f,
  MODEL: 0x0110,
  ORIENTATION: 0x0112,
  EXIF_IFD: 0x8769,
  GPS_IFD: 0x8825,
  EXPOSURE_TIME: 0x829a,
  F_NUMBER: 0x829d,
  ISO: 0x8827,
  DATE_TIME_ORIGINAL: 0x9003,
  FOCAL_LENGTH: 0x920a,
  LENS_MODEL: 0xa434,
} as const;

const GPS_TAG = {
  LAT_REF: 0x0001,
  LAT: 0x0002,
  LON_REF: 0x0003,
  LON: 0x0004,
} as const;

/** TIFF veri tipi başına bayt boyu. */
const TYPE_SIZE: Record<number, number> = {
  1: 1, // BYTE
  2: 1, // ASCII
  3: 2, // SHORT
  4: 4, // LONG
  5: 8, // RATIONAL
  7: 1, // UNDEFINED
  9: 4, // SLONG
  10: 8, // SRATIONAL
};

type TagValue = number | string | number[];

/**
 * Bir IFD'yi okur ve tag → değer eşlemesi döndürür.
 *
 * `tiffStart` TIFF başlığının dosya içindeki konumudur; IFD offset'leri
 * dosyanın başına değil **TIFF başlığına** görelidir. Bu, EXIF
 * ayrıştırıcılarında en sık yapılan hatadır.
 */
function readIfd(
  view: DataView,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean
): Map<number, TagValue> {
  const out = new Map<number, TagValue>();
  const base = tiffStart + ifdOffset;

  if (base + 2 > view.byteLength) return out;
  const count = view.getUint16(base, littleEndian);

  for (let i = 0; i < count; i++) {
    const entry = base + 2 + i * 12;
    if (entry + 12 > view.byteLength) break;

    const tag = view.getUint16(entry, littleEndian);
    const type = view.getUint16(entry + 2, littleEndian);
    const valueCount = view.getUint32(entry + 4, littleEndian);
    const size = TYPE_SIZE[type];
    if (!size) continue;

    const byteLength = size * valueCount;
    // 4 bayta sığan değerler offset alanının içinde durur.
    const valueOffset =
      byteLength <= 4
        ? entry + 8
        : tiffStart + view.getUint32(entry + 8, littleEndian);

    if (valueOffset + byteLength > view.byteLength) continue;

    out.set(tag, readValue(view, valueOffset, type, valueCount, littleEndian));
  }

  return out;
}

function readValue(
  view: DataView,
  offset: number,
  type: number,
  count: number,
  littleEndian: boolean
): TagValue {
  switch (type) {
    case 2: {
      // ASCII — sondaki NUL atılır.
      let text = '';
      for (let i = 0; i < count; i++) {
        const code = view.getUint8(offset + i);
        if (code === 0) break;
        text += String.fromCharCode(code);
      }
      return text.trim();
    }
    case 3:
      return count === 1
        ? view.getUint16(offset, littleEndian)
        : Array.from({ length: count }, (_, i) =>
            view.getUint16(offset + i * 2, littleEndian)
          );
    case 4:
      return count === 1
        ? view.getUint32(offset, littleEndian)
        : Array.from({ length: count }, (_, i) =>
            view.getUint32(offset + i * 4, littleEndian)
          );
    case 5:
    case 10: {
      const readRational = (at: number) => {
        const numerator =
          type === 5
            ? view.getUint32(at, littleEndian)
            : view.getInt32(at, littleEndian);
        const denominator =
          type === 5
            ? view.getUint32(at + 4, littleEndian)
            : view.getInt32(at + 4, littleEndian);
        return denominator === 0 ? 0 : numerator / denominator;
      };
      return count === 1
        ? readRational(offset)
        : Array.from({ length: count }, (_, i) => readRational(offset + i * 8));
    }
    default: {
      return Array.from({ length: count }, (_, i) => view.getUint8(offset + i));
    }
  }
}

/* ══════════════════════ Dışa açık tipler ══════════════════════ */

export interface ExifGps {
  latitude: number;
  longitude: number;
}

export interface ExifData {
  make?: string;
  model?: string;
  lens?: string;
  /** Poz süresi, saniye. */
  exposureSeconds?: number;
  /** Diyafram (f sayısı). */
  fNumber?: number;
  iso?: number;
  /** Odak uzaklığı, mm. */
  focalLength?: number;
  /** Çekim zamanı (ISO 8601'e çevrilmiş). */
  capturedAt?: string;
  orientation?: number;
  /**
   * Konum — **asla otomatik yayımlanmaz** (§15.3). Varlığı `hasGps` ile
   * ayrıca bildirilir ki arayüz kullanıcıyı uyarabilsin.
   */
  gps?: ExifGps;
  hasGps: boolean;
}

/* ══════════════════════ Ayrıştırma ══════════════════════ */

/** GPS koordinatını derece/dakika/saniye dizisinden ondalık dereceye çevirir. */
export function dmsToDecimal(dms: number[], ref: string): number | null {
  if (!Array.isArray(dms) || dms.length < 3) return null;
  const [degrees, minutes, seconds] = dms;
  const value = degrees + minutes / 60 + seconds / 3600;
  if (!Number.isFinite(value)) return null;

  const normalized = ref.trim().toUpperCase();
  return normalized === 'S' || normalized === 'W' ? -value : value;
}

/**
 * EXIF tarih biçimini (`2026:01:18 22:14:03`) ISO 8601'e çevirir.
 *
 * EXIF saat dilimi taşımaz; bu yüzden çıktı da taşımaz. Yerel kabul edip
 * UTC'ye çevirmek, çekim saatini sistematik olarak kaydırırdı.
 */
export function exifDateToIso(value: string): string | undefined {
  const match = value.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
  );
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second] = match;

  const monthNum = Number(month);
  const dayNum = Number(day);
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return undefined;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

/**
 * JPEG içindeki EXIF bloğunu ayrıştırır.
 *
 * EXIF yoksa ya da dosya bozuksa `null` döner — asla hata fırlatmaz.
 * Kullanıcının seçtiği dosya her şey olabilir; yükleme akışını bir
 * ayrıştırma hatasının düşürmesi kabul edilemez.
 */
export function parseExif(buffer: ArrayBuffer): ExifData | null {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4) return null;

    // JPEG mi? (SOI: FFD8)
    if (view.getUint16(0, false) !== 0xffd8) return null;

    // APP1 segmentini bul.
    let offset = 2;
    let tiffStart = -1;

    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset, false);
      if ((marker & 0xff00) !== 0xff00) break;

      const segmentLength = view.getUint16(offset + 2, false);

      if (marker === 0xffe1) {
        // "Exif\0\0" imzası
        const sig = offset + 4;
        if (
          sig + 6 <= view.byteLength &&
          view.getUint32(sig, false) === 0x45786966 &&
          view.getUint16(sig + 4, false) === 0x0000
        ) {
          tiffStart = sig + 6;
          break;
        }
      }

      // SOS'a (FFDA) gelindiyse görüntü verisi başlar, EXIF yok.
      if (marker === 0xffda) break;
      offset += 2 + segmentLength;
    }

    if (tiffStart < 0 || tiffStart + 8 > view.byteLength) return null;

    // TIFF başlığı: byte sırası + 42 sihirli sayısı + IFD0 offset'i
    const byteOrder = view.getUint16(tiffStart, false);
    const littleEndian = byteOrder === 0x4949;
    if (!littleEndian && byteOrder !== 0x4d4d) return null;
    if (view.getUint16(tiffStart + 2, littleEndian) !== 42) return null;

    const ifd0Offset = view.getUint32(tiffStart + 4, littleEndian);
    const ifd0 = readIfd(view, tiffStart, ifd0Offset, littleEndian);

    const exifPointer = ifd0.get(TAG.EXIF_IFD);
    const exifIfd =
      typeof exifPointer === 'number'
        ? readIfd(view, tiffStart, exifPointer, littleEndian)
        : new Map<number, TagValue>();

    const gpsPointer = ifd0.get(TAG.GPS_IFD);
    const gpsIfd =
      typeof gpsPointer === 'number'
        ? readIfd(view, tiffStart, gpsPointer, littleEndian)
        : new Map<number, TagValue>();

    const text = (value: TagValue | undefined): string | undefined =>
      typeof value === 'string' && value.length > 0 ? value : undefined;
    const num = (value: TagValue | undefined): number | undefined =>
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;

    const gps = readGps(gpsIfd);
    const dateRaw = text(exifIfd.get(TAG.DATE_TIME_ORIGINAL));

    return {
      make: text(ifd0.get(TAG.MAKE)),
      model: text(ifd0.get(TAG.MODEL)),
      lens: text(exifIfd.get(TAG.LENS_MODEL)),
      exposureSeconds: num(exifIfd.get(TAG.EXPOSURE_TIME)),
      fNumber: num(exifIfd.get(TAG.F_NUMBER)),
      iso: num(exifIfd.get(TAG.ISO)),
      focalLength: num(exifIfd.get(TAG.FOCAL_LENGTH)),
      capturedAt: dateRaw ? exifDateToIso(dateRaw) : undefined,
      orientation: num(ifd0.get(TAG.ORIENTATION)),
      gps: gps ?? undefined,
      hasGps: gps !== null,
    };
  } catch {
    // Bozuk dosya, beklenmedik offset, kesilmiş buffer — hepsi aynı sonuç.
    return null;
  }
}

function readGps(gpsIfd: Map<number, TagValue>): ExifGps | null {
  const lat = gpsIfd.get(GPS_TAG.LAT);
  const latRef = gpsIfd.get(GPS_TAG.LAT_REF);
  const lon = gpsIfd.get(GPS_TAG.LON);
  const lonRef = gpsIfd.get(GPS_TAG.LON_REF);

  if (!Array.isArray(lat) || !Array.isArray(lon)) return null;
  if (typeof latRef !== 'string' || typeof lonRef !== 'string') return null;

  const latitude = dmsToDecimal(lat, latRef);
  const longitude = dmsToDecimal(lon, lonRef);
  if (latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}

/* ══════════════════════ Sunum ══════════════════════ */

/** Poz süresini okunur yazar: 1/250 sn, 30 sn, 5 dk. */
export function formatExposure(seconds: number | undefined): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return '—';
  }
  if (seconds < 1) return `1/${Math.round(1 / seconds)} sn`;
  if (seconds < 60) return `${Number(seconds.toFixed(1))} sn`;
  const minutes = seconds / 60;
  return `${Number(minutes.toFixed(1))} dk`;
}

/** Kamera adı: üretici + model, tekrar etmeden ("Canon Canon EOS R" değil). */
export function cameraLabel(data: ExifData): string | undefined {
  const make = data.make?.trim();
  const model = data.model?.trim();
  if (!make && !model) return undefined;
  if (!make) return model;
  if (!model) return make;

  return model.toLocaleLowerCase('tr-TR').startsWith(make.toLocaleLowerCase('tr-TR'))
    ? model
    : `${make} ${model}`;
}
