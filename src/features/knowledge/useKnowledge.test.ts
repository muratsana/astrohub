import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { filterByQuery, groupByInitial } from './useKnowledge';
import { categoryTool, glossaryCategoryLabels, glossaryTerms } from './glossary';
import { faqCategoryLabels, faqItems } from './faq';
import { siteMap } from '@/app/navigation';

/**
 * SÖZLÜK VE SSS (§14.9).
 *
 * Ölçülenler:
 *
 *  1. TÜRKÇE SIRALAMA VE BAŞ HARF. "Ö" kendi başlığında olmalı, "O"nun
 *     altında değil; `toUpperCase()` "i"yi "I" yapıp Türkçe alfabede
 *     yanlış yere koyardı.
 *  2. ARAMA hem terimde hem tanımda, büyük/küçük harf duyarsız.
 *  3. TOHUM TUTARLI: her terimin kategorisinin etiketi var, her slug
 *     benzersiz, her "ilgili araç" gerçek bir rotayı gösteriyor —
 *     §14'ün "çalışmayan placeholder gösterme" kuralı bağlantılar için
 *     de geçerli.
 *  4. `kind` KISITI GÖÇTE GENİŞLETİLDİ; kod ile göç aynı listeyi
 *     tanımalı.
 */

describe('groupByInitial', () => {
  it('baş harfe göre grupluyor, Türkçe sırayla', () => {
    const gruplar = groupByInitial([
      { title: 'Zenit' },
      { title: 'Bortle' },
      { title: 'Çap' },
    ]);
    expect(gruplar.map((g) => g.letter)).toEqual(['B', 'Ç', 'Z']);
  });

  it('Türkçe büyük harf: "ı" ve "i" karışmıyor', () => {
    /* `toUpperCase()` "ışık" → "ISIK" verir ve Türkçe'de doğru; ama
       "iyi" → "IYI" verir ve YANLIŞ (doğrusu "İYİ"). İkisi tek harfte
       birleşince dizin bozulur. */
    const gruplar = groupByInitial([{ title: 'ışık kirliliği' }, { title: 'iz' }]);
    expect(gruplar.map((g) => g.letter)).toEqual(['I', 'İ']);
  });

  it('harf olmayan baş karakterler tek "#" başlığında', () => {
    const gruplar = groupByInitial([{ title: '2× Barlow' }, { title: 'Ay' }]);
    expect(gruplar.map((g) => g.letter)).toEqual(['#', 'A']);
  });
});

describe('filterByQuery', () => {
  const liste = [
    { title: 'Seeing', summary: 'Atmosfer türbülansı' },
    { title: 'Flat kare', summary: 'Aydınlatma farkını ölçer' },
  ];

  it('boş sorgu listeyi olduğu gibi verir', () => {
    expect(filterByQuery(liste, '  ')).toBe(liste);
  });

  it('terim adında arıyor', () => {
    expect(filterByQuery(liste, 'flat').map((x) => x.title)).toEqual(['Flat kare']);
  });

  it('tanımda da arıyor', () => {
    /* Kullanıcı terimi bilmiyorsa tanımdan bulabilmeli — sözlüğün asıl
       işi bu. */
    expect(filterByQuery(liste, 'türbülans').map((x) => x.title)).toEqual([
      'Seeing',
    ]);
  });

  it('büyük/küçük harf duyarsız', () => {
    expect(filterByQuery(liste, 'SEEING')).toHaveLength(1);
  });
});

describe('sözlük tohumu', () => {
  it('slug\'lar benzersiz', () => {
    const slugs = glossaryTerms.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('her terimin kategorisinin etiketi var', () => {
    /* Etiketsiz kategori ekranda ham anahtar olarak görünürdü. */
    for (const t of glossaryTerms) {
      expect(glossaryCategoryLabels[t.category]).toBeTruthy();
    }
  });

  it('her terimin tek cümlelik tanımı var', () => {
    for (const t of glossaryTerms) {
      expect(t.summary.trim().length).toBeGreaterThan(20);
    }
  });

  it('"ilgili araç" bağlantıları gerçek rotalar', () => {
    /* §14 "çalışmayan placeholder gösterme" diyor; kırık bir araç
       bağlantısı da placeholder sayılır. Modül haritasında karşılığı
       olmayan adres bu testte düşer. */
    const yollar = new Set(siteMap.flatMap((g) => g.items.map((i) => i.to)));
    for (const arac of Object.values(categoryTool)) {
      expect(yollar.has(arac.to), `bilinmeyen rota: ${arac.to}`).toBe(true);
    }
  });
});

describe('SSS tohumu', () => {
  it('slug\'lar benzersiz', () => {
    const slugs = faqItems.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('her sorunun kategorisinin etiketi var', () => {
    for (const f of faqItems) {
      expect(faqCategoryLabels[f.category]).toBeTruthy();
    }
  });

  it('başlıklar soru biçiminde', () => {
    /* SSS başlığı bir soru olmalı; "Kotalar" gibi bir başlık cevabı
       aramayı zorlaştırır. */
    for (const f of faqItems) {
      expect(f.title.trim().endsWith('?'), f.title).toBe(true);
    }
  });
});

describe('0065 göçü', () => {
  const sql = readFileSync(
    join(
      resolve(__dirname, '../../..'),
      'supabase/migrations/0065_sozluk_ve_sss.sql'
    ),
    'utf8'
  );

  it('`kind` kısıtı dört türü de tanıyor', () => {
    const kisit = sql.slice(sql.indexOf('content_entries_kind_check'));
    for (const kind of ['haber', 'yazi', 'sozluk', 'sss']) {
      expect(kisit).toContain(`'${kind}'`);
    }
  });

  it('göç yeni tablo AÇMIYOR — fazın birleştirme kuralı', () => {
    /* §14 "çakışan modülleri birleştir" diyor; sözlük/SSS için ayrı
       tablo açmak ikinci bir RLS politikası ve ikinci bir panel yüzeyi
       demekti. */
    expect(sql).not.toMatch(/create table/i);
  });
});
