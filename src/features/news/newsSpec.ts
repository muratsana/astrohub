import { byText, type ExplorerSpec } from '@/features/explorer/query';
import { newsCategoryLabels, type NewsItem } from './data';

/**
 * HABERLERİN DATA EXPLORER TANIMI (Faz 4).
 *
 * Sayfada ARAMA HİÇ YOKTU — yalnızca kategori sekmeleri vardı ve onlar
 * da `useState` içindeydi, yani seçilen kategori paylaşılamıyordu.
 */
export const newsSpec: ExplorerSpec<NewsItem> = {
  searchFields: (n) => [n.title, n.summary, n.source.name],

  facets: [
    {
      param: 'kategori',
      label: 'Kategori',
      valueOf: (n) => n.category,
      labelOf: (v) =>
        newsCategoryLabels[v as keyof typeof newsCategoryLabels] ?? v,
    },
    { param: 'kaynak', label: 'Kaynak', valueOf: (n) => n.source.name },
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
    { value: 'baslik', label: 'Başlık (A–Z)', compare: byText((n) => n.title) },
  ],

  defaultSort: 'yeni',
};
