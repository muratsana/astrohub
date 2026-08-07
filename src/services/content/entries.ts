import type { ContentStatus } from '@/domain/content/status';
import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { safeUrl } from '@/lib/url';
import {
  ContentBlocksSchema,
  blocksToParagraphs,
  blocksToText,
  parseContentBlocks,
  textToBlocks,
  type ContentBlock,
} from '@/domain/content/blocks';

/**
 * İÇERİK KAYITLARI — haber ve yazıların veritabanı katmanı.
 *
 * NEDEN VAR (denetim maddesi E3 / L5): haber ve yazı gövdeleri bugüne
 * kadar uygulamanın içindeki veri dosyalarındaydı. Yeni bir haber
 * yayımlamak kod değiştirip yeniden yayına almak demekti — yani siteyi
 * yönetmek için geliştirici gerekiyordu. Bir içerik sitesinde bu, ürünün
 * kendisinin eksik olması demek.
 *
 * TOHUM VERİ SİLİNMEDİ, YEDEK KALDI. Veritabanı boşken ya da erişilemezken
 * site içeriksiz kalmamalı; okuma katmanı ikisini birleştiriyor ve
 * veritabanından gelen kayıt aynı slug'ı taşıyorsa tohumun yerine geçiyor.
 * Böylece mevcut içerik panelden düzenlenebilir hâle de geliyor.
 *
 * TASLAK/YAYINDA AYRIMI RLS'te: `content_entries_read` yalnızca
 * `status = 'yayinda'` satırlarını herkese açıyor, taslakları yalnızca
 * yönetici görüyor. Arayüzdeki filtre bir nezaket; sınırı politika
 * çiziyor.
 */

/**
 * İçerik türleri. `sozluk` ve `sss` 0065'te eklendi (§14.9) — ayrı tablo
 * açmak yerine bu listeyi genişletmenin gerekçesi o göçün başlığında.
 */
export type EntryKind = 'haber' | 'yazi' | 'sozluk' | 'sss';
/** İçerik durumu artık ortak küme (FAZ 3). Ad geriye dönük uyum için. */
export type EntryStatus = ContentStatus;

export interface ContentEntry {
  id: string;
  kind: EntryKind;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  bodyBlocks: ContentBlock[];
  category: string;
  publishedAt: string;
  status: EntryStatus;
  author: string | null;
  duration: string | null;
  level: string | null;
  tint: string | null;
  image: { url: string; credit: string; licence: string } | null;
  source: { name: string; url: string } | null;
}

interface EntryRow {
  id: string;
  kind: EntryKind;
  slug: string;
  title: string;
  summary: string;
  body: string[] | null;
  body_blocks?: unknown;
  category: string;
  published_at: string;
  status: EntryStatus;
  author: string | null;
  duration: string | null;
  level: string | null;
  tint: string | null;
  image_url: string | null;
  image_credit: string | null;
  image_licence: string | null;
  source_name: string | null;
  source_url: string | null;
}

export function mapEntryRow(row: EntryRow): ContentEntry {
  const body = row.body ?? [];
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary ?? '',
    body,
    bodyBlocks: parseContentBlocks(row.body_blocks, body),
    category: row.category,
    publishedAt: row.published_at,
    status: row.status,
    author: row.author,
    duration: row.duration,
    level: row.level,
    tint: row.tint,
    /* Görsel ancak adres VARSA nesne olur: boş bir adresle kredi
       göstermek, olmayan bir görseli kredilendirmek olurdu. */
    image: row.image_url
      ? {
          url: row.image_url,
          credit: row.image_credit ?? '',
          licence: row.image_licence ?? '',
        }
      : null,
    source: row.source_url
      ? { name: row.source_name ?? row.source_url, url: row.source_url }
      : null,
  };
}

const SELECT =
  'id, kind, slug, title, summary, body, body_blocks, category, published_at, status, ' +
  'author, duration, level, tint, image_url, image_credit, image_licence, ' +
  'source_name, source_url';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return promise;
}

/* ── Okuma ─────────────────────────────────────────────────────────── */

export interface EntriesState {
  entries: ContentEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEntries(
  kind: EntryKind,
  options: { includeDrafts?: boolean } = {}
): EntriesState {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const includeDrafts = options.includeDrafts ?? false;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    client()
      .then(async (supabase) => {
        let query = supabase
          .from('content_entries')
          .select(SELECT)
          .eq('kind', kind)
          .order('published_at', { ascending: false });
        /* Taslakları istemeyen çağrı için ayrıca eleniyor; RLS zaten
           yönetici olmayana taslak vermiyor ama yönetici de ana sayfada
           taslak görmemeli. */
        if (!includeDrafts) query = query.eq('status', 'yayinda');
        const { data, error: queryError } = await query;
        if (queryError) throw new Error(queryError.message);
        return (data as unknown as EntryRow[]).map(mapEntryRow);
      })
      .then((rows) => {
        if (!active) return;
        setEntries(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'İçerik okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [kind, includeDrafts, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { entries, loading, error, refresh };
}

/**
 * Veritabanı kayıtlarını tohum veriyle birleştirir.
 *
 * AYNI SLUG VARSA VERİTABANI KAZANIR: paneldeki düzenleme, uygulamanın
 * içindeki eski metnin üstüne geçmeli. Bu kural sayesinde mevcut
 * içerikler de panelden düzenlenebilir hâle geliyor — kod dosyasını
 * değiştirmeye gerek kalmıyor.
 */
export function mergeWithSeed<T extends { slug: string }>(
  seed: T[],
  entries: ContentEntry[],
  toItem: (entry: ContentEntry) => T
): T[] {
  const fromDb = entries.map(toItem);
  const overridden = new Set(fromDb.map((item) => item.slug));
  return [...fromDb, ...seed.filter((item) => !overridden.has(item.slug))];
}

/* ── Yazma ─────────────────────────────────────────────────────────── */

export interface EntryDraft {
  kind: EntryKind;
  slug: string;
  title: string;
  summary: string;
  /** Paragraflar tek metin olarak; boş satırla ayrılır. */
  bodyText: string;
  bodyBlocks: ContentBlock[];
  category: string;
  publishedAt: string;
  status: EntryStatus;
  author: string;
  duration: string;
  level: string;
  imageUrl: string;
  imageCredit: string;
  imageLicence: string;
  sourceName: string;
  sourceUrl: string;
}

export const EMPTY_DRAFT: EntryDraft = {
  kind: 'haber',
  slug: '',
  title: '',
  summary: '',
  bodyText: '',
  bodyBlocks: [],
  category: 'kesif',
  publishedAt: new Date().toISOString().slice(0, 10),
  status: 'taslak',
  author: '',
  duration: '',
  level: '',
  imageUrl: '',
  imageCredit: '',
  imageLicence: '',
  sourceName: '',
  sourceUrl: '',
};

/** Başlıktan adres üretir — Türkçe harfler ASCII'ye iner. */
export function slugFromTitle(title: string): string {
  const map: Record<string, string> = {
    ı: 'i', İ: 'i', ğ: 'g', Ğ: 'g', ü: 'u', Ü: 'u',
    ş: 's', Ş: 's', ö: 'o', Ö: 'o', ç: 'c', Ç: 'c',
  };
  return title
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/** Gövdeyi paragraflara böler — boş satır ayırıcı. */
export function bodyParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => sanitizeText(p, { multiline: true }))
    .filter(Boolean);
}

export function validateEntry(draft: EntryDraft): string | null {
  if (sanitizeText(draft.title, { maxLength: 200 }).length < 6) {
    return 'Başlık en az 6 karakter olmalı.';
  }
  if (!/^[a-z0-9-]{3,120}$/.test(draft.slug)) {
    return 'Adres yalnızca küçük harf, rakam ve tire içerebilir (en az 3 karakter).';
  }
  if (sanitizeText(draft.summary, { multiline: true }).length < 20) {
    return 'Özet en az 20 karakter olmalı — kartlarda bu metin görünüyor.';
  }
  if (draft.bodyBlocks.length === 0 && bodyParagraphs(draft.bodyText).length === 0) {
    return 'Gövde boş. En az bir paragraf yazın.';
  }
  if (
    draft.bodyBlocks.length > 0 &&
    !ContentBlocksSchema.safeParse(draft.bodyBlocks).success
  ) {
    return 'İçerik bloklarında boş ya da geçersiz alan var.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.publishedAt)) {
    return 'Tarih YYYY-AA-GG biçiminde olmalı.';
  }
  /* Adresler `safeUrl`den geçiyor: `javascript:` şeması taşıyan bir
     bağlantı yayımlanan sayfada tıklanabilir hâle gelirdi (§15.4). */
  for (const [label, value] of [
    ['Görsel adresi', draft.imageUrl],
    ['Kaynak adresi', draft.sourceUrl],
  ] as const) {
    if (value.trim() && !safeUrl(value.trim())) {
      return `${label} geçersiz — http:// ya da https:// ile başlamalı.`;
    }
  }
  /* Görsel varsa kredi zorunlu: CC BY ve CC BY-SA'nın şartı bu, ayrıca
     kaynağı yazılmayan bir görselin telif durumu sonradan izlenemez. */
  if (draft.imageUrl.trim() && !draft.imageCredit.trim()) {
    return 'Görsel eklediyseniz kredi alanı zorunlu — lisansın şartı bu.';
  }
  return null;
}

function toRow(draft: EntryDraft) {
  const bodyBlocks =
    draft.bodyBlocks.length > 0 ? draft.bodyBlocks : textToBlocks(draft.bodyText);
  return {
    kind: draft.kind,
    slug: draft.slug,
    title: sanitizeText(draft.title, { maxLength: 200 }),
    summary: sanitizeText(draft.summary, { multiline: true }),
    body: blocksToParagraphs(bodyBlocks),
    body_blocks: bodyBlocks,
    category: draft.category,
    published_at: draft.publishedAt,
    status: draft.status,
    author: sanitizeText(draft.author, { maxLength: 80 }) || null,
    duration: sanitizeText(draft.duration, { maxLength: 40 }) || null,
    level: sanitizeText(draft.level, { maxLength: 40 }) || null,
    image_url: draft.imageUrl.trim() ? safeUrl(draft.imageUrl.trim()) : null,
    image_credit: sanitizeText(draft.imageCredit, { maxLength: 160 }) || null,
    image_licence: sanitizeText(draft.imageLicence, { maxLength: 80 }) || null,
    source_name: sanitizeText(draft.sourceName, { maxLength: 120 }) || null,
    source_url: draft.sourceUrl.trim() ? safeUrl(draft.sourceUrl.trim()) : null,
    updated_at: new Date().toISOString(),
  };
}

export async function saveEntry(
  draft: EntryDraft,
  id?: string
): Promise<string> {
  const problem = validateEntry(draft);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const row = toRow(draft);

  if (id) {
    const { error } = await supabase
      .from('content_entries')
      .update(row)
      .eq('id', id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .from('content_entries')
    .insert(row)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

/**
 * İçeriği kaldırır — SOFT DELETE (FAZ 3).
 *
 * Kayıt public sorgulardan düşüyor (`app.icerik_gorunur`) ama
 * veritabanında duruyor ve geri alınabiliyor. Kalıcı silme
 * `content_entries_hard_delete_admin` kısıtlayıcı politikasıyla admine
 * kilitli; `purgeEntry` onu çağırıyor.
 *
 * `select('id')` ekli: PostgREST sıfır satır etkilendiğinde hata
 * döndürmüyor ve bu fonksiyon sessizce "oldu" derdi.
 */
export async function deleteEntry(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('content_entries')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('İçerik kaldırılamadı — kayıt bulunamadı ya da yetki yok.');
  }
}

/** Kaldırılmış içeriği geri getirir (plan görev 5). */
export async function restoreEntry(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('content_entries')
    .update({ deleted_at: null })
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('İçerik geri alınamadı — kayıt bulunamadı ya da yetki yok.');
  }
}

/** Kalıcı silme — yalnızca admin. RLS reddederse sessiz geçmiyor. */
export async function purgeEntry(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('content_entries')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Kalıcı silme reddedildi — bu işlem yalnızca yöneticilere açık.'
    );
  }
}

export async function setEntryStatus(
  id: string,
  status: EntryStatus
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('content_entries')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Kayıttan forma — düzenleme açılırken. */
export function draftFromEntry(entry: ContentEntry): EntryDraft {
  return {
    kind: entry.kind,
    slug: entry.slug,
    title: entry.title,
    summary: entry.summary,
    bodyText: blocksToText(entry.bodyBlocks),
    bodyBlocks: entry.bodyBlocks,
    category: entry.category,
    publishedAt: entry.publishedAt,
    status: entry.status,
    author: entry.author ?? '',
    duration: entry.duration ?? '',
    level: entry.level ?? '',
    imageUrl: entry.image?.url ?? '',
    imageCredit: entry.image?.credit ?? '',
    imageLicence: entry.image?.licence ?? '',
    sourceName: entry.source?.name ?? '',
    sourceUrl: entry.source?.url ?? '',
  };
}
