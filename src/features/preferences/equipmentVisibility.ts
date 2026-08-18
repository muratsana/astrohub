import type { SetupVisibility } from '@/features/setups/store';
import { usePreference } from './usePreference';

/**
 * YENİ EKİPMANIN VARSAYILAN GÖRÜNÜRLÜĞÜ.
 *
 * 0133 varsayılanı "profilde" yaptı ve gerekçesi hâlâ geçerli: ekipman
 * profil vitrininin çekirdeği, gizli varsayılanla kimse açmıyordu.
 *
 * Ama varsayılan HERKES İÇİN aynı olmak zorunda değil. Konumunu ya da
 * donanımını paylaşmak istemeyen kullanıcı, kurduğu her ekipmanda aynı
 * seçimi tekrar tekrar yapmak yerine bir kez "özel" diyebilmeli.
 * Varsayılanı zorla dayatmak, tercihi tercih olmaktan çıkarırdı.
 *
 * Değer `ui_preferences` defterinde: oturum açıkken hesaba yazılıyor,
 * kapalıyken bellekte kalıyor (bkz. `UiPreferencesProvider`).
 */
export const EQUIPMENT_VISIBILITY_KEY = 'ekipman-varsayilan-gorunurluk';

const GECERLI: SetupVisibility[] = ['ozel', 'profilde', 'herkese-acik'];

function isVisibility(value: string): value is SetupVisibility {
  return (GECERLI as string[]).includes(value);
}

export function useDefaultEquipmentVisibility(): [
  SetupVisibility,
  (value: SetupVisibility) => void,
] {
  return usePreference<SetupVisibility>(
    EQUIPMENT_VISIBILITY_KEY,
    'profilde',
    isVisibility
  );
}
