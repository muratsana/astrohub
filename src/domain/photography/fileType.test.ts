import { describe, expect, it } from 'vitest';
import {
  sniffImageFormat,
  checkImageFormat,
  readHead,
  HEAD_BYTES,
} from './fileType';

/** Belirtilen baytlarla başlayan, gerisi sıfır bir başlık üretir. */
function head(...bytes: number[]): Uint8Array {
  const out = new Uint8Array(HEAD_BYTES);
  out.set(bytes);
  return out;
}

const JPEG = head(0xff, 0xd8, 0xff, 0xe0);
const PNG = head(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const TIFF_LE = head(0x49, 0x49, 0x2a, 0x00);
const TIFF_BE = head(0x4d, 0x4d, 0x00, 0x2a);
const WEBP = head(
  0x52,
  0x49,
  0x46,
  0x46,
  0x24,
  0x00,
  0x00,
  0x00,
  0x57,
  0x45,
  0x42,
  0x50
);
const WAV = head(
  0x52,
  0x49,
  0x46,
  0x46,
  0x24,
  0x00,
  0x00,
  0x00,
  0x57,
  0x41,
  0x56,
  0x45
);

describe('sniffImageFormat', () => {
  it('yaygın biçimleri tanır', () => {
    expect(sniffImageFormat(JPEG)).toBe('jpeg');
    expect(sniffImageFormat(PNG)).toBe('png');
    expect(sniffImageFormat(WEBP)).toBe('webp');
    expect(sniffImageFormat(head(0x47, 0x49, 0x46, 0x38))).toBe('gif');
    expect(sniffImageFormat(head(0x42, 0x4d))).toBe('bmp');
  });

  it('TIFF iki bayt sırasında da tanınır', () => {
    expect(sniffImageFormat(TIFF_LE)).toBe('tiff');
    expect(sniffImageFormat(TIFF_BE)).toBe('tiff');
  });

  /*
   * WebP'nin ilk dört baytı RIFF — WAV ve AVI de öyle. Yalnızca RIFF'e
   * bakmak bir ses dosyasını görüntü sanmak olurdu.
   */
  it('RIFF kabuğundaki ses dosyasını görüntü sanmaz', () => {
    expect(sniffImageFormat(WAV)).toBeNull();
  });

  it('tanımadığı içeriğe null döner', () => {
    expect(sniffImageFormat(head(0x25, 0x50, 0x44, 0x46))).toBeNull(); // PDF
    expect(sniffImageFormat(head(0x4d, 0x5a))).toBeNull(); // Windows çalıştırılabilir
    expect(sniffImageFormat(new Uint8Array(0))).toBeNull();
  });

  it('kısa girdide taşma yapmaz', () => {
    expect(sniffImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull();
    expect(
      sniffImageFormat(new Uint8Array([0x52, 0x49, 0x46, 0x46]))
    ).toBeNull();
  });
});

describe('checkImageFormat', () => {
  it('çözülebilir biçimi kabul eder', () => {
    expect(checkImageFormat(JPEG)).toEqual({ kind: 'ok', format: 'jpeg' });
    expect(checkImageFormat(PNG)).toEqual({ kind: 'ok', format: 'png' });
  });

  /*
   * TIFF reddedilmiyor: astrofotoğrafta yaygın ve bucket kabul ediyor.
   * Ama tarayıcı çoğu zaman açamıyor, bu yüzden kullanıcı önceden
   * uyarılıyor — yükleme yarısında anlaşılmaz bir hata almaktansa.
   */
  it('TIFF reddedilmez, uyarılır', () => {
    const verdict = checkImageFormat(TIFF_LE);
    expect(verdict.kind).toBe('risky');
    if (verdict.kind === 'risky') {
      expect(verdict.format).toBe('tiff');
      expect(verdict.reason).toContain('JPEG');
    }
  });

  /*
   * Asıl yakaladığı durum: uzantısı `.jpg` ama içeriği başka bir dosya.
   * Mesaj bunu ayırt ediyor — "görüntü değil" ile "görüntü diye
   * adlandırılmış ama değil" kullanıcı için farklı iki sorun.
   */
  it('görüntü diye adlandırılmış görüntü olmayanı ayırt eder', () => {
    const disguised = checkImageFormat(
      head(0x25, 0x50, 0x44, 0x46),
      'image/jpeg'
    );
    expect(disguised.kind).toBe('reject');
    if (disguised.kind === 'reject') {
      expect(disguised.reason).toContain('Uzantısı değiştirilmiş');
    }

    const plain = checkImageFormat(
      head(0x25, 0x50, 0x44, 0x46),
      'application/pdf'
    );
    expect(plain.kind).toBe('reject');
    if (plain.kind === 'reject') {
      expect(plain.reason).toContain('JPEG, PNG veya WebP');
    }
  });
});

describe('readHead', () => {
  it('yalnızca ilk baytları okur — dosyanın tamamını belleğe almaz', async () => {
    const blob = new Blob([new Uint8Array(5_000_000).fill(0xab)]);
    const bytes = await readHead(blob);
    expect(bytes.length).toBe(HEAD_BYTES);
    expect(bytes[0]).toBe(0xab);
  });

  it('dosya başlıktan kısaysa olduğu kadarını döner', async () => {
    const bytes = await readHead(new Blob([new Uint8Array([1, 2, 3])]));
    expect(bytes.length).toBe(3);
  });
});
