import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

/**
 * Tek dosya önizleme derlemesi.
 *
 * Uygulamayı tüm JS/CSS gömülü tek bir `index.html` olarak üretir; böylece
 * sunucu, build adımı veya dış istek olmadan (katı CSP altında da) açılabilir.
 * Yalnızca tasarım/akış önizlemesi içindir — üretim derlemesi `vite.config.ts`.
 *
 * Router `hash` modunda çalışır (VITE_ROUTER_MODE), çünkü tek dosya
 * önizlemede history API tabanlı derin bağlantılar çözülemez.
 */
function inlineAssets(): Plugin {
  return {
    name: 'astrohub-inline-assets',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlName = Object.keys(bundle).find((name) =>
        name.endsWith('.html')
      );
      if (!htmlName) return;

      const htmlAsset = bundle[htmlName];
      if (htmlAsset.type !== 'asset') return;

      let html = String(htmlAsset.source);
      const inlined: string[] = [];

      for (const [name, chunk] of Object.entries(bundle)) {
        // Not: yerine koyma metni fonksiyonla verilir — paket kodundaki
        // `$&` / `$'` dizileri String.replace tarafından yorumlanmasın.
        if (chunk.type === 'chunk' && name.endsWith('.js')) {
          html = html.replace(
            new RegExp(
              `<script[^>]*src="[^"]*${escapeRegExp(name)}"[^>]*></script>`
            ),
            () => `<script type="module">${chunk.code}</script>`
          );
          inlined.push(name);
        } else if (chunk.type === 'asset' && name.endsWith('.css')) {
          html = html.replace(
            new RegExp(`<link[^>]*href="[^"]*${escapeRegExp(name)}"[^>]*>`),
            () => `<style>${String(chunk.source)}</style>`
          );
          inlined.push(name);
        }
      }

      // Gömülen dosyalara işaret eden ön yükleme/simge bağlantıları kalmasın;
      // önizleme tek dosyadır, dış istek yapmamalıdır.
      html = html
        .replace(/\s*<link[^>]*rel="modulepreload"[^>]*>/g, '')
        .replace(/\s*<link[^>]*rel="icon"[^>]*>/g, '');

      // Gömülen dosyalar ayrıca yazılmasın — çıktı tek dosya kalsın.
      for (const name of inlined) delete bundle[name];

      htmlAsset.source = html;
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default defineConfig({
  plugins: [react(), tailwindcss(), inlineAssets()],
  define: {
    'import.meta.env.VITE_ROUTER_MODE': JSON.stringify('hash'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist-preview',
    emptyOutDir: true,
    // Görsel/font varlıkları da HTML içine gömülsün (dış istek olmasın).
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
    cssCodeSplit: false,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Tek JS parçası — inline edilebilmesi için kod bölme kapalı.
        inlineDynamicImports: true,
      },
    },
  },
});
