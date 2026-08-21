import type { SupabaseClient } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import { getSupabase } from '@/services/supabase/client';
import { slugify } from '@/lib/slug';
import {
  encodeWithinBudget,
  type EncodeAttempt,
} from '@/domain/photography/resize';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { forumThreads as forumSeed } from '@/features/forum/data';
import {
  forumCategoryOrder,
  forumLabelOrder,
  forumLabelLimit,
  type ForumCategoryId,
  type ForumImage,
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
  avatar_path?: string | null;
}

interface PostRow {
  id: string;
  body: string;
  created_at: string;
  removal_reason: string | null;
  image_path?: string | null;
  image_width?: number | null;
  image_height?: number | null;
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
  image_path: string | null;
  image_width: number | null;
  image_height: number | null;
  profiles: AuthorRow | null;
  forum_posts: PostRow[] | null;
}

export const FORUM_IMAGE_BUDGET_BYTES = 5 * 1024 * 1024;
export const FORUM_IMAGE_BUDGET_LABEL = '5 MB';
export const FORUM_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

const FORUM_IMAGE_LADDER = [
  { maxEdge: 1600, quality: 0.82 },
  { maxEdge: 1600, quality: 0.74 },
  { maxEdge: 1400, quality: 0.72 },
  { maxEdge: 1200, quality: 0.68 },
  { maxEdge: 1000, quality: 0.64 },
] as const satisfies readonly EncodeAttempt[];

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
    avatarPath: row?.avatar_path ?? null,
  };
}

export function forumImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/storage/v1/object/public/forum-images/${path}`;
}

function image(row: {
  image_path?: string | null;
  image_width?: number | null;
  image_height?: number | null;
}): ForumImage | undefined {
  const url = forumImageUrl(row.image_path);
  if (!url) return undefined;
  return {
    url,
    width: row.image_width ?? null,
    height: row.image_height ?? null,
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
    image: image(row),
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
    image: image(row),
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
  'removal_reason, image_path, image_width, image_height, ' +
  'profiles!forum_threads_author_id_profiles_fkey(username, display_name, avatar_path), ' +
  'forum_posts(id, body, created_at, removal_reason, image_path, image_width, image_height, ' +
  'profiles!forum_posts_author_id_profiles_fkey(username, display_name, avatar_path))';

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
      const local = forumSeed.find((thread) => thread.slug === slug) ?? null;
      const clientPromise = getSupabase();
      if (!clientPromise || !slug) {
        return local;
      }
      try {
        return (await fetchThreadBySlug(await clientPromise, slug)) ?? local;
      } catch (error) {
        if (local) return local;
        throw error;
      }
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
  imageFile?: File | null;
}

interface PreparedForumImage {
  path: string;
  blob: Blob;
  width: number;
  height: number;
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('Tarayıcı bu işlem için gereken güvenli kimlik üretimini desteklemiyor.');
}

async function prepareForumImage(
  file: File | null | undefined,
  userId: string,
  recordId: string,
  kind: 'thread' | 'post'
): Promise<PreparedForumImage | null> {
  if (!file) return null;

  const format = checkImageFormat(await readHead(file), file.type);
  if (format.kind === 'reject') throw new Error(format.reason);

  const resized = await encodeWithinBudget(
    file,
    FORUM_IMAGE_BUDGET_BYTES,
    FORUM_IMAGE_LADDER
  );
  if (!resized) {
    throw new Error(
      format.kind === 'risky'
        ? format.reason
        : 'Görsel bu tarayıcıda işlenemedi. JPEG, PNG veya WebP deneyin.'
    );
  }
  if (!resized.withinBudget) {
    throw new Error(
      `Fotoğraf ${FORUM_IMAGE_BUDGET_LABEL} sınırına sığacak şekilde optimize edilemedi. Daha düşük çözünürlüklü bir dosya deneyin.`
    );
  }

  return {
    path: `${userId}/${recordId}/${kind}.jpg`,
    blob: resized.blob,
    width: resized.size.width,
    height: resized.size.height,
  };
}

async function uploadPreparedForumImage(
  supabase: SupabaseClient,
  prepared: PreparedForumImage | null
): Promise<void> {
  if (!prepared) return;
  const { error } = await supabase.storage
    .from('forum-images')
    .upload(prepared.path, prepared.blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
  if (error) throw new Error(error.message);
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
  const threadId = randomUuid();
  const slug = threadSlug(title, slugSuffix());

  /* Rozetler istemcide de süzülüyor. Kolonda CHECK var ve asıl kapı orası;
     buradaki eleme, sunucudan dönen ham kısıt hatası yerine sessizce
     geçerli bir alt küme göndermek için — kullanıcı rozeti listeden
     seçiyor, geçersiz değer ancak bir hatadan gelir. */
  const chosen = (input.labels ?? [])
    .filter((id) => forumLabelOrder.includes(id))
    .slice(0, forumLabelLimit);

  const prepared = await prepareForumImage(
    input.imageFile,
    input.authorId,
    threadId,
    'thread'
  );
  await uploadPreparedForumImage(supabase, prepared);

  const { error } = await supabase.from('forum_threads').insert({
    id: threadId,
    slug,
    title,
    body,
    category_id: input.category,
    labels: chosen,
    author_id: input.authorId,
    image_path: prepared?.path ?? null,
    image_width: prepared?.width ?? null,
    image_height: prepared?.height ?? null,
  });

  if (error) {
    if (prepared) {
      try {
        await supabase.storage.from('forum-images').remove([prepared.path]);
      } catch (cause) {
        console.error('geri alma: forum konu görseli silinemedi', cause);
      }
    }
    throw new Error(error.message);
  }
  return slug;
}

export interface NewReplyInput {
  threadId: string;
  body: string;
  authorId: string;
  imageFile?: File | null;
}

export async function createReply(input: NewReplyInput): Promise<void> {
  const body = sanitizeText(input.body, { multiline: true, maxLength: 20000 });
  if (body.length < 2) throw new Error('Boş yanıt gönderilemez.');

  const supabase = await client();
  const postId = randomUuid();
  const prepared = await prepareForumImage(
    input.imageFile,
    input.authorId,
    postId,
    'post'
  );
  await uploadPreparedForumImage(supabase, prepared);

  const { error } = await supabase.from('forum_posts').insert({
    id: postId,
    thread_id: input.threadId,
    body,
    author_id: input.authorId,
    image_path: prepared?.path ?? null,
    image_width: prepared?.width ?? null,
    image_height: prepared?.height ?? null,
  });

  if (error) {
    if (prepared) {
      try {
        await supabase.storage.from('forum-images').remove([prepared.path]);
      } catch (cause) {
        console.error('geri alma: forum yanıt görseli silinemedi', cause);
      }
    }
    throw new Error(error.message);
  }
}
