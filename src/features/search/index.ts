import { photos } from '@/features/photos/data';
import { photoTypeLabels } from '@/features/photos/types';
import { targets, targetKindLabels } from '@/features/targets/data';
import { events } from '@/features/events/data';
import { eventTypeLabels } from '@/features/events/types';
import {
  equipment,
  equipmentCategoryLabels,
  equipmentPath,
} from '@/features/equipment/data';
import { sites } from '@/features/observing-sites/data';
import { articles, articleCategoryLabels } from '@/features/articles/data';
import { news, newsCategoryLabels } from '@/features/news/data';
import { listings } from '@/features/marketplace/data';

/**
 * Global arama (§16.1). Tek kutu; fotoğraf, hedef, kullanıcı, ekipman,
 * etkinlik, gözlem alanı, yazı, haber ve ilanları tarar. Sonuçlar
 * kategori başlıklarıyla gruplanır.
 *
 * MVP'de indeks istemci tarafında mock veriden kurulur. Veri hacmi
 * büyüdüğünde arama sunucuya (Postgres FTS / harici arama servisi — §11.4)
 * taşınacak; `searchAll` imzası aynı kalacak şekilde tasarlanmıştır.
 */

export type SearchCategory =
  | 'fotograf'
  | 'hedef'
  | 'kullanici'
  | 'ekipman'
  | 'etkinlik'
  | 'nokta'
  | 'yazi'
  | 'haber'
  | 'ilan';

export const searchCategoryLabels: Record<SearchCategory, string> = {
  fotograf: 'Fotoğraflar',
  hedef: 'Astronomik Hedefler',
  kullanici: 'Astrofotoğrafçılar',
  ekipman: 'Ekipman',
  etkinlik: 'Etkinlikler',
  nokta: 'Gözlem Alanları',
  yazi: 'Yazılar',
  haber: 'Haberler',
  ilan: 'İlanlar',
};

/** Kategori gösterim sırası — sonuç listesinde bu sırayla görünür. */
export const searchCategoryOrder: SearchCategory[] = [
  'fotograf',
  'hedef',
  'etkinlik',
  'nokta',
  'ekipman',
  'kullanici',
  'yazi',
  'haber',
  'ilan',
];

export interface SearchDoc {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  to: string;
  /** Başlıkta geçmeyen ama aranabilir olması gereken terimler. */
  keywords: string[];
}

export interface SearchGroup {
  category: SearchCategory;
  label: string;
  items: SearchDoc[];
}

/**
 * Türkçe duyarlı normalizasyon: "İSTANBUL", "istanbul" ve "Istanbul"
 * aynı anahtara indirgenir. Aksan/özel harfler ASCII karşılığına çevrilir ki
 * klavye düzeni farkı arama sonucunu değiştirmesin.
 */
const FOLD: Record<string, string> = {
  ı: 'i',
  ş: 's',
  ğ: 'g',
  ü: 'u',
  ö: 'o',
  ç: 'c',
  â: 'a',
  î: 'i',
  û: 'u',
};

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[ışğüöçâîû]/g, (ch) => FOLD[ch] ?? ch)
    .replace(/\s+/g, ' ')
    .trim();
}

function doc(
  category: SearchCategory,
  id: string,
  title: string,
  subtitle: string,
  to: string,
  keywords: (string | number | undefined)[] = []
): SearchDoc {
  return {
    id: `${category}:${id}`,
    category,
    title,
    subtitle,
    to,
    keywords: keywords.filter(Boolean).map(String),
  };
}

/** Tüm modüllerden kurulan arama indeksi. */
export const searchIndex: SearchDoc[] = [
  ...photos.map((p) =>
    doc(
      'fotograf',
      p.slug,
      p.title,
      `${p.target.catalog} · @${p.user.username} · ${p.city}`,
      `/fotograf/${p.slug}`,
      [
        p.target.name,
        p.target.catalog,
        p.target.constellation,
        photoTypeLabels[p.type],
        p.palette,
        p.city,
        p.user.displayName,
        p.setup.optic,
        p.setup.camera,
        p.setup.mount,
      ]
    )
  ),

  ...targets.map((t) =>
    doc(
      'hedef',
      t.slug,
      `${t.catalog} · ${t.name}`,
      `${targetKindLabels[t.kind]} · ${t.constellation}`,
      `/hedef/${t.slug}`,
      [...t.aliases, t.name, t.catalog, t.constellation]
    )
  ),

  ...events.map((e) =>
    doc(
      'etkinlik',
      e.slug,
      e.title,
      `${eventTypeLabels[e.type]} · ${e.city}`,
      `/etkinlik/${e.slug}`,
      [e.venue, e.city, e.organizer.name, eventTypeLabels[e.type]]
    )
  ),

  ...sites.map((s) =>
    doc(
      'nokta',
      s.slug,
      s.name,
      `${s.region} · Bortle ${s.bortle} · ${s.altitude} m`,
      `/saha/${s.slug}`,
      [s.region, `bortle ${s.bortle}`, s.roadAccess]
    )
  ),

  ...equipment.map((eq) =>
    doc(
      'ekipman',
      eq.slug,
      `${eq.brand} ${eq.model}`,
      equipmentCategoryLabels[eq.category],
      equipmentPath(eq),
      [eq.brand, eq.model, ...Object.values(eq.specs)]
    )
  ),

  // Kullanıcılar fotoğraf verisinden türetilir (hesap sistemi bağlanınca
  // profil tablosundan gelecek).
  ...[...new Map(photos.map((p) => [p.user.username, p.user])).values()].map(
    (u) =>
      doc(
        'kullanici',
        u.username,
        u.displayName,
        `@${u.username}`,
        `/profil/${u.username}`,
        [u.username]
      )
  ),

  ...articles.map((a) =>
    doc(
      'yazi',
      a.slug,
      a.title,
      `${articleCategoryLabels[a.category]} · ${a.level}`,
      `/yazi/${a.slug}`,
      [articleCategoryLabels[a.category], a.level, a.summary, a.author]
    )
  ),

  ...news.map((n) =>
    doc(
      'haber',
      n.slug,
      n.title,
      `${newsCategoryLabels[n.category]} · ${n.source.name}`,
      `/haber/${n.slug}`,
      [newsCategoryLabels[n.category], n.summary, n.source.name]
    )
  ),

  ...listings.map((l) =>
    doc(
      'ilan',
      l.slug,
      l.title,
      `${l.price.toLocaleString('tr-TR')} ₺ · ${l.city}`,
      `/ilan/${l.slug}`,
      [l.city, equipmentCategoryLabels[l.category], l.condition]
    )
  ),
];

/**
 * Boşluksuz karşılık: katalog kodları veride "M 31" biçiminde tutulur ama
 * kullanıcı çoğunlukla "M31" yazar. Her alanın boşluksuz bir kopyası da
 * saklanır ki iki yazım da aynı sonucu bulsun.
 */
function compact(value: string): string {
  return value.replace(/\s+/g, '');
}

/** Önceden normalize edilmiş arama metinleri — her tuş vuruşunda yeniden üretilmez. */
const haystack = new Map(
  searchIndex.map((d) => {
    const title = normalize(d.title);
    const rest = normalize([d.subtitle, ...d.keywords].join(' '));
    return [
      d.id,
      {
        title,
        rest,
        titleCompact: compact(title),
        restCompact: compact(rest),
      },
    ];
  })
);

/**
 * Sorguyu tüm kelimelerin eşleşmesi (AND) koşuluyla arar ve alaka düzeyine
 * göre sıralar: başlık başlangıcı > başlık içi > diğer alanlar.
 * Boşluksuz eşleşme bir tık düşük puan alır ki tam yazım öne çıksın.
 */
function score(docId: string, terms: string[]): number {
  const fields = haystack.get(docId);
  if (!fields) return 0;

  let total = 0;
  for (const term of terms) {
    const bare = compact(term);
    if (fields.title.startsWith(term)) total += 6;
    else if (fields.titleCompact.startsWith(bare)) total += 5;
    else if (fields.title.includes(term)) total += 4;
    else if (fields.titleCompact.includes(bare)) total += 3;
    else if (fields.rest.includes(term)) total += 1;
    else if (fields.restCompact.includes(bare)) total += 1;
    else return 0; // her terim bir yerde geçmeli
  }
  return total;
}

export interface SearchOptions {
  /** Kategori başına gösterilecek en fazla sonuç. */
  limitPerCategory?: number;
}

/** Sorguyu çalıştırır ve kategori başlıklarıyla gruplanmış sonuç döner (§16.1). */
export function searchAll(
  query: string,
  { limitPerCategory = 4 }: SearchOptions = {}
): SearchGroup[] {
  const terms = normalize(query).split(' ').filter(Boolean);
  if (terms.length === 0) return [];

  const scored = searchIndex
    .map((d) => ({ doc: d, score: score(d.id, terms) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.doc.title.localeCompare(b.doc.title, 'tr')
    );

  return searchCategoryOrder
    .map((category) => ({
      category,
      label: searchCategoryLabels[category],
      items: scored
        .filter((r) => r.doc.category === category)
        .slice(0, limitPerCategory)
        .map((r) => r.doc),
    }))
    .filter((group) => group.items.length > 0);
}

/** Gruplanmış sonuçları klavye gezinmesi için tek düz listeye indirger. */
export function flattenGroups(groups: SearchGroup[]): SearchDoc[] {
  return groups.flatMap((g) => g.items);
}
