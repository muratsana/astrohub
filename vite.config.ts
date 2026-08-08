import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { renderServiceWorker } from './src/pwa/buildSw';
import { validateClientEnv } from './src/lib/envCheck';

/**
 * BU DOSYA UYGULAMA KODUNU İÇE AKTARAMAZ.
 *
 * Vite yapılandırmayı esbuild ile paketlerken göreli olmayan her
 * belirteci DIŞARIDA bırakıyor — `@/...` takma adı da öyle. Node o
 * belirteci bir paket adı sanıp "Cannot find package '@/domain'" diyor
 * ve derleme yapılandırma daha okunmadan düşüyor.
 *
 * Tuzak sinsi: kırılma bu dosyada değil, aktarılan modülün
 * aktardıklarının ONLARCA adım ötesinde oluşuyor. Depoda tam olarak bu
 * yaşandı — `sitemap.xml` eklentisi 26 dosyalık bir zinciri buraya
 * çekiyordu; zincirin dibindeki bir dosya `@/domain/...` yazmaya
 * başlayınca `npm run build` dört commit boyunca kırık kaldı ve testler
 * geçmeye devam ettiği için kimse fark etmedi.
 *
 * Bu yüzden buradan yalnızca KENDİ BAŞINA DURAN yardımcılar aktarılıyor
 * (`buildSw`, `envCheck` — ikisi de bağımlılıksız). Uygulama verisine
 * ihtiyaç duyan üretim işleri prerender adımına ait: orası Vite'ın kendi
 * boru hattından geçiyor ve takma adlar orada çözülüyor.
 *
 * Kural `viteConfig.test.ts` ile ölçülüyor; elle uyulacak bir kural
 * olsaydı yine unutulurdu.
 */

/**
 * Ortam değişkeni nöbeti (T-003). Biçimi bozuk değer her derlemede,
 * eksik değer yalnızca gerçek üretim dağıtımında (VERCEL_ENV=production)
 * derlemeyi durdurur. Gerekçe ve kurallar: src/lib/envCheck.ts.
 */
function envGuard(): Plugin {
  return {
    name: 'astrohub-env-guard',
    apply: (_config, env) => env.command === 'build' && !env.isSsrBuild,
    configResolved(config) {
      const errors = validateClientEnv(
        {
          supabaseUrl: config.env.VITE_SUPABASE_URL,
          supabaseAnonKey: config.env.VITE_SUPABASE_ANON_KEY,
          siteUrl: config.env.VITE_SITE_URL,
        },
        {
          production: process.env.VERCEL_ENV === 'production',
          // Preview dahil her Vercel derlemesinde Supabase değişkenleri
          // zorunlu — anahtarsız çıkan önizleme, girişin çalışmadığı
          // "kusursuz görünen" bir site üretir.
          deployed: Boolean(process.env.VERCEL),
        }
      );
      if (errors.length > 0) {
        throw new Error(
          `Ortam değişkeni doğrulaması başarısız:\n- ${errors.join('\n- ')}`
        );
      }
    },
  };
}

// https://vite.dev/config/
/**
 * Service worker üretir (§16.3).
 *
 * Şablon `src/pwa/sw-template.js`; buradaki tek iş, derlemede oluşan gerçek
 * dosya adlarını ve sürüm damgasını şablona yazmak. Hash router modunda
 * (tek dosya önizleme) üretilmez — orada service worker zaten çalışmaz.
 */
function serviceWorker(): Plugin {
  let routerMode: string | undefined;

  return {
    name: 'astrohub-sw',
    apply: (_config, env) => env.command === 'build' && !env.isSsrBuild,
    configResolved(config) {
      routerMode = config.env.VITE_ROUTER_MODE;
    },
    generateBundle(_options, bundle) {
      if (routerMode === 'hash') return;

      const template = readFileSync(
        path.resolve(__dirname, 'src/pwa/sw-template.js'),
        'utf8'
      );

      /*
       * Sürüm damgası derleme çıktısındaki giriş paketinin adından alınır:
       * içerik değişmediyse hash de değişmez, yani gereksiz yere yeni bir
       * önbellek adı üretip kullanıcıya her derlemede yeniden indirtmeyiz.
       */
      const emittedFiles = Object.keys(bundle);
      const entry =
        emittedFiles.find((f) => /^assets\/index-[^/]+\.js$/.test(f)) ??
        emittedFiles[0] ??
        'astrohub';
      const buildId = entry.replace(/^assets\/index-|\.js$/g, '');

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: renderServiceWorker(template, { buildId, emittedFiles }),
      });
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [envGuard(), react(), tailwindcss(), serviceWorker()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    rollupOptions: {
      output: isSsrBuild
        ? // SSR (prerender) paketinde bağımlılıklar external kalır;
          // manualChunks orada geçersizdir ve derlemeyi kırar.
          {}
        : {
            /**
             * Satıcı kodunu ayrı chunk'lara böler (§16.4). React ve router
             * sürümler arası sabit kaldığı için ayrı dosyada tutulunca uzun
             * ömürlü CDN cache'inden yararlanır; uygulama kodu değiştiğinde
             * kullanıcı bunları yeniden indirmez.
             */
            manualChunks: {
              // `react-dom/client` ayrıca listelenir: uygulama paketi bu alt
              // girişten yüklüyor ve yalnızca 'react-dom' verildiğinde React DOM
              // çalışma zamanı satıcı chunk'ına değil uygulama chunk'ına düşüyor.
              'vendor-react': [
                'react',
                'react-dom',
                'react-dom/client',
                'react-router',
              ],
              'vendor-query': ['@tanstack/react-query'],
              'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
              // @supabase/supabase-js bilerek listelenmez: tembel içe aktarılır
              // (services/supabase/client.ts) ve manualChunks'a alınırsa eager
              // yüklenen bir grupla birleşip bu kazancı yok eder.
            },
          },
    },
  },
}));
