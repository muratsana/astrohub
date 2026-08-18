import { useCallback, useEffect, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import { sanitizeText, sanitizeUsername } from '@/lib/sanitize';
import { safeUrl } from '@/lib/url';
import {
  avatarStoragePath,
  bannerStoragePath,
} from '@/domain/profile/avatar';

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
  displayNameVisible: boolean;
  bio: string | null;
  city: string | null;
  /** İlçe — `districts` kanonik yazımı. İl gibi isteğe bağlı. */
  district: string | null;
  websiteUrl: string | null;
  avatarPath: string | null;
  /** Public profil kapak görseli — avatarla aynı kovada, farklı önekle. */
  bannerPath: string | null;
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
  /**
   * Kullanıcı adının SEÇİLDİĞİ an; `null` ise hâlâ kayıtta üretilen
   * `user_xxxx` adı duruyor ya da hesap 0132 öncesinden kalma.
   *
   * Dolu olması adın KİLİTLİ olduğu anlamına geliyor: damga bir kez
   * basılıyor ve `app.profiles_username_kilidi` sonraki değişikliği
   * reddediyor. Arayüz bunu yalnızca anlatmak için okuyor.
   */
  usernameCustomizedAt: string | null;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  display_name_visible?: boolean | null;
  bio: string | null;
  city: string | null;
  district?: string | null;
  website_url: string | null;
  avatar_path: string | null;
  banner_path?: string | null;
  terms_accepted_at: string | null;
  username_customized_at?: string | null;
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
    displayNameVisible: row.display_name_visible !== false,
    bio: row.bio,
    city: row.city,
    district: row.district ?? null,
    websiteUrl: row.website_url,
    avatarPath: row.avatar_path,
    bannerPath: row.banner_path ?? null,
    termsAcceptedAt: row.terms_accepted_at,
    usernameCustomizedAt: row.username_customized_at ?? null,
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

/**
 * Kovadaki bir dosyanın açık adresi.
 *
 * Avatar ve kapak AYNI kovada duruyor (gerekçesi 20260818220000'de):
 * ikinci bir kova, birebir aynı politika setinin ikinci bir kopyası
 * olurdu. Bu yüzden tek üretici ikisine de bakıyor.
 */
function avatarKovaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = import.meta.env.VITE_SUPABASE_URL?.trim();
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${path}`;
}

export function profileAvatarUrl(path: string | null | undefined): string | null {
  return avatarKovaUrl(path);
}

export function profileBannerUrl(path: string | null | undefined): string | null {
  return avatarKovaUrl(path);
}

/*
 * SEÇİM TEK PARÇA BİR DİZE, BİRLEŞTİRME DEĞİL.
 *
 * PostgREST tipleri seçimi SABİT dize olarak okuyor; birleştirilmiş
 * dizede satır tipi çözülemiyor ve kayıtlar sessizce genel bir tipe
 * düşüyor. Bunun bedeli `/saha` sayfasında görüldü: dizede tabloda
 * olmayan dört kolon vardı, tip çözülmediği için derleme hiçbir şey
 * söylemedi ve sayfa canlıda 400 aldı (bkz. 20260818210000).
 */
const SELECT =
  'id, username, display_name, display_name_visible, bio, city, district, website_url, avatar_path, banner_path, terms_accepted_at, username_customized_at, account_status, suspended_until, status_reason';

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
  displayNameVisible: boolean;
  bio: string;
  city: string;
  district: string;
  websiteUrl: string;
}

export interface ProfileContact {
  phoneNumber: string | null;
  phoneVisible: boolean;
}

interface ProfileContactRow {
  phone_number: string | null;
  phone_visible: boolean | null;
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
      display_name_visible: edit.displayNameVisible,
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

function mapContact(row: ProfileContactRow | null): ProfileContact {
  return {
    phoneNumber: row?.phone_number ?? null,
    phoneVisible: row?.phone_visible === true,
  };
}

export function useMyProfileContact(userId: string | undefined): {
  contact: ProfileContact;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const [contact, setContact] = useState<ProfileContact>({
    phoneNumber: null,
    phoneVisible: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setContact({ phoneNumber: null, phoneVisible: false });
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    client()
      .then(async (supabase) => {
        const { data, error: queryError } = await supabase
          .from('profile_contacts')
          .select('phone_number, phone_visible')
          .eq('user_id', userId)
          .maybeSingle();
        if (queryError) throw new Error(queryError.message);
        return mapContact((data as ProfileContactRow | null) ?? null);
      })
      .then((next) => {
        if (!active) return;
        setContact(next);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'İletişim bilgisi okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { contact, loading, error, refresh };
}

export function usePublicProfileContact(userId: string | undefined): {
  contact: ProfileContact | null;
  loading: boolean;
} {
  const [contact, setContact] = useState<ProfileContact | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setContact(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    client()
      .then(async (supabase) => {
        const { data } = await supabase
          .from('profile_contacts')
          .select('phone_number, phone_visible')
          .eq('user_id', userId)
          .maybeSingle();
        return mapContact((data as ProfileContactRow | null) ?? null);
      })
      .then((next) => {
        if (!active) return;
        setContact(next.phoneVisible ? next : null);
      })
      .catch(() => {
        if (active) setContact(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return { contact, loading };
}

export async function updateProfileContact(
  userId: string,
  contact: ProfileContact
): Promise<void> {
  const phone = sanitizeText(contact.phoneNumber ?? '', { maxLength: 32 });
  if (phone && !/^[+0-9 ()-]{7,32}$/.test(phone)) {
    throw new Error('Telefon numarası geçersiz görünüyor.');
  }

  const supabase = await client();
  const { error } = await supabase.from('profile_contacts').upsert(
    {
      user_id: userId,
      phone_number: phone || null,
      phone_visible: phone ? contact.phoneVisible : false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw new Error(error.message);
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * GÖRSEL YÜKLEME SIRASI — ÖNCE YÜKLE, SONRA İŞARET ET, EN SON SİL
 *
 * Sıra bilinçli ve her adımın bir gerekçesi var:
 *
 *   1. Yeni dosya depolamaya yazılır. Burada düşerse profil hiç
 *      değişmemiştir; kullanıcı eski görselini kaybetmez.
 *   2. Profil satırı yeni yola çevrilir. Burada düşerse yeni dosya
 *      GERİ ALINIR — aksi hâlde depolamada hiçbir kaydın işaret
 *      etmediği bir öksüz kalırdı.
 *   3. Eski dosya en son silinir. Önce silmek, ikinci adım düştüğünde
 *      kullanıcıyı görselsiz bırakırdı.
 *
 * Avatar ve kapak aynı fonksiyondan geçiyor: farkları yalnızca hangi
 * kolonun güncellendiği. İki kopya, birinde düzeltilen sıralamanın
 * diğerinde eski kalmasına davetiye olurdu.
 */
type GorselAlani = 'avatar_path' | 'banner_path';

async function profilGorseliYukle(
  userId: string,
  blob: Blob,
  path: string,
  alan: GorselAlani,
  previousPath: string | null | undefined
): Promise<void> {
  const supabase = await client();
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ [alan]: path, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (profileError) {
    await supabase.storage.from('avatars').remove([path]);
    throw new Error(profileError.message);
  }

  if (previousPath && previousPath !== path) {
    await supabase.storage.from('avatars').remove([previousPath]);
  }
}

async function profilGorseliSil(
  userId: string,
  path: string | null | undefined,
  alan: GorselAlani
): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('profiles')
    .update({ [alan]: null, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);

  /* Kayıt temizlendikten SONRA dosya siliniyor: ters sırada silme
     başarısız olursa profil var olmayan bir dosyayı gösterirdi. */
  if (path) {
    await supabase.storage.from('avatars').remove([path]);
  }
}

export function uploadProfileAvatar(
  userId: string,
  blob: Blob,
  previousPath: string | null | undefined
): Promise<void> {
  return profilGorseliYukle(
    userId,
    blob,
    avatarStoragePath(userId),
    'avatar_path',
    previousPath
  );
}

export function removeProfileAvatar(
  userId: string,
  path: string | null | undefined
): Promise<void> {
  return profilGorseliSil(userId, path, 'avatar_path');
}

export function uploadProfileBanner(
  userId: string,
  blob: Blob,
  previousPath: string | null | undefined
): Promise<void> {
  return profilGorseliYukle(
    userId,
    blob,
    bannerStoragePath(userId),
    'banner_path',
    previousPath
  );
}

export function removeProfileBanner(
  userId: string,
  path: string | null | undefined
): Promise<void> {
  return profilGorseliSil(userId, path, 'banner_path');
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

/** Şifre en az bu kadar olmalı — Supabase projesi de aynı sınırı uyguluyor. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Oturum açmış kullanıcının şifresini değiştirir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU EKRAN HİÇ YOKTU
 *
 * Hesap sayfasında e-posta, telefon, şehir, avatar ve HESAP SİLME
 * vardı — şifre değiştirme yoktu. Şifresini değiştirmek isteyen
 * kullanıcının tek yolu çıkış yapıp "şifremi unuttum" akışına girmekti,
 * yani şifresini bilen birine şifresini unutmuş gibi davranmak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ESKİ ŞİFRE NEDEN SORULMUYOR
 *
 * Supabase'in `updateUser` çağrısı oturum jetonuyla çalışıyor ve eski
 * şifreyi doğrulayacak bir uç sunmuyor. Elle doğrulamak için şifreyle
 * yeniden `signInWithPassword` çağırmak gerekirdi; o çağrı başarısız
 * olduğunda GoTrue deneme sayacını artırıyor ve kullanıcı kendi
 * hesabını kilitleyebiliyor.
 *
 * Bunun yerine oturumun kendisi kanıt sayılıyor — ve gerçek koruma
 * "her yerden çık" düğmesi: şifre değiştikten sonra diğer oturumları
 * kapatmak, çalınmış bir jetonun işini bitiren şey.
 */
export async function changeOwnPassword(newPassword: string): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`);
  }
  const supabase = await client();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

/**
 * KVKK m.11 — kullanıcının kendi verisini indirmesi.
 *
 * Yanıt `public.hesap_verilerim()` içinde kuruluyor ve kapsam kararı
 * orada yazılı (özetle: kullanıcının ÜRETTİĞİ veri, başkasının verisi
 * değil). Burada tek iş onu dosyaya çevirmek.
 *
 * Dönüş tipi `unknown`: gövde sunucuda kuruluyor ve alan listesi
 * zamanla büyüyecek. Burada bir arayüz tanımlasaydık, sunucu yeni bir
 * bölüm eklediğinde bu tip sessizce eksik kalırdı — ve JSON'u olduğu
 * gibi yazan bir indiriciye o tipin hiçbir faydası yok.
 */
export async function exportMyData(): Promise<unknown> {
  const supabase = await client();
  const { data, error } = await supabase.rpc('hesap_verilerim');
  if (error) throw new Error(error.message);
  return data;
}
