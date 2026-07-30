import { useMemo } from 'react';
import {
  mergeWithSeed,
  useEntries,
  type ContentEntry,
} from '@/services/content/entries';
import { articles, type Article } from './data';

/**
 * YAZILARIN TEK OKUMA KAPISI — gerekçe için `features/news/useNews.ts`.
 * Panelden yayımlanan yazı; şeritte, listede ve kendi adresinde aynı
 * kayıttır.
 */
export function entryToArticle(e: ContentEntry): Article {
  return {
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    category: e.category as Article['category'],
    level: (e.level ?? 'Başlangıç') as Article['level'],
    duration: e.duration ?? '',
    publishedAt: e.publishedAt,
    author: e.author ?? 'Astrohub',
    body: e.body,
    tint: e.tint ?? '150,185,235',
    image: e.image ?? undefined,
  };
}

export interface ArticleList {
  items: Article[];
  /** Veritabanı yanıtı henüz gelmediyse true — detay sayfası 404 basmadan önce bekler. */
  loading: boolean;
}

/** Tohum + veritabanı birleşimi, yayın tarihine göre yeniden sıralı. */
export function useArticles(): ArticleList {
  const db = useEntries('yazi');
  const items = useMemo(
    () =>
      mergeWithSeed(articles, db.entries, entryToArticle).sort((a, b) =>
        b.publishedAt.localeCompare(a.publishedAt)
      ),
    [db.entries]
  );
  return { items, loading: db.loading };
}
