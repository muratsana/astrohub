/**
 * MİNİMAL ZIP YAZICI — sıkıştırmasız (store) (D12).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KÜTÜPHANE DEĞİL
 *
 * Paylaşım paketi üç dosya taşıyor: feed.jpg, story.jpg, caption.txt.
 * İlk ikisi zaten JPEG (sıkıştırılmış); yeniden sıkıştırmak yer
 * kazandırmaz. Sıkıştırmasız "store" ZIP bu iş için yeterli ve bir
 * bağımlılık eklemeden, ilk rota bütçesini büyütmeden yazılabiliyor.
 *
 * Biçim: her dosya için yerel başlık + veri; sonda merkezi dizin ve
 * EOCD. CRC-32 her dosyanın verisinden hesaplanıyor (ZIP zorunluluğu).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Verilen dosyalardan sıkıştırmasız bir ZIP arşivi üretir.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const encoder = new TextEncoder();
  const parcalar: Uint8Array[] = [];
  const merkezi: Uint8Array[] = [];
  let ofset = 0;

  for (const entry of entries) {
    const ad = encoder.encode(entry.name);
    const veri = entry.data;
    const crc = crc32(veri);

    // Yerel dosya başlığı (30 bayt + ad).
    const yerel = new Uint8Array(30 + ad.length);
    const yv = new DataView(yerel.buffer);
    yv.setUint32(0, 0x04034b50, true); // PK\x03\x04
    yv.setUint16(4, 20, true); // sürüm
    yv.setUint16(6, 0, true); // bayrak
    yv.setUint16(8, 0, true); // yöntem 0 = store
    yv.setUint16(10, 0, true); // saat
    yv.setUint16(12, 0, true); // tarih
    yv.setUint32(14, crc, true);
    yv.setUint32(18, veri.length, true); // sıkışık boyut
    yv.setUint32(22, veri.length, true); // gerçek boyut
    yv.setUint16(26, ad.length, true);
    yv.setUint16(28, 0, true); // ekstra alan yok
    yerel.set(ad, 30);

    parcalar.push(yerel, veri);

    // Merkezi dizin kaydı (46 bayt + ad).
    const md = new Uint8Array(46 + ad.length);
    const mv = new DataView(md.buffer);
    mv.setUint32(0, 0x02014b50, true); // PK\x01\x02
    mv.setUint16(4, 20, true); // üreten sürüm
    mv.setUint16(6, 20, true); // gereken sürüm
    mv.setUint16(8, 0, true);
    mv.setUint16(10, 0, true); // store
    mv.setUint16(12, 0, true);
    mv.setUint16(14, 0, true);
    mv.setUint32(16, crc, true);
    mv.setUint32(20, veri.length, true);
    mv.setUint32(24, veri.length, true);
    mv.setUint16(28, ad.length, true);
    mv.setUint16(30, 0, true); // ekstra
    mv.setUint16(32, 0, true); // yorum
    mv.setUint16(34, 0, true); // disk
    mv.setUint16(36, 0, true); // iç öznitelik
    mv.setUint32(38, 0, true); // dış öznitelik
    mv.setUint32(42, ofset, true); // yerel başlık ofseti
    md.set(ad, 46);
    merkezi.push(md);

    ofset += yerel.length + veri.length;
  }

  const merkeziBoyut = merkezi.reduce((s, p) => s + p.length, 0);

  // EOCD (22 bayt).
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // PK\x05\x06
  ev.setUint16(4, 0, true); // disk
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, merkeziBoyut, true);
  ev.setUint32(16, ofset, true); // merkezi dizin ofseti
  ev.setUint16(20, 0, true); // yorum uzunluğu

  const hepsi = [...parcalar, ...merkezi, eocd];
  const toplam = hepsi.reduce((s, p) => s + p.length, 0);
  const sonuc = new Uint8Array(toplam);
  let p = 0;
  for (const parca of hepsi) {
    sonuc.set(parca, p);
    p += parca.length;
  }
  return sonuc;
}
