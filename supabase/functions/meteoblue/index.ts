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
 * KREDİ KORUMASI — iki katman:
 *   1. Koordinat iki ondalığa yuvarlanıyor (≈1 km). Aynı şehirdeki iki
 *      kullanıcı aynı isteği üretiyor, önbellek paylaşılıyor.
 *   2. Yanıt 15 dakika `Cache-Control` taşıyor; CDN ve tarayıcı aynı
 *      isteği tekrar sormuyor. Hava bundan hızlı değişmiyor.
 */

const HOST = 'https://my.meteoblue.com/packages';

/* Yalnızca ihtiyacımız olan iki paket. `basic-1h` yer koşulları,
   `clouds-1h` astronomi için asıl önemli olanı: bulut katmanlarının
   ayrımı. Tek bir "%40 bulut" sayısı, alçak sisle yüksek sirrusu aynı
   gösterir; ilki gözlemi bitirir, ikincisi geniş alan çekimini yalnızca
   zorlaştırır. */
const PACKAGES = ['basic-1h', 'clouds-1h'] as const;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS, ...extra },
  });
}

function coord(value: string | null, limit: number): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || Math.abs(n) > limit) return null;
  /* İki ondalık ≈ 1 km. Daha hassası ne tahmini değiştiriyor ne de
     önbelleği paylaştırıyor — yalnızca konumu gereksiz kesinlikte
     üçüncü tarafa bildiriyor. */
  return Math.round(n * 100) / 100;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const apikey = Deno.env.get('METEOBLUE_API_KEY');
  if (!apikey) {
    return json(
      { error: 'METEOBLUE_API_KEY tanımlı değil' },
      503,
      { 'Cache-Control': 'no-store' }
    );
  }

  const url = new URL(request.url);
  const lat = coord(url.searchParams.get('lat'), 90);
  const lon = coord(url.searchParams.get('lon'), 180);
  if (lat === null || lon === null) {
    return json({ error: 'lat ve lon gerekli' }, 400);
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
        { 'Cache-Control': 'no-store' }
      );
    }

    const [basic, clouds] = await Promise.all(responses.map((r) => r.json()));

    return json(
      { basic, clouds },
      200,
      { 'Cache-Control': 'public, max-age=900, s-maxage=900' }
    );
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'bilinmeyen hata' },
      502,
      { 'Cache-Control': 'no-store' }
    );
  }
});
