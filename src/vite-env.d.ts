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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
