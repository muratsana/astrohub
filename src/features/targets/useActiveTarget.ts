import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useTargetBySlug } from '@/services/content/targets';
import type { CelestialTarget } from './data';

/**
 * AKTİF HEDEF — araçlar arasında taşınan seçim.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÇÖZDÜĞÜ SORUN
 *
 * Aktif EKİPMAN araçlar arasında taşınıyordu (`ActiveSetupContext`) ama
 * aktif HEDEF taşınmıyordu. Kullanıcı gökyüzü kataloğunda M 31'i
 * buluyor, kadraj aracına geçiyor ve hedefi baştan arıyordu. Aynı soru
 * her araçta yeniden soruluyordu — ekipman için çözülmüş olan sorunun
 * hedef yarısı açıkta kalmıştı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BAĞLAM DEĞİL, ADRES
 *
 * `ActiveSetupContext` bir React bağlamı ve seçimi `sessionStorage`da
 * tutuyor. Hedef için adres (`?hedef=<slug>`) daha doğru:
 *
 *   · PAYLAŞILABİLİR. "Şu hedefi bu ekipmanla şöyle kadrajla" demek tek
 *     bağlantı gönderme meselesi olmalı. Bağlamdaki bir seçim
 *     kopyalanan adreste görünmez.
 *   · GERİ TUŞU ÇALIŞIR. Hedefi değiştirip geri basan kullanıcı
 *     öncekine döner.
 *   · SAĞLAYICI GEREKTİRMEZ. Araç sayfaları testlerde ve prerender'da
 *     sağlayıcısız render ediliyor.
 *
 * `sessionStorage` yine de YEDEK olarak duruyor: adres parametresi
 * olmayan bir araca geçildiğinde son seçim hatırlanıyor. Adres her zaman
 * kazanıyor — paylaşılan bir bağlantı, alıcının kendi son seçimiyle
 * ezilmemeli.
 */

const STORAGE_KEY = 'astrohub:aktif-hedef';

/** Adres parametresi adı — tek yerde, çünkü dört araç ve altı düğme okuyor. */
export const TARGET_PARAM = 'hedef';
export const SETUP_PARAM = 'ekipman';

function readStored(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    /* Özel mod ya da kota — hatırlamamak çökmekten iyidir. */
    return null;
  }
}

function writeStored(slug: string | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (slug) sessionStorage.setItem(STORAGE_KEY, slug);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* yok sayılır */
  }
}

export interface ActiveTarget {
  slug: string | null;
  target: CelestialTarget | undefined;
  loading: boolean;
  /** Seçimi değiştirir ve adrese yazar. `null` seçimi temizler. */
  setSlug: (slug: string | null) => void;
}

export function useActiveTarget(): ActiveTarget {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get(TARGET_PARAM);

  /*
   * Adreste hedef yoksa hatırlanan seçim adrese YAZILIYOR, yalnızca
   * okunmuyor. Okusaydık araç doğru hedefi gösterir ama kullanıcının
   * kopyaladığı adres onu taşımazdı — yani ekranda gördüğü şeyle
   * paylaştığı şey farklı olurdu.
   */
  useEffect(() => {
    if (fromUrl) return;
    const stored = readStored();
    if (!stored) return;
    setParams(
      (mevcut) => {
        const next = new URLSearchParams(mevcut);
        next.set(TARGET_PARAM, stored);
        return next;
      },
      { replace: true }
    );
  }, [fromUrl, setParams]);

  useEffect(() => {
    if (fromUrl) writeStored(fromUrl);
  }, [fromUrl]);

  const { target, loading } = useTargetBySlug(fromUrl ?? undefined);

  const setSlug = useCallback(
    (slug: string | null) => {
      writeStored(slug);
      setParams(
        (mevcut) => {
          const next = new URLSearchParams(mevcut);
          if (slug) next.set(TARGET_PARAM, slug);
          else next.delete(TARGET_PARAM);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return { slug: fromUrl, target, loading, setSlug };
}

/**
 * ARAÇLAR ARASI BAĞLANTI — hedef ve ekipman seçimini koruyarak.
 *
 * Bunu elle kurmak ("`/araclar/kadraj?hedef=` + slug") altı ayrı yerde
 * altı kez yazılırdı ve biri parametrelerden birini unuttuğunda
 * kullanıcı hedefini kaybederdi — hem de tam olarak devretme anında.
 *
 * Boş değerler ATILIYOR: `?hedef=&ekipman=` gibi bir adres hem çirkin
 * hem de "seçim var ama boş" gibi okunuyor.
 */
export function toolLink(
  path: string,
  selection: { hedef?: string | null; ekipman?: string | null }
): string {
  const params = new URLSearchParams();
  if (selection.hedef) params.set(TARGET_PARAM, selection.hedef);
  if (selection.ekipman) params.set(SETUP_PARAM, selection.ekipman);
  const query = params.toString();
  return query ? path + '?' + query : path;
}

/** "FOV'da gör" düğmelerinin hedefi — tek yerde. */
export function framingLink(
  slug: string,
  setupId?: string | null
): string {
  return toolLink('/araclar/kadraj', { hedef: slug, ekipman: setupId });
}
