import { getSupabase } from '@/services/supabase/client';
import { isValidYoutubeId, type BroadcastKind, type YoutubeRef } from '@/features/tv/types';
import { sanitizeText } from '@/lib/sanitize';

/**
 * YAYIN KONTROL VERİ KATMANI — TV ve radyo yönetimi.
 *
 * Arayüz bileşeni Supabase çağrısı yapmaz; hepsi burada. Sebep §12.5'in
 * aynısı: ekran bileşeni değiştiğinde iş kuralı taşınmasın. Ayrıca bu
 * modül testte kolayca sahtelenebilir bir sınır oluşturuyor.
 *
 * YETKİ BURADA KONTROL EDİLMEZ. Kontrol RLS'te: yazma politikası
 * admin/content_editor rolüne bağlı (0011, 0004). Arayüzde ikinci bir
 * kontrol koymak, güvenliği artırmaz ama iki yerin birbirinden sapması
 * riskini getirir. Buradaki tek görev isteği doğru biçimde göndermek.
 */

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export interface AdminBroadcast {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  refKind: YoutubeRef;
  youtubeId: string;
  startsAt: string | null;
  published: boolean;
  position: number;
}

interface BroadcastRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  ref_kind: YoutubeRef;
  youtube_id: string;
  starts_at: string | null;
  published: boolean;
  position: number;
}

/** Yayınlanmamışlar dâhil tüm program — RLS editöre hepsini gösterir. */
export async function fetchBroadcasts(): Promise<AdminBroadcast[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('tv_broadcasts')
    .select(
      'id, slug, title, description, kind, ref_kind, youtube_id, starts_at, published, position'
    )
    .order('position');

  if (error) throw new Error(error.message);

  return (data as unknown as BroadcastRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    kind: row.kind,
    refKind: row.ref_kind,
    youtubeId: row.youtube_id,
    startsAt: row.starts_at,
    published: row.published,
    position: row.position,
  }));
}

export interface NewBroadcast {
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  refKind: YoutubeRef;
  youtubeId: string;
  startsAt: string | null;
}

/**
 * Kimlik biçimi göndermeden önce doğrulanır.
 *
 * Veritabanı kısıtı zaten reddeder ama o red ham bir Postgres hatası
 * olarak döner ("new row violates check constraint …"). Editöre ne
 * yapması gerektiğini söyleyen cümleyi burada üretiyoruz.
 */
export function validateBroadcast(input: NewBroadcast): string | null {
  if (!/^[a-z0-9-]{3,120}$/.test(input.slug)) {
    return 'Kısa ad yalnızca küçük harf, rakam ve tire içerebilir (en az 3 karakter).';
  }
  if (input.title.trim().length < 3) return 'Başlık en az 3 karakter olmalı.';
  if (!isValidYoutubeId(input.refKind, input.youtubeId)) {
    return input.refKind === 'video'
      ? 'Video kimliği 11 karakterdir — izleme adresindeki v= değeri.'
      : 'Kanal kimliği UC ile başlar ve 24 karakterdir.';
  }
  return null;
}

export async function createBroadcast(input: NewBroadcast): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('tv_broadcasts').insert({
    slug: input.slug,
    title: sanitizeText(input.title, { maxLength: 200 }),
    description: sanitizeText(input.description, {
      multiline: true,
      maxLength: 2000,
    }),
    kind: input.kind,
    ref_kind: input.refKind,
    youtube_id: input.youtubeId,
    starts_at: input.startsAt,
    published: false,
  });

  if (error) throw new Error(error.message);
}

export async function setBroadcastPublished(
  id: string,
  published: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ published })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/**
 * Bir yayını canlıya alır.
 *
 * Veritabanında "aynı anda en fazla bir canlı yayın" kısmi tekil indeksi
 * var (0011). Önce diğerlerini indiriyoruz, sonra bunu kaldırıyoruz —
 * ters sırada yapmak indeksi ihlal eder ve işlem tümden reddedilir.
 * Aradaki kısa anda hiç canlı yayın görünmez; alternatifi olan "iki
 * canlı yayın" durumundan iyidir.
 */
export async function setLive(id: string): Promise<void> {
  const supabase = await client();

  const { error: clearError } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'archive' })
    .eq('kind', 'live')
    .neq('id', id);
  if (clearError) throw new Error(clearError.message);

  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'live', published: true })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Canlı yayını sonlandırır: kayıt arşive düşer, silinmez. */
export async function endLive(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('tv_broadcasts')
    .update({ kind: 'archive' })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteBroadcast(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('tv_broadcasts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   RADYO
   ══════════════════════════════════════════════════════════════════════ */

export interface AdminTrack {
  id: string;
  title: string;
  artist: string;
  source: 'mp3' | 'spotify';
  path: string;
  note: string | null;
  position: number;
  published: boolean;
}

export async function fetchTracks(): Promise<AdminTrack[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('radio_tracks')
    .select('id, title, artist, source, path, note, position, published')
    .order('position');

  if (error) throw new Error(error.message);
  return data as unknown as AdminTrack[];
}

export interface NewTrack {
  title: string;
  artist: string;
  source: 'mp3' | 'spotify';
  path: string;
  note: string;
}

/**
 * Radyo kaydı doğrulaması.
 *
 * Spotify tarafında tam adres saklanıyor (şema öyle tanımlı), bu yüzden
 * burada şema kontrolü yapılıyor: yalnızca open.spotify.com. MP3 tarafında
 * saklanan şey bucket içindeki **yol**, tam URL değil — başında `http`
 * olan bir değer yol değildir ve muhtemelen yanlış alana yapıştırılmıştır.
 */
export function validateTrack(input: NewTrack): string | null {
  if (input.title.trim().length < 1) return 'Başlık boş olamaz.';
  if (input.source === 'spotify') {
    if (!/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+/.test(input.path)) {
      return 'Spotify bağlantısı https://open.spotify.com/track/… biçiminde olmalı.';
    }
  } else if (/^https?:\/\//i.test(input.path)) {
    return 'MP3 için bucket içindeki yol girilir (ör. gece/nocturne.mp3), tam adres değil.';
  } else if (input.path.trim().length === 0) {
    return 'Dosya yolu boş olamaz.';
  }
  return null;
}

export async function createTrack(input: NewTrack): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('radio_tracks').insert({
    title: sanitizeText(input.title, { maxLength: 200 }),
    artist: sanitizeText(input.artist, { maxLength: 200 }),
    source: input.source,
    path: input.path.trim(),
    note: sanitizeText(input.note, { maxLength: 500 }) || null,
    published: false,
  });

  if (error) throw new Error(error.message);
}

export async function setTrackPublished(
  id: string,
  published: boolean
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('radio_tracks')
    .update({ published })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTrack(id: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.from('radio_tracks').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
