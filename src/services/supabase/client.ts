import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase istemcisi (§11.3). Kimlik bilgileri ortam değişkenlerinden gelir.
 *
 * Ortam değişkeni tanımlı değilse istemci `null` olur ve uygulama yine de
 * çalışır (graceful degradation) — böylece kurulum tamamlanmadan da UI
 * geliştirilebilir/test edilebilir. Kimlik bilgileri girilince otomatik devreye
 * girer. Service role anahtarı ASLA istemciye konmaz (§15.1).
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** İstemci yapılandırılmışsa döndürür, değilse anlaşılır bir hata fırlatır. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenlerini ayarlayın.'
    );
  }
  return supabase;
}
