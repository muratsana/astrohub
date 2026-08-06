import { getSupabase } from '@/services/supabase/client';
import {
  renderResized,
  encodeWithinBudget,
  storagePath,
  extensionOf,
  DISPLAY_MAX_EDGE,
  THUMB_MAX_EDGE,
} from '@/domain/photography/resize';
import {
  checkUploadSize,
  formatBytes,
  MAX_STORED_BYTES,
} from '@/domain/membership/quota';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { sanitizeText } from '@/lib/sanitize';

/**
 * FOTOĞRAF YÜKLEME AKIŞI.
 *
 * Sıra bilinçli: önce satır, sonra dosyalar, sonra satırın yollarla
 * güncellenmesi.
 *
 *   1. `astro_photos` satırı TASLAK olarak açılır (kimlik burada doğar).
 *   2. Küçültülmüş kopyalar ve orijinal, `<user>/<photo_id>/…` yoluna
 *      yüklenir — kimlik olmadan yol kurulamaz, bu yüzden satır önce.
 *   3. Satır yollarla güncellenir; kullanıcı isterse yayımlar.
 *
 * Ters sıra (önce dosya) daha "doğal" görünür ama sahipsiz nesne bırakır:
 * yükleme bitip satır açılmadan bağlantı koparsa, bucket'ta kime ait
 * olduğu bilinmeyen bir dosya kalır. Bu sırada ise kopan bağlantı yalnızca
 * görselsiz bir taslak bırakır — kullanıcı görür ve siler.
 *
 * YAYIN AYRI BİR ADIM. Kota tetikleyicisi yalnızca yayına geçişte çalışır
 * (§4.2); taslak açmak kotayı tüketmez. Böylece kotası dolu bir kullanıcı
 * da fotoğrafını hazırlayıp bekletebilir.
 */

export interface UploadInput {
  file: File;
  userId: string;
  slug: string;
  title: string;
  photoType: string;
  /**
   * İŞLEME PALETİ — ZORUNLU, isteğe bağlı değil.
   *
   * `AstroPhoto.palette` zorunlu bir alan ve galeri süzgeci ("Tüm
   * paletler") ona dayanıyor. Yükleme sihirbazı bunu hiç sormuyordu:
   * yayımlanan her yeni fotoğraf paletsiz kaydediliyor, süzgeçte
   * görünmüyor ve kartındaki "RGB · 20 sa" satırı yarım kalıyordu.
   *
   * `?` ile isteğe bağlı bırakmak, çağıranın unutmasını derleme
   * zamanında değil yayın sonrasında fark etmek demekti — telif
   * onayında aynı hata bir kez yaşandı, aynı karar burada da veriliyor.
   */
  palette: string;
  description?: string;
  capturedAt?: string;
  locationLabel?: string;
  locationVisibility?: 'exact' | 'approximate' | 'region' | 'hidden';
  license?: string;
  allowDownload?: boolean;
  watermarkRequired?: boolean;
  aiDeclared?: boolean;
  /**
   * Telif beyanı (§15.4) — kullanıcının "bu eserin sahibiyim" onayı.
   *
   * ZORUNLU ALAN, isteğe bağlı değil. Veritabanı `status = 'published'`
   * olan her satırda bunu şart koşuyor
   * (`astro_photos_publish_requires_copyright`). Alan `?` ile isteğe
   * bağlı bırakılsaydı, çağıran taraf onu yazmayı unuttuğunda derleme
   * geçer ve hata ancak YAYIN adımında, kısıt ihlali olarak çıkardı —
   * bu tam olarak yaşandı: dosyalar yükleniyor, satır açılıyor ve
   * fotoğraf taslakta kalıyordu.
   */
  copyrightConfirmed: boolean;
  /** Ekipman künyesi — serbest metin; katalog bağı ayrı alanlarda. */
  setup?: Record<string, string>;
  opticId?: string | null;
  cameraId?: string | null;
  mountId?: string | null;
  /** Katalogdaki hedefin veritabanı kimliği; yoksa yalnızca etiket saklanır. */
  objectId?: string | null;
  /** Çekimde kullanılan kayıtlı setup — künye ayrıca saklanır. */
  setupId?: string | null;
  /** Hedefin okunabilir adı — katalog bağı kurulamasa da künye eksik kalmasın. */
  targetLabel?: string | null;
  exposures?: { filter: string; frames: number; exposureSeconds: number }[];
  /**
   * Dosyadan okunan künye.
   *
   * KOORDİNAT ALINMIYOR — yalnızca varlığı. `ExifData` GPS'i de taşıyor
   * ama buraya `gpsPresent` bayrağı olarak geliyor; ham koordinat
   * veritabanına hiç girmiyor (§15.3). Alanın tipini `ExifData` yapmak
   * kolaydı ama o zaman koordinat bu sınıra kadar taşınır ve bir gün
   * yanlışlıkla yazılırdı. Sınırı tipin kendisi çiziyor.
   */
  exif?: {
    camera?: string;
    lens?: string;
    iso?: number;
    focalMm?: number;
    apertureF?: number;
    exposureSeconds?: number;
    gpsPresent: boolean;
  };
}

/**
 * EXIF sayısını veritabanının kabul edeceği aralığa indirger.
 *
 * Ayrıştırıcı bozuk bir dosyada saçma değerler üretebiliyor (sıfıra
 * bölme, işaretli/işaretsiz karışması). `astro_photos_exif_makul` kısıtı
 * bunları zaten reddediyor — ama kısıt ihlali BÜTÜN YÜKLEMEYİ düşürürdü:
 * kullanıcının fotoğrafı, dosyasındaki bozuk bir ISO alanı yüzünden
 * kaydedilemezdi. Burada eleniyor, künyede o satır boş kalıyor.
 */
function exifNumber(
  value: number | undefined,
  max: number
): number | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  if (value <= 0 || value > max) return null;
  return value;
}

export interface UploadResult {
  photoId: string;
  displayPath: string;
  thumbPath: string;
  originalPath: string | null;
  width: number;
  height: number;
  /** Küçültme yapıldı mı — arayüz kullanıcıya bunu söylüyor. */
  optimized: boolean;
  /** Bu fotoğrafın bucket'larda tuttuğu toplam yer. */
  storedBytes: number;
  /** Poz künyesi yazılabildi mi — yazılamadıysa fotoğraf yine geçerli. */
  exposuresSaved: boolean;
}

export type UploadProgress =
  'hazirlaniyor' | 'kucultuluyor' | 'yukleniyor' | 'kaydediliyor';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/** Geri alınabilmesi için yüklenen her nesne kaydediliyor. */
interface UploadedObject {
  bucket: 'photos' | 'photo-originals';
  path: string;
}

export async function uploadPhoto(
  input: UploadInput,
  onProgress?: (stage: UploadProgress) => void
): Promise<UploadResult> {
  const verdict = checkUploadSize(input.file.size);
  if (verdict.kind === 'reject') throw new Error(verdict.reason);

  onProgress?.('hazirlaniyor');

  /*
   * BİÇİM DENETİMİ SATIR AÇILMADAN ÖNCE. Uzantısı `.jpg` ama içeriği RAW
   * ya da PDF olan dosya eskiden akışın ortasında, küçültme aşamasında
   * patlıyordu — o noktada zaten bir taslak satır açılmış oluyordu ve
   * kullanıcı "işlenemedi" mesajıyla baş başa kalıyordu. Sihirli baytlar
   * ilk 16 baytta okunuyor; dosyanın tamamı belleğe alınmıyor.
   *
   * Bu bir GÜVENLİK SINIRI DEĞİL (bkz. fileType.ts) — depolama API'sine
   * doğrudan giden biri buradan geçmez. Asıl sınır bucket'ın
   * `allowed_mime_types` ayarı.
   */
  const format = checkImageFormat(await readHead(input.file), input.file.type);
  if (format.kind === 'reject') throw new Error(format.reason);

  const supabase = await client();

  /*
   * TELAFİ YIĞINI.
   *
   * Eski akış hata durumunda yalnızca taslak SATIRI siliyordu; o ana kadar
   * yüklenmiş NESNELER bucket'ta kalıyordu. İki kopya paralel yükleniyor
   * (`Promise.all`) ve biri başarılı olup diğeri düşerse, sahipsiz bir
   * dosya geride kalıyordu: hiçbir satırın işaret etmediği, arayüzde
   * görünmeyen, ama depolama kotasını yiyen bir nesne. Kullanıcı yeniden
   * denediğinde yenileri ekleniyordu.
   *
   * Artık her başarılı yükleme kaydediliyor ve hata hâlinde hepsi
   * siliniyor.
   */
  const uploaded: UploadedObject[] = [];
  let photoId: string | null = null;

  /**
   * Yarım kalan işi geri alır — HER ADIMI DENER, biri düşse de durmaz.
   *
   * Geri alma başarısız olursa SESSİZ KALINIYOR: kullanıcıya gösterilecek
   * hata asıl hatadır, temizlik hatası değil. Onu öne çıkarmak, "neden
   * yüklenemedi" sorusunun cevabını gizlerdi. Yine de günlüğe yazılıyor.
   */
  async function rollback() {
    for (const bucket of ['photos', 'photo-originals'] as const) {
      const paths = uploaded
        .filter((o) => o.bucket === bucket)
        .map((o) => o.path);
      if (paths.length === 0) continue;
      try {
        await supabase.storage.from(bucket).remove(paths);
      } catch (cause) {
        console.error(`geri alma: ${bucket} temizlenemedi`, cause);
      }
    }
    if (photoId) {
      try {
        await supabase.from('astro_photos').delete().eq('id', photoId);
      } catch (cause) {
        console.error('geri alma: taslak satır silinemedi', cause);
      }
    }
  }

  try {
    return await runUpload();
  } catch (cause) {
    await rollback();
    throw cause;
  }

  async function runUpload(): Promise<UploadResult> {
    /* ── 1. Taslak satır ── */
    const { data: created, error: insertError } = await supabase
      .from('astro_photos')
      .insert({
        user_id: input.userId,
        slug: input.slug,
        title: sanitizeText(input.title, { maxLength: 160 }),
        description: sanitizeText(input.description ?? '', {
          multiline: true,
          maxLength: 5000,
        }),
        photo_type: input.photoType,
        palette: input.palette,
        object_id: input.objectId ?? null,
        setup_id: input.setupId ?? null,
        target_label: input.targetLabel
          ? sanitizeText(input.targetLabel, { maxLength: 160 })
          : null,
        status: 'draft',
        captured_at: input.capturedAt || null,
        location_label: input.locationLabel || null,
        location_visibility: input.locationVisibility ?? 'approximate',
        license: input.license ?? 'Tüm hakları saklıdır',
        allow_download: input.allowDownload ?? false,
        watermark_required: input.watermarkRequired ?? true,
        ai_declared: input.aiDeclared ?? false,
        /*
         * Onay TASLAKTA yazılıyor, yayın adımında değil. Beyan
         * kullanıcının dosyayı verdiği anda verdiği bir beyan; onu
         * yayına ertelemek, taslakta duran bir kaydın telif durumunu
         * belirsiz bırakırdı.
         */
        copyright_confirmed: input.copyrightConfirmed,
        optic_id: input.opticId ?? null,
        camera_id: input.cameraId ?? null,
        mount_id: input.mountId ?? null,
        setup_text: input.setup ?? {},
        /*
         * DOSYADAN OKUNAN KÜNYE — kullanıcının yazdığından ayrı kolonlarda
         * (0035). Değerler burada bir kez süzülüyor: bozuk bir EXIF
         * bloğu yüzünden kısıt ihlali alıp bütün yüklemeyi düşürmek
         * orantısız olurdu.
         */
        exif_camera: input.exif?.camera ?? null,
        exif_lens: input.exif?.lens ?? null,
        exif_iso: exifNumber(input.exif?.iso, 4_000_000),
        exif_focal_mm: exifNumber(input.exif?.focalMm, 100_000),
        exif_aperture_f: exifNumber(input.exif?.apertureF, 1000),
        exif_exposure_seconds: exifNumber(input.exif?.exposureSeconds, 86_400),
        exif_gps_present: input.exif?.gpsPresent ?? false,
        bytes: input.file.size,
      })
      .select('id')
      .single();

    if (insertError) throw new Error(insertError.message);
    photoId = (created as { id: string }).id;

    /* ── 2. Kopyalar ── */
    onProgress?.('kucultuluyor');
    const display = await renderResized(input.file, DISPLAY_MAX_EDGE);
    const thumb = await renderResized(input.file, THUMB_MAX_EDGE);

    if (!display || !thumb) {
      /*
       * Tarayıcı küçültemedi. Biçim denetimi bunu çoğu durumda önceden
       * yakalıyor; buraya düşen asıl durum TIFF — bucket kabul ediyor ama
       * `createImageBitmap` çoğu tarayıcıda açamıyor.
       */
      throw new Error(
        format.kind === 'risky'
          ? format.reason
          : 'Görsel bu tarayıcıda işlenemedi. JPEG ya da PNG deneyin.'
      );
    }

    onProgress?.('yukleniyor');
    const displayPath = storagePath(input.userId, photoId, 'display');
    const thumbPath = storagePath(input.userId, photoId, 'thumb');

    /*
     * İki kopya paralel yükleniyor ama sonuçları TEK TEK kaydediliyor:
     * biri başarılı olup diğeri düşerse, başarılı olan geri alınacak
     * listeye girmiş olmalı. `Promise.all` sonucunu topluca "hata var mı"
     * diye yoklamak, başarılı olanı unutmak demekti.
     */
    const uploads = await Promise.all([
      supabase.storage
        .from('photos')
        .upload(displayPath, display.blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })
        .then((result) => {
          if (!result.error)
            uploaded.push({ bucket: 'photos', path: displayPath });
          return result;
        }),
      supabase.storage
        .from('photos')
        .upload(thumbPath, thumb.blob, {
          contentType: 'image/jpeg',
          upsert: true,
        })
        .then((result) => {
          if (!result.error)
            uploaded.push({ bucket: 'photos', path: thumbPath });
          return result;
        }),
    ]);

    const failed = uploads.find((u) => u.error);
    if (failed?.error) throw new Error(failed.error.message);

    /*
     * ARŞİV KOPYASI GİZLİ BUCKET'A — ama 10 MB bütçesiyle (§4.2).
     *
     * Eskiden ham dosya olduğu gibi yükleniyordu ve tek maliyet kalemi buydu:
     * 100 MB'lık bir TIFF, gösterim kopyalarının elli katı yer tutuyordu. Kota
     * fotoğraf SAYISINI sınırlıyordu ama BOYUTU serbest bırakmıştı; asıl
     * maliyet boyuttaydı.
     *
     * Bütçenin altındaki dosyaya DOKUNULMUYOR: 6 MB'lık bir JPEG'i yeniden
     * kodlamak yer kazandırmaz, yalnızca kullanıcının dosyasını sessizce
     * bozardı. Üstündeki `ARCHIVE_LADDER` ile bütçeye indiriliyor.
     */
    const oversize = input.file.size > MAX_STORED_BYTES;
    let archiveBody: Blob = input.file;
    let archiveType = input.file.type || 'application/octet-stream';
    let archiveExtension = extensionOf(input.file.name);

    if (oversize) {
      const encoded = await encodeWithinBudget(input.file, MAX_STORED_BYTES);
      if (!encoded || !encoded.withinBudget) {
        /*
         * Küçültme hedefe ulaşamadı. Yine de yüklemek, depolama API'sinin
         * anlaşılmaz 413'üne düşmek olurdu.
         */
        throw new Error(
          `Bu dosya ${formatBytes(MAX_STORED_BYTES)} sınırına indirilemedi. Kaydı dışa aktarırken çözünürlüğü düşürüp yeniden deneyin.`
        );
      }
      archiveBody = encoded.blob;
      archiveType = 'image/jpeg';
      archiveExtension = 'jpg';
    }

    /*
     * Arşiv yüklemesi başarısız olursa akış durmuyor: gösterilecek kopyalar
     * zaten yüklendi ve kullanıcının emeğini bir arşivleme hatası yüzünden
     * çöpe atmak orantısız olurdu. Eksiklik `original_path`'in boş kalmasıyla
     * görünür.
     */
    const originalPath = storagePath(
      input.userId,
      photoId,
      'original',
      archiveExtension
    );
    const { error: originalError } = await supabase.storage
      .from('photo-originals')
      .upload(originalPath, archiveBody, {
        contentType: archiveType,
        upsert: true,
      });

    if (!originalError) {
      uploaded.push({ bucket: 'photo-originals', path: originalPath });
    }

    /* ── 3. Yolları yaz ──
     *
     * `bytes` artık SAKLANAN toplam, seçilen dosyanın boyu değil. Taslak
     * açılırken ham boyut yazılmıştı çünkü küçültme daha yapılmamıştı; o
     * sayıyı bırakmak kapasite planını 40 MB'lık bir dosyada dört kat
     * yanıltırdı. Kullanıcının diskinde ne olduğu bizi ilgilendirmiyor —
     * bizim bucket'ımızda ne durduğu ilgilendiriyor. */
    onProgress?.('kaydediliyor');
    const storedBytes =
      (originalError ? 0 : archiveBody.size) +
      display.blob.size +
      thumb.blob.size;

    const { error: updateError } = await supabase
      .from('astro_photos')
      .update({
        display_path: displayPath,
        thumb_path: thumbPath,
        original_path: originalError ? null : originalPath,
        width: display.size.width,
        height: display.size.height,
        bytes: storedBytes,
      })
      .eq('id', photoId);

    if (updateError) throw new Error(updateError.message);

    /*
     * POZ BİLGİLERİ FOTOĞRAFI GÖTÜRMEZ.
     *
     * Bu insert eskiden hata fırlatıyordu ve artık geri alma yığını devrede
     * olduğu için, poz tablosundaki bir sorun YÜKLENMİŞ FOTOĞRAFIN TAMAMINI
     * silerdi — orantısız. Fotoğraf pozsuz da geçerli bir kayıt; poz künyenin
     * bir ayrıntısı.
     *
     * Ama sessizce de yutulmuyor: kullanıcı girdiği veriyi kaybettiğini
     * bilmeli, `exposuresSaved` ile arayüze taşınıyor.
     */
    let exposuresSaved = true;
    if (input.exposures && input.exposures.length > 0) {
      const rows = input.exposures
        .filter((e) => e.frames > 0 && e.exposureSeconds > 0)
        .map((e, index) => ({
          photo_id: photoId,
          filter: e.filter,
          frames: e.frames,
          exposure_seconds: e.exposureSeconds,
          position: index,
        }));

      if (rows.length > 0) {
        const { error } = await supabase.from('photo_exposures').insert(rows);
        if (error) {
          console.error('poz bilgileri kaydedilemedi', error);
          exposuresSaved = false;
        }
      }
    }

    return {
      photoId,
      displayPath,
      thumbPath,
      originalPath: originalError ? null : originalPath,
      width: display.size.width,
      height: display.size.height,
      /* Niyet değil, olan biten: `verdict` yalnızca küçültmenin gerekeceğini
       söylüyordu, `oversize` gerçekten yapıldığını. */
      optimized: oversize,
      storedBytes,
      exposuresSaved,
    };
  }
}

/**
 * Taslağı yayına alır.
 *
 * Kota kontrolü burada YAPILMAZ — veritabanı tetikleyicisi yapar (§4.2).
 * İstemcide ikinci bir kontrol koymak, iki sınırın ayrışması riskini
 * getirir ve hiçbir güvence eklemez. Tetikleyicinin hata mesajı zaten
 * kotayı ve kademeyi söylüyor; onu olduğu gibi yukarı taşıyoruz.
 */
export async function publishPhoto(photoId: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('astro_photos')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', photoId);

  if (error) throw new Error(error.message);
}

/**
 * Plate solve isteği — SONUCU BEKLEMİYOR.
 *
 * astrometry.net kuyruklu çalışıyor ve sonuç dakikalar sürebiliyor.
 * Kullanıcıyı yayın ekranında bekletmenin bir anlamı yok: fotoğraf
 * yayımlandı, çözüm arkadan geliyor ve hazır olduğunda fotoğraf
 * sayfasında beliriyor (sunucu tarafında `pg_cron` yokluyor).
 *
 * HATASI YUTULUYOR VE BU BİLİNÇLİ. Çözüm bir EK: künye, dosyalar ve
 * yayın zaten tamam. İsteğin düşmesi yüzünden kullanıcıya hata
 * göstermek, başarılı bir yüklemeyi başarısız gibi sunmak olurdu.
 * Durum veritabanında duruyor; çözülemezse fotoğraf sayfası bunu
 * kendi söylüyor.
 */
export async function requestPlateSolve(photoId: string): Promise<void> {
  try {
    const supabase = await client();
    await supabase.functions.invoke('plate-solve', { body: { photoId } });
  } catch {
    // Sessiz: bkz. yukarısı.
  }
}

/* `publicPhotoUrl` `./publicUrl`e TAŞINDI ve buradan yeniden dışa
   aktarılıyor. Sebep ölçüldü: galeri katmanı yalnızca bu beş satır için
   yükleme boru hattının tamamını ilk pakete çekiyordu. Yeniden dışa
   aktarma, mevcut çağıranları değiştirmeden bırakıyor. */
export { publicPhotoUrl } from './publicUrl';
