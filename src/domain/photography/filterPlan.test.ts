import { describe, it, expect } from 'vitest';
import {
  continuumRejection,
  filterClassLabels,
  moonImpact,
  planFilters,
  skyFit,
  targetFit,
  worseFit,
  type FilterClass,
  type SkyConditions,
} from './filterPlan';

/**
 * FİLTRE–HEDEF UYUMU (§14.2).
 *
 * Ölçülenler, fazın iki kuralına karşılık geliyor:
 *
 *  1. FORMÜL DOĞRU MU — `continuumRejection` elle hesaplanmış oranlarla
 *     karşılaştırılıyor.
 *  2. KESİNLİK İDDİASI YOK — LP filtresi hiçbir koşulda `uygun`
 *     dönmüyor, ay etkisi sayı değil BANT, ve güneş her sınıfta
 *     reddediliyor.
 */

const karanlikGece: SkyConditions = {
  moonIllumination: 0,
  moonSeparationDeg: null,
  bortle: 3,
};

const dolunay: SkyConditions = {
  moonIllumination: 1,
  moonSeparationDeg: 25,
  bortle: 4,
};

const sehir: SkyConditions = {
  moonIllumination: 0,
  moonSeparationDeg: null,
  bortle: 8,
};

describe('moonImpact', () => {
  it('ay ufkun altındaysa etki yok', () => {
    /* Uzaklık `null` = ay ortada yok; aydınlanma oranının anlamı kalmaz. */
    expect(moonImpact({ ...karanlikGece, moonIllumination: 1 })).toBe('yok');
  });

  it('dolunay hedefin yanındayken ağır', () => {
    expect(moonImpact(dolunay)).toBe('agir');
  });

  it('dolunay gökyüzünün öbür ucundayken bile belirgin', () => {
    /* Ay ışığı bütün göğe yayılır; uzaklık yumuşatır, sıfırlamaz. */
    expect(
      moonImpact({ ...dolunay, moonSeparationDeg: 150 })
    ).toBe('belirgin');
  });

  it('ince hilal uzaktayken etkisiz', () => {
    expect(
      moonImpact({ moonIllumination: 0.08, moonSeparationDeg: 120, bortle: 3 })
    ).toBe('yok');
  });

  it('yarım ay yakındayken ağır', () => {
    expect(
      moonImpact({ moonIllumination: 0.5, moonSeparationDeg: 20, bortle: 3 })
    ).toBe('agir');
  });
});

describe('targetFit', () => {
  it('emisyon bulutsusunda dar bant uygun, geniş bant sınırlı', () => {
    const f = targetFit('emisyon-bulutsusu');
    expect(f['dar-bant'].fit).toBe('uygun');
    expect(f['dual-band'].fit).toBe('uygun');
    expect(f['genis-bant'].fit).toBe('sinirli');
  });

  it('galakside dar bant EK kanal, tek başına değil', () => {
    const f = targetFit('galaksi');
    expect(f['genis-bant'].fit).toBe('uygun');
    expect(f['dar-bant'].fit).toBe('sinirli');
    expect(f['dar-bant'].reasons[0]).toMatch(/EK kanal/);
  });

  it('yansıma bulutsusunda dar bant hedefi de söndürür', () => {
    const f = targetFit('yansima-bulutsusu');
    expect(f['dar-bant'].fit).toBe('uygun-degil');
    expect(f['dual-band'].fit).toBe('uygun-degil');
  });

  it('kümelerde dar bant uygun değil', () => {
    for (const k of ['kuresel-kume', 'acik-kume', 'cift-yildiz'] as const) {
      expect(targetFit(k)['dar-bant'].fit, k).toBe('uygun-degil');
    }
  });

  it('karanlık bulutsuda dar bant "duruma bağlı" — arka perde bilinmiyor', () => {
    const f = targetFit('karanlik-bulutsu');
    expect(f['dar-bant'].fit).toBe('sinirli');
    expect(f['dar-bant'].reasons[0]).toMatch(/arka perde/);
  });

  it('güneşte HİÇBİR sınıf uygun değil ve uyarı güvenlik uyarısı', () => {
    const f = targetFit('gunes');
    for (const cls of Object.keys(filterClassLabels) as FilterClass[]) {
      expect(f[cls].fit, cls).toBe('uygun-degil');
      expect(f[cls].reasons[0]).toMatch(/GÖZE KALICI ZARAR/);
    }
  });
});

describe('skyFit', () => {
  it('dolunayda geniş bant uygun değil, dar bant etkilenmiyor', () => {
    expect(skyFit('genis-bant', dolunay).fit).toBe('uygun-degil');
    expect(skyFit('dar-bant', dolunay).fit).toBe('uygun');
  });

  it('Bortle 8 geniş bandı düşürüyor', () => {
    expect(skyFit('genis-bant', sehir).fit).toBe('uygun-degil');
    expect(skyFit('dual-band', sehir).fit).toBe('uygun');
  });

  it('karanlık gecede geniş bant sorunsuz', () => {
    expect(skyFit('genis-bant', karanlikGece).fit).toBe('uygun');
  });

  it('LP filtresi HİÇBİR koşulda `uygun` değil', () => {
    /* Bilerek: kazanç lamba türüne bağlı ve LED'e geçişle kayboluyor.
       "Uygun" demek, ölçmediğimiz bir faydayı vaat etmek olurdu. */
    for (const sky of [karanlikGece, dolunay, sehir]) {
      expect(skyFit('lp', sky).fit).not.toBe('uygun');
    }
  });

  it('karanlık gökyüzünde LP filtresi zararlı', () => {
    expect(skyFit('lp', karanlikGece).fit).toBe('uygun-degil');
  });
});

describe('planFilters', () => {
  it('şehirden emisyon bulutsusu: dar bant başta', () => {
    const liste = planFilters('emisyon-bulutsusu', sehir);
    expect(liste[0]!.filterClass).toMatch(/dar-bant|dual-band/);
    expect(liste[0]!.fit).toBe('uygun');
    expect(liste.at(-1)!.fit).not.toBe('uygun');
  });

  it('kötü yargı kazanıyor: dolunayda galaksi için hiçbir şey uygun değil', () => {
    const liste = planFilters('galaksi', dolunay);
    expect(liste.every((v) => v.fit !== 'uygun')).toBe(true);
  });

  it('karanlık gecede galaksi: geniş bant uygun', () => {
    const liste = planFilters('galaksi', karanlikGece);
    expect(liste[0]!.filterClass).toBe('genis-bant');
    expect(liste[0]!.fit).toBe('uygun');
  });

  it('her sınıf tam olarak bir kez listeleniyor', () => {
    const liste = planFilters('emisyon-bulutsusu', karanlikGece);
    expect(new Set(liste.map((v) => v.filterClass)).size).toBe(4);
    expect(liste).toHaveLength(4);
  });

  it('her yargı gerekçesiyle geliyor', () => {
    for (const v of planFilters('galaksi', dolunay)) {
      expect(v.reasons.length, v.filterClass).toBeGreaterThan(0);
    }
  });
});

describe('worseFit', () => {
  it('kötü olan kazanıyor, sıra fark etmiyor', () => {
    expect(worseFit('uygun', 'sinirli')).toBe('sinirli');
    expect(worseFit('sinirli', 'uygun')).toBe('sinirli');
    expect(worseFit('sinirli', 'uygun-degil')).toBe('uygun-degil');
    expect(worseFit('uygun', 'uygun')).toBe('uygun');
  });
});

describe('continuumRejection', () => {
  it('7 nm / 300 nm ≈ %2,3', () => {
    expect(continuumRejection(7)).toBeCloseTo(0.0233, 4);
  });

  it('3 nm dar bant 7 nm’den daha çok eliyor', () => {
    expect(continuumRejection(3)).toBeLessThan(continuumRejection(7));
  });

  it('referans bant değiştirilebiliyor', () => {
    expect(continuumRejection(10, 100)).toBeCloseTo(0.1, 6);
  });

  it('referanstan geniş bant 1’i aşmıyor', () => {
    /* "Fonun %150’sini geçiriyor" anlamsız olurdu. */
    expect(continuumRejection(400, 300)).toBe(1);
  });

  it('geçersiz girdi hata veriyor', () => {
    expect(() => continuumRejection(0)).toThrow();
    expect(() => continuumRejection(-5)).toThrow();
    expect(() => continuumRejection(7, 0)).toThrow();
  });
});
