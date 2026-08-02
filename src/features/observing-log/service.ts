import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import {
  describeDraftProblem,
  MAX_NOTE,
  MAX_TARGET,
  type ObservationDraft,
  type ObservationLog,
} from './types';

/**
 * GÖZLEM GÜNLÜĞÜ — veri katmanı (§14.6).
 *
 * ══════════════════════════════════════════════════════════════════════
 * RLS SESSİZ, `.select()` ONU KONUŞTURUYOR
 *
 * `upsertNavLink`teki gerekçenin aynısı: RLS yüzünden hiçbir satıra
 * dokunamayan bir `update`/`delete` HATA DÖNDÜRMEZ — `error` null gelir
 * ve iş bitmiş görünür. Kullanıcı "kaydedildi" yazısını görür, kayıt
 * eskisi gibi durur. Dönen satırı isteyip saymak, "yetkim yokmuş" ile
 * "kaydettim"i ayıran tek şey.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BOŞ DİZE → `null`
 *
 * Kullanıcı bir alanı doldurup silerse form `''` gönderir. Veritabanında
 * "boş metin" ile "girilmemiş" iki ayrı durum olur ve gösterimde
 * `deger ?? '—'` yazan her yer boş dizeyi "girilmiş" sayar. Sınırda
 * temizleniyor.
 */

function bos(v: string | null | undefined, maxLength: number): string | null {
  if (typeof v !== 'string') return null;
  const temiz = sanitizeText(v, { maxLength }).trim();
  return temiz || null;
}

/** Ham satırı görünüme çevirir. Sütun adları snake_case, tip camelCase. */
function fromRow(row: Record<string, unknown>): ObservationLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    observedOn: String(row.observed_on),
    locationText: (row.location_text as string) ?? null,
    siteSlug: (row.site_slug as string) ?? null,
    target: (row.target as string) ?? null,
    seeing: row.seeing === null || row.seeing === undefined ? null : Number(row.seeing),
    transparency:
      row.transparency === null || row.transparency === undefined
        ? null
        : Number(row.transparency),
    equipment: (row.equipment as string) ?? null,
    note: (row.note as string) ?? null,
    photoId: (row.photo_id as string) ?? null,
    isPublic: row.is_public === true,
    createdAt: String(row.created_at),
  };
}

const COLUMNS =
  'id, user_id, observed_on, location_text, site_slug, target, seeing, transparency, equipment, note, photo_id, is_public, created_at';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;
  if (!supabase) throw new Error('Veritabanı bağlantısı kurulamadı');
  return supabase;
}

/**
 * Kullanıcının kendi günlüğü.
 *
 * FİLTRE `user_id` ÜZERİNDE, RLS'e GÜVENİLEREK DEĞİL. RLS zaten
 * başkasının özel kaydını vermiyor ama BAŞKASININ AÇIK kaydını veriyor —
 * filtresiz sorgu "benim günlüğüm" sayfasına bütün sitenin açık
 * kayıtlarını dökerdi. RLS bir güvenlik sınırı, sorgu niyeti değil.
 */
export async function fetchMyLogs(userId: string): Promise<ObservationLog[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('observation_logs')
    .select(COLUMNS)
    .eq('user_id', userId)
    .order('observed_on', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

/** Bir kullanıcının HERKESE AÇIK kayıtları — profil sayfası için. */
export async function fetchPublicLogs(userId: string): Promise<ObservationLog[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('observation_logs')
    .select(COLUMNS)
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('observed_on', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow(r as Record<string, unknown>));
}

function toRow(draft: ObservationDraft) {
  return {
    observed_on: draft.observedOn,
    location_text: bos(draft.locationText, 160),
    site_slug: draft.siteSlug || null,
    target: bos(draft.target, MAX_TARGET),
    seeing: draft.seeing ?? null,
    transparency: draft.transparency ?? null,
    equipment: bos(draft.equipment, 160),
    note: bos(draft.note, MAX_NOTE),
    photo_id: draft.photoId || null,
    is_public: draft.isPublic === true,
  };
}

export async function createLog(
  userId: string,
  draft: ObservationDraft
): Promise<ObservationLog> {
  const sorun = describeDraftProblem(draft);
  if (sorun) throw new Error(sorun);

  const supabase = await client();
  const { data, error } = await supabase
    .from('observation_logs')
    .insert({ ...toRow(draft), user_id: userId })
    .select(COLUMNS);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Kayıt eklenemedi — oturumunuz düşmüş olabilir.');
  return fromRow(data[0] as Record<string, unknown>);
}

export async function updateLog(
  id: string,
  draft: ObservationDraft
): Promise<void> {
  const sorun = describeDraftProblem(draft);
  if (sorun) throw new Error(sorun);

  const supabase = await client();
  const { data, error } = await supabase
    .from('observation_logs')
    .update(toRow(draft))
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Kayıt güncellenemedi — bulunamadı ya da yetkiniz yok.');
}

export async function deleteLog(id: string): Promise<void> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('observation_logs')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error('Kayıt silinemedi — bulunamadı ya da yetkiniz yok.');
}
