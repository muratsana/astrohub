import { Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, createHashRouter } from 'react-router';
import { AppShell } from '@/components/shell/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { RouteError } from '@/components/RouteError';
import { RouteFallback } from '@/components/RouteFallback';
import { RedirectTo, RedirectParam, RedirectKeepQuery } from './Redirect';
import { lazyWithRetry } from '@/lib/lazyWithRetry';
import { cityRoutePaths } from '@/features/city/routes';
import { FlagRoute } from '@/features/site/FlagRoute';

/**
 * Sunucusuz önizleme (tek dosya HTML) için hash tabanlı router kullanılır;
 * üretimde her zaman history API'li browser router çalışır.
 */
const createRouter =
  import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createHashRouter
    : createBrowserRouter;

/**
 * Rota bazlı kod bölme (§16.4). Ana sayfa ilk boyamayı geciktirmemek için
 * eager yüklenir; diğer tüm sayfalar ayrı chunk'lara ayrılır ve yalnızca
 * ziyaret edildiklerinde indirilir.
 *
 * Tek dosya önizleme derlemesinde `inlineDynamicImports` açık olduğu için
 * bu chunk'lar tek pakette birleşir — davranış değişmez.
 *
 * Yükleyici `lazyWithRetry` ile sarılır: yeni sürüm yayına alındığında eski
 * chunk dosyaları silinir ve açık duran sekmede gezinen kullanıcı var olmayan
 * bir dosya ister. Tek gereken sayfayı yenilemekken kullanıcı hata ekranı
 * görüyordu (bkz. `lib/lazyWithRetry`).
 */
function route(loader: () => Promise<{ default: ComponentType }>): ReactNode {
  const Component = lazyWithRetry(loader);
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  );
}

/**
 * Bayrağa bağlı rota sarmalayıcıları (§13.2).
 *
 * `radyo_acik` / `tv_acik` kapalıyken bu rotalar sayfayı değil "kapalı"
 * ekranını çiziyor. Sarmalayıcı `route()`nun DIŞINDA: içeride olsaydı
 * bayrak kapalıyken bile sayfanın chunk'ı indirilirdi.
 */
function radyoRoute(
  loader: () => Promise<{ default: ComponentType }>
): ReactNode {
  return (
    <FlagRoute flag="radyo_acik" title="Astrohub Radyo">
      {route(loader)}
    </FlagRoute>
  );
}

function tvRoute(loader: () => Promise<{ default: ComponentType }>): ReactNode {
  return (
    <FlagRoute flag="tv_acik" title="Astrohub.tv">
      {route(loader)}
    </FlagRoute>
  );
}

/** Adlandırılmış export'ları `default` bekleyen `lazy()` biçimine çevirir. */
function named<T extends string>(
  loader: () => Promise<Record<T, ComponentType>>,
  name: T
) {
  return () => loader().then((module) => ({ default: module[name] }));
}

// Aynı bileşeni birden çok yolda kullanan yükleyiciler
const sitesPage = () =>
  route(
    named(() => import('@/features/observing-sites/SitesPage'), 'SitesPage')
  );
const equipmentPage = () =>
  route(
    named(() => import('@/features/equipment/EquipmentPage'), 'EquipmentPage')
  );
/* /ekipman artık katalog değil planlama modülü; kategori kırılımı
   (/ekipman/montur) eski katalog sayfasında kalıyor. */
const equipmentModulePage = () =>
  route(
    named(
      () => import('@/features/equipment/EquipmentModulePage'),
      'EquipmentModulePage'
    )
  );
const panelPage = () =>
  route(named(() => import('@/features/panel/PanelPage'), 'PanelPage'));
const messagesPage = () =>
  route(
    named(() => import('@/features/messages/MessagesPage'), 'MessagesPage')
  );

/**
 * Route haritası — yedi ana modül.
 *
 * Modül adları değiştiği için URL'ler de hizalandı; eski adresler kalıcı
 * yönlendirmeyle korunur (yer imleri ve arama motoru indeksi kırılmasın).
 */
/**
 * Rota tanımları — hem tarayıcı router'ı hem prerender (SSG) bunları
 * kullanır. Prerender tarafı `createStaticHandler` ile aynı ağacı statik
 * olarak çözer; iki ayrı liste tutmak, birinin sessizce eskimesi demekti.
 */
export const appRoutes = [
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },

      /* ═════════════ GALERİ ═════════════ */
      {
        path: 'galeri',
        element: route(
          named(() => import('@/features/photos/GalleryPage'), 'GalleryPage')
        ),
      },
      {
        path: 'galeri/yukle',
        element: route(
          named(
            () => import('@/features/upload/UploadWizardPage'),
            'UploadWizardPage'
          )
        ),
      },
      /* AYLIK SEÇKİ KALDIRILDI. Haftanın fotoğrafı arşivi aynı işi
         yapıyor — her haftanın kazananı orada zaten listeleniyor — ve iki
         ayrı "seçki" sayfası okuyucuya hangisinin asıl olduğu sorusunu
         sorduruyordu. Adres yönlendirmede kalıyor: dış bağlantılar ve
         yer imleri kırılmasın. */
      { path: 'secki', element: <RedirectTo to="/haftanin-fotografi" /> },
      {
        path: 'haftanin-fotografi',
        element: route(
          named(
            () => import('@/features/photos/PhotoOfWeekPage'),
            'PhotoOfWeekPage'
          )
        ),
      },
      {
        path: 'fotograf/:slug',
        element: route(
          named(
            () => import('@/features/photos/PhotoDetailPage'),
            'PhotoDetailPage'
          )
        ),
      },
      {
        path: 'kesfet',
        element: route(
          named(
            () => import('@/features/discover/DiscoverPage'),
            'DiscoverPage'
          )
        ),
      },
      {
        /* Dizin, profil rotasının ÜSTÜNDE: ikisi de kök seviyede tek
           parçalı adresler ve okuyanın sırayı görmesi kolay olsun. */
        path: 'astrofotografcilar',
        element: route(
          named(
            () => import('@/features/profile/PhotographersPage'),
            'PhotographersPage'
          )
        ),
      },
      {
        path: 'profil/:username',
        element: route(
          named(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
        ),
      },
      /* Takip akışı: takip edilen kullanıcıların fotoğraf, ilan ve forum
         hareketleri tek listede. Oturum gerektiriyor ve sayfa bunu kendisi
         söylüyor — rota koruması yok, çünkü asıl koruma RLS'te. */
      {
        path: 'akis',
        element: route(
          named(
            () => import('@/features/activity/ActivityPage'),
            'ActivityPage'
          )
        ),
      },

      /* ═════════════ ETKİNLİKLER ═════════════ */
      {
        path: 'etkinlikler',
        element: route(
          named(() => import('@/features/events/EventMapPage'), 'EventMapPage')
        ),
      },
      {
        path: 'etkinlik/yeni',
        element: route(
          named(() => import('@/features/events/NewEventPage'), 'NewEventPage')
        ),
      },
      {
        path: 'etkinlikler/yeni',
        element: <RedirectTo to="/etkinlik/yeni" />,
      },
      {
        path: 'etkinlik/:slug',
        element: route(
          named(
            () => import('@/features/events/EventDetailPage'),
            'EventDetailPage'
          )
        ),
      },
      {
        path: 'etkinlikler/harita',
        element: <RedirectTo to="/etkinlikler" />,
      },
      /* Takvim, etkinlik modülünün ikinci görünümü: harita "nerede?",
         takvim "ne zaman?" sorusunu cevaplıyor. Ayrı rota çünkü harita
         sayfası 650 satır ve takvime gelen kullanıcıya altlık
         katmanlarının paketini indirtmenin karşılığı yok. */
      {
        path: 'etkinlikler/takvim',
        element: route(
          named(
            () => import('@/features/events/EventCalendarPage'),
            'EventCalendarPage'
          )
        ),
      },
      {
        path: 'topluluklar',
        element: route(
          named(() => import('@/features/clubs/ClubsPage'), 'ClubsPage')
        ),
      },
      {
        path: 'topluluklar/ekle',
        element: route(
          named(() => import('@/features/clubs/NewClubPage'), 'NewClubPage')
        ),
      },
      {
        path: 'topluluk/:slug',
        element: route(
          named(
            () => import('@/features/clubs/ClubDetailPage'),
            'ClubDetailPage'
          )
        ),
      },

      /* ═════════════ HABERLER ═════════════ */
      {
        path: 'haberler',
        element: route(
          named(() => import('@/features/news/NewsPage'), 'NewsPage')
        ),
      },
      {
        path: 'haber/:slug',
        element: route(
          named(
            () => import('@/features/news/NewsDetailPage'),
            'NewsDetailPage'
          )
        ),
      },

      /* ═════════════ YAZILAR ═════════════ */
      {
        path: 'yazilar',
        element: route(
          named(
            () => import('@/features/articles/ArticlesPage'),
            'ArticlesPage'
          )
        ),
      },
      {
        path: 'yazi/drizzle-rehberi',
        element: <RedirectTo to="/yazi/drizzle" />,
      },
      {
        path: 'yazi/snr-rehberi',
        element: <RedirectTo to="/yazi/gurultu-gain-poz" />,
      },
      {
        path: 'yazilar/drizzle-rehberi',
        element: <RedirectTo to="/yazi/drizzle" />,
      },
      {
        path: 'yazilar/snr-rehberi',
        element: <RedirectTo to="/yazi/gurultu-gain-poz" />,
      },
      {
        path: 'yazilar/kutup-hizalamasi',
        element: <RedirectTo to="/yazi/kutup-hizalamasi" />,
      },
      {
        path: 'yazi/:slug',
        element: route(
          named(
            () => import('@/features/articles/ArticleDetailPage'),
            'ArticleDetailPage'
          )
        ),
      },

      /* ═════════════ FORUM ═════════════ */
      {
        path: 'forum',
        element: route(
          named(() => import('@/features/forum/ForumPage'), 'ForumPage')
        ),
      },
      {
        path: 'forum/yeni',
        element: route(
          named(() => import('@/features/forum/NewThreadPage'), 'NewThreadPage')
        ),
      },
      {
        path: 'forum/:slug',
        element: route(
          named(() => import('@/features/forum/ThreadPage'), 'ThreadPage')
        ),
      },

      /* ═════════════ YAYIN (TV + RADYO) ═════════════ */
      {
        path: 'tv',
        element: tvRoute(named(() => import('@/features/tv/TvPage'), 'TvPage')),
      },
      {
        path: 'tv/arsiv',
        element: tvRoute(
          named(() => import('@/features/tv/TvArchivePage'), 'TvArchivePage')
        ),
      },
      {
        path: 'tv/arsiv/:slug',
        element: tvRoute(
          named(() => import('@/features/tv/TvArchivePage'), 'TvArchivePage')
        ),
      },
      {
        path: 'radyo',
        element: radyoRoute(
          named(() => import('@/features/radio/RadioPage'), 'RadioPage')
        ),
      },
      {
        path: 'radyo/program/:slug',
        element: radyoRoute(
          named(() => import('@/features/radio/ProgramPage'), 'ProgramPage')
        ),
      },
      {
        path: 'radyo/yayinci/:slug',
        element: radyoRoute(
          named(() => import('@/features/radio/HostPage'), 'HostPage')
        ),
      },
      {
        path: 'radyo/podcast',
        element: radyoRoute(
          named(() => import('@/features/radio/PodcastPage'), 'PodcastPage')
        ),
      },
      {
        path: 'radyo/podcast/:slug',
        element: radyoRoute(
          named(() => import('@/features/radio/PodcastPage'), 'PodcastPage')
        ),
      },
      {
        path: 'radyo/podcast/:slug/:bolum',
        element: radyoRoute(
          named(() => import('@/features/radio/EpisodePage'), 'EpisodePage')
        ),
      },

      {
        path: 'araclar/poz-plani',
        element: route(
          named(
            () => import('@/features/calculators/CapturePlannerPage'),
            'CapturePlannerPage'
          )
        ),
      },

      /* Bilgi merkezi (§14.9) — sözlük ve SSS. */
      {
        path: 'sozluk',
        element: route(
          named(
            () => import('@/features/knowledge/GlossaryPage'),
            'GlossaryPage'
          )
        ),
      },
      {
        path: 'sss',
        element: route(
          named(() => import('@/features/knowledge/FaqPage'), 'FaqPage')
        ),
      },

      /* Gözlem günlüğü (§14.6) — kişisel kayıt, oturum gerekli. */
      {
        path: 'gunluk',
        element: route(
          named(
            () => import('@/features/observing-log/ObservingLogPage'),
            'ObservingLogPage'
          )
        ),
      },
      {
        path: 'arsivim',
        element: route(
          named(() => import('@/features/simulator/ArchivePage'), 'ArchivePage')
        ),
      },
      {
        /* KANONİK ADRES `/araclar/kadraj`. Sayfa artık yalnızca kadraj
           hesabı yapıyor: uyumluluk kontrolü Ekipman modülüne, ASCOM
           köprüsü `/ekipman/bridge`e taşındı. "Simülatör" adı ne yaptığını
           söylemiyordu ve adres araçların dışında duruyordu. */
        path: 'araclar/kadraj',
        element: route(
          named(
            () => import('@/features/simulator/SimulatorPage'),
            'SimulatorPage'
          )
        ),
      },
      { path: 'simulator', element: <RedirectTo to="/araclar/kadraj" /> },

      /* ═════════════ ARAÇLAR ═════════════ */
      {
        path: 'araclar',
        element: route(
          named(
            () => import('@/features/calculators/ToolsIndexPage'),
            'ToolsIndexPage'
          )
        ),
      },
      {
        /* Gökyüzü Kataloğu: 16.663 gök cismi, sunucu taraflı filtre ve
           sayfalama. Tembel yükleniyor — modülün tamamı yalnızca bu
           adrese girildiğinde indiriliyor. */
        path: 'araclar/gokyuzu-katalogu',
        element: route(
          named(
            () => import('@/features/skycatalog/SkyCatalogPage'),
            'SkyCatalogPage'
          )
        ),
      },
      { path: 'araclar/fov', element: <RedirectTo to="/araclar/kadraj" /> },
      {
        path: 'araclar/simulator',
        element: <RedirectTo to="/araclar/kadraj" />,
      },
      // Tek kanonik çalışma alanı: FoV, pixel scale ve setup uyumluluk Simülatör'de birleşir.
      {
        path: 'araclar/pixel-scale',
        element: <RedirectTo to="/araclar/kadraj" />,
      },
      {
        path: 'araclar/isik-kirliligi',
        element: route(
          named(
            () => import('@/features/sky/LightPollutionPage'),
            'LightPollutionPage'
          )
        ),
      },
      /* Mozaik, kadrajın ikinci görünümü (denetim §3.6): "sığmıyor"
         cevabını alan kullanıcının bir sonraki sorusu zaten "kaç panele
         bölerim". Gece modülüyle aynı gerekçeyle ayrı rota kaldı —
         mozaik kendi hesabını ve panel önizlemesini taşıyor. */
      {
        path: 'araclar/kadraj/mozaik',
        element: route(
          named(
            () => import('@/features/calculators/MosaicPlannerPage'),
            'MosaicPlannerPage'
          )
        ),
      },
      {
        path: 'araclar/mosaic',
        element: <RedirectKeepQuery to="/araclar/kadraj/mozaik" />,
      },
      {
        path: 'araclar/setup-uyumluluk',
        element: <RedirectTo to="/ekipman" />,
      },
      /*
        GECE MODÜLÜ. Planlayıcı uygulamadan kaldırıldı; eski plan adresleri
        kullanıcıyı ana gece ekranına düşürür.
      */
      {
        path: 'bu-gece',
        element: route(
          named(() => import('@/features/sky/TonightPage'), 'TonightPage')
        ),
      },
      {
        path: 'bu-gece/plan',
        element: <RedirectTo to="/bu-gece" />,
      },
      {
        path: 'bu-gece/takvim',
        element: route(
          named(
            () => import('@/features/sky/DarkCalendarPage'),
            'DarkCalendarPage'
          )
        ),
      },
      {
        path: 'planlayici',
        element: <RedirectTo to="/bu-gece" />,
      },
      {
        path: 'araclar/takvim',
        element: <RedirectKeepQuery to="/bu-gece/takvim" />,
      },

      /* ═════════════ İLANLAR ═════════════ */
      {
        path: 'ilanlar',
        element: route(
          named(
            () => import('@/features/marketplace/MarketplacePage'),
            'MarketplacePage'
          )
        ),
      },
      {
        /* Slug rotasından ÖNCE: `ilan/yeni` aksi hâlde `:slug` ile
           eşleşip "böyle bir ilan yok" derdi. */
        path: 'ilan/yeni',
        element: route(
          named(
            () => import('@/features/marketplace/NewListingPage'),
            'NewListingPage'
          )
        ),
      },
      {
        path: 'ilan/:slug',
        element: route(
          named(
            () => import('@/features/marketplace/ListingDetailPage'),
            'ListingDetailPage'
          )
        ),
      },

      /* ═════════════ SAHA ═════════════ */
      { path: 'saha', element: sitesPage() },
      {
        path: 'saha/yeni',
        element: route(
          named(
            () => import('@/features/observing-sites/NewSitePage'),
            'NewSitePage'
          )
        ),
      },
      {
        path: 'saha/:slug',
        element: route(
          named(
            () => import('@/features/observing-sites/SiteDetailPage'),
            'SiteDetailPage'
          )
        ),
      },
      {
        path: 'saha/istasyonlar',
        element: <RedirectTo to="/allsky" />,
      },
      {
        path: 'allsky',
        element: route(
          named(() => import('@/features/allsky/AllskyPage'), 'AllskyPage')
        ),
      },
      {
        path: 'tesisler',
        element: route(
          named(
            () => import('@/features/clubs/FacilitiesPage'),
            'FacilitiesPage'
          )
        ),
      },

      /* ═════════════ REFERANS ═════════════ */
      {
        path: 'hedefler',
        element: <RedirectTo to="/araclar/gokyuzu-katalogu" />,
      },
      {
        path: 'hedef/:slug',
        element: route(
          named(
            () => import('@/features/targets/TargetDetailPage'),
            'TargetDetailPage'
          )
        ),
      },
      { path: 'ekipman', element: equipmentModulePage() },
      /* Statik parça dinamikten önce tanımlı: React Router statik segmenti
         zaten üstün sayıyor, ama sıra okuyan için de açık olsun. */
      {
        path: 'ekipman/karsilastir',
        element: route(
          named(
            () => import('@/features/equipment/EquipmentComparePage'),
            'EquipmentComparePage'
          )
        ),
      },
      {
        /* ASCOM köprüsü — Simülatör'ün içindeydi, ileri seviye ve donanım
           gerektiren bir alan olduğu için Ekipman modülünün altına indi.
           Gerekçe `BridgePage` başlığında. */
        path: 'ekipman/bridge',
        element: route(
          named(() => import('@/features/equipment/BridgePage'), 'BridgePage')
        ),
      },
      { path: 'ekipman/:category', element: equipmentPage() },
      {
        path: 'ekipman/:brand/:slug',
        element: route(
          named(
            () => import('@/features/equipment/EquipmentDetailPage'),
            'EquipmentDetailPage'
          )
        ),
      },
      {
        /*
         * "Setup" adı kullanıcı arayüzünden kalktı (bkz.
         * `MyEquipmentPanel`); adres de hizalandı. Eski yol kalıcı
         * yönlendirmeyle duruyor: paylaşılmış `/setup/<uuid>`
         * bağlantıları dışarıda ve onları kırmak, kullanıcının
         * paylaştığı ekipmanı yok etmek olurdu.
         */
        path: 'ekipmanim/:id',
        element: route(
          named(
            () => import('@/features/setups/SetupDetailPage'),
            'SetupDetailPage'
          )
        ),
      },
      {
        path: 'setup/:id',
        element: <RedirectParam to="/ekipmanim/:id" param="id" />,
      },

      /* ═════════════ HESAP VE YÖNETİM ═════════════ */
      {
        path: 'hesap',
        element: route(
          named(() => import('@/features/profile/AccountPage'), 'AccountPage')
        ),
      },
      /*
       * BİLDİRİM VE MESAJ — ikisi de oturuma bağlı, ikisi de `noIndex`.
       * `/mesajlar` ve `/mesajlar/:id` AYNI bileşeni açıyor: liste ile
       * konuşma geniş ekranda yan yana duruyor ve ayrı rotalara bölmek
       * her sohbet değişiminde listeyi yeniden yüklemek olurdu.
       */
      {
        path: 'bildirimler',
        element: route(
          named(
            () => import('@/features/notifications/NotificationsPage'),
            'NotificationsPage'
          )
        ),
      },
      { path: 'mesajlar', element: messagesPage() },
      { path: 'mesajlar/:id', element: messagesPage() },
      { path: 'panel', element: panelPage() },
      { path: 'panel/:section', element: panelPage() },
      {
        path: 'admin/*',
        element: route(
          named(() => import('@/features/admin/AdminPage'), 'AdminPage')
        ),
      },
      {
        path: 'giris',
        element: route(
          named(() => import('@/features/auth/LoginPage'), 'LoginPage')
        ),
      },
      {
        path: 'kayit',
        element: route(
          named(() => import('@/features/auth/RegisterPage'), 'RegisterPage')
        ),
      },

      /* ═════════════ KURUMSAL ═════════════ */
      {
        path: 'kvkk',
        element: route(
          named(() => import('@/features/static/PrivacyPage'), 'PrivacyPage')
        ),
      },
      {
        path: 'uyelik',
        element: route(
          named(
            () => import('@/features/membership/PremiumPage'),
            'PremiumPage'
          )
        ),
      },
      {
        path: 'kullanim-kosullari',
        element: route(
          named(() => import('@/features/static/TermsPage'), 'TermsPage')
        ),
      },
      {
        path: 'cerezler',
        element: route(
          named(
            () => import('@/features/privacy/CookiePreferencesPage'),
            'CookiePreferencesPage'
          )
        ),
      },
      {
        path: 'hakkinda',
        element: route(
          named(() => import('@/features/static/AboutPage'), 'AboutPage')
        ),
      },
      {
        path: 'iletisim',
        element: route(
          named(() => import('@/features/static/ContactPage'), 'ContactPage')
        ),
      },

      /* ═════════════ ESKİ ADRESLER ═════════════
       * Modül adları değişti; eski yollar kalıcı olarak yönlendirilir.
       * Yer imleri ve arama motoru indeksi kırılmaz. */
      { path: 'fotograflar', element: <RedirectTo to="/galeri" /> },
      { path: 'fotograflar/yukle', element: <RedirectTo to="/galeri/yukle" /> },
      { path: 'egitim', element: <RedirectTo to="/yazilar" /> },
      { path: 'egitim/:slug', element: <RedirectParam to="/yazi/:slug" /> },
      { path: 'ikinci-el', element: <RedirectTo to="/ilanlar" /> },
      { path: 'harita', element: <RedirectTo to="/saha" /> },
      { path: 'harita/gozlem-noktalari', element: <RedirectTo to="/saha" /> },
      {
        path: 'harita/isik-kirliligi',
        element: <RedirectTo to="/araclar/isik-kirliligi" />,
      },
      {
        path: 'harita/etkinlikler',
        element: <RedirectTo to="/etkinlikler" />,
      },
      {
        path: 'harita/istasyonlar',
        element: <RedirectTo to="/saha/istasyonlar" />,
      },
      {
        path: 'gozlem-noktasi/:slug',
        element: <RedirectParam to="/saha/:slug" />,
      },

      /* ═════════════ ŞEHİR SAYFALARI ═════════════
       * `/ankara-astronomi-etkinlikleri` gibi adresler (§20). Şehir adı yol
       * parçasının içinde geçtiği için dinamik segment kullanılamaz; rotalar
       * şehir listesinden üretilir. Tanımsız şehir adı böylece 404 alır. */
      ...cityRoutePaths.map((path) => ({
        path,
        element: route(
          named(() => import('@/features/city/CityPage'), 'CityPage')
        ),
      })),

      // 404
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createRouter(appRoutes);
