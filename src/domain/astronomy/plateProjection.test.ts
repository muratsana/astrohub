import { describe, expect, it } from 'vitest';
import {
  gokyuzundenKadraja,
  kadrajIcinde,
  kadrajYaricapiDerece,
  type CozumGeometrisi,
} from './plateProjection';

/**
 * İZDÜŞÜM TESTLERİ — gerçek bir çözüm olmadan doğrulanabilen kısım.
 *
 * Buradaki iddiaların hiçbiri "şu sayı çıkmalı" değil; hepsi YÖN
 * iddiası: kuzeydeki cisim yukarıda, doğudaki solda, merkezdeki ortada.
 * Bunlar konvansiyondan mantıksal olarak çıkıyor ve tam da yanlış
 * gitmesi hâlinde etiketleri yanlış yere koyacak olan şeyler.
 *
 * Ölçek doğruluğu ayrıca ölçülüyor: kadrajın çeyreği kadar kuzeydeki
 * bir cisim, kadrajın çeyreği kadar yukarıda olmalı.
 */

/** 2° × 1° kadraj, kuzey yukarıda, ayna yok. Merkez: RA 0°, Dec 0°. */
const DUZ: CozumGeometrisi = {
  raDeg: 0,
  decDeg: 0,
  rotationDeg: 0,
  fieldWidthDeg: 2,
  fieldHeightDeg: 1,
  parity: -1,
};

describe('gokyuzundenKadraja', () => {
  it('merkezdeki cismi tam ortaya koyar', () => {
    const p = gokyuzundenKadraja(DUZ, 0, 0)!;
    expect(p.x).toBeCloseTo(0.5, 9);
    expect(p.y).toBeCloseTo(0.5, 9);
  });

  it('kuzeydeki cismi YUKARI koyar', () => {
    const p = gokyuzundenKadraja(DUZ, 0, 0.25)!;
    expect(p.y).toBeLessThan(0.5);
    expect(p.x).toBeCloseTo(0.5, 6);
  });

  it('güneydeki cismi AŞAĞI koyar', () => {
    expect(gokyuzundenKadraja(DUZ, 0, -0.25)!.y).toBeGreaterThan(0.5);
  });

  it('doğudaki cismi SOLA koyar — gökyüzüne içeriden bakıyoruz', () => {
    // Sağ açıklık doğuya artar; aynasız bir kadrajda doğu soldadır.
    expect(gokyuzundenKadraja(DUZ, 0.25, 0)!.x).toBeLessThan(0.5);
  });

  it('batıdaki cismi SAĞA koyar', () => {
    expect(gokyuzundenKadraja(DUZ, 359.75, 0)!.x).toBeGreaterThan(0.5);
  });

  it('sağ açıklık sarmasında yön bozulmaz', () => {
    // 359.75° ile -0.25° aynı nokta; farklı yazılmaları sonucu
    // değiştirmemeli.
    const a = gokyuzundenKadraja(DUZ, 359.75, 0)!;
    const b = gokyuzundenKadraja(DUZ, -0.25, 0)!;
    expect(a.x).toBeCloseTo(b.x, 12);
  });

  it('kadraj oranını ölçekle doğru veriyor', () => {
    // Kadraj 1° yüksek; 0.25° kuzeydeki cisim merkezden çeyrek kadraj
    // yukarıda, yani y ≈ 0.25.
    const p = gokyuzundenKadraja(DUZ, 0, 0.25)!;
    expect(p.y).toBeCloseTo(0.25, 3);

    // Kadraj 2° geniş; 0.5° doğudaki cisim çeyrek kadraj solda.
    const q = gokyuzundenKadraja(DUZ, 0.5, 0)!;
    expect(q.x).toBeCloseTo(0.25, 3);
  });

  it('90 derece dönüklükte kuzey SOLA gider', () => {
    /* Dönüklük, görüntünün yukarı yönünün kuzeyden doğuya açısı.
       Yukarı yön 90° doğuya bakıyorsa, kuzey artık yukarı değil sol
       taraftadır. */
    const donuk: CozumGeometrisi = { ...DUZ, rotationDeg: 90, fieldHeightDeg: 2 };
    const p = gokyuzundenKadraja(donuk, 0, 0.25)!;
    expect(p.x).toBeLessThan(0.5);
    expect(p.y).toBeCloseTo(0.5, 6);
  });

  it('aynalı kadrajda doğu SAĞA geçer', () => {
    const ayna: CozumGeometrisi = { ...DUZ, parity: 1 };
    expect(gokyuzundenKadraja(ayna, 0.25, 0)!.x).toBeGreaterThan(0.5);
    // Kuzey-güney ekseni aynadan etkilenmiyor.
    expect(gokyuzundenKadraja(ayna, 0, 0.25)!.y).toBeLessThan(0.5);
  });

  it('parite bilinmiyorsa aynasız varsayar', () => {
    const bilinmiyor: CozumGeometrisi = { ...DUZ, parity: null };
    expect(gokyuzundenKadraja(bilinmiyor, 0.25, 0)!.x).toBeLessThan(0.5);
  });

  it('gökyüzünün öbür yarısındaki cisim için nokta üretmez', () => {
    // Gnomonik izdüşüm 90 dereceden uzağı sonsuza gönderiyor; oradan
    // bir kadraj oranı üretmek yer uydurmak olurdu.
    expect(gokyuzundenKadraja(DUZ, 180, 0)).toBeNull();
    expect(gokyuzundenKadraja(DUZ, 0, 90)).toBeNull();
  });

  it('kadraj boyutu yoksa nokta üretmez', () => {
    expect(
      gokyuzundenKadraja({ ...DUZ, fieldWidthDeg: 0 }, 0, 0.1)
    ).toBeNull();
  });

  it('kutba yakın merkezde sağ açıklık farkı doğru daralıyor', () => {
    /* Dec +80'de bir derecelik RA farkı gökyüzünde yalnızca cos(80°)
       ≈ 0.17 derecelik açıya denk. Düzlemsel bir yaklaşım burada altı
       kat şişirirdi ve etiketler kadrajın dışına taşardı. */
    const kutup: CozumGeometrisi = {
      ...DUZ,
      decDeg: 80,
      fieldWidthDeg: 1,
      fieldHeightDeg: 1,
    };
    const p = gokyuzundenKadraja(kutup, 1, 80)!;
    const kayma = Math.abs(p.x - 0.5);
    expect(kayma).toBeGreaterThan(0.15);
    expect(kayma).toBeLessThan(0.2);
  });
});

/**
 * KADRAJIN DIŞINA ETİKET BASILAMAZ.
 *
 * Sabit %6'lık bir pay vardı ve canlıda fotoğrafın DIŞINDA, siyah
 * alanda "M 52", "NGC 7635", "IC 1470" etiketleri belirdi. Alan çözümü
 * bir ÖLÇÜM; kadrajın dışına taşan bir etiket o ölçümün güvenilirliğini
 * bitirir.
 */
describe('kadrajIcinde', () => {
  it('içerideki noktayı alır', () => {
    expect(kadrajIcinde({ x: 0.5, y: 0.5 })).toBe(true);
    expect(kadrajIcinde({ x: 0, y: 1 })).toBe(true);
  });

  /* Varsayılan pay SIFIR: merkezi dışarıdaysa cisim karede değildir. */
  it('kenarın dışını varsayılan olarak almaz', () => {
    expect(kadrajIcinde({ x: 1.03, y: 0.5 })).toBe(false);
    expect(kadrajIcinde({ x: -0.03, y: 0.5 })).toBe(false);
  });

  /* Payı yalnızca cismin kendi açısal boyutunu bilen çağıran veriyor:
     kenardaki büyük bir bulutsunun merkezi dışarıda kalabilir ama
     kendisi karede görünür. */
  it('açıkça verilen payı uygular', () => {
    expect(kadrajIcinde({ x: 1.03, y: 0.5 }, 0.05)).toBe(true);
    expect(kadrajIcinde({ x: 1.2, y: 0.5 }, 0.05)).toBe(false);
  });

  it('uzaktakini hiçbir payla almaz', () => {
    expect(kadrajIcinde({ x: 1.4, y: 0.5 }, 0.06)).toBe(false);
    expect(kadrajIcinde({ x: 0.5, y: -0.5 }, 0.06)).toBe(false);
  });
});

describe('kadrajYaricapiDerece', () => {
  it('köşegenin yarısını verir', () => {
    // 3×4 kadrajın köşegeni 5; koni araması yarıçapı 2.5.
    expect(kadrajYaricapiDerece({ ...DUZ, fieldWidthDeg: 3, fieldHeightDeg: 4 }))
      .toBeCloseTo(2.5, 9);
  });

  it('boyut yoksa sıfır', () => {
    expect(kadrajYaricapiDerece({ ...DUZ, fieldWidthDeg: 0 })).toBe(0);
  });
});
