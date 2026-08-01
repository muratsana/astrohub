/**
 * AZURACAST ADAPTÖRÜ — yayın durumu ve sağlık yoklaması.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN VEKİL
 *
 * §10.1 "secret'ların yalnızca server-side saklanması" diyor. AzuraCast
 * API anahtarı `AZURACAST_API_KEY` olarak burada duruyor; `VITE_` önekli
 * bir değişkene koysaydık derlenmiş pakete düz metin girer ve siteyi
 * açan herkes okurdu — o anahtar istasyonu yönetme yetkisi taşıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İKİ İŞ, TEK FONKSİYON
 *
 *   GET  /radyo-durum            → tarayıcı: şu an ne çalıyor, canlı mı
 *   POST /radyo-durum?yokla=1    → cron: yoklama yapıp veritabanına yaz
 *
 * Ayrı fonksiyonlar olsaydı AzuraCast yanıtını çözen kod iki yerde
 * dururdu ve biri düzeltilip diğeri unutulurdu. Aynı çözümleyici,
 * iki kapı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DİNLEYİCİ LİSTESİ HİÇ İSTENMİYOR
 *
 * AzuraCast `/listeners` uç noktası IP, konum ve user-agent döndürür.
 * Bu fonksiyon o uç noktaya HİÇ gitmiyor. §10.2 "dinleyici sayısı
 * gösterimi, gizlilik ve doğruluk kontrolüyle" diyor: gösterilecek şey
 * sayı, ve sayıyı almak için listeyi çekmek gerekmiyor. Çekmediğimiz
 * veri sızdıramayacağımız veridir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SUNUCU YOKSA "ÇEVRİMDIŞI", "CANLI" DEĞİL
 *
 * Yapılandırma eksikse, sunucuya ulaşılamıyorsa ya da yanıt anlaşılmazsa
 * cevap her zaman `canli: false`. §10.2'nin son maddesi sahte "canlı"
 * ibaresini yasaklıyor ve bu, hata yolunun da uyması gereken bir kural:
 * "bilmiyorum" ile "canlı" arasında varsayılan asla "canlı" olamaz.
 */

import { cevrimdisi, cozumle, type Durum } from './durum.ts';

const ISTEK_ZAMAN_ASIMI_MS = 5000;

function corsFor(origin: string | null): Record<string, string> {
  const izinli = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
  if (origin && izinli.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Headers'] = 'authorization, content-type';
  }
  return headers;
}

async function yokla(): Promise<Durum> {
  const taban = Deno.env.get('AZURACAST_BASE_URL');
  const istasyon = Deno.env.get('AZURACAST_STATION_ID');
  const anahtar = Deno.env.get('AZURACAST_API_KEY');

  /* YAPILANDIRMA EKSİKSE HATA FIRLATMIYORUZ. Dış radyo sunucusu henüz
     kurulmadı (§10.1 IMPLEMENTED_BLOCKED_EXTERNAL). O hâlde doğru cevap
     "çevrimdışı" — arayüz bunu zaten doğru gösteriyor ve site radyo
     olmadan da çalışıyor. */
  if (!taban || !istasyon) {
    return cevrimdisi('Radyo sunucusu yapılandırılmamış');
  }

  const baslangic = Date.now();
  const iptal = new AbortController();
  const zamanlayici = setTimeout(() => iptal.abort(), ISTEK_ZAMAN_ASIMI_MS);

  try {
    /* `nowplaying` uç noktası anahtar İSTEMİYOR — herkese açık. Anahtar
       varsa yine gönderiliyor: özel istasyonlarda gerekiyor. Dinleyici
       listesi veren `/listeners` uç noktasına kasıtlı olarak
       gidilmiyor. */
    const basliklar: Record<string, string> = { Accept: 'application/json' };
    if (anahtar) basliklar['X-API-Key'] = anahtar;

    const yanit = await fetch(
      `${taban.replace(/\/$/, '')}/api/nowplaying/${encodeURIComponent(istasyon)}`,
      { headers: basliklar, signal: iptal.signal }
    );

    if (!yanit.ok) {
      return cevrimdisi(`Yayın sunucusu ${yanit.status} döndü`);
    }

    return cozumle(await yanit.json(), Date.now() - baslangic);
  } catch (e) {
    /* Zaman aşımı da bir cevap: yayın erişilemiyorsa dinleyici için
       çevrimdışıdır, sebebi ne olursa olsun. */
    const neden = e instanceof Error && e.name === 'AbortError'
      ? `Yanıt ${ISTEK_ZAMAN_ASIMI_MS} ms içinde gelmedi`
      : e instanceof Error
        ? e.message
        : 'Bilinmeyen hata';
    return cevrimdisi(neden);
  } finally {
    clearTimeout(zamanlayici);
  }
}

/** Yoklamayı `radio_stream_health` tablosuna yazar (cron yolu). */
async function kaydet(durum: Durum): Promise<{ yazildi: boolean; not?: string }> {
  const url = Deno.env.get('SUPABASE_URL');
  const servis = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !servis) return { yazildi: false, not: 'Supabase yapılandırması eksik' };

  /* Hangi istasyona yazılacağı veritabanından okunuyor, ortamdan değil:
     `is_default` tek satır garantisi 0051'deki tekil indekste. */
  const istasyonYanit = await fetch(
    `${url}/rest/v1/radio_stations?select=id&is_default=is.true&limit=1`,
    { headers: { apikey: servis, Authorization: `Bearer ${servis}` } }
  );
  const istasyonlar = (await istasyonYanit.json()) as { id: string }[];
  const istasyonId = istasyonlar?.[0]?.id;
  if (!istasyonId) return { yazildi: false, not: 'Varsayılan istasyon tanımlı değil' };

  const yazma = await fetch(`${url}/rest/v1/radio_stream_health`, {
    method: 'POST',
    headers: {
      apikey: servis,
      Authorization: `Bearer ${servis}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      station_id: istasyonId,
      is_live: durum.canli,
      latency_ms: durum.gecikmeMs,
      listeners: durum.dinleyici,
      now_playing: durum.calan,
      error: durum.hata,
    }),
  });

  return { yazildi: yazma.ok, not: yazma.ok ? undefined : await yazma.text() };
}

Deno.serve(async (istek) => {
  const origin = istek.headers.get('origin');
  const cors = corsFor(origin);

  if (istek.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const adres = new URL(istek.url);
  const yoklamaModu = istek.method === 'POST' && adres.searchParams.has('yokla');

  /* CRON KAPISI. Yoklama yolu veritabanına yazıyor; herkese açık
     bırakmak, isteyen herkesin sağlık tablosunu şişirmesi demekti.
     Paylaşılan sır `CRON_SECRET` ve sabit süreli karşılaştırma
     gerekmiyor: sır tahmin edilebilir değil ve yanıt zamanı istek
     ağından çok daha gürültülü. */
  if (yoklamaModu) {
    const beklenen = Deno.env.get('CRON_SECRET');
    const gelen = istek.headers.get('x-cron-secret');
    if (!beklenen || gelen !== beklenen) {
      return new Response(JSON.stringify({ hata: 'Yetkisiz' }), {
        status: 401,
        headers: cors,
      });
    }
  }

  const durum = await yokla();

  if (yoklamaModu) {
    const sonuc = await kaydet(durum);
    return new Response(JSON.stringify({ ...durum, ...sonuc }), {
      status: 200,
      headers: cors,
    });
  }

  return new Response(JSON.stringify(durum), {
    status: 200,
    headers: {
      ...cors,
      /* Kısa önbellek: yayın durumu saniyede değişmiyor ama dakikalarca
         eski de olmamalı. On saniye, aynı anda sayfayı açan yüz kişiyi
         tek isteğe indiriyor. */
      'Cache-Control': 'public, max-age=10',
    },
  });
});
