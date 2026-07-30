/**
 * DOSYA TÜRÜ — UZANTIYA VE BEYANA DEĞİL, İÇERİĞE BAKARAK.
 *
 * BU BİR GÜVENLİK SINIRI DEĞİL ve öyleymiş gibi anlatılmamalı. Tarayıcıda
 * yapılan her kontrol atlanabilir: depolama API'sine doğrudan istek atan
 * biri buradan hiç geçmez. Asıl sınır sunucuda — bucket'ın
 * `allowed_mime_types`/`file_size_limit` ayarı ve depolama nesne
 * politikaları.
 *
 * O hâlde neden var? Çünkü kullanıcıların büyük çoğunluğu saldırgan değil,
 * ve bu kontrol onların gerçekten yaşadığı sorunu erken yakalıyor:
 *
 *   · `.jpg` uzantılı ama aslında RAW/CR2 olan dosya (fotoğraf makinesi
 *     yazılımları bunu üretiyor) — yüklenir, sonra tarayıcı çözemez ve
 *     kullanıcı neden başarısız olduğunu anlamaz.
 *   · Uzantısı değiştirilmiş PDF ya da video.
 *   · Bozuk/yarım inmiş dosya — ilk baytları eksik.
 *
 * `file.type` tarayıcının UZANTIYA bakarak verdiği tahmin; bir dosyanın
 * gerçekte ne olduğunu söylemiyor. Sihirli baytlar söylüyor.
 */

/** Desteklenen giriş biçimleri — bucket'ın kabul ettikleriyle aynı küme. */
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'tiff' | 'gif' | 'bmp';

interface Signature {
  format: ImageFormat;
  /** Baytların dosya başından itibaren beklenen değerleri. */
  bytes: number[];
  offset?: number;
}

/*
 * İmzalar dosya başındaki sabit baytlar. WebP iki parçalı: `RIFF` +
 * 8 bayt sonra `WEBP` — yalnızca `RIFF`e bakmak WAV ve AVI'yi de görüntü
 * sanardı.
 */
const SIGNATURES: Signature[] = [
  { format: 'jpeg', bytes: [0xff, 0xd8, 0xff] },
  { format: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { format: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { format: 'bmp', bytes: [0x42, 0x4d] },
  { format: 'tiff', bytes: [0x49, 0x49, 0x2a, 0x00] }, // little-endian
  { format: 'tiff', bytes: [0x4d, 0x4d, 0x00, 0x2a] }, // big-endian
];

function matches(head: Uint8Array, signature: Signature): boolean {
  const offset = signature.offset ?? 0;
  if (head.length < offset + signature.bytes.length) return false;
  return signature.bytes.every((byte, index) => head[offset + index] === byte);
}

/**
 * İlk baytlardan biçimi çıkarır; tanınmazsa `null`.
 *
 * Saf fonksiyon — `File` değil `Uint8Array` alıyor ki tarayıcı olmadan
 * test edilebilsin.
 */
export function sniffImageFormat(head: Uint8Array): ImageFormat | null {
  // WebP: RIFF....WEBP
  if (
    head.length >= 12 &&
    head[0] === 0x52 &&
    head[1] === 0x49 &&
    head[2] === 0x46 &&
    head[3] === 0x46 &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return 'webp';
  }

  for (const signature of SIGNATURES) {
    if (matches(head, signature)) return signature.format;
  }
  return null;
}

/** Tarayıcının canvas ile açabildiği biçimler. */
const RENDERABLE: ImageFormat[] = ['jpeg', 'png', 'webp', 'gif', 'bmp'];

export type FileTypeVerdict =
  | { kind: 'ok'; format: ImageFormat }
  /** Görüntü ama tarayıcı çözemeyebilir — kullanıcı uyarılıyor, engellenmiyor. */
  | { kind: 'risky'; format: ImageFormat; reason: string }
  | { kind: 'reject'; reason: string };

/**
 * Biçim kararı.
 *
 * TIFF REDDEDİLMİYOR, UYARILIYOR. Astrofotoğrafta 16-bit TIFF yaygın ve
 * bucket da kabul ediyor; ama `createImageBitmap` TIFF'i çoğu tarayıcıda
 * açamıyor. Baştan reddetmek meşru bir dosyayı geri çevirmek, sessizce
 * kabul etmek ise yükleme yarısında anlaşılmaz bir hata vermek olurdu.
 */
export function checkImageFormat(
  head: Uint8Array,
  declaredType?: string
): FileTypeVerdict {
  const format = sniffImageFormat(head);

  if (!format) {
    return {
      kind: 'reject',
      reason: declaredType?.startsWith('image/')
        ? 'Dosya bir görüntü gibi adlandırılmış ama içeriği görüntü değil. Uzantısı değiştirilmiş ya da dosya bozuk olabilir.'
        : 'Bu bir görüntü dosyası değil. JPEG, PNG veya WebP yükleyin.',
    };
  }

  if (!RENDERABLE.includes(format)) {
    return {
      kind: 'risky',
      format,
      reason:
        'Dosya TIFF görünüyor. TIFF desteği tarayıcıya göre değişir; küçültme başarısız olursa JPEG olarak dışa aktarıp yeniden deneyin.',
    };
  }

  return { kind: 'ok', format };
}

/** Sihirli bayt kontrolü için yeterli uzunluk — en uzun imza 12 bayt. */
export const HEAD_BYTES = 16;

/**
 * Bir `File`/`Blob`'un ilk baytlarını okur.
 *
 * HER ZAMAN ÖNCE DİLİMLİYOR. 40 MB'lık bir dosyanın tamamını belleğe
 * almak 16 bayt için gereksiz; iki yol da yalnızca dilimi okuyor.
 *
 * `Blob.arrayBuffer()` görece yeni bir API ve her yerde yok — jsdom'da
 * yok, eski Safari'de de yoktu. `FileReader` ise her yerde var ve aynı
 * dilimi okuyor; yalnızca geri çağırma tabanlı olduğu için sarmalanıyor.
 */
export async function readHead(
  file: Blob,
  length = HEAD_BYTES
): Promise<Uint8Array> {
  const slice = file.slice(0, length);

  if (typeof slice.arrayBuffer === 'function') {
    return new Uint8Array(await slice.arrayBuffer());
  }

  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error('dosya okunamadı'));
    reader.readAsArrayBuffer(slice);
  });
  return new Uint8Array(buffer);
}
