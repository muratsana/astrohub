import { getSupabase } from '@/services/supabase/client';

/**
 * KULLANICI YÖNETİMİ — roller, üyelik ve silme talepleri.
 *
 * ══════════════════════════════════════════════════════════════════════
 * YETKİ BURADA DEĞİL, VERİTABANINDA
 *
 * Bu dosyadaki hiçbir kontrol güvenlik sınırı değil. `user_roles` ve
 * `memberships` üzerinde yazma yetkisini `*_admin_write` politikaları
 * veriyor; admin olmayan biri bu fonksiyonları çağırırsa istek sunucuda
 * reddediliyor. Buradaki filtreler yalnızca reddedilecek bir düğmeyi hiç
 * göstermemek için.
 *
 * ══════════════════════════════════════════════════════════════════════
 * E-POSTA GÖSTERİLMİYOR
 *
 * `auth.users` PostgREST'e açık değil ve açılmamalı: e-posta, son giriş
 * IP'si ve şifre özeti orada. Panel kullanıcıyı `profiles` üzerinden
 * tanıyor (kullanıcı adı + görünen ad). Bir yöneticinin e-postaya
 * ihtiyacı olan tek iş KVKK silme talebi ve o talep kendi tablosunda
 * zaten kayıtlı.
 *
 * Sonuç: panelden bir kullanıcının e-postası SIZDIRILAMAZ. Bu bir eksik
 * değil, tasarım.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SON ADMİN KORUMASI
 *
 * `admin` rolünü almak, kendini dışarı kilitleyebilecek tek işlem.
 * `revokeRole` son admini almayı reddediyor — veritabanı bunu
 * bilmiyor (RLS satır bazlı, "kaç tane kaldı" sorusunu sormuyor), o
 * yüzden kural burada. Yanlış tarafta duran bir kural olduğunu biliyorum;
 * alternatifi bir tetikleyiciydi ve `user_roles`a yazan tek yol bu panel
 * olduğu için maliyeti taşımadı.
 */

export const ROLES = [
  'member',
  'verified_organizer',
  'club_manager',
  'content_editor',
  'moderator',
  'admin',
] as const;

export type AppRole = (typeof ROLES)[number];

export const roleLabels: Record<AppRole, string> = {
  member: 'Üye',
  verified_organizer: 'Onaylı düzenleyici',
  club_manager: 'Kulüp yöneticisi',
  content_editor: 'İçerik editörü',
  moderator: 'Moderatör',
  admin: 'Yönetici',
};

/** Rolün ne açtığını tek cümlede söyler — panelde yanında yazıyor. */
export const roleDescriptions: Record<AppRole, string> = {
  member: 'Varsayılan. Fotoğraf yükler, yorum yazar, ilan açar.',
  verified_organizer: 'Etkinlik oluşturabilir ve yayımlayabilir.',
  club_manager: 'Kulüp sayfasını ve üyelerini yönetir.',
  content_editor: 'Haber, yazı, TV ve radyo yayınlarını düzenler.',
  moderator: 'İçerik kaldırır, forumu ve ilanları denetler.',
  admin: 'Her şey — rol verme dahil.',
};

export const MEMBERSHIP_STATUSES = [
  'active',
  'grace',
  'expired',
  'canceled',
  'none',
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const membershipLabels: Record<MembershipStatus, string> = {
  active: 'Aktif',
  grace: 'Ödemesiz dönem',
  expired: 'Süresi dolmuş',
  canceled: 'İptal edilmiş',
  none: 'Yok',
};

export interface AdminUser {
  id: string;
  username: string;
  displayName: string | null;
  city: string | null;
  createdAt: string;
  roles: AppRole[];
  membership: MembershipStatus;
  membershipEnds: string | null;
  /** Yüklediği yayındaki fotoğraf sayısı — kim aktif, bir bakışta. */
  photoCount: number;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  city: string | null;
  created_at: string;
}

/**
 * Kullanıcı listesi.
 *
 * ÜÇ SORGU, GÖMME DEĞİL. `profiles`tan `user_roles`a PostgREST gömmesi
 * kurulabilirdi ama `memberships` ve fotoğraf sayısı için yine ayrı
 * sorgu gerekiyordu; üç küçük sorguyu istemcide birleştirmek, tek
 * karmaşık gömme ifadesinden hem okunur hem de her parçası ayrı ayrı
 * hata verebilir durumda.
 *
 * `search` kullanıcı adı VE görünen adda arıyor: yönetici genelde birini
 * adıyla arıyor, kullanıcı adını hatırlamıyor.
 */
export async function fetchUsers(
  search = '',
  limit = 50
): Promise<AdminUser[]> {
  const supabase = await client();

  let query = supabase
    .from('profiles')
    .select('id, username, display_name, city, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const term = search.trim();
  if (term) {
    /* `or` içinde virgül ayırıcı; arama terimindeki virgül ifadeyi
       bozardı, bu yüzden temizleniyor. */
    const safe = term.replace(/[,()]/g, ' ').trim();
    query = query.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const profiles = (data ?? []) as ProfileRow[];
  if (profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);

  const [rolesRes, memberRes, photoRes] = await Promise.all([
    supabase.from('user_roles').select('user_id, role').in('user_id', ids),
    supabase
      .from('memberships')
      .select('user_id, status, current_period_end')
      .in('user_id', ids),
    supabase
      .from('astro_photos')
      .select('user_id')
      .in('user_id', ids)
      .eq('status', 'published'),
  ]);

  const roleMap = new Map<string, AppRole[]>();
  for (const row of (rolesRes.data ?? []) as { user_id: string; role: AppRole }[]) {
    roleMap.set(row.user_id, [...(roleMap.get(row.user_id) ?? []), row.role]);
  }

  const memberMap = new Map<string, { status: MembershipStatus; ends: string | null }>();
  for (const row of (memberRes.data ?? []) as {
    user_id: string;
    status: MembershipStatus;
    current_period_end: string | null;
  }[]) {
    memberMap.set(row.user_id, {
      status: row.status,
      ends: row.current_period_end,
    });
  }

  const photoCounts = new Map<string, number>();
  for (const row of (photoRes.data ?? []) as { user_id: string }[]) {
    photoCounts.set(row.user_id, (photoCounts.get(row.user_id) ?? 0) + 1);
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    city: p.city,
    createdAt: p.created_at,
    roles: roleMap.get(p.id) ?? [],
    membership: memberMap.get(p.id)?.status ?? 'none',
    membershipEnds: memberMap.get(p.id)?.ends ?? null,
    photoCount: photoCounts.get(p.id) ?? 0,
  }));
}

export async function grantRole(userId: string, role: AppRole): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
  if (error) throw new Error(error.message);
}

/**
 * Rolü geri alır.
 *
 * SON ADMİN ALINAMAZ. Kendi admin rolünü alan bir yönetici paneli
 * tamamen kaybederdi ve geri dönüş yolu yalnızca SQL konsolu olurdu.
 * Sayım yazma öncesi yapılıyor; yarış durumunda iki eşzamanlı isteğin
 * ikisi de "iki admin var" görebilir, ama bunun için iki yöneticinin
 * aynı saniyede birbirini alması gerekir.
 */
export async function revokeRole(userId: string, role: AppRole): Promise<void> {
  const supabase = await client();

  if (role === 'admin') {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');
    if (error) throw new Error(error.message);
    if ((data ?? []).length <= 1) {
      throw new Error(
        'Son yönetici rolü alınamaz — paneli kimse açamaz hale gelirdi.'
      );
    }
  }

  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);
  if (error) throw new Error(error.message);
}

/**
 * Üyelik durumunu elle ayarlar.
 *
 * NEDEN ELLE: ödeme sağlayıcısı henüz bağlı değil ve destek tarafında
 * "ödemesi geçti ama webhook düşmedi" durumu bir şekilde çözülebilmeli.
 * Alan `provider` boş kalıyor — böylece elle açılmış bir üyelik,
 * sağlayıcıdan gelenden ayırt edilebiliyor.
 */
export async function setMembership(
  userId: string,
  status: MembershipStatus
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('memberships')
    .upsert({ user_id: userId, status }, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

/* ══════════════════════════════════════════════════════════════════════
   KVKK SİLME TALEPLERİ

   Talep bir KAYIT, bir düğme değil: kullanıcı talep ediyor, yönetici
   uyguluyor ve ikisi arasındaki süre yasal olarak izlenebilir olmalı.
   ══════════════════════════════════════════════════════════════════════ */

export interface DeletionRequest {
  id: string;
  userId: string;
  username: string | null;
  requestedAt: string;
  scheduledFor: string | null;
  status: string;
}

/**
 * Silme talepleri.
 *
 * KULLANICI ADI GÖMÜLMÜYOR, AYRI SORGUYLA GELİYOR. `user_id` yabancı
 * anahtarı `auth.users`a bakıyor — `profiles`a değil. PostgREST gömmesi
 * bu yüzden kurulamıyor; denenirse "could not find a relationship"
 * hatası veriyor ve talep listesi tamamen boş kalırdı.
 *
 * Ad bulunamazsa `null` kalıyor ve arayüz kimliği gösteriyor: profili
 * silinmiş bir hesabın talebi de listede görünmeli — asıl silinecek
 * kayıt o.
 */
export async function fetchDeletionRequests(): Promise<DeletionRequest[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id, user_id, requested_at, scheduled_for, status')
    .order('requested_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    requested_at: string;
    scheduled_for: string | null;
    status: string;
  }[];
  if (rows.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', rows.map((r) => r.user_id));

  const names = new Map(
    ((profiles ?? []) as { id: string; username: string }[]).map((p) => [
      p.id,
      p.username,
    ])
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: names.get(row.user_id) ?? null,
    requestedAt: row.requested_at,
    scheduledFor: row.scheduled_for,
    status: row.status,
  }));
}
