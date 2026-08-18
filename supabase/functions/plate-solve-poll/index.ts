import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * PLATE SOLVE — SONUÇ YOKLAMASI.
 *
 * `pg_cron` beş dakikada bir çağırıyor. Kuyruktaki her fotoğraf için
 * astrometry.net'e "bitti mi" diye soruyor ve biten işlerin ölçümünü
 * veritabanına yazıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN YOKLAMA, NEDEN WEBHOOK DEĞİL
 *
 * astrometry.net geri arama (callback) sunmuyor; tek yol sormak. Beş
 * dakika bilinçli bir denge: kuyruk tipik olarak 1–5 dakika sürüyor,
 * daha sık sormak dış servise gereksiz yük, daha seyrek sormak
 * kullanıcıyı bekletmek olurdu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASILI KALAN İŞ DİYE BİR ŞEY OLMAMALI
 *
 * Kuyruk bazen hiç sonuçlanmıyor (servis tarafında düşen iş, silinmiş
 * gönderim). Zaman aşımı olmasaydı o kayıtlar sonsuza kadar "kuyrukta"
 * görünür, kullanıcı beklemeye devam eder ve yoklama her turda onları
 * yeniden sorardı. Belirli bir süre sonra başarısız sayılıyorlar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARTIK YALNIZCA YOKLAMIYOR, GÖNDERİYOR DA
 *
 * Gönderim eskiden yalnızca KULLANICI tarafından tetikleniyordu:
 * yükleme akışının sonunda bir kez, bir de yönetim panelindeki toplu
 * düğmeyle. Bunun bedeli galeride görüldü — anahtar sonradan
 * tanımlandığı için o güne kadar yüklenmiş hiçbir kare hiç
 * gönderilmemişti ve hepsi "çözülmemiş" duruyordu. Düğmeye basacak
 * birini beklemek, bir daha kimse basmazsa hiç çözülmemek demekti.
 *
 * Şimdi her turda önce bekleyenlerden bir tutam gönderiliyor, sonra
 * kuyruktakiler yoklanıyor. Birikmiş galeri kendiliğinden boşalıyor.
 *
 * TUR BAŞINA AZ SAYIDA gönderiliyor: astrometry.net paylaşılan ve
 * ücretsiz bir kuyruk, tamamını bir anda içine boşaltmak hem kaba olur
 * hem de cron turunu uzatırdı.
 */

const NOVA = 'https://nova.astrometry.net/api';

/*
 * `Referer` BAŞLIĞI ZORUNLU — astrometry.net'in kendi API sayfasından:
 * programatik indirmelerde bu başlık istenmezse istek reddediliyor
 * (servis, tarayıcı dışı tarayıcıları böyle ayıklıyor). Değer de
 * belgelerinde birebir verilen adres.
 *
 * Tek yerde duruyor: iki fonksiyon da aynı başlığı kullanıyor ve
 * birinde unutulursa hata "yetkisiz" gibi görünüp saatlerce aranırdı.
 */
const NOVA_HEADERS = { Referer: 'https://nova.astrometry.net/api/login' };
const ENV_KEY = Deno.env.get('ASTROMETRY_API_KEY');
const POLL_SECRET = Deno.env.get('PLATE_SOLVE_POLL_SECRET');
/** Bu süreyi aşan kuyruk işi başarısız sayılıyor. */
const STALE_MINUTES = 90;
/** Tek turda bakılacak azami iş — cron turu uzamasın. */
const BATCH = 20;
/** Tek turda gönderilecek azami yeni iş. */
const SUBMIT_BATCH = 5;
/**
 * Bir fotoğraf en çok kaç kez gönderilir.
 *
 * Üç, geçici arızalar (imzalı adres üretilemedi, servis o an cevap
 * vermedi) için fazlasıyla yeterli. Kalıcı sebep — karede çözülecek
 * kadar yıldız yok — zaten tekrarla değişmiyor ve orada sayaç doğrudan
 * tavana çekiliyor.
 */
const MAX_ATTEMPTS = 3;
/** İmzalı adresin ömrü — kuyruk uzasa da çözücü indirebilmeli. */
const SIGNED_URL_TTL = 3600;

/*
 * Vault okuması ÖRNEK ÖMRÜ BOYUNCA önbelleklenir; `undefined` "henüz
 * sorulmadı", `null` "sorduk, yok" demek. Gerekçenin tamamı
 * `plate-solve` fonksiyonunun başında yazılı — ortam değişkeni standart
 * yol ve önceliği hep onda, Vault yalnızca Dashboard erişimi olmayan
 * bir ortamdan anahtarın yine de tanımlanabilmesi için.
 */
let vaultKey: string | null | undefined;

async function resolveApiKey(
  admin: ReturnType<typeof createClient>
): Promise<string | null> {
  if (ENV_KEY) return ENV_KEY;
  if (vaultKey !== undefined) return vaultKey;

  const { data, error } = await admin.rpc('astrometry_anahtari');
  vaultKey = !error && typeof data === 'string' && data.trim() ? data : null;
  return vaultKey;
}

/**
 * YANITI ÖNCE METİN OLARAK AL, SONRA AYRIŞTIR.
 *
 * `response.json()` doğrudan çağrıldığında servis HTML döndürdüğünde
 * ortaya çıkan hata `Unexpected token '<'` oluyor: hangi uç noktadan
 * geldiği, HTTP kodunun ne olduğu, gövdede ne yazdığı belli değil.
 * Bu tam olarak canlıda başımıza geldi ve altı fotoğraf o mesajla
 * "başarısız" damgalandı — sebebi anlamak için tahmin yürütmek
 * gerekti.
 *
 * Metni önce alıp sonra ayrıştırmanın bedeli yok, kazancı ise hatanın
 * kendini anlatması.
 */
async function novaJson(
  nerede: string,
  url: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  const response = await fetch(url, init);
  const govde = await response.text();
  try {
    return JSON.parse(govde) as Record<string, unknown>;
  } catch {
    throw new Error(
      `${nerede}: yanıt JSON değil (HTTP ${response.status}) — ${govde
        .replace(/\s+/g, ' ')
        .slice(0, 160)}`
    );
  }
}

async function novaLogin(apiKey: string): Promise<string> {
  const data = await novaJson('oturum', `${NOVA}/login`, {
    method: 'POST',
    headers: {
      ...NOVA_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'request-json': JSON.stringify({ apikey: apiKey }),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (data?.status !== 'success' || !data?.session) {
    throw new Error(`astrometry.net oturumu açılamadı: ${data?.errormessage ?? ''}`);
  }
  return data.session as string;
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * ÇÖZÜCÜYE VERİLEN ADRES 200 KARAKTERİ GEÇEMEZ
 *
 * astrometry.net gönderilen adresi Django'nun `URLField` alanında
 * saklıyor ve o alanın varsayılan sınırı 200 karakter. Sınırın bir
 * karakter üstünde adres gönderildiğinde servis JSON bile döndürmüyor:
 * düz bir "Server Error (500)" HTML sayfası dönüyor. Ölçüldü — 200
 * karakter geçiyor, 201 karakter 500 veriyor.
 *
 * İmzalı Supabase adresi ~350 karakter (yolun yanında bir de JWT
 * taşıyor) ve bu yüzden HER gönderim sessizce 500 alıyordu. Anahtar
 * eksikliğinin arkasında duran ikinci arıza buydu.
 *
 * ÇÖZÜM: `photos` kovası ZATEN AÇIK. Galeri görselleri bu adresten
 * yayınlanıyor, yani imzalı adres oraya bir gizlilik katmıyordu —
 * üstelik imzalı adres, taşıdığı jetonu dış servise vermek demekti.
 * Açık adres hem kısa (~160 karakter) hem de daha az şey paylaşıyor.
 *
 * Özel kovada (gösterim kopyası yoksa orijinal) imzalama şart; orada
 * adres sınırı aşarsa iş SESSİZCE değil, ne olduğunu söyleyen bir
 * hatayla düşüyor.
 */
const MAX_URL_LENGTH = 200;

async function cozucuAdresi(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  path: string
): Promise<string> {
  if (bucket === 'photos') {
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    const acik = data?.publicUrl;
    if (acik && acik.length <= MAX_URL_LENGTH) return acik;
  }

  const { data: signed, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !signed?.signedUrl) {
    throw new Error(error?.message ?? 'imzalı adres üretilemedi');
  }
  if (signed.signedUrl.length > MAX_URL_LENGTH) {
    throw new Error(
      `adres ${signed.signedUrl.length} karakter; astrometry.net ${MAX_URL_LENGTH} karakterden uzun adresi kabul etmiyor`
    );
  }
  return signed.signedUrl;
}

/**
 * BEKLEYENLERİ GÖNDER.
 *
 * Oturum tur başına BİR KEZ açılıyor: her fotoğraf için yeniden giriş
 * yapmak aynı işi beş kez yapmak olurdu ve servis tarafında da gereksiz
 * bir yük.
 *
 * Gönderilen dosya ORİJİNAL DEĞİL, gösterim kopyası — gerekçesi
 * `plate-solve` içinde yazılı: çözüm için yıldız konumları yeterli ve
 * kullanıcının en değerli dosyasını dışarı çıkarmanın anlamı yok.
 */
async function gonderimTuru(
  admin: ReturnType<typeof createClient>,
  apiKey: string
): Promise<unknown[]> {
  const { data: bekleyen, error } = await admin
    .from('astro_photos')
    .select('id, original_path, display_path, solve_attempts')
    .in('solve_status', ['yok', 'basarisiz'])
    .lt('solve_attempts', MAX_ATTEMPTS)
    .order('solve_attempts', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(SUBMIT_BATCH);

  if (error) return [{ sonuc: 'gonderim listesi okunamadi', hata: error.message }];
  if (!bekleyen?.length) return [];

  const rapor: unknown[] = [];
  let session: string;
  try {
    session = await novaLogin(apiKey);
  } catch (e) {
    /* Oturum açılamadıysa TEK BİR sorun var ve o da bu tura özgü;
       fotoğrafları tek tek "başarısız" damgalamak, sağlam kareleri
       anahtar arızası yüzünden yakmak olurdu. Sayaç da artmıyor. */
    return [{ sonuc: 'oturum acilamadi', hata: String(e instanceof Error ? e.message : e) }];
  }

  for (const photo of bekleyen) {
    const path = photo.display_path ?? photo.original_path;
    const bucket = photo.display_path ? 'photos' : 'photo-originals';
    const deneme = (photo.solve_attempts ?? 0) + 1;

    if (!path) {
      await admin
        .from('astro_photos')
        .update({
          solve_status: 'basarisiz',
          solve_error: 'Çözülecek dosya yok.',
          solve_attempts: MAX_ATTEMPTS,
        })
        .eq('id', photo.id);
      rapor.push({ id: photo.id, sonuc: 'dosya yok' });
      continue;
    }

    /* Hangi adımda düştüğü hata metninde yazsın: imzalı adres üretimi
       ile gönderim bambaşka iki arıza ve ikisi de aynı `catch`e
       düşüyor. Etiketsizken "JSON değil" mesajı hangisinden geldiğini
       söylemiyordu. */
    let asama = 'adres';
    try {
      const adres = await cozucuAdresi(admin, bucket, path);

      asama = 'gonderim';
      const data = await novaJson('gönderim', `${NOVA}/url_upload`, {
        method: 'POST',
        headers: {
          ...NOVA_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'request-json': JSON.stringify({
            session,
            url: adres,
            publicly_visible: 'n',
            allow_modifications: 'd',
            allow_commercial_use: 'd',
          }),
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (data?.status !== 'success' || !data?.subid) {
        throw new Error(String(data?.errormessage ?? 'gönderim reddedildi'));
      }

      await admin
        .from('astro_photos')
        .update({
          solve_status: 'kuyrukta',
          solve_provider: 'astrometry.net',
          solve_submission_id: String(data.subid),
          solve_job_id: null,
          solve_submitted_at: new Date().toISOString(),
          solve_error: null,
          solve_attempts: deneme,
        })
        .eq('id', photo.id);
      rapor.push({ id: photo.id, sonuc: 'gonderildi', subid: data.subid });
    } catch (e) {
      const message = `[${asama}] ${String(e instanceof Error ? e.message : e)}`.slice(
        0,
        300
      );
      await admin
        .from('astro_photos')
        .update({
          solve_status: 'basarisiz',
          solve_error: message,
          solve_attempts: deneme,
        })
        .eq('id', photo.id);
      rapor.push({ id: photo.id, sonuc: 'gonderilemedi', hata: message });
    }
  }

  return rapor;
}

interface Calibration {
  ra: number;
  dec: number;
  pixscale: number;
  orientation: number;
  /**
   * Kadrajın aynalı olup olmadığı (±1).
   *
   * Katalog etiketlerinin doğu-batı yönü buna bağlı: aynasız bir
   * kadrajda kuzey yukarıdayken doğu SOLDADIR. Saklanmadığı sürece
   * etiketler kadrajın yarısında yanlış tarafa düşerdi.
   */
  parity?: number;
  width_arcsec?: number;
  height_arcsec?: number;
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(url, {
    headers: NOVA_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  /*
   * Cron dışından çağrılmasın. `verify_jwt` bu uç nokta için kapalı
   * (pg_cron bir kullanıcı oturumu taşımıyor), o yüzden kimlik
   * doğrulaması burada elle yapılıyor.
   */
  if (!POLL_SECRET || req.headers.get('x-poll-secret') !== POLL_SECRET) {
    return json(401, { hata: 'yetkisiz' });
  }
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  /*
   * ANAHTAR KONTROLÜ TURU TAMAMEN DURDURMUYOR.
   *
   * Eskiden anahtar yoksa fonksiyon en başta dönüyordu ve bu, tek bir
   * eksik ayarın YOKLAMAYI da öldürmesi demekti: astrometry.net'in
   * `submissions`, `jobs` ve `calibration` uçları anahtar istemiyor,
   * yalnızca giriş ve gönderim istiyor. Anahtar yokken kuyrukta
   * bekleyen işlerin sonucu pekâlâ yazılabilir.
   *
   * Bunun canlıda bir bedeli oldu: `ASTROMETRY_API_KEY` hiç tanımlı
   * olmadığı için yoklama binlerce turda hiçbir şey yapmadan döndü.
   */
  const apiKey = await resolveApiKey(admin);
  const gonderim = apiKey ? await gonderimTuru(admin, apiKey) : [];

  const { data: pending, error } = await admin
    .from('astro_photos')
    .select('id, solve_submission_id, solve_job_id, solve_submitted_at')
    .eq('solve_status', 'kuyrukta')
    .order('solve_submitted_at', { ascending: true })
    .limit(BATCH);

  if (error) return json(500, { hata: error.message });

  const rapor: unknown[] = [];

  for (const photo of pending ?? []) {
    const yasli =
      photo.solve_submitted_at &&
      Date.now() - new Date(photo.solve_submitted_at).getTime() >
        STALE_MINUTES * 60_000;

    if (yasli) {
      await admin
        .from('astro_photos')
        .update({
          solve_status: 'basarisiz',
          solve_error: `Sonuç ${STALE_MINUTES} dakikada gelmedi.`,
          solved_at: new Date().toISOString(),
        })
        .eq('id', photo.id);
      rapor.push({ id: photo.id, sonuc: 'zaman asimi' });
      continue;
    }

    // Gönderimden iş kimliği doğuyor; henüz doğmadıysa bir tur daha.
    let jobId = photo.solve_job_id;
    if (!jobId) {
      const sub = await getJson(
        `${NOVA}/submissions/${photo.solve_submission_id}`
      );
      const jobs = (sub?.jobs as (number | null)[] | undefined) ?? [];
      const first = jobs.find((j) => j !== null);
      if (first == null) {
        rapor.push({ id: photo.id, sonuc: 'kuyrukta' });
        continue;
      }
      jobId = String(first);
      await admin
        .from('astro_photos')
        .update({ solve_job_id: jobId })
        .eq('id', photo.id);
    }

    const job = await getJson(`${NOVA}/jobs/${jobId}`);
    const status = job?.status as string | undefined;

    if (status === 'failure') {
      await admin
        .from('astro_photos')
        .update({
          solve_status: 'basarisiz',
          solve_error:
            'astrometry.net alanı çözemedi — yeterli yıldız bulunamamış olabilir.',
          solved_at: new Date().toISOString(),
          /* HÜKÜM, HATA DEĞİL. Servis kareye baktı ve çözemedi; aynı
             kareyi yeniden göndermek aynı cevabı alır. Sayaç tavana
             çekiliyor ki gönderim turu bunu bir daha eline almasın. */
          solve_attempts: MAX_ATTEMPTS,
        })
        .eq('id', photo.id);
      rapor.push({ id: photo.id, sonuc: 'basarisiz' });
      continue;
    }

    if (status !== 'success') {
      rapor.push({ id: photo.id, sonuc: 'calisiyor' });
      continue;
    }

    const cal = (await getJson(
      `${NOVA}/jobs/${jobId}/calibration/`
    )) as Calibration | null;

    if (!cal || typeof cal.ra !== 'number') {
      rapor.push({ id: photo.id, sonuc: 'kalibrasyon yok' });
      continue;
    }

    /*
     * Alan boyutu doğrudan gelmiyorsa ölçek ve piksel sayısından
     * çıkarılabilir — ama piksel sayısı burada yok. `width_arcsec`
     * geldiğinde dereceye çevriliyor, gelmediğinde alan boş bırakılıyor:
     * uydurulmuş bir kadraj, hiç olmayandan kötü.
     */
    await admin
      .from('astro_photos')
      .update({
        solve_status: 'cozuldu',
        solve_provider: 'astrometry.net',
        solve_ra_deg: cal.ra,
        solve_dec_deg: cal.dec,
        solve_rotation_deg: cal.orientation ?? null,
        /* Parite kadrajın aynalı olup olmadığını söylüyor ve katalog
           etiketlerinin doğu-batı yönü buna bağlı. Saklanmadığında
           etiketler kadrajın yarısında yanlış tarafa düşerdi. */
        solve_parity: cal.parity ?? null,
        solve_scale_arcsec_px: cal.pixscale ?? null,
        solve_field_width_deg: cal.width_arcsec ? cal.width_arcsec / 3600 : null,
        solve_field_height_deg: cal.height_arcsec
          ? cal.height_arcsec / 3600
          : null,
        solve_error: null,
        solved_at: new Date().toISOString(),
      })
      .eq('id', photo.id);

    rapor.push({ id: photo.id, sonuc: 'cozuldu' });
  }

  return json(200, { islenen: rapor.length, rapor, gonderim });
});
