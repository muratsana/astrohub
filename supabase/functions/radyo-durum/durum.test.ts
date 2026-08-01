import { describe, expect, it } from 'vitest';
import { cevrimdisi, cozumle } from './durum';

/**
 * ADAPTÖR ÇÖZÜMLEYİCİSİ.
 *
 * Ölçülen asıl kural §10.2'nin son maddesi: **sahte "canlı" ibaresi
 * gösterme**. Bu bir arayüz kuralı gibi görünüyor ama asıl yeri burası
 * — hata yolundan "canlı" dönerse arayüzün yapabileceği bir şey yok.
 */

describe('cevrimdisi', () => {
  it('her zaman canlı değil ve sebebi taşıyor', () => {
    expect(cevrimdisi('Sunucu yok')).toEqual({
      canli: false,
      dinleyici: null,
      calan: null,
      gecikmeMs: null,
      hata: 'Sunucu yok',
    });
  });
});

describe('cozumle — canlılık', () => {
  it('is_online true ise canlı', () => {
    expect(cozumle({ is_online: true }, 12).canli).toBe(true);
  });

  it('is_online false ise canlı değil', () => {
    const durum = cozumle({ is_online: false }, 12);
    expect(durum.canli).toBe(false);
    expect(durum.hata).toBe('Yayın çevrimdışı');
  });

  /**
   * AZURACAST'İN `live.is_live` ALANI "DJ BAĞLI MI" DEMEK, "YAYIN VAR MI"
   * DEĞİL. AutoDJ çalarken `false` döner ama dinleyici müzik duyar.
   * Bu alanı canlılık ölçütü yapsaydık, sitede yayın sürerken "çevrimdışı"
   * yazardı — sahte "canlı"nın tersi ama aynı derecede yanlış.
   */
  it('AutoDJ yayını canlı sayılıyor (live.is_live false olsa bile)', () => {
    const durum = cozumle(
      { is_online: true, live: { is_live: false } },
      12
    );
    expect(durum.canli).toBe(true);
  });

  it('is_online eksikse canlı değil — varsayılan asla canlı olamaz', () => {
    expect(cozumle({ listeners: { current: 9 } }, 12).canli).toBe(false);
  });

  /* Doğruluk kontrolü: `is_online: "true"` metni boolean değil. */
  it('is_online metin olarak gelirse canlı sayılmıyor', () => {
    expect(cozumle({ is_online: 'true' }, 12).canli).toBe(false);
  });
});

describe('cozumle — bozuk yanıt', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['metin', 'çevrimiçi'],
    ['sayı', 42],
    ['dizi', [{ is_online: true }]],
  ])('%s yanıtı çevrimdışı sayılıyor', (_ad, veri) => {
    const durum = cozumle(veri, 5);
    expect(durum.canli).toBe(false);
    expect(durum.hata).toBe('Yanıt çözümlenemedi');
  });
});

describe('cozumle — dinleyici sayısı', () => {
  it('current okunuyor', () => {
    expect(cozumle({ is_online: true, listeners: { current: 42 } }, 1).dinleyici)
      .toBe(42);
  });

  it('current yoksa total okunuyor', () => {
    expect(cozumle({ is_online: true, listeners: { total: 7 } }, 1).dinleyici)
      .toBe(7);
  });

  /**
   * BİLİNMİYORSA BOŞ, SIFIR DEĞİL. "Kimse dinlemiyor" ile "sayamadık"
   * farklı cümleler; 0 yazmak ikincisini birincisi gibi gösterirdi.
   */
  it('sayı yoksa boş bırakılıyor — 0 yazılmıyor', () => {
    expect(cozumle({ is_online: true }, 1).dinleyici).toBeNull();
    expect(cozumle({ is_online: true, listeners: {} }, 1).dinleyici).toBeNull();
  });

  it('gerçek sıfır sıfır olarak korunuyor', () => {
    expect(cozumle({ is_online: true, listeners: { current: 0 } }, 1).dinleyici)
      .toBe(0);
  });

  it('negatif sayı boş sayılıyor', () => {
    expect(cozumle({ is_online: true, listeners: { current: -3 } }, 1).dinleyici)
      .toBeNull();
  });
});

describe('cozumle — çalan içerik', () => {
  it('şarkı metni okunuyor', () => {
    const durum = cozumle(
      { is_online: true, now_playing: { song: { text: 'Holst — Jupiter' } } },
      1
    );
    expect(durum.calan).toBe('Holst — Jupiter');
  });

  it('boş metin null oluyor', () => {
    const durum = cozumle(
      { is_online: true, now_playing: { song: { text: '   ' } } },
      1
    );
    expect(durum.calan).toBeNull();
  });

  /* Eksik alan yayının düştüğü anlamına gelmiyor: künye gelmeyebilir
     ama yayın ayakta olabilir. */
  it('künye eksikse yayın yine canlı', () => {
    const durum = cozumle({ is_online: true, now_playing: {} }, 1);
    expect(durum.calan).toBeNull();
    expect(durum.canli).toBe(true);
  });
});

describe('cozumle — gecikme', () => {
  it('ölçülen gecikme aynen taşınıyor', () => {
    expect(cozumle({ is_online: true }, 137).gecikmeMs).toBe(137);
  });
});
