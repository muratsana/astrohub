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
  /**
   * ŞİKÂYETİ KİM AÇTI.
   *
   * Kolon 0007'den beri dolduruluyordu ama sorgu onu hiç çekmiyordu:
   * moderatör kimin şikâyet ettiğini göremiyordu. Bu, tekrar eden
   * şikâyetçiyi ve kötü niyetli bildirimi görünmez yapıyordu — aynı
   * kişinin aynı kullanıcıyı beşinci kez bildirmesiyle ilk kez
   * bildirmesi ekranda aynı görünüyordu.
   *
   * Oturumsuz bildirim mümkün olduğu için `null` olabiliyor.
   */
  reported_by: string | null;
  /** Şikâyetçinin kullanıcı adı; profili silinmişse null. */
  reporter_username: string | null;
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
/**
 * KALDIRILABİLİR HEDEFLER — tablo, kimlik kolonu ve gerekçe desteği.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCEDEN YALNIZCA TABLO ADI VARDI VE ÜÇ HEDEF TANIYORDU
 *
 * Fotoğraf listede YOKTU. Sonuç, kuyruğun kullanıcıya yalan söylemesiydi:
 * moderatör "Şikâyet haklı" diyor, kayıt "Kaldırıldı" durumuna geçiyor,
 * ama fotoğrafı kaldıracak düğme hiç çizilmiyordu (`canRemoveContent`
 * false). Canlıda tam olarak bu oldu — telif şikâyeti "Kaldırıldı"
 * görünüyor, fotoğraf yayında duruyordu.
 *
 * İki alan eklendi çünkü tablolar birbirinin aynı değil:
 *
 *   · `idColumn` — şikâyet düğmesi fotoğraf ve ilanda SLUG gönderiyor,
 *     forumda kimlik. `eq('id', slug)` sessizce sıfır satır günceller ve
 *     PostgREST bunu hata saymaz: düğme çalışmış gibi görünür, hiçbir şey
 *     olmazdı.
 *   · `reason` — `removal_reason` kolonu yalnızca tartışma tablolarında
 *     var. Fotoğrafa yazmaya kalkmak "column does not exist" ile
 *     düşerdi.
 */
interface RemovableSpec {
  table: string;
  /** Şikâyet kaydındaki `target_id` bu kolonla eşleşiyor. */
  idColumn: 'id' | 'slug';
  /** Tabloda `removal_reason` var mı? */
  reason: boolean;
}

const REMOVABLE: Partial<Record<ModerationTarget, RemovableSpec>> = {
  photo: { table: 'astro_photos', idColumn: 'slug', reason: false },
  comment: { table: 'photo_comments', idColumn: 'id', reason: true },
  forum_thread: { table: 'forum_threads', idColumn: 'id', reason: true },
  forum_post: { table: 'forum_posts', idColumn: 'id', reason: true },
  listing: { table: 'listings', idColumn: 'slug', reason: false },
  site: { table: 'observing_sites', idColumn: 'slug', reason: false },
  event: { table: 'events', idColumn: 'slug', reason: false },
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
  const spec = REMOVABLE[target];
  if (!spec) {
    throw new Error(
      `${targetLabels[target]} bu ekrandan kaldırılamıyor; ilgili içerik panelinden yürütün.`
    );
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { data, error } = await client
    .from(spec.table)
    .update({
      deleted_at: new Date().toISOString(),
      ...(spec.reason
        ? { removal_reason: reason.trim() || VARSAYILAN_KALDIRMA_GEREKCESI }
        : {}),
    })
    .eq(spec.idColumn, targetId)
    .select(spec.idColumn);

  if (error) throw new Error(error.message);
  /*
   * SIFIR SATIR HATA SAYILIYOR. PostgREST "hiçbir şey eşleşmedi"yi hata
   * döndürmez; `select` olmadan bu çağrı, yanlış kimlik kolonuyla ya da
   * RLS reddiyle hiçbir şey yapmadan başarılı görünürdü — moderatör
   * içeriği kaldırdığını sanıp yayında bırakırdı.
   */
  if (!data || data.length === 0) {
    throw new Error(
      'İçerik kaldırılamadı — kayıt bulunamadı ya da yetkiniz yok.'
    );
  }
}

/**
 * KALDIRILMIŞ İÇERİĞİ YAYINA GERİ ALIR.
 *
 * Şikâyet sonradan haksız çıkabiliyor ve o durumda geri dönüş yolu
 * yoktu: moderasyon kaydında yalnızca kaldırma düğmesi vardı, geri alma
 * kayıt panelinin başka bir köşesindeydi ve şikâyetle bağı yoktu.
 *
 * Gövde arşivden geri geliyor: tartışma tablolarında `deleted_at`
 * boşaltıldığında `app.tartisma_kaldirma` tetikleyicisi metni
 * `removed_content`ten geri yazıyor ve arşiv satırını siliyor. Fotoğraf
 * ve ilanda gövde hiç taşınmıyor, yalnızca bayrak kalkıyor.
 */
export async function restoreContent(
  target: ModerationTarget,
  targetId: string
): Promise<void> {
  const spec = REMOVABLE[target];
  if (!spec) {
    throw new Error(`${targetLabels[target]} bu ekrandan geri alınamıyor.`);
  }

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { data, error } = await client
    .from(spec.table)
    .update({
      deleted_at: null,
      ...(spec.reason ? { removal_reason: null } : {}),
    })
    .eq(spec.idColumn, targetId)
    .select(spec.idColumn);

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'İçerik geri alınamadı — kayıt bulunamadı ya da yetkiniz yok.'
    );
  }
}

export interface ContentState {
  /** Kayıt bulundu mu? Bulunamadıysa kaldırma/geri alma da anlamsız. */
  found: boolean;
  removed: boolean;
}

/**
 * Şikâyet edilen içerik ŞU AN yayında mı?
 *
 * Kuyruk durumu ile içeriğin durumu AYRI şeyler ve ayrıştıklarında
 * moderatör bunu göremiyordu. Bu okuma, karar düğmelerinin doğrusunu
 * göstermesini sağlıyor: yayındaysa "yayından kaldır", kaldırılmışsa
 * "yayına geri al".
 */
export async function fetchContentState(
  target: ModerationTarget,
  targetId: string
): Promise<ContentState> {
  const spec = REMOVABLE[target];
  if (!spec) return { found: false, removed: false };

  const clientPromise = getSupabase();
  if (!clientPromise) throw new Error('Supabase yapılandırılmamış');

  const client = await clientPromise;
  const { data, error } = await client
    .from(spec.table)
    .select(`${spec.idColumn}, deleted_at`)
    .eq(spec.idColumn, targetId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return { found: false, removed: false };
  return {
    found: true,
    removed: (data as { deleted_at: string | null }).deleted_at !== null,
  };
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
    /* Sütun listesi TEK PARÇA dize: birleştirilmiş bir ifade PostgREST'in
       tip çıkarımını düşürüyor ve satırlar `unknown` olarak geliyor. */
    .select(
      'id, target_type, target_id, target_path, status, reason, note, created_at, resolved_at, resolution_note, reported_by'
    )
    .order('created_at', { ascending: false })
    .limit(100);

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Omit<ModerationItem, 'reporter_username'>[];

  /*
   * ŞİKÂYETÇİ ADLARI AYRI SORGUDA.
   *
   * `reported_by` yabancı anahtarı `auth.users`a bakıyor, `profiles`a
   * değil — dolayısıyla PostgREST gömme ifadesi (`profiles!...`) bu
   * ilişkiyi çözemiyor. Kuyruk en fazla yüz satır olduğu için tek ek
   * sorgu yetiyor; satır başına sorgu atmak yüz istek demekti.
   */
  const ids = [
    ...new Set(
      rows.map((r) => r.reported_by).filter((v): v is string => !!v)
    ),
  ];

  const adlar = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiller, error: profilHatasi } = await client
      .from('profiles')
      .select('id, username')
      .in('id', ids);
    /* Hata YUTULMUYOR ama kuyruğu da düşürmüyor: ad okunamadıysa
       şikâyetler yine listelenmeli, yalnızca "kim" sütunu boş kalır. */
    if (profilHatasi) throw new Error(profilHatasi.message);
    for (const p of (profiller ?? []) as { id: string; username: string }[]) {
      adlar.set(p.id, p.username);
    }
  }

  const items: ModerationItem[] = rows.map((row) => ({
    ...row,
    reporter_username: row.reported_by
      ? (adlar.get(row.reported_by) ?? null)
      : null,
  }));
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
