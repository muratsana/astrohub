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
import {
  DEFAULT_NAV_LINKS,
  selectMenu,
  toNavLinks,
  type NavLinkView,
} from './navLinks';
import {
  DEFAULT_HERO_SLIDES,
  toHeroSlides,
  type HeroSlideView,
} from './heroSlides';
import { flaggedNavPrefixes } from '@/app/navigation';
import { useAuth } from '@/features/auth/AuthContext';

/**
 * SİTE AYARLARI SAĞLAYICISI (§13.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SAĞLAYICI, HER YERDE AYRI KANCA DEĞİL
 *
 * Bayrakları ve menüyü okuyan yerler dağınık: rıhtım, üst çubuk, footer,
 * kayıt formu, yorum kutusu, ilan formu, bakım kapısı. Her biri kendi
 * sorgusunu atsaydı tek bir sayfa açılışında aynı üç tablo yedi kez
 * istenirdi. Bir kez okunuyor, bağlamla dağıtılıyor.
 *
 * Üç tablo TEK GİDİŞTE değil, tek `Promise.all`de isteniyor: PostgREST
 * ayrı uç noktalar, birleştirmenin yolu bir RPC yazmak olurdu. Üç
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
  /** Üst menü + footer bağlantıları (§13.2). Kapalı olanlar süzülmüş. */
  navLinks: NavLinkView[];
  /** Hero slaytları (§6.3). Yayın penceresini RLS uyguluyor. */
  heroSlides: HeroSlideView[];
  status: 'loading' | 'ready' | 'unconfigured';
}

const VARSAYILAN: SiteConfigValue = {
  flags: DEFAULT_FLAGS,
  announcement: DEFAULT_ANNOUNCEMENT,
  maintenance: DEFAULT_MAINTENANCE,
  navLinks: DEFAULT_NAV_LINKS,
  heroSlides: DEFAULT_HERO_SLIDES,
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

        const [bayraklar, ayarlar, menuler, slaytlar] = await Promise.all([
          supabase.from('feature_flags').select('key, enabled'),
          supabase
            .from('app_settings')
            .select('key, value')
            .in('key', ['announcement', 'maintenance']),
          supabase
            .from('nav_links')
            .select('menu, group_label, label, path, position, enabled, new_tab, auth_only'),
          /* Yayın penceresi SELECT politikasında; ileri tarihli slayt
             buraya HİÇ gelmiyor, süzmeye gerek yok. */
          supabase
            .from('hero_slides')
            .select(
              'key, badge, title, subtitle, cta_label, cta_to, scene, tint, image_url, image_credit, image_licence, focal_x, focal_y, text_align, position, enabled'
            ),
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

        /* MENÜ HATASI TEK BAŞINA HER ŞEYİ DÜŞÜRMÜYOR: bayraklar
           okunduysa onlar uygulanmalı, menü koddaki yedeğine düşer.
           Üç sorguyu tek bir "hep ya da hiç"e bağlamak, menüdeki bir
           izin hatasını bakım moduna da bulaştırırdı. */
        const menuSatirlari = menuler.error ? null : menuler.data;
        const slaytSatirlari = slaytlar.error ? null : slaytlar.data;

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
          navLinks: toNavLinks(menuSatirlari),
          heroSlides: toHeroSlides(slaytSatirlari),
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

/**
 * Bir menünün çizilecek bağlantıları (§13.2).
 *
 * Oturum durumu ve kapalı bölüm önekleri burada uygulanıyor: çağıran
 * yerler (üst çubuk, footer) yalnızca "bana header menüsünü ver" diyor.
 * Her biri kendi süzmesini yapsaydı `auth_only` bir yerde uygulanır,
 * ötekinde unutulurdu.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useMenu(menu: 'header' | 'footer'): NavLinkView[] {
  const { navLinks, flags } = useContext(SiteConfigContext);
  const { user } = useAuth();

  return useMemo(() => {
    const gizli = (
      Object.keys(flaggedNavPrefixes) as (keyof typeof flaggedNavPrefixes)[]
    )
      .filter((anahtar) => !flags[anahtar])
      .map((anahtar) => flaggedNavPrefixes[anahtar]);

    return selectMenu(navLinks, menu, {
      signedIn: Boolean(user),
      hiddenPrefixes: gizli,
    });
  }, [navLinks, flags, menu, user]);
}

/**
 * Yayındaki hero slaytları (§6.3).
 *
 * Yayın penceresi burada uygulanmıyor — `hero_slides`ın SELECT
 * politikası ileri tarihli satırı zaten döndürmüyor. Kuralın tek yerde
 * durması bilinçli: iki yerde olsaydı biri güncellenir, öteki eskirdi.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useHeroSlides(): HeroSlideView[] {
  return useContext(SiteConfigContext).heroSlides;
}
