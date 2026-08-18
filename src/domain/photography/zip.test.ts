import { describe, expect, it } from 'vitest';
import { buildZip, crc32 } from './zip';

const enc = (s: string) => new TextEncoder().encode(s);

describe('crc32', () => {
  it('bilinen girdiler için doğru CRC üretir', () => {
    // "hello" için CRC-32 = 0x3610a686.
    expect(crc32(enc('hello')).toString(16)).toBe('3610a686');
    expect(crc32(enc('')).toString(16)).toBe('0');
  });
});

describe('buildZip (D12)', () => {
  it('yerel başlık, merkezi dizin ve EOCD imzalarını yazar', () => {
    const zip = buildZip([
      { name: 'caption.txt', data: enc('merhaba') },
      { name: 'feed.jpg', data: enc('jpegbytes') },
    ]);
    const dv = new DataView(zip.buffer);
    // İlk 4 bayt yerel başlık imzası PK\x03\x04.
    expect(dv.getUint32(0, true)).toBe(0x04034b50);
    // Son 22 bayt EOCD; imza PK\x05\x06.
    expect(dv.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    // EOCD içindeki dosya sayısı 2.
    expect(dv.getUint16(zip.length - 22 + 10, true)).toBe(2);
  });

  it('dosya adlarını arşive gömer', () => {
    const zip = buildZip([{ name: 'story.jpg', data: enc('x') }]);
    const metin = new TextDecoder('latin1').decode(zip);
    expect(metin).toContain('story.jpg');
  });

  it('boş arşiv yalnızca EOCD taşır', () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22);
    expect(new DataView(zip.buffer).getUint32(0, true)).toBe(0x06054b50);
  });
});
