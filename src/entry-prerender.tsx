/* eslint-disable react-refresh/only-export-components --
   Bu dosya yalnızca derleme zamanında (SSG) çalışır; hot reload'a hiç
   girmez, kural burada anlamsız. */
import type { ReactNode } from 'react';
import { prerender } from 'react-dom/static';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/features/theme/ThemeContext';
import { LocationProvider } from '@/features/location/LocationContext';
import { AuthProvider } from '@/features/auth/AuthContext';
import { RadioProvider } from '@/features/radio/RadioContext';
import { SiteConfigProvider } from '@/features/site/SiteConfigContext';
import { PreviewEditorProvider } from '@/features/preview-editor/PreviewEditorContext';
import { appRoutes } from '@/app/router';
import { staticEntries, contentEntries } from '@/app/sitemap';

/**
 * PRERENDER GİRİŞİ (T-301 / QA P0-03, SEO-01).
 *
 * Vercel her rotaya aynı `index.html` kabuğunu veriyordu: ham HTML'de ne
 * rota başlığı ne açıklama ne og:image vardı — sosyal botlar ve ham-HTML
 * okuyan tarayıcılar siteyi tek tip görüyordu. Bu giriş noktası, derleme
 * sonrası her sitemap rotasını React 19'un `prerender` API'siyle statik
 * HTML'e çevirir; `prerender`, `renderToString`ten farklı olarak Suspense
 * ve lazy chunk'ların çözülmesini BEKLER — sayfalar yükleniyor iskeleti
 * değil gerçek içerikleriyle yazılır.
 *
 * Sağlayıcı yığını main.tsx ile birebir aynıdır (StrictMode hariç):
 * sayfalar bağlamlardan (tema, konum, oturum) koptuğunda render zaten
 * kırılır. Efektler statik render'da çalışmaz — ağ istekleri atılmaz,
 * sayfalar tohum/varsayılan veriyle yazılır; canlı veri istemcide gelir.
 */

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocationProvider>
          <AuthProvider>
            <RadioProvider>
              <SiteConfigProvider>
                <PreviewEditorProvider>{children}</PreviewEditorProvider>
              </SiteConfigProvider>
            </RadioProvider>
          </AuthProvider>
        </LocationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
  }
  return html + decoder.decode();
}

/** Tek bir rotayı tam çözülmüş HTML'e çevirir. */
export async function renderRoute(path: string): Promise<string> {
  const handler = createStaticHandler(appRoutes);
  const context = await handler.query(
    new Request(`https://astrohub.com.tr${path}`)
  );
  if (context instanceof Response) {
    throw new Error(`Rota yönlendirme döndürdü: ${path} → ${context.status}`);
  }

  const router = createStaticRouter(handler.dataRoutes, context);
  const { prelude } = await prerender(
    <Providers>
      <StaticRouterProvider router={router} context={context} />
    </Providers>
  );
  return streamToString(prelude);
}

/** Prerender edilecek yollar — sitemap ile aynı kaynak (§16.2). */
export function prerenderPaths(): string[] {
  return [...staticEntries, ...contentEntries()].map((entry) => entry.path);
}
