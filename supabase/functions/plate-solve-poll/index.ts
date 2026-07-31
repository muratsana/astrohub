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
const API_KEY = Deno.env.get('ASTROMETRY_API_KEY');
const POLL_SECRET = Deno.env.get('PLATE_SOLVE_POLL_SECRET');
/** Bu süreyi aşan kuyruk işi başarısız sayılıyor. */
const STALE_MINUTES = 90;
/** Tek turda bakılacak azami iş — cron turu uzamasın. */
const BATCH = 20;

interface Calibration {
  ra: number;
  dec: number;
  pixscale: number;
  orientation: number;
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
  if (!API_KEY) return json(200, { durum: 'yok', islenen: 0 });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

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

  return json(200, { islenen: rapor.length, rapor });
});
