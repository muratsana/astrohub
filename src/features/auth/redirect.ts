/**
 * KİMLİK DOĞRULAMA DÖNÜŞ ADRESİ — ya bilinen bir kökene, ya hiçbir yere.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SORUN: DÖNÜŞ ADRESİNİ SAYFAYI SUNAN BELİRLİYORDU
 *
 * Adres üretimi `VITE_SITE_URL` yokken `window.location.origin`'e
 * düşüyordu — yani uygulamayı barındıran her kimse dönüş adresini o
 * belirliyordu. Saldırgan bu paketi kendi alan adından sunduğunda
 * `redirectTo` kendiliğinden ona işaret ediyor; Supabase tarafındaki
 * "Redirect URLs" listesi genişse (ya da joker içeriyorsa) OAuth kodu
 * saldırganın sayfasına teslim ediliyordu. Kökene güvenmek, kimlik
 * doğrulamanın nereye döneceğini saldırgana sormak demekti.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ÇÖZÜM: İKİ KÖKEN, BAŞKA HİÇBİRİ
 *
 * Üretimde derlemeye gömülü `VITE_SITE_URL`, geliştirmede localhost.
 * Tanınmayan bir kökende adres ÜRETİLMİYOR ve `undefined` dönüyor.
 *
 * `undefined` DÖNMEK NEDEN GÜVENLİ: supabase-js alan yokken parametreyi
 * hiç göndermiyor, sunucu da kendi panelinde tanımlı Site URL'ini
 * kullanıyor. Yani seçim istemciden alınıp sunucuya veriliyor — kötü
 * senaryoda kullanıcı yanlış (ama BİZİM) bir sayfaya düşer, saldırganın
 * sayfasına değil. Boş bir dize DÖNDÜRMEK yanlış olurdu: `'' + '/giris'`
 * göreli bir adres üretir ve supabase-js onu alan olarak gönderir.
 *
 * Bu istemci tarafı kontrol sunucudaki listenin YERİNE GEÇMEZ; Supabase
 * panelindeki "Redirect URLs" listesini dar tutmak hâlâ ayrı bir iş
 * (T-508).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * NEDEN AYRI DOSYA
 *
 * Bu mantık `AuthContext` içindeyken sınanamıyordu: test etmek için
 * bütün sağlayıcıyı ve supabase istemcisini ayağa kaldırmak gerekiyordu.
 * Güvenlik kararı veren bir dal, sınanması en kolay yerde durmalı.
 */

/** Dönüş adresinin güvenilebileceği tek istisna: yerel geliştirme. */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Köken yerel geliştirme adresi mi?
 *
 * `URL.hostname` IPv6'da köşeli parantezleri KORUYOR (`[::1]`), ama
 * bazı ortamlar çıplak `::1` veriyor — ikisi de listede.
 */
export function isLocalOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTNAMES.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

/**
 * Yönlendirmelerin döneceği taban adres.
 *
 * `VITE_SITE_URL` OKUNUYOR, `VITE_APP_URL` DEĞİL. Burada uzun süre
 * `VITE_APP_URL` yazıyordu ve yorumunda "yayında bu kullanılıyor"
 * deniyordu — ama o ad hiçbir yerde tanımlı değildi: ne
 * `vite-env.d.ts`'te bildirilmiş, ne derleme nöbetinde (`envCheck`)
 * doğrulanıyor, ne Vercel'de ayarlı. Yani koşul her zaman `false`'a
 * düşüyordu. `VITE_SITE_URL` canonical/OG/sitemap için zaten üretimde
 * ZORUNLU kılınıyor — tek ada indirmek, dönüş adresini de o nöbetin
 * arkasına almak demek.
 *
 * Tanınmayan kökende boş dize döner; çağıran bunu `undefined`'a çevirir.
 */
function appUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  if (typeof window === 'undefined') return '';
  return isLocalOrigin(window.location.origin) ? window.location.origin : '';
}

/**
 * `path` için tam dönüş adresi; köken tanınmıyorsa `undefined`.
 *
 * @param path Kök göreli yol — `/giris` gibi, başında eğik çizgiyle.
 */
export function authRedirect(path: string): string | undefined {
  const base = appUrl();
  return base ? `${base}${path}` : undefined;
}
