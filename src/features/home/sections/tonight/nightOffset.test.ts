import { describe, expect, it } from 'vitest';
import {
  MAX_OFFSET,
  clampOffset,
  dateBounds,
  dateToOffset,
  fromISODate,
  gunFarki,
  offsetFromParam,
  offsetToDate,
  toISODate,
} from './nightOffset';

/** Yerel gece yarısı — testler zaman diliminden bağımsız kalsın. */
const g = (y: number, ay: number, gun: number) => new Date(y, ay - 1, gun);

describe('tarih kimlikleri', () => {
  it('yerel takvim gününü sıfır dolgulu yazıyor', () => {
    expect(toISODate(g(2026, 8, 5))).toBe('2026-08-05');
    expect(toISODate(g(2026, 12, 31))).toBe('2026-12-31');
  });

  it('geri okuyor', () => {
    expect(fromISODate('2026-08-05')?.getDate()).toBe(5);
    expect(fromISODate('2026-08-05')?.getMonth()).toBe(7);
  });

  /*
   * `new Date(2026, 1, 31)` SESSİZCE 3 Mart'a taşar. Kontrol edilmezse
   * "31 Şubat" içeren bir bağlantı, kullanıcıya hiç istemediği bir
   * geceyi gösterirdi.
   */
  it('takvimde olmayan günü reddediyor', () => {
    expect(fromISODate('2026-02-31')).toBeNull();
    expect(fromISODate('2026-13-01')).toBeNull();
  });

  it('biçimsiz değeri reddediyor', () => {
    for (const kotu of ['', 'bugün', '2026-8-5', '05.08.2026', '2026-08-05T21:00']) {
      expect(fromISODate(kotu), kotu).toBeNull();
    }
  });
});

describe('gün farkı', () => {
  it('ardışık günlerde 1', () => {
    expect(gunFarki(g(2026, 8, 5), g(2026, 8, 6))).toBe(1);
  });

  it('ay ve yıl sınırını geçiyor', () => {
    expect(gunFarki(g(2026, 12, 31), g(2027, 1, 1))).toBe(1);
    expect(gunFarki(g(2026, 8, 31), g(2026, 9, 1))).toBe(1);
  });

  it('geriye doğru negatif', () => {
    expect(gunFarki(g(2026, 8, 6), g(2026, 8, 5))).toBe(-1);
  });

  /*
   * YAZ SAATİ TUZAĞI. Türkiye kalıcı UTC+3 kullanıyor ama test başka
   * dilimde de koşabilir. Milisaniye farkını 86.4 milyona bölmek, 23
   * ya da 25 saatlik bir günde 0 ya da 1.04 verir ve `Math.floor` bir
   * gün kaydırır. Gün başına inip yuvarlamak bunu kapatıyor.
   */
  it('bir yıl boyunca her ardışık gün tam olarak 1 fark veriyor', () => {
    let d = g(2026, 1, 1);
    for (let i = 0; i < 365; i += 1) {
      const sonraki = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      expect(gunFarki(d, sonraki), toISODate(d)).toBe(1);
      d = sonraki;
    }
  });
});

describe('offset sınırları', () => {
  it('aralık dışını kırpıyor', () => {
    expect(clampOffset(-5)).toBe(0);
    expect(clampOffset(999)).toBe(MAX_OFFSET);
    expect(clampOffset(3)).toBe(3);
  });

  /*
   * SONLU OLMAYAN DEĞER BU GECEYE DÜŞÜYOR, UFKA DEĞİL.
   *
   * İlk yazdığımda `Infinity` için MAX_OFFSET bekliyordum — "çok ileri"
   * demek en ileri gece demek diye. Ama `Infinity` ya da `NaN` bir
   * niyet değil, bir HATA belirtisi: bozuk bir parametre ya da bozuk bir
   * hesap. Hata durumunda kullanıcıyı 15 gün sonrasına atmak, bu geceye
   * düşürmekten kötü.
   */
  it('sonlu olmayan değer bu geceye düşüyor', () => {
    expect(clampOffset(Number.NaN)).toBe(0);
    expect(clampOffset(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampOffset(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('offset ile tarih gidiş-dönüş tutuyor', () => {
    const bugun = g(2026, 8, 1);
    for (let i = 0; i <= MAX_OFFSET; i += 1) {
      expect(dateToOffset(offsetToDate(i, bugun), bugun), `offset ${i}`).toBe(i);
    }
  });

  /*
   * KIRPMA DEĞİL `null`. Ufkun ötesindeki bir tarihi en yakın güne
   * çekmek, kullanıcıya istemediği geceyi istediği gece diye
   * gösterirdi.
   */
  it('geçmiş ve ufuk ötesi tarih null dönüyor', () => {
    const bugun = g(2026, 8, 1);
    expect(dateToOffset(g(2026, 7, 31), bugun)).toBeNull();
    /* `offsetToDate` kendi içinde kırpıyor, yani MAX_OFFSET+1 vermek
       sınır ötesi bir TARİH üretmez. Tarih doğrudan kuruluyor. */
    const ufkunOtesi = new Date(2026, 7, 1 + MAX_OFFSET + 1);
    expect(dateToOffset(ufkunOtesi, bugun)).toBeNull();
  });

  it('seçici sınırları ufku aşmıyor', () => {
    const { min, max } = dateBounds(g(2026, 8, 1));
    expect(min).toBe('2026-08-01');
    expect(dateToOffset(fromISODate(max)!, g(2026, 8, 1))).toBe(MAX_OFFSET);
  });
});

describe('URL parametresi', () => {
  const bugun = g(2026, 8, 1);

  it('geçerli tarihi offsete çeviriyor', () => {
    expect(offsetFromParam('2026-08-05', bugun)).toBe(4);
  });

  /*
   * URL'de OFFSET değil TARİH var. Offset olsaydı paylaşılan bağlantı
   * ertesi gün açıldığında başka bir geceyi gösterirdi — bu test o
   * kararı kilitliyor.
   */
  it('aynı bağlantı ertesi gün açılınca AYNI geceye çözülüyor', () => {
    const baglanti = '2026-08-05';
    expect(offsetFromParam(baglanti, g(2026, 8, 1))).toBe(4);
    expect(offsetFromParam(baglanti, g(2026, 8, 2))).toBe(3);
    expect(offsetFromParam(baglanti, g(2026, 8, 5))).toBe(0);
  });

  it('eskimiş, bozuk ve ufuk ötesi bağlantı bu geceye düşüyor', () => {
    expect(offsetFromParam('2026-07-01', bugun)).toBe(0);
    expect(offsetFromParam('çorba', bugun)).toBe(0);
    expect(offsetFromParam('2027-01-01', bugun)).toBe(0);
    expect(offsetFromParam(null, bugun)).toBe(0);
  });
});
