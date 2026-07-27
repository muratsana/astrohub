import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    /*
     * Testler geliştiricinin `.env` dosyasından yalıtılır.
     *
     * Vite, vitest çalışırken de `.env` yükler; bu yüzden makinesinde gerçek
     * Supabase anahtarları olan bir geliştiricide `isSupabaseConfigured`
     * true, olmayanda false olur ve aynı test iki makinede farklı sonuç
     * verir. (Bu bir kez gerçekten oldu: `.env` eklenince kurulum uyarısı
     * testi kırıldı.) Burada boş bırakılarak "yapılandırılmamış" hâli
     * herkeste aynı şekilde temel alınır; yapılandırılmış hâli test içinde
     * modül taklidiyle kurulur.
     */
    env: {
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
});
