/**
 * YOUTUBE ADAPTÖRÜ — saf mantık (§11.2).
 *
 * `index.ts`ten ayrı çünkü buradaki kararların hepsi ölçülebilir:
 * süre biçimi nasıl çözülür, hangi çağrı kaç kota birimi yer, bir
 * yanıttaki hangi alanlar güvenilir. Bunları bir `Deno.serve` çağrısının
 * içinden sınamak, ağ ve OAuth taklidi kurmak demekti.
 */

/**
 * KOTA MALİYETLERİ — YouTube Data API v3.
 *
 * Günlük kota 10.000 birim. Sayılar YouTube'un ilan ettiği maliyetler;
 * SABİT YAZILDILAR ÇÜNKÜ API onları yanıtta söylemiyor. Tahmin etmek
 * yerine bilinen değerleri kullanıp harcamayı takip etmek, kotanın
 * günün ortasında sessizce bitmesinden iyi.
 *
 * `search` diğerlerinin yüz katı: bir arama çağrısı, yüz video
 * listeleme çağrısına bedel. Senkronizasyon bu yüzden `search`
 * KULLANMIYOR — kanalın yükleme playlist'i üzerinden yürüyor.
 */
export const QUOTA_COST = {
  'playlistItems.list': 1,
  'videos.list': 1,
  'channels.list': 1,
  'playlists.list': 1,
  'liveBroadcasts.list': 1,
  'search.list': 100,
} as const;

export type QuotaOperation = keyof typeof QUOTA_COST;

/** Günlük kota tavanı — YouTube'un varsayılan tahsisi. */
export const DAILY_QUOTA = 10_000;

/**
 * Bir işlem bütçeye sığıyor mu.
 *
 * PAY BIRAKIYOR. Tam tavana kadar harcamak, aynı gün içinde yapılması
 * gereken tek seferlik bir çağrıyı (kanal doğrulama, canlı yayın
 * kontrolü) imkânsız kılardı. %10'luk pay o çağrılar için ayrılıyor.
 */
export function quotaAllows(
  used: number,
  operation: QuotaOperation,
  reserveRatio = 0.1
): boolean {
  const limit = DAILY_QUOTA * (1 - reserveRatio);
  return used + QUOTA_COST[operation] <= limit;
}

/**
 * ISO 8601 süre → saniye. YouTube süreyi `PT1H2M3S` biçiminde veriyor.
 *
 * ÜÇ TUZAK VAR VE ÜÇÜ DE TEST EDİLDİ:
 *   · Eksik bileşen — `PT4M13S` (saat yok), `PT45S` (dakika da yok).
 *   · Canlı yayın — süre `P0D` geliyor, yani sıfır; "bilinmiyor" olarak
 *     dönmeli, 0 olarak değil. Sıfır süre "video boş" demek olurdu.
 *   · Gün bileşeni — uzun kayıtlarda `P1DT2H` çıkabiliyor.
 */
export function parseDuration(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null;

  const match =
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(
      value.trim()
    );
  if (!match) return null;

  const [, gun, saat, dakika, saniye] = match;
  const toplam =
    Number(gun ?? 0) * 86_400 +
    Number(saat ?? 0) * 3_600 +
    Number(dakika ?? 0) * 60 +
    Math.floor(Number(saniye ?? 0));

  /* Sıfır süre gerçek bir süre değil: canlı yayında `P0D` geliyor.
     0 yazmak "video boş" demek olurdu, oysa doğru cevap "bilmiyoruz". */
  return toplam > 0 ? toplam : null;
}

/** YouTube video kimliği — `<iframe src>` güvenliğinin istemci yarısı. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export interface SyncedVideo {
  youtubeId: string;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  publishedAt: string | null;
}

/**
 * `videos.list` yanıtındaki bir öğeyi satıra çevirir.
 *
 * KİMLİĞİ DOĞRULANMAYAN ÖĞE ATLANIYOR, HATA VERİLMİYOR. Bir listede tek
 * bozuk kayıt yüzünden bütün senkronizasyonu düşürmek, doksan dokuz
 * sağlam videoyu da kaybetmek olurdu. Veritabanındaki kısıt son sözü
 * zaten söylüyor (`0055`); buradaki eleme, o kısıta hiç çarpmamak için.
 *
 * EN BÜYÜK KAPAK SEÇİLİYOR. YouTube beş boyut döndürüyor ve `default`
 * 120px — kart görselinde bulanık görünür. Sıra büyükten küçüğe
 * deneniyor; hiçbiri yoksa `null` ve arayüz kendi görselini çiziyor.
 */
export function toSyncedVideo(item: unknown): SyncedVideo | null {
  if (!item || typeof item !== 'object') return null;
  const kok = item as Record<string, unknown>;

  const id = typeof kok.id === 'string' ? kok.id : null;
  if (!id || !VIDEO_ID.test(id)) return null;

  const snippet = kok.snippet as Record<string, unknown> | undefined;
  const details = kok.contentDetails as Record<string, unknown> | undefined;
  const thumbs = snippet?.thumbnails as Record<string, unknown> | undefined;

  const baslik = typeof snippet?.title === 'string' ? snippet.title.trim() : '';
  /* Başlıksız video kaydedilmiyor: `title` sütunu `not null` ve boş bir
     başlık listede tıklanacak bir şey bırakmazdı. */
  if (!baslik) return null;

  const kapakSirasi = ['maxres', 'standard', 'high', 'medium', 'default'];
  let kapak: string | null = null;
  for (const boy of kapakSirasi) {
    const aday = thumbs?.[boy] as Record<string, unknown> | undefined;
    if (typeof aday?.url === 'string') {
      kapak = aday.url;
      break;
    }
  }

  return {
    youtubeId: id,
    title: baslik,
    description:
      typeof snippet?.description === 'string' ? snippet.description : '',
    thumbnailUrl: kapak,
    durationSec: parseDuration(details?.duration as string | undefined),
    publishedAt:
      typeof snippet?.publishedAt === 'string' ? snippet.publishedAt : null,
  };
}

/**
 * Kanal kimliğinden yükleme playlist'i.
 *
 * YouTube'un belgelenmiş kuralı: `UCxxx` kanalının yüklemeleri `UUxxx`
 * playlist'inde. `channels.list` çağırıp `relatedPlaylists.uploads`
 * okumak da olurdu — bir kota birimi ve bir ağ gidiş dönüşü daha.
 * Kural sabit olduğu için çağrıya gerek yok.
 */
export function uploadsPlaylistId(channelId: string): string | null {
  if (!/^UC[A-Za-z0-9_-]{22}$/.test(channelId)) return null;
  return `UU${channelId.slice(2)}`;
}

/**
 * OAuth yetkilendirme adresi.
 *
 * `access_type=offline` + `prompt=consent`: yenileme jetonu ancak böyle
 * geliyor. İkincisi olmadan Google, kullanıcı daha önce izin verdiyse
 * yenileme jetonunu TEKRAR GÖNDERMİYOR — ve o jeton olmadan bağlantı
 * bir saat sonra ölüyor. Bu, entegrasyonlarda en sık yapılan hata.
 *
 * `state` çağıran tarafından veriliyor ve dönüşte doğrulanıyor: CSRF
 * koruması bu parametrede.
 */
export function authUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: input.state,
    /* EN DAR KAPSAM. `youtube` (yazma) değil `youtube.readonly`:
       adaptörün işi okumak. Yazma kapsamı istemek, sızan bir jetonun
       kanalı yönetebilmesi demekti. */
    scope: 'https://www.googleapis.com/auth/youtube.readonly',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}

/**
 * Jeton yanıtını çözer.
 *
 * `refresh_token` YENİLEMEDE GELMİYOR — yalnızca ilk yetkilendirmede.
 * `null` dönüyor ve çağıran mevcut jetonu KORUYOR; üzerine `null`
 * yazsaydık bağlantı ilk yenilemede kendini öldürürdü.
 */
export function parseTokenResponse(
  data: unknown,
  now: number = Date.now()
): TokenResult | null {
  if (!data || typeof data !== 'object') return null;
  const kok = data as Record<string, unknown>;

  if (typeof kok.access_token !== 'string' || !kok.access_token) return null;

  const saniye = typeof kok.expires_in === 'number' ? kok.expires_in : 3600;
  /* Altmış saniye pay: jeton tam sınırda yenilenirse arada kalan
     istek 401 alır. */
  const expiresAt = new Date(now + (saniye - 60) * 1000).toISOString();

  return {
    accessToken: kok.access_token,
    refreshToken:
      typeof kok.refresh_token === 'string' && kok.refresh_token
        ? kok.refresh_token
        : null,
    expiresAt,
  };
}

/**
 * YENİDEN DENEME — hangi hata denenmeye değer.
 *
 * 403 kota hatası denenmemeli: kota gün sonuna kadar dolu ve tekrar
 * denemek yalnızca daha çok hata üretir. 5xx ve 429 denenmeli:
 * ikisi de geçici.
 *
 * Ayrım önemli çünkü ikisi de "başarısız" görünüyor ama biri bekleyerek
 * çözülüyor, diğeri ertesi günü bekliyor.
 */
export function shouldRetry(status: number): boolean {
  if (status === 429) return true;
  if (status >= 500 && status < 600) return true;
  return false;
}

/** Üstel geri çekilme — 1s, 2s, 4s. */
export function backoffMs(attempt: number): number {
  return Math.min(1000 * 2 ** attempt, 8000);
}
