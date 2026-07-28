import { describe, expect, it } from 'vitest';
import { applyFeatured } from './featured';

interface Item {
  slug: string;
}

const items: Item[] = [
  { slug: 'a' },
  { slug: 'b' },
  { slug: 'c' },
  { slug: 'd' },
  { slug: 'e' },
];

const slugOf = (i: Item) => i.slug;

describe('applyFeatured', () => {
  it('seçim yoksa kendi sırasını korur', () => {
    // Yönetici hiçbir şey seçmediyse ana sayfa eskisi gibi çalışmalı;
    // boş bir tablo, boş bir şerit anlamına gelmemeli.
    expect(applyFeatured(items, [], slugOf, 3).map(slugOf)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('seçilenleri verilen sırayla öne alır', () => {
    expect(applyFeatured(items, ['d', 'b'], slugOf, 4).map(slugOf)).toEqual([
      'd',
      'b',
      'a',
      'c',
    ]);
  });

  it('seçim sınırı doldurursa gerisini almaz', () => {
    expect(applyFeatured(items, ['e', 'd', 'c'], slugOf, 2).map(slugOf)).toEqual(
      ['e', 'd']
    );
  });

  it('silinmiş içeriğin slug’ını sessizce atlar', () => {
    // Seçim yapıldıktan sonra içerik kaldırılmış olabilir. Boş bir kart
    // göstermek, sıralamayı hiç uygulamamaktan kötüdür.
    expect(applyFeatured(items, ['yok', 'c'], slugOf, 3).map(slugOf)).toEqual([
      'c',
      'a',
      'b',
    ]);
  });

  it('aynı slug iki kez seçilmişse bir kez gösterir', () => {
    expect(applyFeatured(items, ['b', 'b'], slugOf, 3).map(slugOf)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('sınır listeden büyükse elde olanı verir', () => {
    expect(applyFeatured(items.slice(0, 2), ['b'], slugOf, 9).map(slugOf)).toEqual(
      ['b', 'a']
    );
  });
});
