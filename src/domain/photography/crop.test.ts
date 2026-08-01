import { describe, expect, it } from 'vitest';
import {
  applyAspect,
  clampRect,
  croppedFieldDeg,
  croppedPixels,
  isFullFrame,
  FULL_FRAME,
} from './crop';

/**
 * KIRPMA GEOMETRİSİ.
 *
 * İki kural sessizce kırılabilir ve ikisi de görsel olarak fark edilmez:
 * oran dönüşümü (piksel dünyası ↔ oran dünyası) ve kadraj sınırı.
 */
describe('clampRect', () => {
  it('taşan dikdörtgeni kadrajın içine çekiyor', () => {
    const r = clampRect({ x: 0.8, y: 0.9, width: 0.5, height: 0.4 });
    expect(r.x + r.width).toBeLessThanOrEqual(1.0001);
    expect(r.y + r.height).toBeLessThanOrEqual(1.0001);
  });

  /*
   * Taşan bir dikdörtgen `drawImage`e verildiğinde siyah şerit üretiyor —
   * kırpılmış karenin kenarında olmayan bir gökyüzü çıkıyor.
   */
  it('negatif başlangıcı sıfıra çekiyor', () => {
    const r = clampRect({ x: -0.3, y: -0.2, width: 0.5, height: 0.5 });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });

  it('asgari bir alan bırakıyor — sıfır boyutlu kırpma olamaz', () => {
    const r = clampRect({ x: 0.5, y: 0.5, width: 0, height: 0 });
    expect(r.width).toBeGreaterThan(0);
    expect(r.height).toBeGreaterThan(0);
  });
});

describe('applyAspect', () => {
  /*
   * ASIL KURAL. Oran PİKSEL dünyasında tanımlı, dikdörtgen ORAN
   * dünyasında. 3000×2000 bir görüntüde 0.5 × 0.5 kare değil, 3:2'dir.
   * Dönüşüm olmasaydı "1:1" düğmesi kare olmayan bir kutu üretirdi ve
   * bu ekranda fark edilmezdi — ancak yüklenen dosya kare çıkmayınca
   * anlaşılırdı.
   */
  it('1:1 seçimi gerçekten kare piksel veriyor', () => {
    const kaynak = { width: 3000, height: 2000 };
    const r = applyAspect(
      { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
      1,
      kaynak.width / kaynak.height
    );
    const px = croppedPixels(r, kaynak);
    expect(Math.abs(px.width - px.height)).toBeLessThanOrEqual(1);
  });

  it('16:9 seçimi 16/9 piksel oranı veriyor', () => {
    const kaynak = { width: 4000, height: 3000 };
    const r = applyAspect(FULL_FRAME, 16 / 9, kaynak.width / kaynak.height);
    const px = croppedPixels(r, kaynak);
    expect(px.width / px.height).toBeCloseTo(16 / 9, 2);
  });

  /*
   * Kullanıcı bir yeri seçtiyse oran değişimi onu kaydırmamalı — yalnızca
   * kenarları düzeltmeli.
   */
  it('oran değişiminde merkez korunuyor', () => {
    const once = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
    const sonra = applyAspect(once, 16 / 9, 1.5);
    expect(sonra.x + sonra.width / 2).toBeCloseTo(0.4, 2);
    expect(sonra.y + sonra.height / 2).toBeCloseTo(0.4, 2);
  });

  it('serbest oranda dikdörtgene dokunmuyor', () => {
    const r = { x: 0.1, y: 0.2, width: 0.5, height: 0.3 };
    expect(applyAspect(r, null, 1.5)).toEqual(clampRect(r));
  });

  it('oran uygulanmış dikdörtgen kadrajı taşmıyor', () => {
    const r = applyAspect(
      { x: 0.9, y: 0.9, width: 0.9, height: 0.9 },
      16 / 9,
      1
    );
    expect(r.x + r.width).toBeLessThanOrEqual(1.0001);
    expect(r.y + r.height).toBeLessThanOrEqual(1.0001);
  });
});

describe('croppedFieldDeg', () => {
  /*
   * Astrofotoğrafta kırpma bir ÖLÇÜ değişikliği: kadraj daraldıkça alan
   * küçülüyor ve künyedeki derece ifadesi yanlış hale geliyor.
   */
  it('piksel ölçeğinden alan derecesini hesaplıyor', () => {
    const alan = croppedFieldDeg(FULL_FRAME, { width: 3600, height: 1800 }, 1);
    expect(alan!.widthDeg).toBeCloseTo(1, 5);
    expect(alan!.heightDeg).toBeCloseTo(0.5, 5);
  });

  it('yarıya kırpınca alan da yarılanıyor', () => {
    const kaynak = { width: 3600, height: 3600 };
    const tam = croppedFieldDeg(FULL_FRAME, kaynak, 1)!;
    const yari = croppedFieldDeg(
      { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
      kaynak,
      1
    )!;
    expect(yari.widthDeg).toBeCloseTo(tam.widthDeg / 2, 5);
  });

  /*
   * Uydurulmuş bir alan ölçüsü, hiç olmayandan kötü: künyede "0.00°"
   * yazan bir kare, ölçülmüş ama sıfır çıkmış gibi okunur.
   */
  it('piksel ölçeği yoksa alan hesaplamıyor', () => {
    const kaynak = { width: 100, height: 100 };
    expect(croppedFieldDeg(FULL_FRAME, kaynak, null)).toBeNull();
    expect(croppedFieldDeg(FULL_FRAME, kaynak, 0)).toBeNull();
    expect(croppedFieldDeg(FULL_FRAME, kaynak, Number.NaN)).toBeNull();
  });
});

describe('isFullFrame', () => {
  /*
   * Tam kadrajda dosyaya hiç dokunulmuyor. Yeniden kodlama JPEG'de
   * kayıplı — hiçbir şey kırpmadan kalite kaybetmek, kullanıcının
   * emeğini sessizce bozmak olurdu.
   */
  it('dokunulmamış kadrajı tanıyor', () => {
    expect(isFullFrame(FULL_FRAME)).toBe(true);
  });

  it('en küçük kırpmayı bile yakalıyor', () => {
    expect(isFullFrame({ x: 0, y: 0, width: 0.99, height: 1 })).toBe(false);
    expect(isFullFrame({ x: 0.01, y: 0, width: 0.99, height: 1 })).toBe(false);
  });
});
