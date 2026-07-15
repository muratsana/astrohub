import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/shell/AppShell';
import { HomePage } from '@/features/home/HomePage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { FovCalculatorPage } from '@/features/calculators/FovCalculatorPage';
import { GalleryPage } from '@/features/photos/GalleryPage';
import { PhotoDetailPage } from '@/features/photos/PhotoDetailPage';

/**
 * Route haritası — şartname §20 önerilen URL yapısı.
 * MVP'de çoğu sayfa placeholder; ilgili feature sprintlerinde
 * gerçek içerikle değiştirilecektir.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },

      // Keşfet
      {
        path: 'kesfet',
        element: (
          <PlaceholderPage
            title="Keşfet"
            description="Astrofotoğrafçılar, kulüpler, rasathaneler ve yeni içerikler."
          />
        ),
      },

      // Fotoğraflar
      { path: 'fotograflar', element: <GalleryPage /> },
      {
        path: 'fotograflar/yukle',
        element: (
          <PlaceholderPage
            title="Fotoğraf Yükle"
            description="6 adımlı astrofotoğraf yükleme sihirbazı — Faz 1.2/1.3'te."
          />
        ),
      },
      { path: 'fotograf/:slug', element: <PhotoDetailPage /> },

      // Hedefler
      {
        path: 'hedefler',
        element: (
          <PlaceholderPage
            title="Astronomik Hedefler"
            description="Messier, NGC, IC ve daha fazla katalog."
          />
        ),
      },
      { path: 'hedef/:slug', element: <PlaceholderPage title="Hedef Detayı" /> },

      // Etkinlikler
      {
        path: 'etkinlikler',
        element: (
          <PlaceholderPage
            title="Etkinlikler"
            description="Türkiye astronomi etkinlikleri: liste, takvim ve harita."
          />
        ),
      },
      {
        path: 'etkinlik/:slug',
        element: <PlaceholderPage title="Etkinlik Detayı" />,
      },

      // Harita
      {
        path: 'harita',
        element: (
          <PlaceholderPage
            title="Harita"
            description="Işık kirliliği, kamp/gözlem noktaları ve tesisler."
          />
        ),
      },
      {
        path: 'harita/isik-kirliligi',
        element: <PlaceholderPage title="Işık Kirliliği Haritası" />,
      },
      {
        path: 'harita/gozlem-noktalari',
        element: (
          <PlaceholderPage
            title="Kamp ve Gözlem Noktaları"
            description="Türkiye'de karanlık gökyüzü ve astrocamping noktaları."
          />
        ),
      },
      {
        path: 'gozlem-noktasi/:slug',
        element: <PlaceholderPage title="Gözlem Noktası" />,
      },

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
      {
        path: 'ekipman',
        element: (
          <PlaceholderPage
            title="Ekipman Veritabanı"
            description="Montür, optik, kamera, filtre ve daha fazlası."
          />
        ),
      },
      {
        path: 'ekipman/:category',
        element: <PlaceholderPage title="Ekipman Kategorisi" />,
      },

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
      {
        path: 'egitim',
        element: (
          <PlaceholderPage
            title="Eğitim Merkezi"
            description="Makaleler, videolar ve işleme laboratuvarı."
          />
        ),
      },
      { path: 'egitim/:slug', element: <PlaceholderPage title="Eğitim İçeriği" /> },

      // İkinci el
      {
        path: 'ikinci-el',
        element: (
          <PlaceholderPage
            title="İkinci El İlanlar"
            description="Güvenilir astronomi ekipmanı pazaryeri."
          />
        ),
      },
      { path: 'ilan/:slug', element: <PlaceholderPage title="İlan Detayı" /> },

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
      {
        path: 'profil/:username',
        element: <PlaceholderPage title="Kullanıcı Profili" />,
      },

      // Üye paneli
      {
        path: 'panel',
        element: (
          <PlaceholderPage
            title="Üye Paneli"
            description="Fotoğraflarım, setup'larım, planlarım ve üyelik."
          />
        ),
      },

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
