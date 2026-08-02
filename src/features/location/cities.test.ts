import { describe, expect, it } from 'vitest';
import {
  cities,
  findCity,
  findCityByCode,
  nearestCity,
  DEFAULT_CITY_ID,
} from './cities';

/**
 * İL KATALOĞU (§4.1).
 *
 * Bu dosya elle yazılmış bir veri tablosu ve tam da bu yüzden test
 * ediliyor: bir satırda düşen basamak ya da kopyalanmış bir plaka kodu
 * derleyiciye görünmez, kullanıcıya "Sivas'ta güneş 3 saat erken
 * batıyor" diye görünür.
 */

describe('kapsam', () => {
  /*
   * SEKSEN BİR — pazarlık payı olmayan sayı. Liste uzun süre 15 ille
   * sınırlıydı; şehir SEO sayfaları, tek dosya önizleme ve yedek il
   * seçici hep o 15'i gösteriyordu. Sayının kendisi ölçülüyor ki bir
   * satır silindiğinde sessizce eksilmesin.
   */
  it('81 il taşıyor', () => {
    expect(cities).toHaveLength(81);
  });

  it('plaka kodları 1–81 arası ve tekil', () => {
    const codes = cities.map((c) => c.code).sort((a, b) => a - b);
    expect(codes).toEqual(Array.from({ length: 81 }, (_, i) => i + 1));
  });

  it('kimlikler tekil', () => {
    expect(new Set(cities.map((c) => c.id)).size).toBe(81);
  });

  it('adlar tekil', () => {
    expect(new Set(cities.map((c) => c.name)).size).toBe(81);
  });

  it('varsayılan şehir listede', () => {
    expect(findCity(DEFAULT_CITY_ID)).toBeDefined();
  });
});

describe('koordinatlar', () => {
  /*
   * TÜRKİYE SINIR KUTUSU. Bir basamağı düşen koordinat (37.0 yerine 3.70)
   * hesabı çökertmez — sessizce Ekvator'da bir gece üretir ve kullanıcı
   * yanlış alacakaranlık saatiyle yola çıkar. Kutu geniş tutuldu; amaç
   * hassasiyet ölçmek değil, kaba yazım hatasını yakalamak.
   */
  it('her il Türkiye sınırları içinde', () => {
    for (const c of cities) {
      expect(c.latitude, c.name).toBeGreaterThan(35.5);
      expect(c.latitude, c.name).toBeLessThan(42.5);
      expect(c.longitude, c.name).toBeGreaterThan(25.5);
      expect(c.longitude, c.name).toBeLessThan(45);
    }
  });

  /*
   * İki il aynı noktada olamaz. Kopyala-yapıştırla çoğaltılan bir satır
   * tam olarak böyle görünürdü ve `nearestCity` o noktada hangisini
   * döndüreceğine sıralamaya bakarak karar verirdi.
   */
  it('iki ilin koordinatı birebir aynı değil', () => {
    const noktalar = cities.map((c) => `${c.latitude},${c.longitude}`);
    expect(new Set(noktalar).size).toBe(81);
  });
});

describe('Bortle', () => {
  /*
   * ÖLÇÜM OLMAYAN YERDE ALAN BOŞ. Altmış altı il için gözleme dayalı
   * değer yok; doldurulsaydı arayüz uydurma bir sayıyı ölçüm gibi
   * gösterirdi. Ölçülen şey "boş bırakma kararının hâlâ yürürlükte
   * olması".
   */
  it('yalnızca ölçümü olan illerde dolu', () => {
    const dolu = cities.filter((c) => c.bortle !== undefined);
    expect(dolu).toHaveLength(15);
    expect(cities.filter((c) => c.bortle === undefined)).toHaveLength(66);
  });

  it('dolu değerler 1–9 ölçeğinde', () => {
    for (const c of cities) {
      if (c.bortle === undefined) continue;
      expect(c.bortle, c.name).toBeGreaterThanOrEqual(1);
      expect(c.bortle, c.name).toBeLessThanOrEqual(9);
      expect(Number.isInteger(c.bortle), c.name).toBe(true);
    }
  });
});

describe('arama', () => {
  it('kimlikle bulunuyor', () => {
    expect(findCity('agri')?.name).toBe('Ağrı');
    expect(findCity('yok')).toBeUndefined();
  });

  /*
   * PLAKA KODUYLA ARAMA İLÇE İÇİN GEREKLİ: ilçeler `province_code` ile
   * sorgulanıyor, il seçimi ise kimlikle geliyor. Eşleme burada.
   */
  it('plaka koduyla bulunuyor', () => {
    expect(findCityByCode(34)?.id).toBe('istanbul');
    expect(findCityByCode(6)?.id).toBe('ankara');
    expect(findCityByCode(99)).toBeUndefined();
  });

  it('en yakın ili buluyor', () => {
    /* Kızılay'ın birkaç yüz metre yakını — Ankara olmalı. */
    expect(nearestCity(39.92, 32.85).id).toBe('ankara');
    /* Kaş; en yakın il merkezi Antalya. */
    expect(nearestCity(36.2, 29.64).id).toBe('antalya');
  });
});
