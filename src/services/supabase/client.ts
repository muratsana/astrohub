import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase istemcisi (§11.3). Kimlik bilgileri ortam değişkenlerinden gelir.
 *
 * SDK **tembel** yüklenir: `@supabase/supabase-js` yaklaşık 240 kB'lık bir
 * paket ve giriş yapmamış bir ziyaretçinin ana sayfayı görmesi için gerekli
 * değil. Bu yüzden modül dinamik `import()` ile, yalnızca ilk gerçek
 * kullanımda indirilir (§16.4 performans hedefleri).
 *
 * Ortam değişkeni tanımlı değilse istemci hiç kurulmaz ve uygulama yine de
 * çalışır (graceful degradation) — böylece kurulum tamamlanmadan da UI
 * geliştirilebilir/test edilebilir. Service role anahtarı ASLA istemciye
 * konmaz (§15.1).
 */
const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Yapılandırma durumu senkron okunabilir — yalnızca ortam değişkenlerine
 * bakar, SDK'yı indirmez.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Aynı istemcinin birden çok kez kurulmasını engelleyen tekil söz. */
let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Supabase istemcisini döndürür; yapılandırma yoksa `null`.
 * İlk çağrıda SDK indirilir, sonraki çağrılar aynı örneği paylaşır.
 */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (!isSupabaseConfigured) return null;

  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  );

  return clientPromise;
}

/** İstemci yapılandırılmışsa döndürür, değilse anlaşılır bir hata fırlatır. */
export async function requireSupabase(): Promise<SupabaseClient> {
  const client = getSupabase();
  if (!client) {
    throw new Error(
      'Supabase yapılandırılmamış. VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ortam değişkenlerini ayarlayın.'
    );
  }
  return client;
}
