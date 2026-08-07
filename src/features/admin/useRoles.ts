import {
  usePermissions,
  roleLabels,
  type AppRole,
  type PermissionsStatus,
} from '@/features/auth/usePermissions';

/**
 * ROLLER — ARTIK KENDİ SORGUSU YOK.
 *
 * Bu kanca `user_roles` tablosunu doğrudan okuyordu. Yenileme planı
 * FAZ 1, görev 5 tek bir yetki kapısı istiyor ve §6.8 aynı sorunun
 * ikinci bir yolunu yasaklıyor: iki okuma yolu zamanla ayrışır ve
 * ayrıştıklarında ortaya çıkan hata görünmez olur — menüde gizli ama
 * API'den çağrılabilen bir özellik.
 *
 * Bu yüzden gövde `usePermissions()`e devredildi. Ad ve dönüş şekli
 * korunuyor: dokuz çağıran dosya değişmeden çalışıyor, ama hepsi artık
 * aynı yanıtı görüyor — ve o yanıt yalnızca rolleri değil statüyü,
 * izinleri ve kotaları da taşıyor.
 *
 * YENİ KOD `usePermissions()` KULLANMALI. Buradaki şekil yalnızca rol
 * soruyor; "bu kullanıcı ilan yayımlayabilir mi" sorusunun cevabı rol
 * değil izin — ve o yalnızca `usePermissions().izin(...)` içinde var.
 */

export type { AppRole };
export { roleLabels };

export type RolesStatus = PermissionsStatus;

export interface RolesState {
  status: RolesStatus;
  roles: AppRole[];
  isAdmin: boolean;
  isModerator: boolean;
  /** Yönetim paneline girebilir mi? */
  canAccessAdmin: boolean;
  error: string | null;
}

export function useRoles(): RolesState {
  const p = usePermissions();
  return {
    status: p.status,
    roles: p.roles,
    isAdmin: p.isAdmin,
    isModerator: p.isModerator,
    canAccessAdmin: p.canAccessAdmin,
    error: p.error,
  };
}
