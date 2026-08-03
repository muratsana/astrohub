import { useMemo } from 'react';
import {
  mergeWithSeed,
  useEntries,
  type ContentEntry,
} from '@/services/content/entries';
import { sortedNews, type NewsItem } from './data';

/**
 * HABERLERİN TEK OKUMA KAPISI (QA'ya girmemiş bulgu — radyo kopukluğunun
 * eşi): yönetim paneli `content_entries`e yazıyordu ama /haberler ve
 * /haber/:slug hâlâ tohum diziyi okuyordu. Panelden yayımlanan haber ana
 * sayfa şeridinde görünüp kendi sayfasında 404 veriyordu.
 *
 * Eşleme NewsStrip'teki gömülü kopyadan buraya taşındı; artık şerit,
 * liste ve detay aynı birleştirilmiş listeyi görüyor.
 */
export function entryToNewsItem(e: ContentEntry): NewsItem {
  return {
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    // Kategori seçenekleri panelde newsCategoryLabels ile sınırlı;
    // buradaki dönüşüm ancak panel dışı elle yazılmış veride şaşar.
    category: e.category as NewsItem['category'],
    publishedAt: e.publishedAt,
    tint: e.tint ?? '150,185,235',
    image: e.image ?? undefined,
    body: e.body,
    bodyBlocks: e.bodyBlocks,
    /* Kaynağı olmayan kayıt panelden yazılmış özgün içeriktir —
       künyesi Astrohub'dır, "—" değil. */
    source: e.source ?? { name: 'Astrohub' },
  };
}

export interface NewsList {
  items: NewsItem[];
  /** Veritabanı yanıtı henüz gelmediyse true — detay sayfası 404 basmadan önce bekler. */
  loading: boolean;
}

/** Tohum + veritabanı birleşimi, yayın tarihine göre yeniden sıralı. */
export function useNewsItems(): NewsList {
  const db = useEntries('haber');
  const items = useMemo(
    () =>
      mergeWithSeed(sortedNews(), db.entries, entryToNewsItem).sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt)
      ),
    [db.entries]
  );
  return { items, loading: db.loading };
}
