import { describe, it, expect } from 'vitest';
import { personalFacet, withFacets, PERSONAL_VALUE } from './personalFacets';
import { applyQuery, parseQuery, type ExplorerSpec } from './query';

/**
 * KİŞİSEL FACET'LER (Faz 4).
 *
 * Ölçülen asıl kural: facet ancak KÜME HAZIRSA var oluyor. Oturumsuz
 * kullanıcıya "Kaydettiklerim" kutusu gösterip her zaman boş sonuç
 * döndürmek, fazın yasakladığı "çalışmayan kontrol" tam olarak buydu —
 * kullanıcı kutuyu işaretler, liste boşalır ve sorunu kendinde arar.
 */

interface Kayit {
  id: string;
  ad: string;
  sahip: string;
}

const veri: Kayit[] = [
  { id: 'a', ad: 'Andromeda', sahip: 'u1' },
  { id: 'b', ad: 'Orion', sahip: 'u2' },
  { id: 'c', ad: 'Kartal', sahip: 'u1' },
];

const temel: ExplorerSpec<Kayit> = {
  searchFields: (k) => [k.ad],
  facets: [{ param: 'sahip', label: 'Sahip', valueOf: (k) => k.sahip }],
  sorts: [{ value: 'ad', label: 'Ad', compare: (a, b) => a.ad.localeCompare(b.ad, 'tr') }],
  defaultSort: 'ad',
};

const suz = (spec: ExplorerSpec<Kayit>, search: string) =>
  applyQuery(veri, parseQuery(new URLSearchParams(search), spec), spec).items.map(
    (k) => k.id
  );

describe('personalFacet', () => {
  const kaydedilen = new Set(['a', 'c']);
  const facet = personalFacet<Kayit>({
    param: 'kaydettiklerim',
    label: 'Kaydettiklerim',
    has: (k) => kaydedilen.has(k.id),
  });

  it('yalnızca kümedekiler için değer üretiyor', () => {
    /* Üç durumlu onay kutusu gerekmiyor: değer yoksa seçim o kaydı
       geçirmez, seçim yoksa hiçbir şey süzülmez. */
    expect(facet.valueOf(veri[0]!)).toBe(PERSONAL_VALUE);
    expect(facet.valueOf(veri[1]!)).toBeNull();
  });

  it('süzgeç olarak çalışıyor', () => {
    const spec = withFacets(temel, [facet]);
    expect(suz(spec, '?kaydettiklerim=evet')).toEqual(['a', 'c']);
  });

  it('seçilmemişse hiçbir şey süzmüyor', () => {
    const spec = withFacets(temel, [facet]);
    expect(suz(spec, '')).toHaveLength(3);
  });

  it('başka facet’lerle birlikte çalışıyor', () => {
    const spec = withFacets(temel, [facet]);
    expect(suz(spec, '?kaydettiklerim=evet&sahip=u1')).toEqual(['a', 'c']);
    expect(suz(spec, '?kaydettiklerim=evet&sahip=u2')).toEqual([]);
  });
});

describe('withFacets', () => {
  it('`null` girdiler atlanıyor — küme hazır değilse facet YOK', () => {
    const spec = withFacets(temel, [null, undefined]);
    expect(spec.facets).toHaveLength(1);
    /* Facet hiç tanımlı değilse adres çubuğundaki parametre de
       süzmüyor: oturumsuz kullanıcı `?kaydettiklerim=evet` bağlantısını
       açtığında boş liste değil, tam liste görüyor. */
    expect(suz(spec, '?kaydettiklerim=evet')).toHaveLength(3);
  });

  it('eklenecek bir şey yoksa AYNI nesne dönüyor', () => {
    expect(withFacets(temel, [])).toBe(temel);
  });

  it('özgün tanımı değiştirmiyor', () => {
    /* Spec’ler modül sabitleri: mutasyon iki farklı kullanıcının
       kümesini aynı sabitte birbirinin üstüne yazardı. */
    const once = temel.facets.length;
    withFacets(temel, [
      personalFacet<Kayit>({ param: 'x', label: 'X', has: () => true }),
    ]);
    expect(temel.facets).toHaveLength(once);
  });

  it('aynı parametre iki kez eklenmiyor — sayfanın kendi tanımı kazanıyor', () => {
    const spec = withFacets(temel, [
      personalFacet<Kayit>({ param: 'sahip', label: 'Çakışan', has: () => true }),
    ]);
    expect(spec.facets).toHaveLength(1);
    expect(spec.facets[0]!.label).toBe('Sahip');
  });

  it('birden çok kişisel facet birlikte ekleniyor', () => {
    const spec = withFacets(temel, [
      personalFacet<Kayit>({
        param: 'kaydettiklerim',
        label: 'Kaydettiklerim',
        has: (k) => k.id === 'a',
      }),
      personalFacet<Kayit>({
        param: 'takip',
        label: 'Takip ettiklerim',
        has: (k) => k.sahip === 'u1',
      }),
    ]);
    expect(spec.facets.map((f) => f.param)).toEqual([
      'sahip',
      'kaydettiklerim',
      'takip',
    ]);
    expect(suz(spec, '?takip=evet')).toEqual(['a', 'c']);
    expect(suz(spec, '?takip=evet&kaydettiklerim=evet')).toEqual(['a']);
  });
});
