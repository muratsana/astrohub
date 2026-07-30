import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { buildSitemapXml } from './src/app/sitemap';
import { renderServiceWorker } from './src/pwa/buildSw';

/**
 * Derleme sırasında `sitemap.xml` üretir (§16.2).
 *
 * Mutlak URL zorunlu olduğu için `VITE_SITE_URL` tanımlı değilse dosya
 * üretilmez ve uyarı verilir — yanlış alan adıyla sitemap yayımlamak,
 * sitemap'i hiç yayımlamamaktan daha zararlıdır.
 */
function sitemap(): Plugin {
  let siteUrl: string | undefined;

  return {
    name: 'astrohub-sitemap',
    apply: 'build',
    configResolved(config) {
      siteUrl = config.env.VITE_SITE_URL?.trim();
    },
    generateBundle() {
      if (!siteUrl) {
        this.warn(
          'VITE_SITE_URL tanımlı değil — sitemap.xml üretilmedi. ' +
            'Yayın alan adını .env dosyasına ekleyin.'
        );
        return;
      }

      // Derleme tarihi `lastmod` olarak kullanılır; içerik veritabanına
      // taşındığında kaydın kendi güncellenme tarihi geçecektir.
      const lastmod = new Date().toISOString().slice(0, 10);

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: buildSitemapXml(siteUrl, lastmod),
      });
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
    apply: 'build',
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

/**
 * Kimlik doğrulama yapılandırmasını derleme zamanında doğrular.
 *
 * `VITE_` ile başlayan değişkenler pakete DERLEME ANINDA gömülür. Bu
 * yüzden Supabase anahtarları olmadan alınan bir üretim derlemesi
 * kusursuz görünen ama hiç kimsenin giriş yapamadığı bir site üretiyor:
 * `isSupabaseConfigured` false kalıyor ve giriş formu "Kimlik doğrulama
 * henüz yapılandırılmadı" diyor. Hata çalışma zamanında, kullanıcının
 * karşısında ortaya çıkıyor — oysa sebebi tamamen derleme zamanında
 * belliydi.
 *
 * `.env` depoya girmediği için (girmemeli de) değerler dağıtım ortamının
 * kendi panelinden gelir. Orada tanımlanmayı unutmak sessiz kalmamalı.
 *
 * NEDEN HER YERDE HATA DEĞİL: CI yalnızca derlemenin tamamlandığını
 * doğruluyor ve gizli anahtarlara ihtiyacı yok; orada zorunlu tutmak,
 * güvenlik kazancı olmadan boruyu kırardı. Bu yüzden gerçek bir dağıtım
 * derlemesinde (Vercel) HATA, başka her yerde UYARI.
 */
function authConfigGuard(): Plugin {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

  return {
    name: 'astrohub-auth-config-guard',
    apply: 'build',
    configResolved(config) {
      const missing = required.filter((key) => !config.env[key]?.trim());
      if (missing.length === 0) return;

      const message =
        `${missing.join(' ve ')} tanımlı değil. Bu değişkenler pakete ` +
        'derleme anında gömülür; eksikken çıkan derlemede giriş ve kayıt ' +
        'tamamen kapalı olur. Değerleri dağıtım ortamının ortam değişkeni ' +
        'ayarlarına girin (Vercel → Project Settings → Environment Variables).';

      // `VERCEL` yalnızca Vercel'in kendi derleme ortamında tanımlıdır;
      // yerel `npm run build` ve CI bu dala girmez.
      if (process.env.VERCEL) {
        throw new Error(`[astrohub] Dağıtım durduruldu — ${message}`);
      }
      config.logger.warn(`[astrohub] ${message}`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    authConfigGuard(),
    sitemap(),
    serviceWorker(),
  ],
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
      output: {
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
            'react-router-dom',
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
});
