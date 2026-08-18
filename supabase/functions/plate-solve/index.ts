import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * PLATE SOLVE — İŞ GÖNDERİMİ (astrometry.net).
 *
 * Plate solve, fotoğrafın gökyüzünde TAM OLARAK nereye baktığını yıldız
 * desenlerinden bulur. Künyedeki hedef adı bir İDDİA; bu bir ÖLÇÜM.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KENDİ SUNUCUMUZ DEĞİL
 *
 * ASTAP ve yıldız veritabanları ücretsiz, ama yerel bir ikili: çalışması
 * için işlemci ve birkaç GB disk taşıyan bir makine gerekiyor. Vercel
 * fonksiyonları yerel ikili çalıştırmıyor, Edge Deno üzerinde koşuyor,
 * bulut depolama alan verir işlemci vermez.
 *
 * Çözümün ANINDA olması gerekmiyor — fotoğraf yüklendikten bir süre
 * sonra çözülmesi yeterli. Bu da astrometry.net'in kuyruklu API'sini
 * tam oturtuyor: iş gönderiliyor, sonuç dakikalar içinde alınıyor,
 * ek sunucu ve aylık ücret yok.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU FONKSİYON YALNIZCA GÖNDERİYOR, BEKLEMİYOR
 *
 * Sonucu burada beklemek Edge Function'ın ömrünü aşardı. Gönderim
 * kimliği (`subid`) kaydediliyor ve `plate-solve-poll` beş dakikada bir
 * yoklayıp sonucu yazıyor.
 *
 * ANAHTAR YAPILANDIRILMAMIŞSA sessizce ve BAŞARIYLA dönüyor: plate
 * solve isteğe bağlı bir eklenti, yokluğu yükleme akışını düşürmemeli.
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
/** İmzalı adresin ömrü — kuyruk uzasa da çözücü indirebilmeli. */
const SIGNED_URL_TTL = 3600;

async function novaLogin(): Promise<string> {
  const body = new URLSearchParams({
    'request-json': JSON.stringify({ apikey: API_KEY }),
  });
  const response = await fetch(`${NOVA}/login`, {
    method: 'POST',
    headers: {
      ...NOVA_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  const data = await response.json();
  if (data?.status !== 'success' || !data?.session) {
    throw new Error(`astrometry.net oturumu açılamadı: ${data?.errormessage ?? ''}`);
  }
  return data.session as string;
}

Deno.serve(async (req: Request) => {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  if (req.method !== 'POST') return json(405, { hata: 'yalnızca POST' });

  if (!API_KEY) {
    return json(200, {
      durum: 'yok',
      aciklama: 'ASTROMETRY_API_KEY tanımlı değil; plate solve atlandı.',
    });
  }

  let photoId: string | undefined;
  try {
    photoId = (await req.json())?.photoId;
  } catch {
    return json(400, { hata: 'geçersiz gövde' });
  }
  if (!photoId) return json(400, { hata: 'photoId gerekli' });

  /*
   * SAHİPLİK KONTROLÜ ÇAĞIRANIN KENDİ YETKİSİYLE. Servis rolüyle
   * sorulsaydı RLS atlanır ve "bu satır senin mi" sorusu her zaman
   * evet dönerdi. Kullanıcının anahtarıyla sorunca cevabı RLS veriyor.
   */
  const asUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') ?? '' },
      },
    }
  );

  const { data: user } = await asUser.auth.getUser();
  if (!user?.user) return json(401, { hata: 'oturum gerekli' });

  const { data: photo, error } = await asUser
    .from('astro_photos')
    .select('id, user_id, original_path, display_path, solve_status')
    .eq('id', photoId)
    .maybeSingle();

  if (error) return json(500, { hata: error.message });
  if (!photo) return json(404, { hata: 'fotoğraf bulunamadı' });

  /*
   * SAHİBİ YA DA YÖNETİM.
   *
   * Önceden yalnızca sahip çözüm isteyebiliyordu ve bunun bir bedeli
   * vardı: `ASTROMETRY_API_KEY` sonradan tanımlandığında, o güne kadar
   * yüklenmiş fotoğrafların hiçbiri çözülemiyordu — her sahibin tek tek
   * kendi fotoğrafına girip düğmeye basması gerekiyordu ve çoğu bunu
   * hiç yapmayacaktı.
   *
   * Yönetim muafiyeti bu birikmiş kuyruğu tek hareketle boşaltmak için.
   * Rol SERVİS ROLÜYLE sorulmuyor: çağıranın kendi kimliğiyle
   * `user_roles` okunuyor, yani "ben adminim" diyen bir gövdeye
   * güvenilmiyor.
   */
  if (photo.user_id !== user.user.id) {
    const { data: roller } = await asUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id);
    const yetkili = (roller ?? []).some(
      (r: { role: string }) => r.role === 'admin' || r.role === 'moderator'
    );
    if (!yetkili) return json(403, { hata: 'bu fotoğraf sizin değil' });
  }
  // Zaten kuyruktaysa ikinci kez göndermiyoruz: astrometry.net kuyruğunu
  // aynı işle doldurmanın kimseye faydası yok.
  if (photo.solve_status === 'kuyrukta') {
    return json(200, { durum: 'kuyrukta', aciklama: 'zaten gönderilmiş' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  /*
   * ORİJİNAL DEĞİL, GÖSTERİM KOPYASI GÖNDERİLİYOR.
   *
   * Çözüm için yıldız KONUMLARI yeterli; 6 MB'lık orijinali dış bir
   * servise yollamak hem gereksiz hem de kullanıcının en değerli
   * dosyasını gereksiz yere dışarı çıkarmak olurdu. Gösterim kopyası
   * (~350 kB) aynı geometriyi taşıyor — ölçek `solve_scale_arcsec_px`
   * olarak bu kopyanın piksel boyutuna göre çıkıyor ve künyede öyle
   * yazıyor.
   */
  const path = photo.display_path ?? photo.original_path;
  if (!path) return json(422, { hata: 'çözülecek dosya yok' });
  const bucket = photo.display_path ? 'photos' : 'photo-originals';

  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signError || !signed) {
    return json(500, { hata: signError?.message ?? 'imzalı adres üretilemedi' });
  }

  try {
    const session = await novaLogin();

    const response = await fetch(`${NOVA}/url_upload`, {
      method: 'POST',
      headers: {
      ...NOVA_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
      body: new URLSearchParams({
        'request-json': JSON.stringify({
          session,
          url: signed.signedUrl,
          // Sonuçlar herkese açık olmasın; yalnızca bizim hesabımızda.
          publicly_visible: 'n',
          allow_modifications: 'd',
          allow_commercial_use: 'd',
        }),
      }),
    });

    const data = await response.json();
    if (data?.status !== 'success' || !data?.subid) {
      throw new Error(data?.errormessage ?? 'gönderim reddedildi');
    }

    await admin
      .from('astro_photos')
      .update({
        solve_status: 'kuyrukta',
        solve_provider: 'astrometry.net',
        solve_submission_id: String(data.subid),
        solve_submitted_at: new Date().toISOString(),
        solve_error: null,
      })
      .eq('id', photoId);

    return json(202, { durum: 'kuyrukta', subid: data.subid });
  } catch (e) {
    const message = String(e instanceof Error ? e.message : e).slice(0, 300);
    await admin
      .from('astro_photos')
      .update({ solve_status: 'basarisiz', solve_error: message })
      .eq('id', photoId);
    return json(502, { hata: message });
  }
});
