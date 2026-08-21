import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';

/**
 * YETKİNİN TEK OKUMA KAPISI (yenileme planı FAZ 1, görev 5).
 *
 * ═══════════════════════════════════════════════════════════════════════
 * NEDEN TEK KANCA
 *
 * Plan §6.8: "Aynı yetki sorusunu farklı yollarla soran kod bırakılmaz."
 * Bileşenler rolü DOĞRUDAN okumamalı — biri `user_roles`'a sorar, biri
 * üyeliğe bakar, biri sadece `isAdmin` kontrol eder ve üçü zamanla
 * birbirinden ayrı düşer. Ayrıldıklarında ortaya çıkan şey görünmez bir
 * hata olur: menüde görünmeyen ama API'den çağrılabilen bir özellik.
 *
 * Burası o soruların tek sorulduğu yer ve altındaki tek çağrı
 * `public.izinlerim()`. Roller, statü, izinler ve kotalar TEK yanıtta
 * geliyor: ayrı ayrı sorulsaydı arayüz kısa bir süre "rolü var ama izni
 * yok" gibi tutarsız bir ara durum gösterirdi.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * BU BİR GÜVENLİK SINIRI DEĞİL
 *
 * Buradaki her kontrol ARAYÜZ İÇİNDİR. Yetkiyi gerçekten zorlayan şey
 * RLS politikaları, `security definer` fonksiyonlar ve kota
 * tetikleyicileridir. `izin('ilan_yayinla')` false dönüp de düğme
 * gizlense bile, aynı çağrı doğrudan API'ye yapılabilir — ve orada
 * `app.izin_var()` reddeder.
 *
 * Bunu yazmak gerekiyor çünkü tersini varsaymak bu tür panellerde en sık
 * yapılan hata: buton gizlemek yetkilendirme sanılıyor.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * NEDEN PAYLAŞILAN ÖNBELLEK
 *
 * Kanca aynı ağaçta onlarca bileşenden çağrılıyor (kullanıcı menüsü,
 * yönetim kapısı, ilan formu, galeri yükleyici…). Önbelleksiz her biri
 * kendi RPC'sini atardı — aynı yanıt için onlarca istek. Anahtar
 * kullanıcı kimliği; oturum değişince önbellek düşüyor.
 */

export const APP_ROLES = [
  'member',
  'verified_organizer',
  'club_manager',
  'content_editor',
  'moderator',
  'admin',
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const roleLabels: Record<AppRole, string> = {
  member: 'Üye',
  verified_organizer: 'Doğrulanmış Organizatör',
  club_manager: 'Kulüp Yöneticisi',
  content_editor: 'İçerik Editörü',
  moderator: 'Moderatör',
  admin: 'Yönetici',
};

/** `public.features` katalogundaki anahtarlar (plan §3.3). */
export type FeatureKey =
  | 'icerik_olustur'
  | 'galeriye_foto_ekle'
  | 'ilan_yayinla'
  | 'canli_sohbete_katil'
  | 'premium_icerik_goruntule'
  | 'katalog_ogesi_oner'
  | 'saha_girdisi_ekle'
  | 'forum_konu_ac'
  | 'mesaj_gonder'
  | 'gokyuzu_arsivi';

/** `public.tier_limits` anahtarları. */
export type LimitKey =
  | 'galeri_foto'
  | 'revizyon'
  | 'depolama_mb'
  | 'setup_sayisi'
  | 'ilan_foto';

export type PermissionsStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unconfigured';

export interface PermissionsState {
  status: PermissionsStatus;
  roles: AppRole[];
  /** Etkin üyelik statüsü. Admin ve moderatör her zaman premium (§3.2). */
  tier: 'standart' | 'premium';
  isAdmin: boolean;
  isModerator: boolean;
  /** Yönetim paneline girebilir mi (arayüz kapısı). */
  canAccessAdmin: boolean;
  /** Üyelik bitiş tarihi; süresiz üyelikte ve üyeliksiz hesapta null. */
  membershipEndsAt: string | null;
  error: string | null;

  /** Özellik izni. Tanımsız anahtar için false. */
  izin: (feature: FeatureKey) => boolean;
  /**
   * Sayısal sınır. `null` SINIRSIZ demek — sıfırla karıştırılmamalı:
   * sıfır "hiç yapamaz", null "sınır yok". Çağıran ikisini ayırmalı.
   */
  kota: (key: LimitKey) => number | null;
}

export interface Payload {
  roller: unknown[];
  statu: 'standart' | 'premium';
  izinler: FeatureKey[];
  kotalar: Partial<Record<LimitKey, number | null>>;
  uyelik_bitis: string | null;
}

const EMPTY_PAYLOAD: Payload = {
  roller: [],
  statu: 'standart',
  izinler: [],
  kotalar: {},
  uyelik_bitis: null,
};

function isAppRole(role: unknown): role is AppRole {
  return (
    typeof role === 'string' &&
    (APP_ROLES as readonly string[]).includes(role)
  );
}

/**
 * `izinlerim()` yanıtı → arayüzün okuyacağı şekil.
 *
 * Saf ve dışa açık: kancanın ağ tarafı olmadan sınanabilsin diye. Sınav
 * konusu davranış, ağ değil — özellikle "null sınırsız demek" kuralı.
 */
export function permissionsFromPayload(
  status: PermissionsStatus,
  payload: Payload,
  error: string | null = null
): PermissionsState {
  const roles = payload.roller.filter(isAppRole);
  const izinSet = new Set<string>(payload.izinler);
  const isAdmin = roles.includes('admin');
  return {
    status,
    roles,
    tier: payload.statu,
    isAdmin,
    isModerator: roles.includes('moderator'),
    canAccessAdmin: isAdmin || roles.includes('moderator'),
    membershipEndsAt: payload.uyelik_bitis,
    error,
    izin: (feature) => izinSet.has(feature),
    /*
     * `??` DEĞİL `in` KONTROLÜ. `kotalar.setup_sayisi` premium'da null
     * geliyor ve o null "sınırsız" demek. `?? undefined` yazsaydık
     * sınırsız ile "böyle bir sınır tanımlı değil" ayırt edilemezdi ve
     * arayüz sınırsız bir kotayı sıfır sanabilirdi.
     */
    kota: (key) => (key in payload.kotalar ? (payload.kotalar[key] ?? null) : null),
  };
}

const EMPTY = permissionsFromPayload('idle', EMPTY_PAYLOAD);

/** Kullanıcı başına paylaşılan istek — aynı yanıt için tek çağrı. */
const cache = new Map<string, Promise<Payload>>();

/**
 * Oturum değiştiğinde ya da yetki değiştiren bir işlemden sonra
 * (rol verme, premium tanımlama) önbelleği düşürür.
 */
export function invalidatePermissions(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}

async function fetchPermissions(userId: string): Promise<Payload> {
  const existing = cache.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    const clientPromise = getSupabase();
    if (!clientPromise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
    const supabase = await clientPromise;
    const { data, error } = await supabase.rpc('izinlerim');
    if (error) throw new Error(error.message);
    const p = (data ?? {}) as Partial<Payload>;
    return {
      roller: p.roller ?? [],
      statu: p.statu ?? 'standart',
      izinler: p.izinler ?? [],
      kotalar: p.kotalar ?? {},
      uyelik_bitis: p.uyelik_bitis ?? null,
    };
  })();

  /* Hata önbelleğe alınmıyor: kalıcı bir "yetkin yok" durumu, geçici bir
     ağ hatasından doğmamalı. */
  promise.catch(() => cache.delete(userId));
  cache.set(userId, promise);
  return promise;
}

export function usePermissions(): PermissionsState {
  const { user, loading, configured } = useAuth();
  const [state, setState] = useState<PermissionsState>(EMPTY);

  useEffect(() => {
    if (!configured) {
      setState(permissionsFromPayload('unconfigured', EMPTY_PAYLOAD));
      return;
    }
    if (loading) {
      setState(permissionsFromPayload('loading', EMPTY_PAYLOAD));
      return;
    }
    if (!user) {
      /* Oturumsuz ziyaretçi: rolsüz, standart, izinsiz. `ready` — çünkü
         cevap belli; "yükleniyor" bırakmak kapıyı süresiz kapalı
         tutardı. */
      setState(permissionsFromPayload('ready', EMPTY_PAYLOAD));
      return;
    }

    let active = true;
    setState(permissionsFromPayload('loading', EMPTY_PAYLOAD));

    fetchPermissions(user.id)
      .then((payload) => {
        if (active) setState(permissionsFromPayload('ready', payload));
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState(
          permissionsFromPayload(
            'error',
            EMPTY_PAYLOAD,
            error instanceof Error ? error.message : 'Yetkiler okunamadı'
          )
        );
      });

    return () => {
      active = false;
    };
  }, [user, loading, configured]);

  return state;
}
