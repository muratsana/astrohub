/**
 * ASTROHUB SERVICE WORKER (§16.3).
 *
 * Bu dosya paketlenmez; derleme sırasında aşağıdaki iki yer tutucu (BUILD_ID
 * ve PRECACHE sabitlerindeki) gerçek değerlerle değiştirilip `dist/sw.js`
 * olarak yazılır (bkz. `vite.config.ts` → `serviceWorker()` eklentisi).
 *
 * Yer tutucu dizeleri bu açıklamada BİLE BİLE yazılmıyor: ilk sürümde
 * yorumda da geçiyorlardı ve `String.replace` ilk eşleşmeyi — yani yorumu —
 * değiştirip gerçek sabitleri olduğu gibi bırakıyordu. Üretilen service
 * worker sessizce bozuktu.
 *
 * ÜÇ FARKLI İSTEK, ÜÇ FARKLI STRATEJİ — hepsi tek bir kuralla yönetilseydi
 * ya çevrimdışı çalışmazdı ya da bayat veri gösterirdi:
 *
 *   1. GEZİNME (HTML)     → önce ağ, olmazsa önbellekteki kabuk.
 *      Uygulama kabuğunu önbellekten servis etmek, yeni sürüm yayına
 *      alındığında kullanıcıyı eski index.html'de kilitler; o da silinmiş
 *      chunk'ları ister ve beyaz ekran doğar.
 *
 *   2. HASH'Lİ VARLIKLAR  → önce önbellek. `/assets/index-a1b2c3.js` adı
 *      içeriğine bağlı olduğu için asla bayatlamaz; ağa çıkmak boşuna.
 *
 *   3. GERİ KALAN HER ŞEY → yalnızca ağ, ÖNBELLEĞE ALINMAZ.
 *      Hava servisi, Supabase ve tüm veri çağrıları buraya düşer. Gökyüzü
 *      koşullarını önbellekten göstermek, kullanıcıyı bulutlu bir gecede
 *      "açık" yazısıyla yola çıkarmak demek olurdu.
 */

const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = `astrohub-shell-${BUILD_ID}`;
const ASSET_CACHE = `astrohub-assets-${BUILD_ID}`;

/** Derlemede üretilen kabuk dosyaları. */
const PRECACHE = __PRECACHE__;

/** Çevrimdışı gezinmede döndürülecek kabuk. */
const SHELL_URL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      /*
       * `skipWaiting` bilinçli: kullanıcı yeni sürümü almak için tüm
       * sekmelerini kapatmak zorunda kalmasın. Eski sekmede açık duran
       * uygulama zaten `lazyWithRetry` sayesinde silinmiş chunk'ta
       * kendini bir kez yeniliyor.
       */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Yalnızca GET önbelleğe konur; POST/PATCH veri yazar, tekrarlanamaz.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Başka bir origin (hava servisi, Supabase, Spotify) — dokunma.
  if (url.origin !== self.location.origin) return;

  // 1. Gezinme: önce ağ, olmazsa kabuk.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          void caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(SHELL_URL)
            .then((cached) => cached ?? Response.error())
        )
    );
    return;
  }

  // 2. Hash'li varlıklar: önce önbellek.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  /*
   * 3. Geri kalan (manifest, ikon, robots…): önce ağ, olmazsa önbellek.
   * Bunlar nadiren değişir ama önbellekte tutmak çevrimdışı ikon/manifest
   * sağlar. Veri uçları buraya düşmez — onlar farklı origin'de.
   */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached ?? Response.error()))
  );
});
