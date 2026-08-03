/**
 * METEOBLUE VEKİLİ — API anahtarını sunucuda tutar.
 *
 * NEDEN VEKİL, NEDEN DOĞRUDAN TARAYICIDAN DEĞİL
 * Vite'ta `VITE_` önekli her değişken derlenmiş pakete düz metin olarak
 * girer. "Ortam değişkeni" olması onu gizli yapmaz; siteyi açan herkes
 * geliştirici araçlarından anahtarı okuyabilir. meteoblue anahtarı
 * kredili: başkası okuyup kullanırsa fatura hesap sahibine çıkar.
 *
 * Bu yüzden anahtar yalnızca burada, Supabase gizli değişkeni olarak
 * duruyor (`METEOBLUE_API_KEY`). Tarayıcı bu fonksiyona konum
 * gönderiyor, fonksiyon meteoblue'ya kendi anahtarıyla soruyor.
 *
 * ANAHTAR YOKSA 503 DÖNÜYOR, HATA FIRLATMIYOR. İstemci bu durumda
 * sessizce Open-Meteo'ya düşüyor: hava verisi olmadan da site çalışıyor
 * ve yapılandırılmamış bir gizli değişken kullanıcıya bozuk sayfa olarak
 * yansımamalı.
 *
 * KREDİ KORUMASI. Anahtarı sunucuda tutmak kotayı korumuyordu: vekil
 * herkese açıktı (`CORS: *`) ve koordinat başına sınırsız istek kabul
 * ediyordu. Farklı koordinatlar üreten biri ücretli krediyi boşaltabilir,
 * fatura hesap sahibine çıkardı (denetim SEC-03).
 *
 * Koruma artık dört katman — kuralların gerekçesi `policy.ts` içinde:
 * origin denetimi, Türkiye sınırı, 5 km ızgara ve IP başına oran limiti.
 * Hiçbiri tek başına yeterli değil; kesin tavan sağlayıcı tarafındaki
 * harcama limitidir ve o koda yazılamaz.
 */

import {
  clientKey,
  hitRateLimit,
  isAllowedOrigin,
  snapCoordinate,
  RATE_LIMIT,
} from './policy.ts';

const HOST = 'https://my.meteoblue.com/packages';

/* Yalnızca ihtiyacımız olan iki paket. `basic-1h` yer koşulları,
   `clouds-1h` astronomi için asıl önemli olanı: bulut katmanlarının
   ayrımı. Tek bir "%40 bulut" sayısı, alçak sisle yüksek sirrusu aynı
   gösterir; ilki gözlemi bitirir, ikincisi geniş alan çekimini yalnızca
   zorlaştırır. */
const PACKAGES = ['basic-1h', 'clouds-1h'] as const;

/**
 * CORS başlıkları isteğin origin'ine göre kurulur.
 *
 * `*` yerine tam origin yansıtılıyor: yıldız, herhangi bir sitenin bizim
 * kotamızla hava servisi çalıştırmasına izin veriyordu. İzinsiz origin'e
 * hiç CORS başlığı basılmıyor — tarayıcı yanıtı zaten okuyamıyor.
 */
function corsFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/** Yedek sayaç — veritabanına ulaşılamadığında son çare (bkz. policy.ts). */
const rateStore = new Map<string, number[]>();

/**
 * Kalıcı oran limiti: sayaç veritabanında, artış atomik.
 *
 * Bellek içi sayaç üretimde ölçüldü ve HİÇ tetiklenmedi (her istek ayrı
 * isolate). Karar artık `consume_rate_limit()` RPC'sinde; public endpoint
 * yalnızca service_role uyumluluk sarmalayıcısı, ayrıcalıklı sayaç gövdesi
 * `app` şemasında.
 *
 * RPC'ye ULAŞILAMAZSA KAPALI TARAFA DÜŞÜLÜYOR (`false`). Açık tarafa
 * düşmek, veritabanı sarsıldığında kota korumasını tamamen kaldırırdı —
 * yani korumanın en çok gerektiği anda. Kapalı taraf kullanıcı için
 * felaket değil: istemci sessizce Open-Meteo'ya geçiyor.
 */
async function allowedByDatabase(bucket: string): Promise<boolean | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null; // yapılandırma yok → yedeğe düş

  try {
    const response = await fetch(`${url}/rest/v1/rpc/consume_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        p_bucket: bucket,
        p_window_seconds: Math.round(RATE_LIMIT.windowMs / 1000),
        p_max: RATE_LIMIT.max,
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    return (await response.json()) === true;
  } catch (cause) {
    console.error('oran limiti sorgulanamadı:', cause);
    return false;
  }
}

function json(
  body: unknown,
  status = 200,
  extra: Record<string, string> = {},
  origin: string | null = null
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsFor(origin),
      ...extra,
    },
  });
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsFor(origin) });
  }

  if (!isAllowedOrigin(origin)) {
    return json({ error: 'origin izinli değil' }, 403, { 'Cache-Control': 'no-store' });
  }

  /*
   * Oran limiti anahtar kontrolünden ÖNCE: yapılandırma eksikse bile
   * istek seli sayılmalı, yoksa 503 dönen bir uç nokta bedava yük
   * üretecek bir hedefe dönüşür.
   */
  const bucket = `meteoblue:${clientKey(request.headers)}`;
  const dbDecision = await allowedByDatabase(bucket);
  const allowed =
    dbDecision ??
    hitRateLimit(rateStore, bucket, Date.now()).allowed; // yapılandırma yoksa yedek

  if (!allowed) {
    return json(
      { error: 'çok fazla istek' },
      429,
      {
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.round(RATE_LIMIT.windowMs / 1000)),
      },
      origin
    );
  }

  const url = new URL(request.url);
  const point = snapCoordinate(
    url.searchParams.get('lat'),
    url.searchParams.get('lon')
  );
  if (!point) {
    /* Sınır dışı koordinat ile eksik koordinat aynı yanıtı alıyor:
       hangi bölgenin kapsandığını dışarıya haritalamanın faydası yok. */
    return json(
      { error: 'lat ve lon gerekli (Türkiye kapsama alanı)' },
      400,
      {},
      origin
    );
  }
  const { lat, lon } = point;

  /* Yapılandırma kontrolü girdi doğrulamasından SONRA: uç noktanın
     sözleşmesi (hangi istek geçerli) gizli değişkenin durumuna bağlı
     olmamalı. Anahtar yokken bozuk bir istek de 503 alıyordu ve teşhis
     yanıltıcı oluyordu. */
  const apikey = Deno.env.get('METEOBLUE_API_KEY');
  if (!apikey) {
    return json(
      { error: 'METEOBLUE_API_KEY tanımlı değil' },
      503,
      { 'Cache-Control': 'no-store' },
      origin
    );
  }

  try {
    const responses = await Promise.all(
      PACKAGES.map((pkg) => {
        const target = new URL(`${HOST}/${pkg}`);
        target.searchParams.set('apikey', apikey);
        target.searchParams.set('lat', String(lat));
        target.searchParams.set('lon', String(lon));
        target.searchParams.set('format', 'json');
        /* UTC iste: istemci saat dilimini kendisi biliyor ve yerel
           damgalı zaman dizisi tarayıcı saat dilimine göre kayabiliyor. */
        target.searchParams.set('tz', 'UTC');
        target.searchParams.set('forecast_days', '2');
        return fetch(target, { headers: { Accept: 'application/json' } });
      })
    );

    const failed = responses.find((r) => !r.ok);
    if (failed) {
      /* Anahtar hatası ile ağ hatası ayrı: 401/403 yapılandırma sorunu,
         istemcinin tekrar denemesi işe yaramaz. */
      return json(
        { error: `meteoblue ${failed.status}` },
        failed.status === 401 || failed.status === 403 ? 503 : 502,
        { 'Cache-Control': 'no-store' },
        origin
      );
    }

    const [basic, clouds] = await Promise.all(responses.map((r) => r.json()));

    return json(
      { basic, clouds },
      200,
      { 'Cache-Control': 'public, max-age=900, s-maxage=900' },
      origin
    );
  } catch (cause) {
    /* İç hata metni İSTEMCİYE sızmıyor (sağlayıcı adresi, anahtar biçimi,
       yığın izi kullanıcının işine yaramaz, saldırgana yarar) ama sunucu
       günlüğüne yazılıyor — yoksa arıza teşhis edilemez. */
    console.error('meteoblue vekili:', cause);
    return json(
      { error: 'hava servisi yanıt vermedi' },
      502,
      { 'Cache-Control': 'no-store' },
      origin
    );
  }
});
