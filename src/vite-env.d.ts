/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase proje URL'i (§11.3). Tanımsızsa istemci devre dışı kalır. */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon anahtarı. Service role anahtarı ASLA istemciye konmaz. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /**
   * `hash` verildiğinde router hash tabanlı çalışır — sunucusuz tek dosya
   * önizleme derlemesi için. Üretimde tanımsızdır (history API).
   */
  readonly VITE_ROUTER_MODE?: 'hash' | 'history';
  /**
   * Yayın alan adı (örn. https://astrohub.example). Canonical/og:url
   * etiketleri ve sitemap üretimi bu değere bağlıdır; tanımsızsa mutlak URL
   * üretilmez (§16.2).
   */
  readonly VITE_SITE_URL?: string;
  /**
   * `true` olduğunda hero metinlerini canlı düzenleyen önizleme paneli
   * açılır. Yalnızca önizleme derlemesinde tanımlanır.
   */
  readonly VITE_PREVIEW_EDITOR?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
