import { useMemo } from 'react';
import {
  mergeWithSeed,
  useEntries,
  type ContentEntry,
} from '@/services/content/entries';
import { glossaryTerms, type GlossaryCategory, type GlossaryTerm } from './glossary';
import { faqItems, type FaqCategory, type FaqItem } from './faq';
import { normalizeTr } from '@/lib/text';

/**
 * SÖZLÜK VE SSS — okuma kapısı (§14.9).
 *
 * Haber/yazıdaki `useArticles` deseninin aynısı: `useEntries` +
 * `mergeWithSeed`. Aynı `slug` gelirse VERİTABANI KAZANIR, yani panelden
 * girilen bir tanım koddaki tohumun üstüne yazıyor ve düzeltmek için
 * dağıtım gerekmiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRALAMA ALFABETİK, TARİHE GÖRE DEĞİL
 *
 * Haber ve yazı `published_at desc` sıralanır çünkü orada yenilik
 * değerlidir. Sözlükte ve SSS'te değil: kullanıcı bir terimi ARIYOR,
 * "en son eklenen terim" diye bir ihtiyaç yok. `localeCompare(..., 'tr')`
 * kullanılıyor — varsayılan sıralama Türkçe'de "ı" ve "i"yi, "ö" ve "o"yu
 * yanlış yere koyar.
 */

function entryToTerm(e: ContentEntry): GlossaryTerm {
  return {
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    body: e.body,
    category: e.category as GlossaryCategory,
  };
}

function entryToFaq(e: ContentEntry): FaqItem {
  return {
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    body: e.body,
    category: e.category as FaqCategory,
  };
}

export interface KnowledgeList<T> {
  items: T[];
  loading: boolean;
}

export function useGlossary(): KnowledgeList<GlossaryTerm> {
  const db = useEntries('sozluk');
  const items = useMemo(
    () =>
      mergeWithSeed(glossaryTerms, db.entries, entryToTerm).sort((a, b) =>
        a.title.localeCompare(b.title, 'tr')
      ),
    [db.entries]
  );
  return { items, loading: db.loading };
}

export function useFaq(): KnowledgeList<FaqItem> {
  const db = useEntries('sss');
  const items = useMemo(
    () => mergeWithSeed(faqItems, db.entries, entryToFaq),
    [db.entries]
  );
  return { items, loading: db.loading };
}

/**
 * Terimleri baş harfe göre gruplar.
 *
 * TÜRKÇE HARFLER KENDİ BAŞLIKLARINDA: "Ö" ile başlayan terim "O"nun
 * altına düşmemeli. `toLocaleUpperCase('tr')` bunu çözüyor — düz
 * `toUpperCase()` "i"yi "I" yapıp Türkçe alfabede yanlış yere koyardı.
 *
 * Sayı ya da simgeyle başlayan terimler tek bir "#" başlığında toplanıyor
 * (örn. bir gün "2× Barlow" eklenirse) — her rakam için ayrı başlık,
 * çoğu boş kalacak bir dizin üretirdi.
 */
export function groupByInitial<T extends { title: string }>(
  items: T[]
): { letter: string; items: T[] }[] {
  const gruplar = new Map<string, T[]>();

  for (const item of items) {
    const ilk = item.title.trim().charAt(0).toLocaleUpperCase('tr');
    const anahtar = /\p{L}/u.test(ilk) ? ilk : '#';
    const liste = gruplar.get(anahtar);
    if (liste) liste.push(item);
    else gruplar.set(anahtar, [item]);
  }

  return [...gruplar.entries()]
    .map(([letter, list]) => ({ letter, items: list }))
    .sort((a, b) => a.letter.localeCompare(b.letter, 'tr'));
}

/**
 * Basit metin araması — terim adı ve tanımda geçen.
 *
 * Sunucuya gitmiyoruz: sözlük birkaç yüz kayıtla sınırlı bir liste ve
 * tamamı zaten bellekte. Yazarken her tuşta bir sorgu atmak, hem ağ hem
 * gecikme açısından karşılıksız olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARAMADA `normalizeTr`, SIRALAMADA `localeCompare('tr')` — AYNI ŞEY DEĞİL
 *
 * İlk yazımda arama da `toLocaleLowerCase('tr')` kullanıyordu ve test
 * yakaladı: Türkçe yerelde `'SEEING'` küçültülünce `'seeıng'` oluyor
 * (noktasız ı), yani caps lock açık arayan kullanıcı HİÇBİR ŞEY
 * bulamıyordu. Türkçe harf dönüşümü GÖSTERİM ve SIRALAMA için doğru,
 * EŞLEŞTİRME için yanlış — çünkü kullanıcının yazdığı biçimle metindeki
 * biçim aynı olmak zorunda değil.
 *
 * `normalizeTr` (lib/text) tam da bunun için var: ı/i, ş/s, ğ/g, ü/u,
 * ö/o, ç/c hepsini katlıyor. "IŞIK" ve "ışık" aynı anahtara iniyor.
 */
export function filterByQuery<T extends { title: string; summary: string }>(
  items: T[],
  query: string
): T[] {
  const q = normalizeTr(query);
  if (!q) return items;
  return items.filter(
    (item) =>
      normalizeTr(item.title).includes(q) ||
      normalizeTr(item.summary).includes(q)
  );
}
