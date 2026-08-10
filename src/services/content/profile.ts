import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { sanitizeText, sanitizeUsername } from '@/lib/sanitize';
import { safeUrl } from '@/lib/url';

/**
 * PROFİL — hesabın kendi kaydı.
 *
 * DENETİM MADDESİ L2: profil sayfası tohum fotoğraflardan türetiliyordu
 * ve hesapla hiçbir bağı yoktu; kullanıcı adını, şehrini ya da kendini
 * anlatan iki satırı değiştirmenin yolu yoktu. Kayıt olan biri için
 * "profil" diye görünen şey aslında başkasının fotoğraflarının bir
 * dökümüydü.
 *
 * YAZMA YETKİSİNİ RLS ÇİZİYOR: `profiles_update_own` yalnızca
 * `auth.uid() = id` satırına izin veriyor. Buradaki kontroller bir
 * güvenlik sınırı değil, kullanıcıyı sunucudan dönen ham hata mesajıyla
 * baş başa bırakmama nezaketi.
 */

/** `app.account_status` enum'unun istemci karşılığı. */
export type AccountStatus = 'active' | 'suspended' | 'banned' | 'deactivated';

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  city: string | null;
  /** İlçe — `districts` kanonik yazımı. İl gibi isteğe bağlı. */
  district: string | null;
  websiteUrl: string | null;
  avatarPath: string | null;
  /**
   * Hesabın yazma yetkisi. BU ALAN BİR GÜVENLİK KONTROLÜ DEĞİL — yaptırım
   * RLS'te (`app.is_account_active`). Buradaki değer yalnızca kullanıcıya
   * durumunu ANLATMAK için: yoksa askıdaki kişi form gönderdiğinde
   * "satır eklenemedi" gibi bir hata görür ve neden olduğunu anlamaz.
   */
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  /** Yöneticinin girdiği, kullanıcıya gösterilen gerekçe. */
  statusReason: string | null;
  /**
   * Kullanım koşullarının onaylandığı an; `null` ise onay hiç alınmamış.
   * Google ile giren kullanıcılar ve 0031 öncesinde açılmış hesaplar
   * bu durumda — arayüz girişten sonra onay ekranı gösteriyor.
   */
  termsAcceptedAt: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  city: string | null;
  district?: string | null;
  website_url: string | null;
  avatar_path: string | null;
  terms_accepted_at: string | null;
  /* Üçü İSTEĞE BAĞLI: bu alanları yalnızca `SELECT` sabiti çekiyor ve
     `mapProfileRow` başka yerlerden de (daha dar seçimlerle) çağrılıyor.
     Zorunlu yapmak, alanı hiç istemeyen çağrıları derlemez hâle
     getirirdi; eksikse `active` varsayılıyor. */
  account_status?: AccountStatus;
  suspended_until?: string | null;
  status_reason?: string | null;
}

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    city: row.city,
    district: row.district ?? null,
    websiteUrl: row.website_url,
    avatarPath: row.avatar_path,
    termsAcceptedAt: row.terms_accepted_at,
    accountStatus: row.account_status ?? 'active',
    suspendedUntil: row.suspended_until ?? null,
    statusReason: row.status_reason ?? null,
  };
}

/**
 * Kullanıcı yazabilir mi?
 *
 * `app.is_account_active()` ile AYNI kuralı uyguluyor — orada da süresi
 * geçmiş askı aktif sayılıyor. İki yerde iki farklı kural, arayüzün
 * "askıdasın" dediği kullanıcının yazabilmesi (ya da tersi) demekti.
 *
 * Yine de bu bir yetki kontrolü DEĞİL: kaynak tek, yaptırım RLS'te.
 */
export function canWrite(profile: Profile | null): boolean {
  if (!profile) return true;
  if (profile.accountStatus === 'active') return true;
  if (profile.accountStatus !== 'suspended') return false;
  return (
    profile.suspendedUntil !== null &&
    new Date(profile.suspendedUntil) <= new Date()
  );
}

const SELECT =
  'id, username, display_name, bio, city, district, website_url, avatar_path, ' +
  'terms_accepted_at, account_status, suspended_until, status_reason';

/**
 * Onayı kendi profil satırına yazar.
 *
 * Zaman damgası burada `now()` olarak İSTEMCİDEN gidiyor gibi görünse
 * de değil: değer sunucuda `now()` ile üretiliyor (bkz. 0031 ve
 * aşağıdaki `updated_at` deseni). İstemci yalnızca "onayladım" diyor.
 */
export async function recordConsent(version: string): Promise<string | null> {
  const supabase = await client();
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return 'Oturum bulunamadı.';

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('profiles')
    .update({
      terms_accepted_at: now,
      privacy_accepted_at: now,
      consent_version: version,
    })
    .eq('id', id);

  return error?.message ?? null;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış.');
  return promise;
}

/* ── Okuma ─────────────────────────────────────────────────────────── */

export interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useProfileQuery(
  run: ((supabase: Awaited<ReturnType<typeof client>>) => Promise<ProfileRow | null>) | null
): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!run || !isSupabaseConfigured) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);

    client()
      .then(run)
      .then((row) => {
        if (!active) return;
        setProfile(row ? mapProfileRow(row) : null);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'Profil okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
    /* `run` her render'da yeniden kurulan bir kapanış; bağımlılığa
       koymak sonsuz döngü yapardı. Çağıran taraf `tick` ile tazeliyor,
       kimlik değişimi de kendi `useMemo`'sundan geliyor. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, !!run]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { profile, loading, error, refresh };
}

/** Oturum açmış kullanıcının kendi profili. */
export function useMyProfile(userId: string | undefined): ProfileState {
  const run = userId
    ? async (supabase: Awaited<ReturnType<typeof client>>) => {
        const { data, error } = await supabase
          .from('profiles')
          .select(SELECT)
          .eq('id', userId)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as ProfileRow | null) ?? null;
      }
    : null;

  return useProfileQuery(run);
}

/** Kullanıcı adına göre herkese açık profil. */
export function useProfileByUsername(username: string | undefined): ProfileState {
  const clean = sanitizeUsername(username);
  const run = clean
    ? async (supabase: Awaited<ReturnType<typeof client>>) => {
        const { data, error } = await supabase
          .from('profiles')
          .select(SELECT)
          .eq('username', clean)
          .maybeSingle();
        if (error) throw new Error(error.message);
        return (data as ProfileRow | null) ?? null;
      }
    : null;

  return useProfileQuery(run);
}

/* ── Yazma ─────────────────────────────────────────────────────────── */

export interface ProfileEdit {
  username: string;
  displayName: string;
  bio: string;
  city: string;
  district: string;
  websiteUrl: string;
}

/**
 * Form doğrulaması.
 *
 * KULLANICI ADI ADRESİN PARÇASI (`/profil/:username`), bu yüzden en sıkı
 * kural onda: yalnızca harf, rakam, alt çizgi ve tire. `sanitizeUsername`
 * gerisini zaten atıyor ama sessizce atmak kötü — kullanıcı yazdığının
 * neden kaybolduğunu görmeli.
 */
export function validateProfile(edit: ProfileEdit): string | null {
  const username = sanitizeUsername(edit.username);
  if (username.length < 3) {
    return 'Kullanıcı adı en az 3 karakter olmalı.';
  }
  if (username !== edit.username.trim()) {
    return 'Kullanıcı adında yalnızca harf, rakam, alt çizgi ve tire kullanılabilir.';
  }
  if (sanitizeText(edit.displayName, { maxLength: 60 }).length > 60) {
    return 'Görünen ad 60 karakteri aşamaz.';
  }
  if (sanitizeText(edit.bio, { multiline: true }).length > 400) {
    return 'Hakkında metni 400 karakteri aşamaz.';
  }
  /* Adres alanı `safeUrl`den geçiyor: `javascript:` şeması taşıyan bir
     bağlantı profil sayfasında tıklanabilir hâle gelirdi (§15.4). */
  if (edit.websiteUrl.trim() && !safeUrl(edit.websiteUrl.trim())) {
    return 'Web adresi geçersiz — http:// ya da https:// ile başlamalı.';
  }
  return null;
}

/** Kullanıcı adı başkasında mı? */
export async function isUsernameTaken(
  username: string,
  ownId: string
): Promise<boolean> {
  const supabase = await client();
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', sanitizeUsername(username))
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { id: string } | null;
  return !!row && row.id !== ownId;
}

export async function updateProfile(
  userId: string,
  edit: ProfileEdit
): Promise<void> {
  const problem = validateProfile(edit);
  if (problem) throw new Error(problem);

  if (await isUsernameTaken(edit.username, userId)) {
    throw new Error('Bu kullanıcı adı alınmış — başka bir tane deneyin.');
  }

  const supabase = await client();
  const { error } = await supabase
    .from('profiles')
    .update({
      username: sanitizeUsername(edit.username),
      /* Boş metin `null` olarak yazılıyor: boş dize ile "girilmemiş"
         arasındaki farkı korumak, profil sayfasında "—" ile boş bir
         satırı ayırt etmeyi sağlıyor. */
      display_name: sanitizeText(edit.displayName, { maxLength: 60 }) || null,
      bio: sanitizeText(edit.bio, { multiline: true }) || null,
      city: sanitizeText(edit.city, { maxLength: 60 }) || null,
      /* İl boşaltıldıysa ilçe de düşüyor: ilçesiz bir il anlamlı ama
         ilsiz bir ilçe değil — "Gölbaşı" tek başına iki farklı yeri
         işaret ediyor. */
      district: edit.city.trim()
        ? sanitizeText(edit.district, { maxLength: 60 }) || null
        : null,
      website_url: edit.websiteUrl.trim() ? safeUrl(edit.websiteUrl.trim()) : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw new Error(error.message);
}

/**
 * Oturum açmış kullanıcının hesabını kalıcı siler.
 *
 * `auth.users` istemciden silinemez; bu yüzden service-role yalnızca Edge
 * Function içinde durur. Fonksiyon body'den kullanıcı id almaz, JWT'deki
 * kullanıcıyı siler.
 */
export async function deleteOwnAccount(): Promise<void> {
  const supabase = await client();
  const { error } = await supabase.functions.invoke('hesap-sil', {
    body: {},
  });
  if (error) throw new Error(error.message);
}
