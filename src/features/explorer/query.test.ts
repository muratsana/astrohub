import { describe, expect, it } from 'vitest';
import {
  EMPTY_QUERY,
  PARAM_Q,
  activeChips,
  applyQuery,
  byNumber,
  byText,
  facetCounts,
  hasActiveFilters,
  parseQuery,
  removeChip,
  toParams,
  toggleFacet,
  type ExplorerSpec,
} from './query';

/**
 * DATA EXPLORER — ortak sorgu motoru (Faz 4).
 *
 * Bu testler bir bileşeni değil, on liste sayfasının ORTAK davranışını
 * kilitliyor. Her sayfa kendi filtre mantığını yazdığı sürece bu
 * davranışların hiçbiri garanti değildi.
 */

interface Kayit {
  ad: string;
  tur: string;
  sehir: string;
  etiketler: string[];
  puan: number | null;
}

const k = (
  ad: string,
  tur: string,
  sehir: string,
  puan: number | null = null,
  etiketler: string[] = []
): Kayit => ({ ad, tur, sehir, puan, etiketler });

const spec: ExplorerSpec<Kayit> = {
  searchFields: (i) => [i.ad, i.sehir],
  facets: [
    { param: 'tur', label: 'Tür', valueOf: (i) => i.tur },
    { param: 'sehir', label: 'Şehir', valueOf: (i) => i.sehir },
    { param: 'etiket', label: 'Etiket', valueOf: (i) => i.etiketler },
  ],
  sorts: [
    { value: 'ad', label: 'Ad', compare: byText((i) => i.ad) },
    { value: 'puan', label: 'Puan', compare: byNumber((i) => i.puan) },
  ],
  defaultSort: 'ad',
};

const veri: Kayit[] = [
  k('Çankırı Gözlemevi', 'saha', 'Çankırı', 4.5, ['kamp']),
  k('Cebeci Tepesi', 'saha', 'Ankara', null, ['kamp', 'karavan']),
  k('Şanlıurfa Sahası', 'saha', 'Şanlıurfa', 3.2, []),
  k('Ankara Kulübü', 'kulup', 'Ankara', 5, ['dernek']),
  k('Iğdır Grubu', 'kulup', 'Iğdır', 2, []),
];

describe('URL çevrimi', () => {
  it('parametreleri okuyor', () => {
    const q = parseQuery(
      new URLSearchParams('ara=orion&tur=saha,kulup&sirala=puan&sayfa=3'),
      spec
    );
    expect(q.q).toBe('orion');
    expect(q.facets.tur).toEqual(['saha', 'kulup']);
    expect(q.sort).toBe('puan');
    expect(q.page).toBe(3);
  });

  it('tekrarlanan parametreyi de çoklu seçim sayıyor', () => {
    /* Paylaşılan bağlantı iki biçimde de gelebilir. */
    const q = parseQuery(new URLSearchParams('tur=saha&tur=kulup'), spec);
    expect(q.facets.tur).toEqual(['saha', 'kulup']);
  });

  /*
   * BİLİNMEYEN DEĞER HATA EKRANI GÖSTERMİYOR ama tanımsız bir
   * sıralamayla boş liste de göstermiyor.
   */
  it('tanınmayan sıralama varsayılana düşüyor', () => {
    expect(parseQuery(new URLSearchParams('sirala=çorba'), spec).sort).toBe('ad');
  });

  it('bozuk sayfa numarası birinci sayfaya düşüyor', () => {
    for (const kotu of ['0', '-4', 'abc', '']) {
      expect(parseQuery(new URLSearchParams(`sayfa=${kotu}`), spec).page, kotu).toBe(1);
    }
  });

  /*
   * VARSAYILANLAR URL'YE YAZILMIYOR. Yoksa hiçbir şey seçmemiş
   * kullanıcının adresi `?ara=&sirala=ad&sayfa=1` olurdu.
   */
  it('varsayılan durum boş parametre üretiyor', () => {
    const p = toParams({ ...EMPTY_QUERY, sort: 'ad' }, spec);
    expect(p.toString()).toBe('');
  });

  it('gidiş-dönüş tutuyor', () => {
    const once = parseQuery(
      new URLSearchParams('ara=van&tur=saha&sehir=Ankara&sirala=puan&sayfa=2'),
      spec
    );
    expect(parseQuery(toParams(once, spec), spec)).toEqual(once);
  });

  /*
   * EXPLORER DIŞI PARAMETRE KORUNUYOR. Aynı sayfada başka bir özellik
   * URL kullanıyorsa (ör. `?gece=`), filtre değişimi onu silmemeli.
   */
  it('yabancı parametreyi silmiyor', () => {
    const taban = new URLSearchParams('gece=2026-08-05&tur=eski');
    const p = toParams({ ...EMPTY_QUERY, sort: 'ad', q: 'van' }, spec, taban);
    expect(p.get('gece')).toBe('2026-08-05');
    expect(p.get('tur')).toBeNull();
    expect(p.get('ara')).toBe('van');
  });
});

describe('arama', () => {
  const ara = (q: string) =>
    applyQuery(veri, { ...EMPTY_QUERY, q, sort: 'ad' }, spec).items.map((i) => i.ad);

  /*
   * TÜRKÇE I/İ TUZAĞI. "igdir" yazan biri "Iğdır"ı bulmalı; JavaScript'in
   * varsayılan küçültmesi bunu yapmaz.
   */
  it('Türkçe karakterleri normalize ediyor', () => {
    expect(ara('igdir')).toEqual(['Iğdır Grubu']);
    expect(ara('IĞDIR')).toEqual(['Iğdır Grubu']);
    expect(ara('cankiri')).toEqual(['Çankırı Gözlemevi']);
    expect(ara('şanlıurfa')).toEqual(['Şanlıurfa Sahası']);
  });

  /*
   * Kelime sırası ve aradaki kelimeler fark etmemeli: "gözlemevi
   * çankırı" yazan biri de bulmalı.
   */
  it('kelimeleri ayrı ayrı arıyor, sıra önemsiz', () => {
    expect(ara('gozlemevi cankiri')).toEqual(['Çankırı Gözlemevi']);
  });

  it('boş terim hepsini geçiriyor', () => {
    expect(ara('   ')).toHaveLength(veri.length);
  });

  it('arama alanı dışındaki metni eşleştirmiyor', () => {
    /* `tur` arama alanlarında yok; "kulup" yazmak kayıt getirmemeli. */
    expect(ara('kulup')).toEqual([]);
  });
});

describe('facet mantığı', () => {
  const suz = (facets: Record<string, string[]>) =>
    applyQuery(veri, { ...EMPTY_QUERY, sort: 'ad', facets }, spec).items.map(
      (i) => i.ad
    );

  /*
   * ASIL KURAL: aynı facet içinde VEYA, farklı facet'ler arasında VE.
   * Tek bir mantıkla birleştirmek ikisinden birini yanlış yapardı.
   */
  it('aynı facet içindeki değerler VEYA', () => {
    expect(suz({ tur: ['saha', 'kulup'] })).toHaveLength(5);
  });

  it('farklı facetler VE', () => {
    expect(suz({ tur: ['kulup'], sehir: ['Ankara'] })).toEqual(['Ankara Kulübü']);
  });

  it('dizi değerli facet çalışıyor', () => {
    expect(suz({ etiket: ['karavan'] })).toEqual(['Cebeci Tepesi']);
  });

  it('seçim yoksa facet süzmüyor', () => {
    expect(suz({})).toHaveLength(5);
  });
});

describe('facet sayıları', () => {
  /*
   * TİPİK HATA: sayımda o facet'in KENDİ seçimini de uygulamak. O zaman
   * "saha" seçilince "kulup (0)" görünür ve kullanıcı seçimini
   * değiştiremez.
   */
  it('kendi seçimi sayımı sıfırlamıyor', () => {
    const q = { ...EMPTY_QUERY, sort: 'ad', facets: { tur: ['saha'] } };
    const sayim = facetCounts(veri, q, spec, 'tur');
    expect(sayim.get('saha')).toBe(3);
    expect(sayim.get('kulup')).toBe(2);
  });

  it('başka facet sayımı daraltıyor', () => {
    const q = { ...EMPTY_QUERY, sort: 'ad', facets: { sehir: ['Ankara'] } };
    const sayim = facetCounts(veri, q, spec, 'tur');
    expect(sayim.get('saha')).toBe(1);
    expect(sayim.get('kulup')).toBe(1);
  });

  it('arama terimi sayımı daraltıyor', () => {
    const q = { ...EMPTY_QUERY, sort: 'ad', q: 'ankara' };
    const sayim = facetCounts(veri, q, spec, 'tur');
    expect(sayim.get('kulup')).toBe(1);
    expect(sayim.get('saha')).toBe(1);
  });
});

describe('sıralama', () => {
  const sirala = (sort: string) =>
    applyQuery(veri, { ...EMPTY_QUERY, sort }, spec).items.map((i) => i.ad);

  /*
   * TÜRKÇE ALFABE. Yerelsiz `localeCompare` Ç'yi C'den, Ş'yi S'den ÖNCE
   * koyar — ölçtüm. Kullanıcı aradığı kaydı beklediği yerde bulamaz.
   */
  it('Türkçe alfabetik sıralıyor', () => {
    expect(sirala('ad')).toEqual([
      'Ankara Kulübü',
      'Cebeci Tepesi',
      'Çankırı Gözlemevi',
      'Iğdır Grubu',
      'Şanlıurfa Sahası',
    ]);
  });

  /*
   * NULL DEĞERLER SONA. Eksik puanı 0 saymak, puanlanmamış bir kaydı
   * "en düşük puanlı" diye listenin dibine yazar ve orada gerçek bir
   * sıfır gibi okunur.
   */
  it('eksik sayısal değer sona düşüyor, sıfır sayılmıyor', () => {
    const sirali = sirala('puan');
    expect(sirali[0]).toBe('Ankara Kulübü');
    expect(sirali.at(-1)).toBe('Cebeci Tepesi');
  });
});

describe('sayfalama', () => {
  const sayfali: ExplorerSpec<Kayit> = { ...spec, pageSize: 2 };

  it('sayfa boyutuna bölüyor ve toplamı koruyor', () => {
    const r = applyQuery(veri, { ...EMPTY_QUERY, sort: 'ad', page: 2 }, sayfali);
    expect(r.items).toHaveLength(2);
    expect(r.total).toBe(5);
    expect(r.pageCount).toBe(3);
    expect(r.page).toBe(2);
  });

  /*
   * ARALIK DIŞI SAYFA SON SAYFAYA ÇEKİLİYOR. Filtre daraldığında
   * kullanıcının bulunduğu 7. sayfa yok olabilir; boş liste ekranda
   * "sonuç yok" gibi okunur ve kullanıcı filtresinin yanlış olduğunu
   * sanır.
   */
  it('aralık dışı sayfa son sayfaya çekiliyor', () => {
    const r = applyQuery(veri, { ...EMPTY_QUERY, sort: 'ad', page: 99 }, sayfali);
    expect(r.page).toBe(3);
    expect(r.items).toHaveLength(1);
  });

  it('sayfa boyutu yoksa tek sayfa', () => {
    const r = applyQuery(veri, { ...EMPTY_QUERY, sort: 'ad' }, spec);
    expect(r.pageCount).toBe(1);
    expect(r.items).toHaveLength(5);
  });
});

describe('chipler ve temizleme', () => {
  const q = {
    ...EMPTY_QUERY,
    sort: 'ad',
    q: 'van',
    facets: { tur: ['saha', 'kulup'], sehir: ['Ankara'] },
  };

  it('arama terimi de bir chip', () => {
    const chips = activeChips(q, spec);
    expect(chips[0]).toMatchObject({ param: PARAM_Q, label: '"van"' });
    expect(chips).toHaveLength(4);
  });

  it('chip etiketi facet adını taşıyor', () => {
    const chips = activeChips(q, spec);
    expect(chips.map((c) => c.label)).toContain('Şehir: Ankara');
  });

  it('tek chip kaldırılınca aynı facetin diğer değeri kalıyor', () => {
    const sonra = removeChip(q, { param: 'tur', value: 'saha', label: '' });
    expect(sonra.facets.tur).toEqual(['kulup']);
  });

  it('son değer kaldırılınca facet tamamen siliniyor', () => {
    const sonra = removeChip(q, { param: 'sehir', value: 'Ankara', label: '' });
    expect(sonra.facets.sehir).toBeUndefined();
  });

  it('arama chipi kaldırılınca terim siliniyor', () => {
    expect(removeChip(q, { param: PARAM_Q, value: 'van', label: '' }).q).toBe('');
  });

  it('facet açılıp kapanıyor', () => {
    const acik = toggleFacet(EMPTY_QUERY, 'tur', 'saha');
    expect(acik.facets.tur).toEqual(['saha']);
    expect(toggleFacet(acik, 'tur', 'saha').facets.tur).toBeUndefined();
  });

  /*
   * FİLTRE DEĞİŞİNCE SAYFA 1'E DÖNÜYOR. Dönmezse kullanıcı 7. sayfada
   * kalır, yeni sonuç kümesinde o sayfa yoktur ve ekran boş görünür.
   */
  it('facet değişimi sayfayı başa alıyor', () => {
    const sayfada = { ...EMPTY_QUERY, sort: 'ad', page: 5 };
    expect(toggleFacet(sayfada, 'tur', 'saha').page).toBe(1);
    expect(removeChip({ ...sayfada, q: 'x' }, { param: PARAM_Q, value: 'x', label: '' }).page).toBe(1);
  });

  it('aktif filtre var mı doğru söylüyor', () => {
    expect(hasActiveFilters(EMPTY_QUERY)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_QUERY, q: '  ' })).toBe(false);
    expect(hasActiveFilters(q)).toBe(true);
    /* Sıralama ve sayfa bir FİLTRE değil: "hepsini temizle" düğmesi
       sıralamayı seçmiş kullanıcıda görünmemeli. */
    expect(hasActiveFilters({ ...EMPTY_QUERY, sort: 'puan', page: 3 })).toBe(false);
  });
});
