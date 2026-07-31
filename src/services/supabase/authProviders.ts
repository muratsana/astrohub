import { useEffect, useState } from 'react';
import { isSupabaseConfigured } from './client';

/**
 * HANGİ OAUTH SAĞLAYICILARI AÇIK — SUPABASE'E SORARAK.
 *
 * NEDEN SORULUYOR, VARSAYILMIYOR
 *
 * "Google ile devam et" düğmesi giriş ve kayıt ekranlarında duruyordu ve
 * yalnızca "Supabase yapılandırılmış mı" koşuluna bakıyordu. Ama
 * yapılandırılmış olmak, GOOGLE SAĞLAYICISININ AÇIK OLDUĞU anlamına
 * gelmiyor: ikisi ayrı ayarlar. Üretimde ölçüldü —
 * `/auth/v1/settings` `"google": false` döndürüyordu, yani düğmeye
 * basan herkes Supabase'in "Unsupported provider" hatasını alıyordu.
 *
 * Çalışmayan bir düğmeyi göstermek, kullanıcıya olmayan bir yol
 * göstermek demek. Üstelik hata mesajı ("provider is not enabled")
 * kullanıcının yapabileceği hiçbir şeyi anlatmıyor.
 *
 * Uç nokta ANONİM ERİŞİME AÇIK ve zaten istemcinin bildiği bilgiyi
 * veriyor (giriş ekranında hangi düğmelerin olacağı). Gizli bir şey
 * sızdırmıyor; Supabase'in kendi arayüzü de aynı uçtan besleniyor.
 *
 * YAN FAYDASI: sağlayıcı panelden açıldığı anda düğme YENİDEN DAĞITIM
 * OLMADAN belirir. Kod ile panel arasındaki gecikme kapanıyor.
 */

export type OAuthProvider = 'google';

interface Settings {
  external?: Record<string, boolean>;
}

/**
 * Sonuç modül düzeyinde önbelleğe alınıyor: her giriş ekranı açılışında
 * yeniden sormak gereksiz. Ayar oturum ortasında değişse bile düğmenin
 * o sekmede belirmemesi kabul edilebilir; sayfa yenilemesi yeter.
 */
let cache: Promise<Set<string>> | null = null;

async function fetchEnabledProviders(): Promise<Set<string>> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return new Set();

  try {
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/settings`, {
      headers: { apikey: key },
    });
    if (!response.ok) return new Set();

    const settings = (await response.json()) as Settings;
    return new Set(
      Object.entries(settings.external ?? {})
        .filter(([, enabled]) => enabled === true)
        .map(([name]) => name)
    );
  } catch {
    /*
     * Ağ hatasında BOŞ küme dönüyor, yani düğme çizilmiyor. Ters yön
     * (hata hâlinde göster) daha "cömert" görünür ama kullanıcıyı
     * çalışmayabilecek bir yola sokar; e-posta girişi zaten duruyor.
     */
    return new Set();
  }
}

export function enabledProviders(): Promise<Set<string>> {
  cache ??= fetchEnabledProviders();
  return cache;
}

/** Testler için — modül önbelleğini sıfırlar. */
export function resetProviderCache(): void {
  cache = null;
}

/**
 * Sağlayıcı açık mı?
 *
 * Cevap gelene kadar `false`: giriş ekranı açılır açılmaz bir an görünüp
 * kaybolan düğme, hiç olmayandan kötü.
 */
export function useProviderEnabled(provider: OAuthProvider): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let active = true;
    void enabledProviders().then((providers) => {
      if (active) setEnabled(providers.has(provider));
    });
    return () => {
      active = false;
    };
  }, [provider]);

  return enabled;
}
