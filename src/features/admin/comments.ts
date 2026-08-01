import { getSupabase } from '@/services/supabase/client';

/**
 * KULLANICI METİNLERİ — fotoğraf yorumu, forum gönderisi, saha yorumu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `records.ts`TEN AYRI
 *
 * `records.ts` KAYITLARI yönetiyor: başlığı, durumu ve sahibi olan
 * şeyler. Bunların hepsinde asıl eylem "durumu değiştir".
 *
 * Buradakiler METİN. Üçünün de durumu yok — bir yorum ya duruyor ya
 * silinmiş. Ve asıl gösterilmesi gereken şey başlık değil, metnin
 * KENDİSİ: moderatör kararını ancak yazıyı okuyarak verebilir. Aynı
 * bileşene sıkıştırmak, satır başına bir başlık gösterip moderatörü her
 * seferinde siteye tıklamaya zorlamak olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YAZAR KOLONU ÜÇÜNDE AYNI DEĞİL
 *
 * `photo_comments.user_id`, `forum_posts.author_id`, `site_reviews.user_id`.
 * Tek bir isim varsaymak, forum sekmesini sessizce boş bırakırdı — sorgu
 * hata verir ve liste hiç dolmaz. Kolon adı bu yüzden tür tanımında
 * yazılı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YALNIZCA SİLME
 *
 * Düzenleme yok ve olmamalı: bir moderatörün başkasının cümlesini
 * değiştirebilmesi, o kişinin ağzına söz koymak demek. Uygun olmayan bir
 * metin kaldırılır, düzeltilmez.
 */

export type CommentKind = 'photoComment' | 'forumPost' | 'siteReview';

export interface CommentRow {
  id: string;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string | null;
  /** Saha yorumunda 5 üzerinden puan; diğerlerinde yok. */
  rating: number | null;
}

interface CommentSpec {
  label: string;
  table: string;
  authorColumn: 'user_id' | 'author_id';
  select: string;
  hasRating: boolean;
}

export const COMMENT_KINDS: Record<CommentKind, CommentSpec> = {
  photoComment: {
    label: 'Fotoğraf yorumları',
    table: 'photo_comments',
    authorColumn: 'user_id',
    select: 'id, body, user_id, created_at',
    hasRating: false,
  },
  forumPost: {
    label: 'Forum gönderileri',
    table: 'forum_posts',
    /* Forumda yazar `author_id` — diğer ikisinde `user_id`. */
    authorColumn: 'author_id',
    select: 'id, body, author_id, created_at',
    hasRating: false,
  },
  siteReview: {
    label: 'Saha yorumları',
    table: 'site_reviews',
    authorColumn: 'user_id',
    select: 'id, body, user_id, created_at, rating',
    hasRating: true,
  },
};

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/**
 * Son metinler, yenisi üstte.
 *
 * YAZAR ADI AYRI SORGUYLA. Üç tablonun yabancı anahtarı da `auth.users`a
 * bakıyor, `profiles`a değil — PostgREST gömmesi kurulamıyor ve
 * denenirse liste tamamen boş kalır. Ad bulunamazsa kimliğin ilk sekiz
 * hanesi gösteriliyor: profili silinmiş birinin yorumu da moderatörün
 * görmesi gereken bir şey.
 */
export async function fetchComments(
  kind: CommentKind,
  limit = 40
): Promise<CommentRow[]> {
  const spec = COMMENT_KINDS[kind];
  const supabase = await client();

  const { data, error } = await supabase
    .from(spec.table)
    .select(spec.select)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return [];

  const ids = [
    ...new Set(
      rows
        .map((r) => r[spec.authorColumn])
        .filter((v): v is string => typeof v === 'string')
    ),
  ];

  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', ids);
    for (const p of (profiles ?? []) as { id: string; username: string }[]) {
      names.set(p.id, p.username);
    }
  }

  return rows.map((r) => {
    const author = r[spec.authorColumn];
    const authorId = typeof author === 'string' ? author : null;
    return {
      id: String(r.id),
      body: typeof r.body === 'string' ? r.body : '',
      authorId,
      authorName: authorId ? (names.get(authorId) ?? null) : null,
      createdAt: typeof r.created_at === 'string' ? r.created_at : null,
      rating:
        spec.hasRating && typeof r.rating === 'number' ? r.rating : null,
    };
  });
}

/**
 * Metni kaldırır.
 *
 * Geri alınamaz. Arayüz bu yüzden ayrı bir onay istiyor; buradaki
 * fonksiyon onayı VARSAYIYOR — `records.ts`teki silmeyle aynı sözleşme.
 */
export async function deleteComment(
  kind: CommentKind,
  id: string
): Promise<void> {
  const spec = COMMENT_KINDS[kind];
  const supabase = await client();
  const { error } = await supabase.from(spec.table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}
