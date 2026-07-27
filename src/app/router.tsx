import { createBrowserRouter, createHashRouter } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { FovCalculatorPage } from '@/features/calculators/FovCalculatorPage';
import { GalleryPage } from '@/features/photos/GalleryPage';
import { PhotoDetailPage } from '@/features/photos/PhotoDetailPage';
import { EventsPage } from '@/features/events/EventsPage';
import { EventDetailPage } from '@/features/events/EventDetailPage';
import { TargetsPage } from '@/features/targets/TargetsPage';
import { TargetDetailPage } from '@/features/targets/TargetDetailPage';
import { EquipmentPage } from '@/features/equipment/EquipmentPage';
import { SitesPage } from '@/features/observing-sites/SitesPage';
import { SiteDetailPage } from '@/features/observing-sites/SiteDetailPage';
import { LearningPage } from '@/features/learning/LearningPage';
import { MarketplacePage } from '@/features/marketplace/MarketplacePage';
import { UploadWizardPage } from '@/features/upload/UploadWizardPage';
import { PanelPage } from '@/features/panel/PanelPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { DiscoverPage } from '@/features/discover/DiscoverPage';

/**
 * Sunucusuz önizleme (tek dosya HTML) için hash tabanlı router kullanılır;
 * üretimde her zaman history API'li browser router çalışır.
 */
const createRouter =
  import.meta.env.VITE_ROUTER_MODE === 'hash'
    ? createHashRouter
    : createBrowserRouter;

/**
 * Route haritası — şartname §20 önerilen URL yapısı.
 * MVP'de çoğu sayfa placeholder; ilgili feature sprintlerinde
 * gerçek içerikle değiştirilecektir.
 */
export const router = createRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },

      // Keşfet
      { path: 'kesfet', element: <DiscoverPage /> },

      // Fotoğraflar
      { path: 'fotograflar', element: <GalleryPage /> },
      { path: 'fotograflar/yukle', element: <UploadWizardPage /> },
      { path: 'fotograf/:slug', element: <PhotoDetailPage /> },

      // Hedefler
      { path: 'hedefler', element: <TargetsPage /> },
      { path: 'hedef/:slug', element: <TargetDetailPage /> },

      // Etkinlikler
      { path: 'etkinlikler', element: <EventsPage /> },
      { path: 'etkinlik/:slug', element: <EventDetailPage /> },

      // Harita — tam ekran harita katmanı, tile sağlayıcısı lisansı
      // doğrulanınca eklenecek (§14.1); şimdilik nokta listesi sunulur.
      { path: 'harita', element: <SitesPage /> },
      {
        path: 'harita/isik-kirliligi',
        element: (
          <PlaceholderPage
            title="Işık Kirliliği Haritası"
            description="Katman, veri lisansı doğrulandıktan sonra yayına alınacak (§14.1)."
          />
        ),
      },
      { path: 'harita/gozlem-noktalari', element: <SitesPage /> },
      { path: 'gozlem-noktasi/:slug', element: <SiteDetailPage /> },

      // Bu gece / planlayıcı
      {
        path: 'bu-gece',
        element: (
          <PlaceholderPage
            title="Bu Gece Gökyüzünde"
            description="Ay fazı, astronomik karanlık ve hedef önerileri."
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
      { path: 'ekipman', element: <EquipmentPage /> },
      { path: 'ekipman/:category', element: <EquipmentPage /> },

      // Araçlar
      {
        path: 'araclar',
        element: (
          <PlaceholderPage
            title="Araçlar"
            description="FOV, pixel scale, mosaic ve setup uyumluluk araçları."
          />
        ),
      },
      { path: 'araclar/fov', element: <FovCalculatorPage /> },
      // Pixel scale hesabı FOV hesaplayıcının içinde sunulur.
      { path: 'araclar/pixel-scale', element: <FovCalculatorPage /> },
      {
        path: 'araclar/mosaic',
        element: <PlaceholderPage title="Mosaic Planlayıcı" />,
      },

      // Eğitim
      { path: 'egitim', element: <LearningPage /> },
      {
        path: 'egitim/:slug',
        element: (
          <PlaceholderPage
            title="Eğitim İçeriği"
            description="İçerik detay sayfaları Faz 1.8'de yayına alınacak."
          />
        ),
      },

      // İkinci el
      { path: 'ikinci-el', element: <MarketplacePage /> },
      {
        path: 'ilan/:slug',
        element: (
          <PlaceholderPage
            title="İlan Detayı"
            description="İlan detayları ve güvenli iletişim Faz 1.8'de."
          />
        ),
      },

      // Topluluk / profil
      {
        path: 'topluluklar',
        element: (
          <PlaceholderPage
            title="Kulüpler ve Topluluklar"
            description="Dernekler, üniversite kulüpleri ve gözlem grupları."
          />
        ),
      },
      {
        path: 'topluluk/:slug',
        element: <PlaceholderPage title="Topluluk" />,
      },
      { path: 'profil/:username', element: <ProfilePage /> },

      // Üye paneli
      { path: 'panel', element: <PanelPage /> },

      // Auth
      { path: 'giris', element: <LoginPage /> },
      { path: 'kayit', element: <RegisterPage /> },

      // 404
      {
        path: '*',
        element: (
          <PlaceholderPage
            title="Sayfa bulunamadı"
            description="Aradığınız sayfa mevcut değil ya da henüz yayında değil."
          />
        ),
      },
    ],
  },
]);
