/**
 * YOUTUBE ENTEGRASYONU — sunucu tarafı (§11.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * OAUTH AKIŞI TARAYICIDA HİÇ GEÇMİYOR
 *
 * "Server-side OAuth" cümlesinin somut karşılığı şu: istemci gizli
 * anahtarı (`YOUTUBE_CLIENT_SECRET`) ve yenileme jetonu hiçbir zaman
 * tarayıcıya gönderilmiyor. Kod → jeton takası burada yapılıyor, jeton
 * veritabanına yazılıyor ve tarayıcı yalnızca "bağlandı mı" cevabını
 * görüyor.
 *
 * Tarayıcı tarafı bir OAuth kütüphanesi kullansaydık gizli anahtar
 * pakete girerdi ve o anahtarla herkes kendi adına jeton alabilirdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖRT KAPI
 *
 *   GET  ?eylem=baslat   → yetkilendirme adresine yönlendir (yönetici)
 *   GET  ?eylem=geridon  → Google'ın döndüğü yer; kodu jetona çevirir
 *   POST ?eylem=ayir     → bağlantıyı kes, jetonları sil (yönetici)
 *   POST ?eylem=esitle   → video senkronizasyonu (yönetici ya da cron)
 *
 * ══════════════════════════════════════════════════════════════════════
 * KANAL BAĞLI DEĞİLKEN SAHTE İÇERİK ÜRETİLMİYOR
 *
 * §11.2'nin son maddesi. Bu fonksiyon bağlantı yokken boş liste
 * dönüyor ve `bagli: false` diyor — örnek video, yer tutucu kayıt ya da
 * "yakında" satırı yazmıyor. Radyodaki "sahte canlı" yasağının TV
 * karşılığı: gösterilecek bir şey yoksa gösterilecek bir şey yoktur.
 */

import {
  authUrl,
  backoffMs,
  parseTokenResponse,
  QUOTA_COST,
  quotaAllows,
  shouldRetry,
  toSyncedVideo,
  uploadsPlaylistId,
  type QuotaOperation,
  type SyncedVideo,
} from './youtube.ts';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** Supabase REST — service role. RLS'i atlayan tek yol burası. */
async function db(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase yapılandırması eksik');

  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

interface Connection {
  channel_id: string | null;
  refresh_token: string | null;
  access_token: string | null;
  token_expires_at: string | null;
  oauth_state: string | null;
  oauth_state_at: string | null;
}

async function readConnection(): Promise<Connection | null> {
  const res = await db('youtube_connection?select=*&limit=1');
  if (!res.ok) return null;
  const rows = (await res.json()) as Connection[];
  return rows?.[0] ?? null;
}

async function writeConnection(patch: Record<string, unknown>): Promise<void> {
  await db('youtube_connection?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: true, ...patch }),
  });
}

/**
 * GEÇERLİ ERİŞİM JETONU — gerekiyorsa yenileyerek.
 *
 * YENİLEME JETONU ÜZERİNE `null` YAZILMIYOR. Google yenileme
 * yanıtında `refresh_token` göndermiyor; `parseTokenResponse` bunu
 * `null` olarak veriyor ve buradaki `??` mevcut jetonu koruyor. Aksi
 * hâlde bağlantı ilk yenilemede kendini öldürürdü.
 */
async function accessToken(conn: Connection): Promise<string | null> {
  if (!conn.refresh_token) return null;

  const gecerli =
    conn.access_token &&
    conn.token_expires_at &&
    new Date(conn.token_expires_at) > new Date();
  if (gecerli) return conn.access_token;

  const clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  if (!clientId || !clientSecret) return null;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    await writeConnection({ last_error: `Jeton yenilenemedi (${res.status})` });
    return null;
  }

  const token = parseTokenResponse(await res.json());
  if (!token) return null;

  await writeConnection({
    access_token: token.accessToken,
    token_expires_at: token.expiresAt,
    /* Mevcut yenileme jetonu KORUNUYOR — gerekçe yukarıda. */
    refresh_token: token.refreshToken ?? conn.refresh_token,
    last_error: null,
  });

  return token.accessToken;
}

/** Bugünün kota harcaması (Pasifik günü — kota orada sıfırlanıyor). */
async function quotaUsed(): Promise<number> {
  const gun = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  const res = await db(`youtube_quota_log?select=units_used&quota_date=eq.${gun}`);
  if (!res.ok) return 0;
  const rows = (await res.json()) as { units_used: number }[];
  return rows?.[0]?.units_used ?? 0;
}

async function spendQuota(operation: QuotaOperation): Promise<void> {
  const gun = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  const mevcut = await quotaUsed();
  await db('youtube_quota_log?on_conflict=quota_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      quota_date: gun,
      units_used: mevcut + QUOTA_COST[operation],
      updated_at: new Date().toISOString(),
    }),
  });
}

/**
 * YouTube çağrısı — yeniden denemeli.
 *
 * Kota hatası (403) DENENMİYOR: kota gün sonuna kadar dolu ve tekrar
 * denemek yalnızca daha çok hata üretir. Ayrım `shouldRetry`de ve
 * testte ölçülü.
 */
async function callApi(
  path: string,
  token: string,
  operation: QuotaOperation
): Promise<unknown | null> {
  for (let deneme = 0; deneme < 3; deneme++) {
    const res = await fetch(`${API}/${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await spendQuota(operation);

    if (res.ok) return res.json();
    if (!shouldRetry(res.status)) {
      await writeConnection({
        last_error: `YouTube ${res.status}: ${path.split('?')[0]}`,
      });
      return null;
    }
    await new Promise((r) => setTimeout(r, backoffMs(deneme)));
  }
  return null;
}

/**
 * Kanalın son videolarını çeker ve yazar.
 *
 * `search` KULLANILMIYOR: yüz kota birimi yerine bir birim. Kanalın
 * yükleme playlist'i (`UUxxx`) aynı listeyi veriyor ve kimliği kanal
 * kimliğinden türetilebiliyor.
 *
 * ELLE EKLENEN KAYIT EZİLMİYOR. Yazma yalnızca `source = 'youtube'`
 * satırlarını güncelliyor; editörün elle düzelttiği bir başlık
 * senkronizasyonda geri gelmemeli.
 */
async function syncVideos(token: string, channelId: string): Promise<number> {
  const playlist = uploadsPlaylistId(channelId);
  if (!playlist) return 0;

  const liste = (await callApi(
    `playlistItems?part=contentDetails&maxResults=50&playlistId=${playlist}`,
    token,
    'playlistItems.list'
  )) as { items?: { contentDetails?: { videoId?: string } }[] } | null;

  const idler = (liste?.items ?? [])
    .map((i) => i.contentDetails?.videoId)
    .filter((v): v is string => typeof v === 'string');

  if (idler.length === 0) return 0;

  const detay = (await callApi(
    `videos?part=snippet,contentDetails&id=${idler.join(',')}`,
    token,
    'videos.list'
  )) as { items?: unknown[] } | null;

  const videolar = (detay?.items ?? [])
    .map(toSyncedVideo)
    .filter((v): v is SyncedVideo => v !== null);

  if (videolar.length === 0) return 0;

  /* ELLE EKLENEN KAYITLAR ÇIKARILIYOR — ve bu bir sorguya mal oluyor.
     `on_conflict=youtube_id` upsert'i ayrım yapmadan her satırı ezerdi;
     editörün elle düzelttiği bir başlık her senkronizasyonda geri
     gelirdi ve düzeltme "tutmuyor" gibi görünürdü. Hangi satırın elle
     eklendiğini bilmenin başka yolu yok, çünkü bilgi veritabanında. */
  const mevcut = await db(
    `tv_videos?select=youtube_id&source=eq.manual&youtube_id=in.(${videolar
      .map((v) => v.youtubeId)
      .join(',')})`
  );
  const elle = new Set(
    mevcut.ok
      ? ((await mevcut.json()) as { youtube_id: string }[]).map((r) => r.youtube_id)
      : []
  );

  const yazilacak = videolar.filter((v) => !elle.has(v.youtubeId));
  if (yazilacak.length === 0) {
    await writeConnection({ last_sync_at: new Date().toISOString(), last_error: null });
    return 0;
  }

  await db('tv_videos?on_conflict=youtube_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(
      yazilacak.map((v) => ({
        youtube_id: v.youtubeId,
        title: v.title,
        description: v.description,
        thumbnail_url: v.thumbnailUrl,
        duration_sec: v.durationSec,
        published_at: v.publishedAt,
        source: 'youtube',
      }))
    ),
  });

  await writeConnection({ last_sync_at: new Date().toISOString(), last_error: null });
  return yazilacak.length;
}

/**
 * YÖNETİCİ KAPISI. Çağıranın jetonu Supabase'e doğrulatılıyor ve rolü
 * `user_roles`tan okunuyor — istemcinin gönderdiği bir "ben adminim"
 * alanına güvenilmiyor.
 */
async function isAdmin(istek: Request): Promise<boolean> {
  const auth = istek.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return false;

  const kullanici = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: auth },
  });
  if (!kullanici.ok) return false;
  const { id } = (await kullanici.json()) as { id?: string };
  if (!id) return false;

  const rol = await db(`user_roles?select=role&user_id=eq.${id}&role=eq.admin`);
  if (!rol.ok) return false;
  return ((await rol.json()) as unknown[]).length > 0;
}

Deno.serve(async (istek) => {
  const adres = new URL(istek.url);
  const eylem = adres.searchParams.get('eylem') ?? 'durum';

  const clientId = Deno.env.get('YOUTUBE_CLIENT_ID');
  const clientSecret = Deno.env.get('YOUTUBE_CLIENT_SECRET');
  const redirectUri = Deno.env.get('YOUTUBE_REDIRECT_URI');

  /* YAPILANDIRMA EKSİKSE HATA DEĞİL, "BAĞLI DEĞİL". Gerçek OAuth
     kimliği henüz yok (§11.2 IMPLEMENTED_BLOCKED_EXTERNAL) ve doğru
     cevap bu — site TV olmadan da çalışıyor. */
  if (!clientId || !clientSecret || !redirectUri) {
    return json({
      bagli: false,
      neden: 'YouTube uygulaması yapılandırılmamış',
    });
  }

  if (eylem === 'baslat') {
    if (!(await isAdmin(istek))) return json({ hata: 'Yetkisiz' }, 401);

    /* `state` CSRF koruması: dönüşte doğrulanıyor. Rastgele ve
       tahmin edilemez olmalı. */
    const state = crypto.randomUUID();
    await writeConnection({
      last_error: null,
      oauth_state: state,
      oauth_state_at: new Date().toISOString(),
    });
    return json({ adres: authUrl({ clientId, redirectUri, state }) });
  }

  if (eylem === 'geridon') {
    const code = adres.searchParams.get('code');
    const state = adres.searchParams.get('state');
    if (!code || !state) return json({ hata: 'Eksik parametre' }, 400);

    const conn = await readConnection();
    /* Beklenen `state` ile gelen eşleşmiyorsa akış bizim
       başlatmadığımız bir akıştır. */
    if (!conn?.oauth_state || conn.oauth_state !== state) {
      return json({ hata: 'Doğrulanamayan yetkilendirme' }, 400);
    }

    /* ON DAKİKALIK PENCERE. Yetkilendirme akışı saniyeler sürüyor;
       bir gün önce başlatılıp yarıda bırakılmış bir state'in hâlâ
       geçerli olması, o state'i ele geçiren birine açık kapı
       bırakmak olurdu. */
    const yas = conn.oauth_state_at
      ? Date.now() - new Date(conn.oauth_state_at).getTime()
      : Infinity;
    if (yas > 10 * 60 * 1000) {
      await writeConnection({ oauth_state: null, oauth_state_at: null });
      return json({ hata: 'Yetkilendirme süresi doldu' }, 400);
    }

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      await writeConnection({
        oauth_state: null,
        oauth_state_at: null,
        last_error: 'Jeton alınamadı',
      });
      return json({ hata: 'Jeton alınamadı' }, 502);
    }

    const token = parseTokenResponse(await res.json());
    if (!token?.refreshToken) {
      /* Yenileme jetonu gelmediyse bağlantı bir saat sonra ölürdü.
         Yarım bir bağlantı kaydetmek, "bağlı" görünüp çalışmayan bir
         entegrasyon bırakmak olurdu. */
      await writeConnection({
        oauth_state: null,
        oauth_state_at: null,
        last_error: 'Yenileme jetonu alınamadı — izin ekranı atlanmış olabilir',
      });
      return json({ hata: 'Yenileme jetonu alınamadı' }, 502);
    }

    const kanal = (await callApi(
      'channels?part=snippet&mine=true',
      token.accessToken,
      'channels.list'
    )) as { items?: { id?: string; snippet?: { title?: string } }[] } | null;

    const ilk = kanal?.items?.[0];
    await writeConnection({
      channel_id: ilk?.id ?? null,
      channel_title: ilk?.snippet?.title ?? null,
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      token_expires_at: token.expiresAt,
      connected_at: new Date().toISOString(),
      /* State tüketildi — tek kullanımlık olmalı. */
      oauth_state: null,
      oauth_state_at: null,
      last_error: null,
    });

    return json({ bagli: true, kanal: ilk?.snippet?.title ?? null });
  }

  if (eylem === 'ayir') {
    if (!(await isAdmin(istek))) return json({ hata: 'Yetkisiz' }, 401);
    /* Jetonlar SİLİNİYOR, işaretlenmiyor. "Bağlantıyı kes" dedikten
       sonra veritabanında duran bir yenileme jetonu, kesilmemiş bir
       bağlantıdır. */
    await writeConnection({
      channel_id: null,
      channel_title: null,
      refresh_token: null,
      access_token: null,
      token_expires_at: null,
      connected_at: null,
      oauth_state: null,
      oauth_state_at: null,
      last_error: null,
    });
    return json({ bagli: false });
  }

  if (eylem === 'esitle') {
    const cronSir = Deno.env.get('CRON_SECRET');
    const cron = cronSir && istek.headers.get('x-cron-secret') === cronSir;
    if (!cron && !(await isAdmin(istek))) return json({ hata: 'Yetkisiz' }, 401);

    const conn = await readConnection();
    if (!conn?.channel_id || !conn.refresh_token) {
      return json({ bagli: false, esitlenen: 0 });
    }

    const harcanan = await quotaUsed();
    if (!quotaAllows(harcanan, 'playlistItems.list')) {
      return json({ bagli: true, esitlenen: 0, hata: 'Günlük kota doldu' });
    }

    const token = await accessToken(conn);
    if (!token) return json({ bagli: false, esitlenen: 0, hata: 'Jeton alınamadı' });

    const sayi = await syncVideos(token, conn.channel_id);
    return json({ bagli: true, esitlenen: sayi });
  }

  /* Varsayılan: durum. Jeton hiçbir koşulda dönmüyor. */
  const conn = await readConnection();
  return json({
    bagli: Boolean(conn?.channel_id && conn?.refresh_token),
    kanal: conn?.channel_id ?? null,
  });
});
