/**
 * MODERASYON KUYRUĞU İSTEMCİSİ (§13).
 *
 * Sorgular RLS'in arkasından geçer: moderatör olmayan bir kullanıcı aynı
 * sorguyu çalıştırsa boş sonuç alır. Bu dosyada bilinçli olarak hiçbir
 * "yetkili mi" kontrolü yok — yetkiyi veritabanı verir, istemci yalnızca
 * sonucu gösterir. İstemcide ikinci bir kontrol koymak, gerçek sınırın
 * nerede olduğunu bulanıklaştırır.
 */

import { getSupabase } from '@/services/supabase/client';

export type ModerationTarget =
  | 'photo'
  | 'comment'
  | 'listing'
  | 'forum_thread'
  | 'forum_post'
  | 'event'
  | 'site'
  | 'profile';

export type ModerationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated';

export type ModerationReason =
  | 'spam'
  | 'telif'
  | 'yanlis-kunye'
  | 'uygunsuz-icerik'
  | 'yanlis-konum'
  | 'dolandiricilik'
  | 'diger';

export const targetLabels: Record<ModerationTarget, string> = {
  photo: 'Fotoğraf',
  comment: 'Yorum',
  listing: 'İlan',
  forum_thread: 'Forum konusu',
  forum_post: 'Forum mesajı',
  event: 'Etkinlik',
  site: 'Gözlem noktası',
  profile: 'Profil',
};

export const statusLabels: Record<ModerationStatus, string> = {
  pending: 'Sırada',
  in_review: 'İncelemede',
  approved: 'Onaylandı',
  rejected: 'Kaldırıldı',
  escalated: 'Yönetime iletildi',
};

export const reasonLabels: Record<ModerationReason, string> = {
  spam: 'Spam',
  telif: 'Telif ihlali',
  'yanlis-kunye': 'Yanlış künye',
  'uygunsuz-icerik': 'Uygunsuz içerik',
  'yanlis-konum': 'Hassas konum ifşası',
  dolandiricilik: 'Dolandırıcılık şüphesi',
  diger: 'Diğer',
};

export interface ModerationItem {
  id: string;
  target_type: ModerationTarget;
  target_id: string;
  target_path: string | null;
  status: ModerationStatus;
  reason: ModerationReason;
  note: string;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface QueueResult {
  items: ModerationItem[];
  /** Duruma göre sayım — panel başlığındaki rozetler için. */
  counts: Record<ModerationStatus, number>;
}

/** Kuyruğu okur. Yetkisiz kullanıcıda boş liste döner (RLS). */
export async function fetchQueue(
  status?: ModerationStatus
): Promise<QueueResult> {
  const clientPromise = getSupabase();
  if (!clientPromise) {
    throw new Error('Supabase yapılandırılmamış');
  }

  const client = await clientPromise;
  let query = client
    .from('moderation_queue')
    .select(
      'id, target_type, target_id, target_path, status, reason, note, created_at, resolved_at, resolution_note'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items = (data ?? []) as ModerationItem[];
  return { items, counts: countByStatus(items) };
}

/** Durum sayımı — boş kuyrukta da tüm anahtarlar sıfırla döner. */
export function countByStatus(
  items: Pick<ModerationItem, 'status'>[]
): Record<ModerationStatus, number> {
  const counts: Record<ModerationStatus, number> = {
    pending: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    escalated: 0,
  };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

/**
 * Kuyruk kaydının durumunu değiştirir.
 *
 * `approved`/`rejected` geçişlerinde `resolved_by` ve `resolved_at`
 * doldurulmak zorunda — veritabanındaki CHECK kısıtı bunu şart koşuyor.
 * Kısıt istemciye güvenmemek için var: "kim karar verdi" sorusunun
 * cevapsız kaldığı bir moderasyon günlüğü işe yaramaz.
 */
export async function resolveItem(
  id: string,
  status: ModerationStatus,
  actorId: string,
  resolutionNote?: string
): Promise<void> {
  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const resolving = status === 'approved' || status === 'rejected';

  const { error } = await client
    .from('moderation_queue')
    .update({
      status,
      resolution_note: resolutionNote ?? null,
      resolved_by: resolving ? actorId : null,
      resolved_at: resolving ? new Date().toISOString() : null,
      assigned_to: status === 'in_review' ? actorId : null,
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
}
