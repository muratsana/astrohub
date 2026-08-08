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
  | 'profile'
  /* Özel mesaj (0047). Moderatör `messages` tablosunu OKUYAMIYOR;
     şikâyet edilen metin rapor notunda taşınıyor — tek bir cümle için
     iki kişinin bütün yazışmasını açmak orantısız olurdu. */
  | 'message'
  /*
   * ŞİKÂYET DEĞİL, TALEP (FAZ 6).
   *
   * Topluluk sahibinin kendi kaydının kaldırılması için açtığı istek.
   * Kuyruğun diğer kayıtlarından üç farkı var ve üçü de veritabanında:
   * gerekçe zorunlu, satırı yalnızca admin ile talebin sahibi görüyor,
   * kararı `topluluk_silme_karari` veriyor — aşağıdaki `resolveItem`
   * bu türü bilerek reddediyor.
   *
   * `target_id` bir UUID değil, kulübün slug'ı: silme izi de slug'la
   * yazılıyor, iki kayıt aynı anahtarla eşleşsin diye.
   */
  | 'club_deletion';

export type ModerationStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'escalated'
  /*
   * KARARSIZ KAPANIŞ (FAZ 6). Yinelenen, konusu kalmamış ya da
   * yanlışlıkla açılmış kayıt için. Bu kayıtlar bugüne kadar `approved`
   * işaretleniyordu ve denetim günlüğünde "içerik incelendi, haklı
   * bulunmadı" gibi görünüyorlardı — oysa içerik hiç incelenmedi.
   */
  | 'archived';

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
  message: 'Özel mesaj',
  club_deletion: 'Topluluk silme talebi',
};

/**
 * DURUM ETİKETLERİ ŞİKÂYETİN DİLİNDE.
 *
 * `approved`/`rejected` kuyrukta İÇERİK hakkında konuşuyor ("kalsın" /
 * "kalksın"). Silme talebinde aynı iki değer TALEP hakkında ve tam ters
 * okunuyor: `approved` topluluğun kaldırıldığı anlamına geliyor. Bu
 * yüzden talep satırları etiketi buradan almıyor — `talepDurumEtiketi`
 * kullanılıyor.
 */
export const statusLabels: Record<ModerationStatus, string> = {
  pending: 'Sırada',
  in_review: 'İncelemede',
  approved: 'Onaylandı',
  rejected: 'Kaldırıldı',
  escalated: 'Yönetime iletildi',
  archived: 'Arşivlendi',
};

/** Silme talebi satırında durumun okunuşu (bkz. `statusLabels`). */
export const talepDurumEtiketleri: Record<ModerationStatus, string> = {
  pending: 'Sırada',
  in_review: 'İncelemede',
  approved: 'Silindi',
  rejected: 'Reddedildi',
  escalated: 'Yönetime iletildi',
  archived: 'Arşivlendi',
};

/** Kuyruk kaydının okunuşu türüne göre değişiyor. */
export function durumEtiketi(item: {
  target_type: ModerationTarget;
  status: ModerationStatus;
}): string {
  return item.target_type === 'club_deletion'
    ? talepDurumEtiketleri[item.status]
    : statusLabels[item.status];
}

/**
 * Kayıt kapandı mı? `archived` de bir kapanış: karar verilmeden
 * kapatılıyor ama yeniden karara bağlanamıyor (veritabanı da öyle
 * diyor — `topluluk_silme_karari` kapalı talebi reddediyor).
 */
export function isResolved(status: ModerationStatus): boolean {
  return status === 'approved' || status === 'rejected' || status === 'archived';
}

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

/* ══════════════════ İçeriğin kendisini kaldırma ══════════════════ */

/**
 * KUYRUK KAYDINI KAPATMAK İÇERİĞİ KALDIRMAZ.
 *
 * `moderation_queue.status = 'rejected'` yalnızca "şikâyet haklıydı"
 * demek; şikâyet edilen metin hâlâ yayında kalıyordu. Moderatör kuyrukta
 * "Kaldır" diyor, kuyruk temizleniyor ve içerik yerinde duruyordu —
 * kuyruğa bakan herkesin işin bittiğini sandığı bir boşluk.
 *
 * Aşağıdaki eşleme, kaldırmanın gerçekten uygulanabildiği hedefleri
 * veriyor. Eksik olanlar bilerek eksik:
 *   · `photo`, `listing`, `event`, `site` — bunların kaldırılması içerik
 *     panellerinde durum değişikliğiyle yapılıyor (FAZ 3), metin
 *     boşaltmakla değil.
 *   · `profile` — profil kaldırmak kullanıcı hesabına dokunmak demek;
 *     kuyruk düğmesinin arkasına saklanacak bir iş değil.
 *   · `message` — moderatör `messages` tablosunu okuyamıyor bile.
 */
const REMOVABLE: Partial<Record<ModerationTarget, string>> = {
  comment: 'photo_comments',
  forum_thread: 'forum_threads',
  forum_post: 'forum_posts',
};

/** Kuyruktaki karar, içeriği de kaldırabiliyor mu? */
export function canRemoveContent(target: ModerationTarget): boolean {
  return target in REMOVABLE;
}

/**
 * İçeriğin YERİNE GEÇECEK metin.
 *
 * Moderatörün karar notundan AYRI tutuluyor. Karar notu iç kayıt için
 * ("şikâyet haklı, üçüncü tekrar") ve altı ay sonra kararı anlamak için
 * yazılıyor; bu cümle ise siteyi okuyan herkesin göreceği metin. İkisini
 * birleştirseydik moderatörün kendine yazdığı not vitrine çıkardı.
 */
export const VARSAYILAN_KALDIRMA_GEREKCESI =
  'Topluluk kurallarına uymadığından kaldırılmıştır.';

/**
 * İçeriği kaldırır: gövde `removed_content` arşivine taşınır, yerine
 * gerekçe geçer.
 *
 * Taşımayı ve denetim kaydını veritabanı tetikleyicisi yapıyor
 * (`app.tartisma_kaldirma`). İstemci yalnızca `deleted_at` ve
 * `removal_reason` yazıyor — arşivleme istemcide olsaydı, doğrudan SQL
 * ile ya da başka bir yüzeyden yapılan kaldırma metni izsiz yok ederdi.
 */
export async function removeContent(
  target: ModerationTarget,
  targetId: string,
  reason: string = VARSAYILAN_KALDIRMA_GEREKCESI
): Promise<void> {
  const table = REMOVABLE[target];
  if (!table) {
    throw new Error(
      `${targetLabels[target]} bu ekrandan kaldırılamıyor; ilgili içerik panelinden yürütün.`
    );
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { error } = await client
    .from(table)
    .update({
      deleted_at: new Date().toISOString(),
      removal_reason: reason.trim() || VARSAYILAN_KALDIRMA_GEREKCESI,
    })
    .eq('id', targetId);

  if (error) throw new Error(error.message);
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
    archived: 0,
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
  resolutionNote?: string,
  target: ModerationTarget = 'photo'
): Promise<void> {
  /*
    SİLME TALEBİ BU KAPIDAN GEÇMİYOR.

    Admin'in `moderation_queue` üzerinde UPDATE yetkisi var; talebi
    buradan `approved` yapmak teknik olarak mümkün ama topluluğu
    SİLMEZDİ — kuyrukta "onaylandı" yazan, sitede duran bir topluluk
    kalırdı. Silme, bildirim ve denetim kaydı birlikte
    `topluluk_silme_karari` içinde; ayırmanın tek sonucu üçünün
    ayrışması olur.
  */
  if (target === 'club_deletion') {
    throw new Error(
      'Silme talebi bu düğmeyle kapatılamaz; "Silmeyi onayla" ya da "Talebi reddet" kullanın.'
    );
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const resolving = isResolved(status);

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

/* ══════════════════ Topluluk silme talebi (FAZ 6) ══════════════════ */

/**
 * Talebi karara bağlar. Onayda topluluk yumuşak siliniyor, redde
 * yerinde kalıyor ve gerekçe sahibine bildirim olarak gidiyor.
 *
 * Gerekçe boşken sunucuya HİÇ gidilmiyor: veritabanı da reddediyor ama
 * hata mesajı ("check_violation") kullanıcıya söylenecek cümle değil ve
 * ret gerekçesi zaten sahibinin okuyacağı metin — burada yakalamak
 * yazarken uyarabilmek demek.
 */
export async function decideClubDeletion(
  talepId: string,
  onay: boolean,
  gerekce?: string
): Promise<void> {
  const metin = (gerekce ?? '').trim();
  if (!onay && !metin) {
    throw new Error(
      'Ret gerekçesi zorunlu — bu metin topluluk sahibine bildirim olarak iletilecek.'
    );
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { error } = await client.rpc('topluluk_silme_karari', {
    p_talep_id: talepId,
    p_onay: onay,
    p_gerekce: metin || null,
  });

  if (error) throw new Error(error.message);
}

/**
 * Karar vermeden kullanıcıya soru sorar ya da bilgi verir.
 *
 * Talebin/şikâyetin durumuna dokunmuyor: "etkinlik kayıtları ne olsun?"
 * diye sormak kaydı kapatmak değil. Kapanış ayrı bir eylem.
 */
export async function sendModerationFeedback(
  kayitId: string,
  mesaj: string
): Promise<void> {
  const metin = mesaj.trim();
  if (!metin) throw new Error('Geri bildirim metni boş olamaz.');

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { error } = await client.rpc('moderasyon_geri_bildirim', {
    p_kayit_id: kayitId,
    p_mesaj: metin,
  });

  if (error) throw new Error(error.message);
}
