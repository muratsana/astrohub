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
import { UiPreferencesProvider } from '@/features/preferences/UiPreferencesProvider';
import { PreviewEditorProvider } from '@/features/preview-editor/PreviewEditorContext';
import { appRoutes } from '@/app/router';
import {
  staticEntries,
  contentEntries,
  buildSitemapXml,
  fetchDbSitemapEntries,
  type SitemapEntry,
} from '@/app/sitemap';
import { SITE_URL } from '@/lib/seo';

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

class PrerenderStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

const storage = globalThis.localStorage;
if (
  !storage ||
  typeof storage.getItem !== 'function' ||
  typeof storage.setItem !== 'function' ||
  typeof storage.removeItem !== 'function'
) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new PrerenderStorage(),
    configurable: true,
  });
}

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
                <UiPreferencesProvider>
                  <PreviewEditorProvider>{children}</PreviewEditorProvider>
                </UiPreferencesProvider>
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

/**
 * Prerender edilecek yollar.
 *
 * SITEMAP'TEN GENİŞ ve fark bilinçli: dizine sunulmayan ince şehir
 * sayfaları da statik HTML alıyor, çünkü adrese giden kullanıcıya gerçek
 * içerik ve gerçek meta göstermek zorundalar. `noindex` sayfayı
 * kapatmıyor.
 */
export function prerenderPaths(): string[] {
  return [...staticEntries, ...contentEntries()].map((entry) => entry.path);
}

/**
 * `sitemap.xml` gövdesi — derleme sırasında diske yazılıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BULUNAN HATA: DOSYA HİÇ ÜRETİLMİYORDU
 *
 * `buildSitemapXml` yazılmış, dışa aktarılmış ve BEŞ TESTLE ölçülüyordu
 * — ama hiçbir yerden çağrılmıyordu. `public/robots.txt` ise
 * `Sitemap: https://astrohub.com.tr/sitemap.xml` diye ilan ediyordu,
 * yani arama motoruna var olmayan bir adres veriliyordu (404).
 *
 * Bu, deponun defalarca yakaladığı hatanın aynısı: kod yazılmış, kimse
 * çağırmıyor. Testlerin geçiyor olması durumu gizliyordu — üretici
 * doğru XML üretiyordu, yalnızca kimse üretmesini istemiyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * VERİTABANI KAYITLARI ARTIK BURADA (ikinci bulunan hata)
 *
 * Aynı dosyayı `vite.config.ts` içindeki bir eklenti de üretiyordu ve o
 * eklenti, panelden yayımlanan haber/yazıları GERÇEK yayın tarihleriyle
 * ekliyordu (QA SEO-02). Ama prerender `vite build`den SONRA çalışıyor
 * ve aynı dosyanın üzerine yazıyordu: veritabanı sorgusu her derlemede
 * atılıyor, sonucu sessizce çöpe gidiyordu.
 *
 * İki üretici yerine bir üretici var artık, veritabanı sorgusu da onda.
 * Eklentinin kaldırılmasının ikinci bir faydası: `vite.config.ts` artık
 * uygulama kodunu içe aktarmıyor (bkz. viteConfig.test.ts).
 */
export async function sitemapXml(): Promise<string | null> {
  /*
   * SİTE ADRESİ YOKSA DOSYA DA YOK.
   *
   * Sitemap protokolü `<loc>` alanının MUTLAK olmasını şart koşuyor.
   * `VITE_SITE_URL` tanımsızken göreli yol ya da uydurma bir alan adı
   * yazmak, `lib/seo.ts`in kendi kuralının ihlali olurdu: "yanlış bir
   * alan adı basmak, etiketi hiç basmamaktan daha zararlıdır".
   * Geçersiz bir sitemap, olmayan bir sitemap'ten kötü — arama motoru
   * onu okur ve bütün adresleri reddeder.
   */
  if (!SITE_URL) return null;
  const bugun = new Date().toISOString().slice(0, 10);

  /*
   * VERİTABANINA ULAŞILAMAZSA DERLEME KIRILMAZ.
   *
   * Tohum girdilerle üretilmiş bir sitemap, hiç üretilmemiş bir
   * sitemap'ten iyi: statik sayfaların tamamı yine ilan ediliyor,
   * yalnızca panelden yayımlanmış içerik eksik kalıyor. Ama sessiz de
   * kalınmıyor — uyarı derleme çıktısına düşüyor.
   */
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  let dbEntries: SitemapEntry[] = [];
  if (supabaseUrl && anonKey) {
    try {
      dbEntries = await fetchDbSitemapEntries(supabaseUrl, anonKey);
    } catch (error) {
      console.warn(
        `sitemap: veritabanı kayıtları alınamadı (${String(error)}); ` +
          'yalnızca tohum girdilerle üretildi.'
      );
    }
  }

  return buildSitemapXml(SITE_URL, bugun, dbEntries);
}
