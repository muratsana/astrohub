import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/services/supabase/client';
import { slugify } from '@/lib/slug';
import { forumThreads as forumSeed } from '@/features/forum/data';
import {
  forumCategoryOrder,
  forumLabelOrder,
  forumLabelLimit,
  type ForumCategoryId,
  type ForumLabelId,
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
  removal_reason: string | null;
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
  labels: string[] | null;
  removal_reason: string | null;
  profiles: AuthorRow | null;
  forum_posts: PostRow[] | null;
}

/**
 * Tanınmayan rozet kimliklerini eler.
 *
 * Rozet seti kodda sabit ama kolon `text[]`; eski bir satır ya da elle
 * yapılmış bir düzenleme listede olmayan bir değer taşıyabilir. Süzmek
 * yerine ham geçirmek, arayüzde `forumLabels[id]` üzerinden `undefined`
 * okumaya ve boş bir rozet kutusuna dönüşüyordu.
 */
function labels(raw: string[] | null): ForumLabelId[] | undefined {
  const known = (raw ?? []).filter((id): id is ForumLabelId =>
    forumLabelOrder.includes(id as ForumLabelId)
  );
  return known.length > 0 ? known.slice(0, forumLabelLimit) : undefined;
}

function author(row: AuthorRow | null) {
  return {
    username: row?.username ?? 'bilinmiyor',
    displayName: row?.display_name ?? row?.username ?? 'Bilinmiyor',
  };
}

/**
 * Kaldırma gerekçesi — boş metin `undefined`a düşürülüyor.
 *
 * Kolon boş dizeyle de dolabilir (eski satır, elle düzenleme). Arayüz
 * "gerekçe var mı" diye baktığı için boş dizeyi geçirmek, içi boş bir
 * kaldırma kutusu çizdirirdi: gövde gizlenir ama yerine hiçbir açıklama
 * gelmez — kullanıcının gördüğü en kötü hâl.
 */
function removalReason(raw: string | null): string | undefined {
  const text = (raw ?? '').trim();
  return text.length > 0 ? text : undefined;
}

function mapPost(row: PostRow, solutionId: string | null): ForumPost {
  return {
    id: row.id,
    author: author(row.profiles),
    createdAt: row.created_at,
    body: row.body,
    solution: solutionId !== null && row.id === solutionId ? true : undefined,
    removalReason: removalReason(row.removal_reason),
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
    labels: labels(row.labels),
    removalReason: removalReason(row.removal_reason),
  };
}

/* Kaldırılmış satırlar sorgudan ELENMİYOR. `deleted_at` süzgeci koysaydık
   kaldırılan konu listeden tamamen düşer, kaldırılan yanıt da tartışmanın
   ortasından sessizce silinirdi — sonraki yanıtlar cevapsız kalmış bir
   konuşmaya dönerdi. Satır yerinde duruyor; gövdesi veritabanında zaten
   boşaltıldı ve yerine `removal_reason` geçiyor. */
const SELECT =
  'id, slug, title, body, category_id, created_at, last_activity_at, ' +
  'reply_count, view_count, pinned, locked, solution_post_id, labels, ' +
  'removal_reason, ' +
  'profiles!forum_threads_author_id_profiles_fkey(username, display_name), ' +
  'forum_posts(id, body, created_at, removal_reason, ' +
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

async function fetchThreadBySlug(
  client: SupabaseClient,
  slug: string
): Promise<ForumThread | null> {
  const { data, error } = await client
    .from('forum_threads')
    .select(SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapThreadRow(data as unknown as ThreadRow) : null;
}

export function useForumThread(slug: string | undefined) {
  return useQuery({
    queryKey: ['forum-thread', slug],
    enabled: Boolean(slug),
    staleTime: 30 * 1000,
    retry: 1,
    queryFn: async () => {
      const clientPromise = getSupabase();
      if (!clientPromise || !slug) {
        return forumSeed.find((thread) => thread.slug === slug) ?? null;
      }
      return fetchThreadBySlug(await clientPromise, slug);
    },
  });
}

/* ══════════════════════ Yazma ══════════════════════ */

/**
 * Başlıktan adres parçası.
 *
 * Türkçe karakterler ASCII karşılığına çevriliyor: adres çubuğunda
 * yüzde kodlaması okunmuyor ve paylaşılan bağlantı anlamsız görünüyordu.
 */
export function threadSlug(title: string, suffix: string): string {
  /* Dönüşüm `lib/slug`ta — aynı kural yükleme sihirbazında da geçerli
     ve iki kopya zamanla ayrışırdı. */
  const base = slugify(title, 60);
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
  labels?: ForumLabelId[];
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

  /* Rozetler istemcide de süzülüyor. Kolonda CHECK var ve asıl kapı orası;
     buradaki eleme, sunucudan dönen ham kısıt hatası yerine sessizce
     geçerli bir alt küme göndermek için — kullanıcı rozeti listeden
     seçiyor, geçersiz değer ancak bir hatadan gelir. */
  const chosen = (input.labels ?? [])
    .filter((id) => forumLabelOrder.includes(id))
    .slice(0, forumLabelLimit);

  const { error } = await supabase.from('forum_threads').insert({
    slug,
    title,
    body,
    category_id: input.category,
    labels: chosen,
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
