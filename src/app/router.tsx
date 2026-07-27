import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/components/NotFoundPage';
import { RouteError } from '@/components/RouteError';
import { RouteFallback } from '@/components/RouteFallback';
import { PlaceholderPage } from '@/components/PlaceholderPage';

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

/**
 * Route haritası — şartname §20 önerilen URL yapısı.
 * Henüz yayına alınmamış bölümler PlaceholderPage ile açık biçimde
 * işaretlenir; hiçbir menü/footer bağlantısı 404'e düşmez.
 */
export const router = createRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <HomePage /> },

      // Keşfet
      {
        path: 'kesfet',
        element: route(
          named(
            () => import('@/features/discover/DiscoverPage'),
            'DiscoverPage'
          )
        ),
      },

      // Fotoğraflar
      {
        path: 'fotograflar',
        element: route(
          named(() => import('@/features/photos/GalleryPage'), 'GalleryPage')
        ),
      },
      {
        path: 'fotograflar/yukle',
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

      // Hedefler
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

      // Etkinlikler
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

      // Harita — tam ekran harita katmanı, tile sağlayıcısı lisansı
      // doğrulanınca eklenecek (§14.1); şimdilik nokta listesi sunulur.
      {
        path: 'harita',
        element: route(
          named(
            () => import('@/features/observing-sites/SitesPage'),
            'SitesPage'
          )
        ),
      },
      {
        path: 'harita/isik-kirliligi',
        element: (
          <PlaceholderPage
            title="Işık Kirliliği Haritası"
            description="Bortle/SQM katmanı, veri lisansı ve kaynak atfı doğrulandıktan sonra yayına alınacak (§14.1)."
          />
        ),
      },
      {
        path: 'harita/gozlem-noktalari',
        element: route(
          named(
            () => import('@/features/observing-sites/SitesPage'),
            'SitesPage'
          )
        ),
      },
      {
        path: 'harita/etkinlikler',
        element: (
          <PlaceholderPage
            title="Etkinlik Haritası"
            description="Yaklaşan etkinliklerin harita görünümü, tile sağlayıcısı bağlandığında açılacak."
          />
        ),
      },
      {
        path: 'harita/istasyonlar',
        element: (
          <PlaceholderPage
            title="Canlı SQM / All-Sky İstasyonları"
            description="Karanlık gökyüzü canlı ölçüm ağı (§8.7) Faz 3'te devreye alınacak."
          />
        ),
      },
      {
        path: 'gozlem-noktasi/:slug',
        element: route(
          named(
            () => import('@/features/observing-sites/SiteDetailPage'),
            'SiteDetailPage'
          )
        ),
      },

      // Bu gece / planlayıcı
      {
        path: 'bu-gece',
        element: (
          <PlaceholderPage
            title="Bu Gece Gökyüzünde"
            description="Ay fazı, astronomik karanlık ve hedef önerileri. Efemeris servisi (§14.2) bağlandığında açılacak."
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

      // Ekipman
      {
        path: 'ekipman',
        element: route(
          named(
            () => import('@/features/equipment/EquipmentPage'),
            'EquipmentPage'
          )
        ),
      },
      {
        path: 'ekipman/:category',
        element: route(
          named(
            () => import('@/features/equipment/EquipmentPage'),
            'EquipmentPage'
          )
        ),
      },
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

      // Araçlar
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
        path: 'araclar/fov',
        element: route(
          named(
            () => import('@/features/calculators/FovCalculatorPage'),
            'FovCalculatorPage'
          )
        ),
      },
      // Pixel scale hesabı FOV hesaplayıcının içinde sunulur.
      {
        path: 'araclar/pixel-scale',
        element: route(
          named(
            () => import('@/features/calculators/FovCalculatorPage'),
            'FovCalculatorPage'
          )
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
            description="Aylık karanlık pencere takvimi; efemeris servisi (§14.2) bağlandığında açılacak."
          />
        ),
      },

      // Eğitim
      {
        path: 'egitim',
        element: route(
          named(
            () => import('@/features/learning/LearningPage'),
            'LearningPage'
          )
        ),
      },
      {
        path: 'egitim/:slug',
        element: (
          <PlaceholderPage
            title="Eğitim İçeriği"
            description="İçerik detay sayfaları ve işleme laboratuvarı Faz 1.8'de yayına alınacak."
          />
        ),
      },

      // İkinci el
      {
        path: 'ikinci-el',
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

      // Topluluk / profil
      {
        path: 'topluluklar',
        element: (
          <PlaceholderPage
            title="Kulüpler ve Topluluklar"
            description="Dernekler, üniversite kulüpleri ve gözlem grupları için kurumsal profiller (§8.11)."
          />
        ),
      },
      {
        path: 'topluluk/:slug',
        element: <PlaceholderPage title="Topluluk" />,
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
      {
        path: 'profil/:username',
        element: route(
          named(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
        ),
      },

      // Üye paneli — alt sayfalar hesap sistemiyle birlikte açılacak (§7.16)
      {
        path: 'panel',
        element: route(
          named(() => import('@/features/panel/PanelPage'), 'PanelPage')
        ),
      },
      {
        path: 'panel/:section',
        element: route(
          named(() => import('@/features/panel/PanelPage'), 'PanelPage')
        ),
      },

      // Yönetim
      {
        path: 'admin',
        element: (
          <PlaceholderPage
            title="Yönetim Paneli"
            description="Moderasyon kuyrukları, ekipman/etkinlik yönetimi ve depolama paneli (§13). Yetkilendirme sunucu tarafında zorunludur."
          />
        ),
      },

      // Kurumsal / hukuki
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

      // Auth
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

      // 404
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
