import { getSupabase } from '@/services/supabase/client';
import { csvFileName, toCsv } from '@/lib/csv';

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

/**
 * HESAP DURUMU (Faz 1, Görev 1.1).
 *
 * Yaptırım BURADA DEĞİL. Bu tip yalnızca panelin ne göstereceğini
 * söylüyor; askıdaki kullanıcının yazamamasını `app.is_account_active()`
 * ve ona bağlanan on bir RLS politikası sağlıyor
 * (`20260806162000_account_status_enforcement.sql`). Arayüzü kapatmak
 * bir güvenlik önlemi değil, nezaket.
 */
export const ACCOUNT_STATUSES = [
  'active',
  'suspended',
  'banned',
  'deactivated',
] as const;

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const accountStatusLabels: Record<AccountStatus, string> = {
  active: 'Aktif',
  suspended: 'Askıda',
  banned: 'Yasaklı',
  deactivated: 'Dondurulmuş',
};

export const accountStatusDescriptions: Record<AccountStatus, string> = {
  active: 'Normal. Yazma yetkisi tam.',
  suspended: 'Okur, yazamaz. Süreli ya da süresiz.',
  banned: 'Kalıcı. Public profili ve içerikleri listelerden düşer.',
  deactivated: 'Kullanıcının kendi isteğiyle dondurduğu hesap.',
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
  status: AccountStatus;
  /** Süreli askının bitişi. `suspended` + null = süresiz. */
  suspendedUntil: string | null;
  /** Kullanıcıya gösterilen gerekçe. */
  statusReason: string | null;
  /** Yalnızca panelde görünen dahili not. */
  adminNote: string | null;
  lastSeenAt: string | null;
  /** NULL ise kullanıcı adı hâlâ otomatik üretilmiş (`user_xxx`). */
  usernameCustomizedAt: string | null;
}

/**
 * Askı süresi dolmuş mu? `app.is_account_active()` ile AYNI kuralı
 * uyguluyor — orada da süresi geçmiş askı aktif sayılıyor. İki yerde iki
 * farklı kural, panelin "askıda" dediği kullanıcının yazabilmesi demekti.
 */
export function isWriteAllowed(user: {
  status: AccountStatus;
  suspendedUntil: string | null;
}): boolean {
  if (user.status === 'active') return true;
  if (user.status !== 'suspended') return false;
  return user.suspendedUntil !== null && new Date(user.suspendedUntil) <= new Date();
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
  account_status: AccountStatus;
  suspended_until: string | null;
  status_reason: string | null;
  admin_note: string | null;
  last_seen_at: string | null;
  username_customized_at: string | null;
}

export const USER_SORTS = ['createdAt', 'username', 'lastSeen'] as const;
export type UserSort = (typeof USER_SORTS)[number];

export const userSortLabels: Record<UserSort, string> = {
  createdAt: 'Kayıt tarihi',
  username: 'Kullanıcı adı',
  lastSeen: 'Son görülme',
};

export interface UserQuery {
  search?: string;
  status?: AccountStatus | 'hepsi';
  role?: AppRole | 'hepsi';
  city?: string;
  sort?: UserSort;
  /** 0 tabanlı. */
  page?: number;
  pageSize?: number;
}

export interface UserPage {
  rows: AdminUser[];
  /** Filtreye uyan TOPLAM kayıt — sayfadaki değil. */
  total: number;
}

export const USER_PAGE_SIZE = 50;

/**
 * Kullanıcı listesi — sunucu taraflı sayfalama ve süzme (Görev 1.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYFALAMA NEDEN SUNUCUDA
 *
 * Önceki sürüm sabit 50 kayıt çekip istemcide gösteriyordu; 51. kullanıcı
 * panelde HİÇ görünmüyordu ve bunu söyleyen bir şey de yoktu. Şimdi
 * `range()` ile sayfalanıyor ve `count: exact` toplam sayıyı veriyor —
 * yönetici kaç kaydın filtresine uyduğunu görüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ROL SÜZGECİ İKİ AŞAMALI
 *
 * Roller ayrı tabloda (`user_roles`) ve PostgREST gömmesi üzerinden
 * süzmek `profiles`ın sayımını bozuyor. Bu yüzden rol filtresi varken
 * önce o role sahip kimlikler çekiliyor, sonra `in()` ile ana sorguya
 * veriliyor. Rol taşıyan kullanıcı sayısı doğası gereği küçük (şu an 2);
 * bu liste büyürse `in()` yerine RPC gerekir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖRT SORGU, GÖMME DEĞİL
 *
 * `profiles`tan `user_roles`a gömme kurulabilirdi ama `memberships` ve
 * fotoğraf sayısı için yine ayrı sorgu gerekiyordu; küçük sorguları
 * istemcide birleştirmek tek karmaşık gömme ifadesinden hem okunur hem
 * de her parçası ayrı ayrı hata verebilir durumda.
 *
 * `search` kullanıcı adı VE görünen adda arıyor: yönetici genelde birini
 * adıyla arıyor, kullanıcı adını hatırlamıyor.
 */
export async function fetchUsers(query: UserQuery = {}): Promise<UserPage> {
  const supabase = await client();
  const {
    search = '',
    status = 'hepsi',
    role = 'hepsi',
    city = '',
    sort = 'createdAt',
    page = 0,
    pageSize = USER_PAGE_SIZE,
  } = query;

  /* Rol süzgeci: önce kimlikler, sonra `in()`. Gerekçe başlıkta. */
  let roleIds: string[] | null = null;
  if (role !== 'hepsi') {
    const { data: rows, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', role);
    if (roleError) throw new Error(roleError.message);
    roleIds = ((rows ?? []) as { user_id: string }[]).map((r) => r.user_id);
    /* Hiç kimse o role sahip değilse sorguya hiç gitmiyoruz: `in()` boş
       diziyle çağrıldığında PostgREST sözdizimi hatası veriyor. */
    if (roleIds.length === 0) return { rows: [], total: 0 };
  }

  const siralama: Record<UserSort, { alan: string; artan: boolean }> = {
    createdAt: { alan: 'created_at', artan: false },
    username: { alan: 'username', artan: true },
    lastSeen: { alan: 'last_seen_at', artan: false },
  };
  const { alan, artan } = siralama[sort];

  const bas = page * pageSize;

  let sorgu = supabase
    .from('profiles')
    .select(
      'id, username, display_name, city, created_at, account_status, ' +
        'suspended_until, status_reason, admin_note, last_seen_at, username_customized_at',
      { count: 'exact' }
    )
    /* `nullsFirst: false` — son görülmesi hiç yazılmamış kullanıcılar
       listenin başında değil sonunda dursun. */
    .order(alan, { ascending: artan, nullsFirst: false })
    .range(bas, bas + pageSize - 1);

  const term = search.trim();
  if (term) {
    /* `or` içinde virgül ayırıcı; arama terimindeki virgül ifadeyi
       bozardı, bu yüzden temizleniyor. */
    const safe = term.replace(/[,()]/g, ' ').trim();
    sorgu = sorgu.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`);
  }
  if (status !== 'hepsi') sorgu = sorgu.eq('account_status', status);
  if (city.trim()) sorgu = sorgu.ilike('city', `%${city.trim()}%`);
  if (roleIds) sorgu = sorgu.in('id', roleIds);

  const { data, error, count } = await sorgu;
  if (error) throw new Error(error.message);

  /* `as unknown as` — PostgREST'in tip çıkarımı çok satırlı select
     dizesini çözemiyor ve `GenericStringError[]` döndürüyor. Alan
     listesi elle yazıldığı için şekli biliyoruz; ara dönüşüm bunu
     derleyiciye söylüyor. */
  const profiles = (data ?? []) as unknown as ProfileRow[];
  const total = count ?? profiles.length;
  if (profiles.length === 0) return { rows: [], total };

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

  const rows = profiles.map((p) => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    city: p.city,
    createdAt: p.created_at,
    roles: roleMap.get(p.id) ?? [],
    membership: memberMap.get(p.id)?.status ?? 'none',
    membershipEnds: memberMap.get(p.id)?.ends ?? null,
    photoCount: photoCounts.get(p.id) ?? 0,
    status: p.account_status,
    suspendedUntil: p.suspended_until,
    statusReason: p.status_reason,
    adminNote: p.admin_note,
    lastSeenAt: p.last_seen_at,
    usernameCustomizedAt: p.username_customized_at,
  }));

  return { rows, total };
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

/**
 * HESAP DURUMU DEĞİŞTİRME (Görev 1.4/4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SEBEP ZORUNLU, ÇÜNKÜ KULLANICI ONU GÖRÜYOR
 *
 * `status_reason` panelde tutulan bir not değil; askıya alınan kişiye
 * gösterilecek metin. Boş bırakılabilseydi kullanıcı "hesabınız askıda"
 * yazısını görüp neden olduğunu hiç öğrenemezdi. Dahili not için ayrı
 * alan var (`admin_note`).
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU FONKSİYON BİR GÜVENLİK SINIRI DEĞİL
 *
 * Admin olmayan biri bunu çağırırsa `profiles_guard_admin_fields`
 * tetikleyicisi isteği 42501 ile reddediyor. Buradaki kontroller
 * yalnızca hata mesajını anlaşılır kılmak için.
 *
 * Denetim kaydını da bu fonksiyon YAZMIYOR: `profiles_audit_status`
 * tetikleyicisi yazıyor. Panelden geçmeyen bir değişiklik de kaçmasın
 * diye orada.
 */
export interface StatusChange {
  status: AccountStatus;
  /** Kullanıcıya gösterilecek gerekçe — zorunlu. */
  reason: string;
  /** Süreli askı bitişi (ISO). `suspended` dışında yok sayılır. */
  until?: string | null;
}

export async function setAccountStatus(
  userId: string,
  change: StatusChange
): Promise<void> {
  const reason = change.reason.trim();
  if (!reason) {
    throw new Error('Gerekçe zorunlu — kullanıcıya bu metin gösterilecek.');
  }

  const supabase = await client();
  const { data: session } = await supabase.auth.getUser();

  const { error } = await supabase
    .from('profiles')
    .update({
      account_status: change.status,
      /* Askı dışındaki durumlarda süre anlamsız; temizlenmezse
         "yasaklı ama 3 gün sonra biter" gibi bir satır kalırdı. */
      suspended_until: change.status === 'suspended' ? (change.until ?? null) : null,
      status_reason: reason,
      status_changed_by: session.user?.id ?? null,
      status_changed_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

/** Dahili not — kullanıcıya gösterilmez, yalnızca panelde. */
export async function setAdminNote(userId: string, note: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('profiles')
    .update({ admin_note: note.trim() || null })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * KULLANICI LİSTESİ CSV DIŞA AKTARIMI (Görev 1.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYFA DEĞİL, FİLTRE DIŞA AKTARILIR
 *
 * Yönetici "listeyi indir" derken ekrandaki 50 satırı değil, süzdüğü
 * kümeyi kastediyor. Bu yüzden dışa aktarım sayfalamayı yok sayıp
 * filtreye uyan tüm kayıtları çekiyor.
 *
 * ÜST SINIR VAR ve sessiz değil: 5.000 kaydın üstünde işlem reddediliyor.
 * Tarayıcıda 50 bin satırlık bir CSV üretmek sekmeyi kilitler; sessizce
 * ilk 5.000'i indirmek ise daha kötü — yönetici eksik bir dosyayı tam
 * sanır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * E-POSTA YOK
 *
 * Karar K3: e-posta panelde hiç görünmüyor, dolayısıyla CSV'de de yok.
 * Liste kolonu olarak e-posta, tek tıkla bütün üyelerin adresini dışa
 * aktarabilmek demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DENETİM KAYDI
 *
 * Kişisel veri toplu olarak dışarı çıkıyor; belge §0.6 gereği ve KVKK
 * açısından bunun kaydı olmalı. `users.export` olarak yazılıyor, kaç
 * kayıt ve hangi filtreyle olduğu detayda.
 */
const CSV_EXPORT_LIMIT = 5000;

export async function exportUsersCsv(query: UserQuery = {}): Promise<void> {
  const { total } = await fetchUsers({ ...query, page: 0, pageSize: 1 });
  if (total > CSV_EXPORT_LIMIT) {
    throw new Error(
      `${total} kayıt CSV için fazla (sınır ${CSV_EXPORT_LIMIT}). Filtreyi daraltın.`
    );
  }

  const { rows } = await fetchUsers({ ...query, page: 0, pageSize: total || 1 });

  const csv = toCsv(rows, [
    { label: 'Kullanıcı adı', value: (u) => u.username },
    { label: 'Görünen ad', value: (u) => u.displayName },
    { label: 'Şehir', value: (u) => u.city },
    { label: 'Durum', value: (u) => accountStatusLabels[u.status] },
    { label: 'Askı bitişi', value: (u) => u.suspendedUntil },
    { label: 'Gerekçe', value: (u) => u.statusReason },
    { label: 'Roller', value: (u) => u.roles.map((r) => roleLabels[r]).join(' · ') },
    { label: 'Üyelik', value: (u) => membershipLabels[u.membership] },
    { label: 'Fotoğraf', value: (u) => u.photoCount },
    { label: 'Kayıt', value: (u) => u.createdAt },
    { label: 'Son görülme', value: (u) => u.lastSeenAt },
  ]);

  const supabase = await client();
  const { data: session } = await supabase.auth.getUser();
  await supabase.from('audit_logs').insert({
    actor_id: session.user?.id ?? null,
    action: 'users.export',
    target_type: 'profile',
    target_id: null,
    detail: { kayit: rows.length, filtre: query },
  });

  indirCsv(csv, csvFileName('kullanicilar'));
}

/**
 * Tarayıcıda dosya indirir.
 *
 * `URL.revokeObjectURL` gecikmeli: hemen çağrılırsa bazı tarayıcılar
 * indirmeyi başlatmadan bağlantıyı kaybediyor.
 */
function indirCsv(icerik: string, dosyaAdi: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }
  const blob = new Blob([icerik], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Bir kullanıcıya ait son denetim kayıtları (Görev 1.4/7).
 *
 * `target_id` metin alanı; kullanıcı kimliği hem `profile` hem
 * `user_role` hedef tipiyle yazılıyor (durum değişikliği ve rol atama
 * ayrı tetikleyicilerden geliyor). İkisi de aynı kişiye ait, bu yüzden
 * tip süzgeci yok — sorgu kimliğe bakıyor.
 */
export interface AuditEntry {
  id: number;
  action: string;
  createdAt: string;
  detail: Record<string, unknown>;
}

export async function fetchUserAudit(
  userId: string,
  limit = 20
): Promise<AuditEntry[]> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, created_at, detail')
    .eq('target_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return ((data ?? []) as {
    id: number;
    action: string;
    created_at: string;
    detail: Record<string, unknown> | null;
  }[]).map((row) => ({
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    detail: row.detail ?? {},
  }));
}
