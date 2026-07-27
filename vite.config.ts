import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { buildSitemapXml } from './src/app/sitemap';

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
export default defineConfig({
  plugins: [react(), tailwindcss(), sitemap()],
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
