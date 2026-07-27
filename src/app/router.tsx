import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { RouteError } from '@/components/RouteError';
import { RouteFallback } from '@/components/RouteFallback';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { RedirectTo, RedirectParam } from './Redirect';

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
 */
function route(loader: () => Promise<{ default: ComponentType }>): ReactNode {
  const Component = lazy(loader);
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
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
const fovPage = () =>
  route(
    named(
      () => import('@/features/calculators/FovCalculatorPage'),
      'FovCalculatorPage'
    )
  );
const equipmentPage = () =>
  route(
    named(() => import('@/features/equipment/EquipmentPage'), 'EquipmentPage')
  );
const panelPage = () =>
  route(named(() => import('@/features/panel/PanelPage'), 'PanelPage'));

/**
 * Route haritası — yedi ana modül.
 *
 * Modül adları değiştiği için URL'ler de hizalandı; eski adresler kalıcı
 * yönlendirmeyle korunur (yer imleri ve arama motoru indeksi kırılmasın).
 */
export const router = createRouter([
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
          named(() => import('@/features/discover/DiscoverPage'), 'DiscoverPage')
        ),
      },
      { path: 'profil/:username', element: route(
          named(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
        ) },

      /* ═════════════ ETKİNLİKLER ═════════════ */
      {
        path: 'etkinlikler',
        element: route(
          named(() => import('@/features/events/EventsPage'), 'EventsPage')
        ),
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
        element: (
          <PlaceholderPage
            title="Etkinlik Haritası"
            description="Yaklaşan etkinliklerin harita görünümü, tile sağlayıcısı bağlandığında açılacak."
          />
        ),
      },
      {
        path: 'topluluklar',
        element: (
          <PlaceholderPage
            title="Kulüpler ve Topluluklar"
            description="Dernekler, üniversite kulüpleri ve gözlem grupları için kurumsal profiller (§8.11)."
          />
        ),
      },
      { path: 'topluluk/:slug', element: <PlaceholderPage title="Topluluk" /> },

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
          named(() => import('@/features/news/NewsDetailPage'), 'NewsDetailPage')
        ),
      },

      /* ═════════════ YAZILAR ═════════════ */
      {
        path: 'yazilar',
        element: route(
          named(() => import('@/features/articles/ArticlesPage'), 'ArticlesPage')
        ),
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

      /* ═════════════ RADYO ═════════════ */
      {
        path: 'radyo',
        element: route(
          named(() => import('@/features/radio/RadioPage'), 'RadioPage')
        ),
      },

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
      { path: 'araclar/fov', element: fovPage() },
      // Pixel scale hesabı FOV hesaplayıcının içinde sunulur.
      { path: 'araclar/pixel-scale', element: fovPage() },
      {
        path: 'araclar/isik-kirliligi',
        element: (
          <PlaceholderPage
            title="Işık Kirliliği Haritası"
            description="Bortle/SQM katmanı, veri lisansı ve kaynak atfı doğrulandıktan sonra yayına alınacak (§14.1)."
          />
        ),
      },
      {
        path: 'araclar/mosaic',
        element: (
          <PlaceholderPage
            title="Mosaic Planlayıcı"
            description="Çok panelli kadraj planı ve örtüşme hesabı."
          />
        ),
      },
      {
        path: 'araclar/setup-uyumluluk',
        element: (
          <PlaceholderPage
            title="Setup Uyumluluk Kontrolü"
            description="Montür yük kapasitesi, backfocus ve guide uyumu kontrolü (§7.12)."
          />
        ),
      },
      {
        path: 'araclar/takvim',
        element: (
          <PlaceholderPage
            title="Ay ve Astronomik Karanlık Takvimi"
            description="Aylık karanlık pencere takvimi."
          />
        ),
      },
      {
        path: 'bu-gece',
        element: (
          <PlaceholderPage
            title="Bu Gece Gökyüzünde"
            description="Ana sayfadaki panel bu sayfada gün gün genişletilecek: yükseklik grafikleri, ay penceresi ve hedef sırası."
          />
        ),
      },
      {
        path: 'planlayici',
        element: (
          <PlaceholderPage
            title="Gözlem ve Çekim Planlayıcı"
            description="Gece planı, hedef sırası ve yükseklik grafiği."
          />
        ),
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
        path: 'ilan/:slug',
        element: (
          <PlaceholderPage
            title="İlan Detayı"
            description="İlan detayları ve platform içi güvenli iletişim Faz 1.8'de."
          />
        ),
      },

      /* ═════════════ SAHA ═════════════ */
      { path: 'saha', element: sitesPage() },
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
        element: (
          <PlaceholderPage
            title="Canlı SQM / All-Sky İstasyonları"
            description="Karanlık gökyüzü canlı ölçüm ağı (§8.7) Faz 3'te devreye alınacak."
          />
        ),
      },
      {
        path: 'tesisler',
        element: (
          <PlaceholderPage
            title="Rasathaneler ve Planetaryumlar"
            description="Türkiye astronomi tesisleri rehberi Faz 2'de yayına alınacak."
          />
        ),
      },

      /* ═════════════ REFERANS ═════════════ */
      {
        path: 'hedefler',
        element: route(
          named(() => import('@/features/targets/TargetsPage'), 'TargetsPage')
        ),
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
      { path: 'ekipman', element: equipmentPage() },
      { path: 'ekipman/:category', element: equipmentPage() },
      {
        path: 'ekipman/:brand/:slug',
        element: (
          <PlaceholderPage
            title="Ekipman Modeli"
            description="Model detay sayfaları (teknik alanlar, uyumluluk, bu ekipmanla çekilmiş fotoğraflar) Faz 1.5'te."
          />
        ),
      },
      {
        path: 'setup/:id',
        element: (
          <PlaceholderPage
            title="Setup Detayı"
            description="Kayıtlı setup'lar ve fotoğraf ilişkisi Faz 1.5'te yayına alınacak."
          />
        ),
      },

      /* ═════════════ HESAP VE YÖNETİM ═════════════ */
      { path: 'panel', element: panelPage() },
      { path: 'panel/:section', element: panelPage() },
      {
        path: 'admin',
        element: (
          <PlaceholderPage
            title="Yönetim Paneli"
            description="Moderasyon kuyrukları, etkinlik/haber girişi ve depolama paneli (§13). Yetkilendirme sunucu tarafında zorunludur."
          />
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
        path: 'kullanim-kosullari',
        element: route(
          named(() => import('@/features/static/TermsPage'), 'TermsPage')
        ),
      },
      {
        path: 'hakkinda',
        element: route(
          named(() => import('@/features/static/AboutPage'), 'AboutPage')
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
        element: <RedirectTo to="/etkinlikler/harita" />,
      },
      {
        path: 'harita/istasyonlar',
        element: <RedirectTo to="/saha/istasyonlar" />,
      },
      {
        path: 'gozlem-noktasi/:slug',
        element: <RedirectParam to="/saha/:slug" />,
      },

      // 404
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
