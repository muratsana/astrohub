import { useMemo } from 'react';
import {
  flaggedNavPrefixes,
  siteMap,
  withoutPrefixes,
  type NavGroup,
  type NavItem,
} from '@/app/navigation';
import { useSiteConfig } from './SiteConfigContext';

/**
 * Bayraklara göre süzülmüş modül haritası (§13.2).
 *
 * Footer, mobil çekmece ve komut paleti aynı `siteMap`i okuyor; süzmeyi
 * her biri kendi içinde yapsaydı üç ayrı kopya olurdu ve biri
 * güncellendiğinde diğerleri sessizce eskirdi.
 */
export function useSiteMap(): NavGroup[] {
  const kapali = useHiddenPrefixes();
  return useMemo(() => withoutPrefixes(siteMap, kapali), [kapali]);
}

/**
 * Kapalı bölümlerin adres önekleri.
 *
 * Komut paleti modül haritasını değil kendi indeksini geziyor; ona
 * listeyi değil ÖLÇÜTÜ vermek gerekiyor.
 */
export function useHiddenPrefixes(): readonly string[] {
  const { flags } = useSiteConfig();

  return useMemo(
    () =>
      (Object.keys(flaggedNavPrefixes) as (keyof typeof flaggedNavPrefixes)[])
        .filter((anahtar) => !flags[anahtar])
        .map((anahtar) => flaggedNavPrefixes[anahtar]),
    [flags]
  );
}

/** Süzülmüş haritanın düz listesi — komut paletinin indeksi. */
export function useNavItems(): NavItem[] {
  const groups = useSiteMap();
  return useMemo(() => groups.flatMap((g) => g.items), [groups]);
}
