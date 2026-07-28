import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase/client';
import { forumThreads as forumSeed } from '@/features/forum/data';
import {
  forumCategoryOrder,
  type ForumCategoryId,
  type ForumPost,
  type ForumThread,
} from '@/features/forum/types';
import { sanitizeText } from '@/lib/sanitize';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * FORUM — okuma ve yazma.
 *
 * Şema ve RLS başından beri hazırdı; eksik olan istemciydi ve "Konuyu Aç"
 * düğmesi `disabled` duruyordu. Bir forumun okunabilir ama yazılamaz
 * olması, forum olmaması demek.
 *
 * METİN İKİ KEZ TEMİZLENİYOR. Önizleme `sanitizeText` çıktısını gösteriyor
 * (kullanıcı ne yayımlanacağını yazarken görsün) ve gönderim de aynı
 * fonksiyondan geçiyor. İkincisi gereksiz değil: önizlemeyi atlayan bir
 * istemci ya da doğrudan çağrı temizlenmemiş metin gönderebilir (§15.4).
 *
 * SLUG İSTEMCİDE ÜRETİLİYOR, çakışırsa veritabanı reddediyor. Kısa bir
 * rastgele son ek çakışmayı pratikte imkânsız kılıyor; başlığı slug'a
 * çevirmek de adresi okunabilir tutuyor.
 */

interface AuthorRow {
  username: string;
  display_name: string | null;
}

interface PostRow {
  id: string;
  body: string;
  created_at: string;
  profiles: AuthorRow | null;
}

interface ThreadRow {
  id: string;
  slug: string;
  title: string;
  body: string;
  category_id: string;
  created_at: string;
  last_activity_at: string;
  reply_count: number;
  view_count: number;
  pinned: boolean;
  locked: boolean;
  solution_post_id: string | null;
  profiles: AuthorRow | null;
  forum_posts: PostRow[] | null;
}

function author(row: AuthorRow | null) {
  return {
    username: row?.username ?? 'bilinmiyor',
    displayName: row?.display_name ?? row?.username ?? 'Bilinmiyor',
  };
}

function mapPost(row: PostRow, solutionId: string | null): ForumPost {
  return {
    id: row.id,
    author: author(row.profiles),
    createdAt: row.created_at,
    body: row.body,
    solution: solutionId !== null && row.id === solutionId ? true : undefined,
  };
}

export function mapThreadRow(row: ThreadRow): ForumThread {
  const replies = [...(row.forum_posts ?? [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((p) => mapPost(p, row.solution_post_id));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    /* Kategori seti editoryal bir karar (bkz. forum/types). Tanınmayan
       bir kimlik gelirse ilk kategoriye düşüyoruz — konuyu listeden
       tamamen düşürmek, yanlış rozet göstermekten kötü. */
    category: (forumCategoryOrder.includes(row.category_id as ForumCategoryId)
      ? row.category_id
      : forumCategoryOrder[0]) as ForumCategoryId,
    author: author(row.profiles),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    replyCount: row.reply_count,
    viewCount: row.view_count,
    pinned: row.pinned || undefined,
    locked: row.locked || undefined,
    solved: row.solution_post_id !== null || undefined,
    body: row.body,
    replies,
  };
}

const SELECT =
  'id, slug, title, body, category_id, created_at, last_activity_at, ' +
  'reply_count, view_count, pinned, locked, solution_post_id, ' +
  'profiles!forum_threads_author_id_profiles_fkey(username, display_name), ' +
  'forum_posts(id, body, created_at, ' +
  'profiles!forum_posts_author_id_profiles_fkey(username, display_name))';

async function fetchThreads(client: SupabaseClient): Promise<ForumThread[]> {
  const { data, error } = await client
    .from('forum_threads')
    .select(SELECT)
    .order('last_activity_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data as unknown as ThreadRow[]).map(mapThreadRow);
}

export function useForumThreads(): ContentSelection<ForumThread> {
  return useCatalog('forum', forumSeed, fetchThreads);
}

/* ══════════════════════ Yazma ══════════════════════ */

/**
 * Başlıktan adres parçası.
 *
 * Türkçe karakterler ASCII karşılığına çevriliyor: adres çubuğunda
 * yüzde kodlaması okunmuyor ve paylaşılan bağlantı anlamsız görünüyordu.
 */
export function threadSlug(title: string, suffix: string): string {
  const base = title
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

  return `${base || 'konu'}-${suffix}`;
}

/** Çakışmayı pratikte imkânsız kılan kısa son ek. */
export function slugSuffix(): string {
  return Math.random().toString(36).slice(2, 7);
}

async function client(): Promise<SupabaseClient> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface NewThreadInput {
  title: string;
  body: string;
  category: ForumCategoryId;
  authorId: string;
}

/** Konu açar ve oluşan slug'ı döndürür — çağıran oraya yönlendirir. */
export async function createThread(input: NewThreadInput): Promise<string> {
  const title = sanitizeText(input.title, { maxLength: 120 });
  const body = sanitizeText(input.body, { multiline: true, maxLength: 20000 });

  if (title.length < 8) {
    throw new Error('Başlık en az 8 karakter olmalı — sorunu özetleyin.');
  }
  if (body.length < 20) {
    throw new Error(
      'Mesaj çok kısa. Ekipman, koşullar ve denedikleriniz olmadan yanıt gelmesi zor.'
    );
  }

  const supabase = await client();
  const slug = threadSlug(title, slugSuffix());

  const { error } = await supabase.from('forum_threads').insert({
    slug,
    title,
    body,
    category_id: input.category,
    author_id: input.authorId,
  });

  if (error) throw new Error(error.message);
  return slug;
}

export interface NewReplyInput {
  threadId: string;
  body: string;
  authorId: string;
}

export async function createReply(input: NewReplyInput): Promise<void> {
  const body = sanitizeText(input.body, { multiline: true, maxLength: 20000 });
  if (body.length < 2) throw new Error('Boş yanıt gönderilemez.');

  const supabase = await client();
  const { error } = await supabase.from('forum_posts').insert({
    thread_id: input.threadId,
    body,
    author_id: input.authorId,
  });

  if (error) throw new Error(error.message);
}
