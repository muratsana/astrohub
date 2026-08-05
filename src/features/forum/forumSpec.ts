import type { ExplorerSpec, SortSpec } from '@/features/explorer/query';
import { forumCategories, type ForumThread } from './types';

/**
 * FORUMUN DATA EXPLORER TANIMI (Faz 4).
 *
 * ═════════════════════════════════════════════════════════════════════
 * SABİTLENMİŞ KONULAR HER SIRALAMADA ÜSTTE
 *
 * `sortThreads` bunu yapıyordu ve yorumu şöyleydi: "Sabitleme bir
 * sıralama tercihi değil, moderasyon kararı." Genel motor bunu
 * bilmiyor — her sıralama yalnızca kendi ölçütünü uygular.
 *
 * Naif bir taşıma duyuru ve kural konularını listenin ortasına
 * gömerdi; yeni gelen kullanıcı forumun kurallarını hiç görmezdi.
 *
 * `sabitOnce` her karşılaştırıcıyı sarıyor: önce sabitleme, sonra
 * ölçüt. Tek tek yazmak yerine sarmalayıcı kullanılıyor çünkü beş
 * sıralamadan birini unutmak sessiz bir gerileme olurdu.
 */
function sabitOnce(
  compare: (a: ForumThread, b: ForumThread) => number
): (a: ForumThread, b: ForumThread) => number {
  return (a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return compare(a, b);
  };
}

const zaman = (iso: string) => new Date(iso).getTime();

const SIRALAMALAR: SortSpec<ForumThread>[] = [
  {
    value: 'son-etkinlik',
    label: 'Son etkinlik',
    compare: (a, b) => zaman(b.lastActivityAt) - zaman(a.lastActivityAt),
  },
  {
    value: 'en-yeni',
    label: 'En yeni tarihli',
    compare: (a, b) => zaman(b.createdAt) - zaman(a.createdAt),
  },
  {
    value: 'en-eski',
    label: 'En eski tarihli',
    compare: (a, b) => zaman(a.createdAt) - zaman(b.createdAt),
  },
  {
    value: 'en-cok-yanit',
    label: 'En çok yanıtlanan',
    compare: (a, b) => b.replyCount - a.replyCount,
  },
  {
    value: 'en-cok-goruntulenme',
    label: 'En çok görüntülenen',
    compare: (a, b) => b.viewCount - a.viewCount,
  },
];

export const forumSpec: ExplorerSpec<ForumThread> = {
  searchFields: (t) => [t.title, t.body, t.author.username],

  facets: [
    {
      param: 'kategori',
      label: 'Kategori',
      valueOf: (t) => t.category,
      labelOf: (v) =>
        forumCategories[v as keyof typeof forumCategories]?.name ?? v,
    },
  ],

  sorts: SIRALAMALAR.map((s) => ({ ...s, compare: sabitOnce(s.compare) })),

  defaultSort: 'son-etkinlik',
};
