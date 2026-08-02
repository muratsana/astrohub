import { describe, expect, it } from 'vitest';
import {
  RANGE_CHIP,
  activeChips,
  applyQuery,
  facetCounts,
  hasActiveFilters,
  parseQuery,
  removeChip,
  setRange,
  toParams,
  type ExplorerSpec,
} from './query';

/**
 * ARALIK SÜZGECİ — tarih ve sayı (§7.1).
 *
 * Motorda YALNIZCA eşitlik vardı: facet bir değeri listeler, sayar,
 * seçilenle karşılaştırır. Belgenin "tarih aralığı", "sayısal aralık" ve
 * "boş değerleri dahil etme" maddelerinin karşılığı yoktu — fiyatı facet
 * yapmak 340 ilan için 340 kutucuk demekti.
 *
 * Burada kilitlenen üç karar:
 *   1. SINIRLAR DAHİL — "0–5000" diyen kullanıcı 5000'i görmeyi bekler
 *   2. BİLİNMEYEN DEĞER VARSAYILAN OLARAK ELENİR — fiyatı girilmemiş bir
 *      ilanın 0–5000 arasında olduğunu söyleyemeyiz
 *   3. TARİHTE ÜST SINIR GÜN SONU — "2 Ağustos'a kadar" o günü kapsar
 */

interface Kayit {
  ad: string;
  sehir: string;
  fiyat: number | null;
  tarih: string;
}

const spec: ExplorerSpec<Kayit> = {
  searchFields: (i) => [i.ad],
  facets: [{ param: 'sehir', label: 'Şehir', valueOf: (i) => i.sehir }],
  ranges: [
    {
      param: 'fiyat',
      label: 'Fiyat',
      valueOf: (i) => i.fiyat,
      format: (n) => `${n} ₺`,
    },
    {
      param: 'tarih',
      label: 'Tarih',
      kind: 'date',
      valueOf: (i) => new Date(i.tarih).getTime(),
    },
  ],
  sorts: [{ value: 'ad', label: 'Ad', compare: (a, b) => a.ad.localeCompare(b.ad) }],
  defaultSort: 'ad',
};

const kayitlar: Kayit[] = [
  { ad: 'ucuz', sehir: 'Ankara', fiyat: 1000, tarih: '2026-08-01T10:00:00Z' },
  { ad: 'orta', sehir: 'Ankara', fiyat: 5000, tarih: '2026-08-02T23:30:00Z' },
  { ad: 'pahali', sehir: 'İzmir', fiyat: 9000, tarih: '2026-08-10T10:00:00Z' },
  { ad: 'fiyatsiz', sehir: 'İzmir', fiyat: null, tarih: '2026-08-03T10:00:00Z' },
];

/*
 * Boş sorgu `EMPTY_QUERY` DEĞİL, ayrıştırılmış boş adres: `EMPTY_QUERY`
 * `sort: ''` taşıyor (hiçbir spec'e ait olmayan bir taban) ve o değerle
 * ne sıralama uygulanır ne de "varsayılan" sayılıp adresten düşürülür.
 * Gerçek sayfaların gördüğü durum bu.
 */
const BOS = parseQuery(new URLSearchParams(), spec);

const q = (param: string, v: Partial<{ min: number; max: number; includeEmpty: boolean }>) =>
  setRange(BOS, param, v as never);

function adlar(query: Parameters<typeof applyQuery<Kayit>>[1]): string[] {
  return applyQuery(kayitlar, query, spec).items.map((i) => i.ad);
}

describe('sayısal aralık', () => {
  it('sınırlar DAHİL süzüyor', () => {
    /* 5000 üst sınırı 5000'lik kaydı ELEMEMELİ — kullanıcının yazdığı
       sayının kendisini eleyen bir süzgeç yanlış cevap verir. */
    expect(adlar(q('fiyat', { min: 1000, max: 5000 }))).toEqual(['orta', 'ucuz']);
  });

  it('tek uç açık bırakılabiliyor', () => {
    expect(adlar(q('fiyat', { min: 5000 }))).toEqual(['orta', 'pahali']);
    expect(adlar(q('fiyat', { max: 1000 }))).toEqual(['ucuz']);
  });

  it('değeri olmayan kayıt varsayılan olarak eleniyor', () => {
    expect(adlar(q('fiyat', { min: 0, max: 100000 }))).not.toContain('fiyatsiz');
  });

  it('"boşlar dahil" işaretlenince geri geliyor', () => {
    expect(
      adlar(q('fiyat', { min: 0, max: 100000, includeEmpty: true }))
    ).toContain('fiyatsiz');
  });

  /*
   * Yalnızca "boşlar dahil" işaretliyken hiçbir sınır yok — bu bir
   * DARALTMA değil. Hiçbir kaydı elememeli, yoksa kutu "göster" diyip
   * liste kısalırdı.
   */
  it('sınırsız "boşlar dahil" hiçbir şeyi elemiyor', () => {
    expect(adlar(q('fiyat', { includeEmpty: true })).length).toBe(4);
  });

  it('sıfır alt sınırı ile "sınır yok" aynı şey değil', () => {
    /* `Number('')` sıfır verir; ikisini karıştıran bir ayrıştırma
       "en az 0" seçimini sessizce seçimsizliğe çevirirdi. */
    const sifir = q('fiyat', { min: 0 });
    expect(hasActiveFilters(sifir)).toBe(true);
    expect(adlar(sifir)).not.toContain('fiyatsiz');
  });
});

describe('tarih aralığı', () => {
  it('üst sınır günü KAPSIYOR', () => {
    /* 2 Ağustos 23:30'daki kayıt, "2 Ağustos'a kadar" seçiminde
       görünmeli: gün başını sınır alsaydık bir gün eksik süzerdik. */
    const query = parseQuery(
      new URLSearchParams('tarih_max=2026-08-02'),
      spec
    );
    expect(adlar(query)).toEqual(['orta', 'ucuz']);
  });

  it('alt sınır günün başından itibaren', () => {
    const query = parseQuery(new URLSearchParams('tarih_min=2026-08-03'), spec);
    expect(adlar(query).sort()).toEqual(['fiyatsiz', 'pahali']);
  });

  it('bozuk tarih sessizce düşüyor', () => {
    const query = parseQuery(new URLSearchParams('tarih_min=çorba'), spec);
    expect(query.ranges.tarih).toBeUndefined();
    expect(adlar(query).length).toBe(4);
  });
});

describe('URL gidiş-dönüşü', () => {
  it('üç parametre yazılıyor ve aynı aralığa geri dönüyor', () => {
    const yazilan = toParams(
      setRange(BOS, 'fiyat', { min: 1000, max: 5000, includeEmpty: true }),
      spec
    );
    expect(yazilan.get('fiyat_min')).toBe('1000');
    expect(yazilan.get('fiyat_max')).toBe('5000');
    expect(yazilan.get('fiyat_bos')).toBe('1');

    const geri = parseQuery(yazilan, spec);
    expect(geri.ranges.fiyat).toEqual({ min: 1000, max: 5000, includeEmpty: true });
  });

  it('tarih adrese GÜN olarak yazılıyor ve aralık korunuyor', () => {
    const okunan = parseQuery(new URLSearchParams('tarih_max=2026-08-02'), spec);
    /* Ayrıştırma gün sonuna yuvarlıyor; adrese geri yazarken gün olarak
       görünmeli, yoksa paylaşılan bağlantı okunmaz bir sayı taşırdı. */
    expect(toParams(okunan, spec).get('tarih_max')).toBe('2026-08-02');
    expect(adlar(parseQuery(toParams(okunan, spec), spec))).toEqual(adlar(okunan));
  });

  it('seçim yoksa parametre yazılmıyor', () => {
    expect(toParams(BOS, spec).toString()).toBe('');
  });

  it('iki ucu da boşalan aralık durumdan SİLİNİYOR', () => {
    /* Boş kayıt bırakmak `hasActiveFilters`ı yanıltır ve mobil
       çekmecenin "filtre var" rozeti hiçbir filtre yokken yanardı. */
    const bir = setRange(BOS, 'fiyat', { min: 1000 });
    const sifirlanmis = setRange(bir, 'fiyat', { min: null });
    expect(sifirlanmis.ranges.fiyat).toBeUndefined();
    expect(hasActiveFilters(sifirlanmis)).toBe(false);
  });
});

describe('chip ve sayım', () => {
  it('aralık TEK chip üretiyor ve tek tıkla kalkıyor', () => {
    const query = q('fiyat', { min: 1000, max: 5000 });
    const chips = activeChips(query, spec);
    expect(chips).toHaveLength(1);
    expect(chips[0].label).toBe('Fiyat: 1000 ₺ – 5000 ₺');

    expect(removeChip(query, chips[0]).ranges.fiyat).toBeUndefined();
  });

  it('açık uç chip metninde okunuyor', () => {
    expect(activeChips(q('fiyat', { min: 5000 }), spec)[0].label).toBe(
      'Fiyat: 5000 ₺ ve üzeri'
    );
    expect(activeChips(q('fiyat', { max: 5000 }), spec)[0].label).toBe(
      'Fiyat: 5000 ₺ ve altı'
    );
  });

  it('chip değeri aralığı işaretliyor — facet değeriyle karışmıyor', () => {
    expect(activeChips(q('fiyat', { min: 1 }), spec)[0].value).toBe(RANGE_CHIP);
  });

  /*
   * Sayının tek işi tıklamanın sonucunu ÖNCEDEN söylemek. Aralık
   * sayımda uygulanmasaydı "İzmir (2)" yazar, tıklanınca 1 kayıt çıkardı.
   */
  it('facet sayımı aktif aralığa uyuyor', () => {
    const sayim = facetCounts(kayitlar, q('fiyat', { max: 5000 }), spec, 'sehir');
    expect(sayim.get('Ankara')).toBe(2);
    expect(sayim.get('İzmir')).toBeUndefined();
  });
});
