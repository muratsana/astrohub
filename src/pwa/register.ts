/**
 * SERVICE WORKER KAYDI (§16.3).
 *
 * NEREDE KAYIT YAPILMAZ VE NEDEN:
 *
 *   · Geliştirme sunucusunda — service worker, Vite'ın sıcak modül
 *     değişimini (HMR) önbelleğe alıp geliştiriciyi eski dosyalarla baş başa
 *     bırakır. Bu, "neden değişikliğim görünmüyor" saatlerinin klasik
 *     kaynağıdır.
 *   · `file://` üzerinden açılan tek dosya önizlemede — tarayıcı zaten
 *     izin vermez, denemek konsola gereksiz hata basar.
 *   · Hash router modunda — önizleme derlemesi bu modda çalışır.
 *
 * Kayıt başarısız olursa uygulama normal çalışmaya devam eder: çevrimdışı
 * desteği bir ek, bir önkoşul değil.
 */

export function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;
  if (import.meta.env.VITE_ROUTER_MODE === 'hash') return;
  if (typeof location !== 'undefined' && location.protocol === 'file:') return;

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      // Sessiz yutmak yerine bir kez bildiriyoruz: çevrimdışı desteğin
      // neden yokolduğunu ancak böyle anlayabiliriz.
      console.warn('[pwa] service worker kaydedilemedi', error);
    });
  });
}
