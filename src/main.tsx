import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router } from '@/app/router';
import { AuthProvider } from '@/features/auth/AuthContext';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { PreviewEditorProvider } from '@/features/preview-editor/PreviewEditorContext';
import { ActiveSetupProvider } from '@/features/setups/ActiveSetupContext';
import { RadioProvider } from '@/features/radio/RadioContext';
import { SiteConfigProvider } from '@/features/site/SiteConfigContext';
import { UiPreferencesProvider } from '@/features/preferences/UiPreferencesProvider';
import { registerServiceWorker } from '@/pwa/register';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root elementi bulunamadı');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocationProvider>
          <AuthProvider>
            {/*
              Radyo sağlayıcısı router'ın DIŞINDA: sayfa değişimi <audio>
              öğesini söküp müziği kesmemeli. Rota içinde yaşasaydı her
              gezinme yayını sıfırlardı.
            */}
            <RadioProvider>
              {/*
                Site ayarları router'ın DIŞINDA: bakım kapısı ve duyuru
                bandı kabuk seviyesinde yaşıyor, her rota değişiminde
                yeniden okumaları gereksiz bir istek olurdu.
              */}
              <SiteConfigProvider>
                {/*
                  Arayüz tercihleri de router'ın DIŞINDA: `useViewMode`
                  her liste sayfasında çağrılıyor ve tercih satırları
                  rota başına yeniden okunmamalı. Sağlayıcı çocuk
                  çizmiyor, yalnızca `preferenceStore` defterine kayıt
                  yapıyor (bkz. o dosyanın başlığı).
                */}
                <UiPreferencesProvider>
                  {/*
                    AKTİF SETUP router'ın DIŞINDA: rota değiştiğinde seçim
                    sıfırlanmamalı. Simülatörde setup'ını seçip mozaik
                    planlayıcıya geçen kullanıcı aynı ekipmanla devam
                    ediyor — modül ayrımının tek işe yarar hâle geldiği
                    yer burası (bkz. ActiveSetupContext başlığı).
                  */}
                  <ActiveSetupProvider>
                    <PreviewEditorProvider>
                      <RouterProvider router={router} />
                    </PreviewEditorProvider>
                  </ActiveSetupProvider>
                </UiPreferencesProvider>
              </SiteConfigProvider>
            </RadioProvider>
          </AuthProvider>
        </LocationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);

/*
 * Çevrimdışı desteği uygulama boyandıktan SONRA kurulur: kayıt işlemi ilk
 * boyamayla yarışırsa, ölçülebilir bir kazanç sağlamadan ilk içerik boyamasını
 * geciktirir (§16.4). Kayıt başarısız olursa uygulama normal çalışır.
 */
registerServiceWorker();
