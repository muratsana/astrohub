import { byText, type ExplorerSpec } from '@/features/explorer/query';
import { articleCategoryLabels, type Article } from './data';

/**
 * YAZILARIN DATA EXPLORER TANIMI (Faz 4).
 *
 * Sayfada ARAMA HİÇ YOKTU; kategori sekmesi `useState` içindeydi, yani
 * "işleme yazıları" gibi bir seçim paylaşılamıyordu.
 */
export const articlesSpec: ExplorerSpec<Article> = {
  searchFields: (a) => [a.title, a.summary, a.author],

  facets: [
    {
      param: 'kategori',
      label: 'Kategori',
      valueOf: (a) => a.category,
      labelOf: (v) =>
        articleCategoryLabels[v as keyof typeof articleCategoryLabels] ?? v,
    },
    { param: 'yazar', label: 'Yazar', valueOf: (a) => a.author },
  ],

  sorts: [
    {
      value: 'yeni',
      label: 'En yeni',
      compare: (a, b) => b.publishedAt.localeCompare(a.publishedAt),
    },
    {
      value: 'eski',
      label: 'En eski',
      compare: (a, b) => a.publishedAt.localeCompare(b.publishedAt),
    },
    { value: 'baslik', label: 'Başlık (A–Z)', compare: byText((a) => a.title) },
  ],

  defaultSort: 'yeni',
};
