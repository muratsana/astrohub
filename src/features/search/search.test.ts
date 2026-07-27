import { describe, it, expect } from 'vitest';
import {
  normalize,
  searchAll,
  searchIndex,
  flattenGroups,
  searchCategoryOrder,
} from './index';

describe('normalize', () => {
  it('Türkçe harfleri ASCII karşılığına indirger', () => {
    expect(normalize('İSTANBUL')).toBe('istanbul');
    expect(normalize('Istanbul')).toBe('istanbul');
    expect(normalize('ışık kirliliği')).toBe('isik kirliligi');
    expect(normalize('Güneş Gözlemi')).toBe('gunes gozlemi');
  });

  it('fazla boşlukları tekilleştirir ve kırpar', () => {
    expect(normalize('  M31   Andromeda  ')).toBe('m31 andromeda');
  });
});

describe('searchAll (§16.1)', () => {
  it('boş sorguda sonuç döndürmez', () => {
    expect(searchAll('')).toEqual([]);
    expect(searchAll('   ')).toEqual([]);
  });

  it('katalog kodunu boşluklu ve boşluksuz yazımla bulur', () => {
    // Veride "M 31" biçiminde tutulur; kullanıcı çoğunlukla "M31" yazar.
    for (const query of ['M31', 'M 31']) {
      const hedefler = searchAll(query).find((g) => g.category === 'hedef');
      expect(hedefler, `"${query}" sorgusu hedef bulmalı`).toBeDefined();
      expect(
        hedefler!.items.some((i) => normalize(i.title).includes('m 31'))
      ).toBe(true);
    }
  });

  it('NGC kodunu boşluksuz yazımla bulur', () => {
    const hedefler = searchAll('NGC7000').find((g) => g.category === 'hedef');
    expect(hedefler?.items[0]?.title).toContain('NGC 7000');
  });

  it('sonuçları kategori başlıklarıyla gruplar', () => {
    const groups = searchAll('m');
    expect(groups.length).toBeGreaterThan(0);
    for (const group of groups) {
      expect(group.label).toBeTruthy();
      expect(group.items.length).toBeGreaterThan(0);
      expect(group.items.every((i) => i.category === group.category)).toBe(
        true
      );
    }
  });

  it('grupları sabit kategori sırasında döndürür', () => {
    const groups = searchAll('a');
    const positions = groups.map((g) =>
      searchCategoryOrder.indexOf(g.category)
    );
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('Türkçe karakter farkını yok sayar', () => {
    const withDiacritics = searchAll('gözlem');
    const withoutDiacritics = searchAll('gozlem');
    expect(flattenGroups(withoutDiacritics).map((d) => d.id)).toEqual(
      flattenGroups(withDiacritics).map((d) => d.id)
    );
  });

  it('çok kelimeli sorguda tüm terimlerin eşleşmesini arar (AND)', () => {
    const hits = flattenGroups(searchAll('zzzz m31'));
    expect(hits).toHaveLength(0);
  });

  it('başlıkta geçen sonucu yalnızca yan alanda geçenden önce sıralar', () => {
    const first = flattenGroups(searchAll('andromeda'))[0];
    expect(normalize(first.title)).toContain('andromeda');
  });

  it('kategori başına sonuç sayısını sınırlar', () => {
    for (const group of searchAll('a', { limitPerCategory: 2 })) {
      expect(group.items.length).toBeLessThanOrEqual(2);
    }
  });

  it('eşleşme yoksa boş dizi döner', () => {
    expect(searchAll('qwxzptr')).toEqual([]);
  });
});

describe('searchIndex', () => {
  it('tüm modüllerden kayıt içerir (§16.1)', () => {
    const categories = new Set(searchIndex.map((d) => d.category));
    for (const expected of searchCategoryOrder) {
      expect(categories).toContain(expected);
    }
  });

  it('her kaydın benzersiz kimliği ve geçerli bir yolu vardır', () => {
    const ids = new Set<string>();
    for (const doc of searchIndex) {
      expect(ids.has(doc.id)).toBe(false);
      ids.add(doc.id);
      expect(doc.to.startsWith('/')).toBe(true);
      expect(doc.title.trim()).not.toBe('');
    }
  });
});
