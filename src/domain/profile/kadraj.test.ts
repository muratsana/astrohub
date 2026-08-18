import { describe, expect, it } from 'vitest';
import {
  kadrajiTemizle,
  kaynakDikdortgen,
  sahneOturmasi,
  suruklediktenSonra,
  yakinlastiktanSonra,
} from './kadraj';

/**
 * Bu hesap iki farklı en-boy oranını birden taşıyor: kare avatar ve
 * geniş kapak. Testler tam olarak o ayrımı ölçüyor — kare varsayımına
 * geri dönen bir değişiklik kapağı sessizce bozar ve ekranda "biraz
 * yamuk" görünür, hata vermez.
 */
describe('kaynak dikdörtgeni', () => {
  it('kare oranda kısa kenara oturuyor', () => {
    expect(
      kaynakDikdortgen({ width: 4000, height: 2000 }, { zoom: 1, panX: 0, panY: 0 }, 1)
    ).toEqual({ x: 1000, y: 0, width: 2000, height: 2000 });
  });

  it('geniş oranda tam genişliği alıyor', () => {
    /* 4000×2000'de 3:1 isteyen kadraj genişlikten sınırlanır: 4000 geniş,
       1333 yüksek ve dikeyde ortalanır. */
    const d = kaynakDikdortgen(
      { width: 4000, height: 2000 },
      { zoom: 1, panX: 0, panY: 0 },
      3
    );
    expect(d.width).toBe(4000);
    expect(d.height).toBeCloseTo(4000 / 3, 5);
    expect(d.x).toBe(0);
    expect(d.y).toBeCloseTo((2000 - 4000 / 3) / 2, 5);
  });

  /* Dar bir kaynakta 3:1 kadraj YÜKSEKLİKTEN değil genişlikten sınırlanır
     ve bant fotoğrafın tamamını kaplar; taşma olmamalı. */
  it('dar kaynakta taşmıyor', () => {
    const d = kaynakDikdortgen(
      { width: 900, height: 1600 },
      { zoom: 1, panX: 0, panY: 1 },
      3
    );
    expect(d.width).toBe(900);
    expect(d.x + d.width).toBeLessThanOrEqual(900);
    expect(d.y + d.height).toBeLessThanOrEqual(1600);
  });

  it('zoom arttıkça alan küçülüyor ve oran korunuyor', () => {
    const d = kaynakDikdortgen(
      { width: 3000, height: 3000 },
      { zoom: 3, panX: 0, panY: 0 },
      1
    );
    expect(d.width).toBe(1000);
    expect(d.height).toBe(1000);
    expect(d.x).toBe(1000);
  });
});

describe('sahne oturması', () => {
  it('yatay fotoğrafı sığdırıp dikeyde ortalıyor', () => {
    expect(sahneOturmasi({ width: 4000, height: 2000 }, 320, 320)).toEqual({
      scale: 0.08,
      offsetX: 0,
      offsetY: 80,
    });
  });

  it('sahne kare değilse de doğru ölçek buluyor', () => {
    const o = sahneOturmasi({ width: 1000, height: 1000 }, 600, 200);
    expect(o.scale).toBe(0.2);
    expect(o.offsetX).toBe(200);
    expect(o.offsetY).toBe(0);
  });
});

describe('sürükleme', () => {
  it('sürüklendiği yönde kalıyor', () => {
    const s = suruklediktenSonra(
      { width: 4000, height: 2000 },
      { zoom: 1, panX: 0, panY: 0 },
      500,
      0,
      1
    );
    expect(s.panX).toBeCloseTo(0.5, 5);
  });

  /*
   * Gidilecek yer yokken bölme yapılmamalı: korumasız bir hesap
   * `Infinity` üretir, temizleyici onu sıfıra çeker ve kadraj sessizce
   * başa döner. Kare fotoğrafta zoom 1 tam bu durum.
   */
  it('gidilecek yer yokken kadrajı bozmuyor', () => {
    expect(
      suruklediktenSonra({ width: 1000, height: 1000 }, { zoom: 1, panX: 0, panY: 0 }, 120, -80, 1)
    ).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });

  /* 3:1 kapakta yatayda yer yok ama DİKEYDE var; sürükleme dikeyde
     çalışmalı. Kare varsayımına dönen bir değişiklik burada düşer. */
  it('geniş kadrajda dikey kaydırma çalışıyor', () => {
    const s = suruklediktenSonra(
      { width: 3000, height: 1500 },
      { zoom: 1, panX: 0, panY: 0 },
      0,
      -200,
      3
    );
    expect(s.panY).toBeLessThan(0);
    expect(s.panX).toBe(0);
  });
});

describe('yakınlaştırma ve temizleme', () => {
  it('oranı uyguluyor ve sınırda duruyor', () => {
    expect(yakinlastiktanSonra({ zoom: 2, panX: 0, panY: 0 }, 1.5).zoom).toBeCloseTo(3);
    expect(yakinlastiktanSonra({ zoom: 3, panX: 0, panY: 0 }, 10).zoom).toBe(4);
  });

  /* Kıstırmanın ilk karesinde mesafe oranı 0 çıkabiliyor; bunu uygulamak
     kadrajı sıfırlardı. */
  it('geçersiz oranı yok sayıyor', () => {
    expect(yakinlastiktanSonra({ zoom: 2.5, panX: 0, panY: 0 }, 0).zoom).toBe(2.5);
    expect(yakinlastiktanSonra({ zoom: 2.5, panX: 0, panY: 0 }, Number.NaN).zoom).toBe(2.5);
  });

  it('geçersiz kontrolleri aralığa çekiyor', () => {
    expect(kadrajiTemizle({ zoom: 99, panX: -4, panY: Number.NaN })).toEqual({
      zoom: 4,
      panX: -1,
      panY: 0,
    });
  });
});
