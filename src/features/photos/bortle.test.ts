import { describe, expect, it } from 'vitest';
import { deriveBortle } from './bortle';

/**
 * KONUMDAN BORTLE TÜRETME.
 *
 * Kuralın iki ayrı işi var ve ikisi de sessizce kırılabilir: doğru
 * kaynağı seçmek ve il adını Türkçe kurallarıyla eşleştirmek.
 */
describe('deriveBortle · kaynak sırası', () => {
  it('fotoğrafın kendi değeri varsa ili hiç sormuyor', () => {
    const result = deriveBortle({ bortle: 3, city: 'İstanbul' });
    expect(result).toEqual({ value: 3, source: 'kayit' });
  });

  /*
   * ASIL KURAL. İl ortalaması bir TAHMİN ve öyle etiketlenmeli; çağıran
   * taraf bu alana bakıp "ölçüldü" demiyor. `source` düşerse gösterge
   * kaba bir değeri ölçüm gibi sunmaya başlar.
   */
  it('kendi değeri yokken ilden türetiyor ve tahmin olduğunu işaretliyor', () => {
    const result = deriveBortle({ city: 'Ankara' });
    expect(result).toEqual({ value: 8, source: 'il' });
  });

  it('hiçbir kaynak yoksa uydurmuyor', () => {
    expect(deriveBortle({})).toBeNull();
    expect(deriveBortle({ city: 'Lizbon' })).toBeNull();
  });
});

describe('deriveBortle · il eşleştirme', () => {
  /*
   * TÜRKÇE KÜÇÜK HARF TUZAĞI. `toLowerCase()` "İzmir"i "i̇zmir" yapıyor
   * (noktalı i + ayrı birleşen nokta) ve katalogdaki "izmir" ile
   * eşleşmiyor. Gösterge hata vermeden çizilmez olurdu — en kötü
   * kırılma türü.
   */
  it('noktalı büyük İ ile başlayan il adını tanıyor', () => {
    expect(deriveBortle({ city: 'İzmir' })).toEqual({ value: 8, source: 'il' });
    expect(deriveBortle({ locationLabel: 'İstanbul' })).toEqual({
      value: 9,
      source: 'il',
    });
  });

  it('ilçe içeren etiketten ili çıkarıyor', () => {
    expect(deriveBortle({ locationLabel: 'Saklıkent, Antalya' })).toEqual({
      value: 8,
      source: 'il',
    });
  });

  it('şapkalı ve özel harfli il adlarını tanıyor', () => {
    expect(deriveBortle({ city: 'Çanakkale' })).toEqual({
      value: 6,
      source: 'il',
    });
    expect(deriveBortle({ city: 'Muğla' })).toEqual({ value: 6, source: 'il' });
  });

  /*
   * ══════════════════════════════════════════════════════════════════
   * 81 İLE ÇIKINCA ORTAYA ÇIKAN TUZAK.
   *
   * Bir il adı başka bir ilin İLÇE/SEMT adı olabiliyor. Katalog 15 ilken
   * bu hiç görünmüyordu; 81'de "Aksaray" hem bir il hem de İstanbul'un
   * bir semti ve alfabetik olarak İstanbul'un ÖNÜNDE. "İlk eşleşen"
   * kuralı fotoğrafı Aksaray'a bağlar, Aksaray'ın ölçümü olmadığı için
   * de gösterge hiç çizilmezdi.
   *
   * Kural: Türkçe adres SONA doğru genişler, en sağdaki eşleşme kazanır.
   */
  it('semt adı bir il adıyla çakıştığında sondaki ili seçiyor', () => {
    expect(deriveBortle({ locationLabel: 'Aksaray, İstanbul' })).toEqual({
      value: 9,
      source: 'il',
    });
    expect(deriveBortle({ locationLabel: 'Ereğli, Konya' })).toEqual({
      value: 7,
      source: 'il',
    });
  });

  /*
   * ÖLÇÜMÜ OLMAYAN İL SAYI ÜRETMİYOR. Altmış altı il için Bortle ölçümü
   * yok; nüfusa bakıp tahmin etmek kullanıcının gökyüzü beklentisini
   * yanlış kurardı. İl TANINIYOR ama değer uydurulmuyor.
   */
  it('ölçümü olmayan ilde tahmin üretmiyor', () => {
    expect(deriveBortle({ city: 'Bayburt' })).toBeNull();
    expect(deriveBortle({ locationLabel: 'Uzungöl, Trabzon' })).toEqual({
      value: 7,
      source: 'il',
    });
  });
});

describe('deriveBortle · aralık dışı değerler', () => {
  /*
   * Bortle ölçeği 1–9. Dışarıdaki bir sayı `bortleScale[value]`
   * aramasında `undefined` döndürür ve gösterge çizerken çökerdi.
   */
  it('ölçek dışındaki değeri kayıttan saymıyor, ile düşüyor', () => {
    expect(deriveBortle({ bortle: 0, city: 'Ankara' })).toEqual({
      value: 8,
      source: 'il',
    });
    expect(deriveBortle({ bortle: 12, city: 'Ankara' })).toEqual({
      value: 8,
      source: 'il',
    });
  });

  it('ondalık değeri en yakın sınıfa yuvarlıyor', () => {
    expect(deriveBortle({ bortle: 4.4 })).toEqual({ value: 4, source: 'kayit' });
    expect(deriveBortle({ bortle: 4.6 })).toEqual({ value: 5, source: 'kayit' });
  });

  it('sayı olmayan değeri yok sayıyor', () => {
    expect(deriveBortle({ bortle: Number.NaN })).toBeNull();
  });
});
