import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '@/services/supabase/client';
import {
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_FLAGS,
  DEFAULT_MAINTENANCE,
  toAnnouncement,
  toFlags,
  toMaintenance,
  type Announcement,
  type FlagKey,
  type Maintenance,
  type SiteFlags,
} from './siteConfig';

/**
 * SİTE AYARLARI SAĞLAYICISI (§13.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SAĞLAYICI, HER YERDE AYRI KANCA DEĞİL
 *
 * Bayrakları okuyan yerler dağınık: rıhtım, üst menü, kayıt formu, yorum
 * kutusu, ilan formu, bakım kapısı. Her biri kendi sorgusunu atsaydı tek
 * bir sayfa açılışında aynı iki tablo altı kez istenirdi. Bir kez
 * okunuyor, bağlamla dağıtılıyor.
 *
 * İki tablo TEK GİDİŞTE değil, tek `Promise.all`de isteniyor: PostgREST
 * ayrı uç noktalar, birleştirmenin yolu bir RPC yazmak olurdu. İki
 * paralel istek, bir RPC'nin bakım maliyetinden ucuz.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VARSAYILANLAR BAŞLANGIÇ DEĞERİ, "YÜKLENİYOR" DEĞİL
 *
 * `useState` doğrudan varsayılanlarla başlıyor. `null` ile başlayıp
 * "yükleniyor" çizseydik, bayrağa bakan her yüzey ilk karede kaybolur,
 * sonra geri gelirdi — bütün sitede bir titreme. Varsayılan zaten "site
 * normal çalışıyor" olduğu için ilk kare doğru kare.
 *
 * Bunun bilinçli sonucu: bakım modu ve duyuru bir kare GEÇ görünüyor.
 * Doğru takas — tersi, her ziyaretçiye her açılışta boş bir sayfa
 * göstermek olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * `status` NEDEN VAR
 *
 * Bakım kapısının "henüz bilmiyorum" ile "bakım kapalı"yı ayırması
 * gerekiyor — ama ziyaretçi için değil, YÖNETİCİ için: bakım açıkken
 * yöneticiye gösterilen uyarı şeridi, veri gelmeden önce yanıp sönmemeli.
 */

interface SiteConfigValue {
  flags: SiteFlags;
  announcement: Announcement;
  maintenance: Maintenance;
  status: 'loading' | 'ready' | 'unconfigured';
}

const VARSAYILAN: SiteConfigValue = {
  flags: DEFAULT_FLAGS,
  announcement: DEFAULT_ANNOUNCEMENT,
  maintenance: DEFAULT_MAINTENANCE,
  status: 'loading',
};

const SiteConfigContext = createContext<SiteConfigValue>(VARSAYILAN);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SiteConfigValue>(VARSAYILAN);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState((eski) => ({ ...eski, status: 'unconfigured' }));
      return;
    }

    let active = true;
    void (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return;

        const [bayraklar, ayarlar] = await Promise.all([
          supabase.from('feature_flags').select('key, enabled'),
          supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['announcement', 'maintenance']),
        ]);
        if (!active) return;

        /*
          HATA SESSİZCE YUTULMUYOR AMA EKRANA DA ÇIKMIYOR. Ziyaretçiye
          "ayarlar okunamadı" demek anlamsız — yapabileceği bir şey yok ve
          site zaten olağan hâliyle çalışıyor. Varsayılanlarda kalıp
          `ready`ye geçiyoruz: yönetici uyarı şeridi görmesin diye.
        */
        if (bayraklar.error || ayarlar.error) {
          setState((eski) => ({ ...eski, status: 'ready' }));
          return;
        }

        const satirlar = (ayarlar.data ?? []) as {
          key: string;
          value: unknown;
        }[];
        const bul = (anahtar: string) =>
          satirlar.find((s) => s.key === anahtar)?.value;

        setState({
          flags: toFlags(bayraklar.data),
          announcement: toAnnouncement(bul('announcement')),
          maintenance: toMaintenance(bul('maintenance')),
          status: 'ready',
        });
      } catch {
        if (active) setState((eski) => ({ ...eski, status: 'ready' }));
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <SiteConfigContext.Provider value={value}>
      {children}
    </SiteConfigContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSiteConfig(): SiteConfigValue {
  return useContext(SiteConfigContext);
}

/**
 * Tek bir bayrağı okur.
 *
 * SAĞLAYICI YOKSA VARSAYILAN DÖNER, HATA ATMAZ. `useAuth`tan bilinçli
 * olarak farklı: oturum olmadan çalışamayan bir ekran için "sağlayıcı
 * yok" gerçek bir programlama hatasıdır, ama bayrağa bakan yüzeylerin
 * çoğu testlerde ve önizleme derlemesinde sağlayıcısız render ediliyor.
 * Orada patlamak yerine "site normal çalışıyor" cevabını veriyoruz —
 * bağlamın varsayılan değeri zaten o.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useFlag(key: FlagKey): boolean {
  return useContext(SiteConfigContext).flags[key];
}
