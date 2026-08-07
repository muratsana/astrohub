import { getSupabase } from '@/services/supabase/client';

/**
 * FOTOĞRAF SİLME — kaydın sahibi kendi karesini kaldırır (§10.2, §15.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN VARDI DA YOKTU
 *
 * Satır güvenliği bu işlemi baştan beri veriyor (`astro_photos_delete_own`,
 * `auth.uid() = user_id`) ama arayüzde hiçbir yerden çağrılmıyordu.
 * Kullanıcı yüklediği kareyi kaldıramıyordu; panelde "Fotoğraflarım"
 * listesi salt okunurdu. Yönetici tarafında silme vardı — yani tek çıkış
 * yolu, kendi fotoğrafı için yöneticiye yazmaktı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRA: ÖNCE DOSYALAR, SONRA SATIR
 *
 * İki yanlış sıra var ve hangisinin daha az zarar verdiğine karar vermek
 * gerekiyordu:
 *
 *   Satır önce → dosyalar kalırsa: `photos` bucket'ı GENEL. Kullanıcı
 *   "sildim" der, kayıt listeden gider, ama görsel adresi bilen herkes
 *   dosyayı indirmeye devam eder. Silmenin asıl vaadi bozulur.
 *
 *   Dosyalar önce → satır kalırsa: kart bir süre görselsiz görünür,
 *   kullanıcı tekrar siler ve biter. Rahatsız edici ama geri dönülebilir
 *   ve KİMSEYE fazladan bir şey sızdırmaz.
 *
 * İkincisi tercih edildi. Dosya temizliği düşerse satıra HİÇ
 * dokunulmuyor: yarım silinmiş bir kayıt bırakmaktansa işlemi hata
 * vererek durdurmak, kullanıcıya tekrar deneme şansı bırakıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KLASÖR LİSTELENİYOR, KOLON OKUNMUYOR
 *
 * Yollar `<user>/<photo>/…` deseninde (`storagePath`, `versionStoragePath`)
 * ve bir fotoğrafın altında kaç dosya olduğu ÖNCEDEN BİLİNMİYOR: gösterim,
 * küçük kopya, orijinal (uzantısı değişken) ve her işleme sürümü için
 * birer kare. `display_path`/`thumb_path`/`original_path` kolonlarını tek
 * tek okumak sürümleri kaçırırdı — kullanıcı fotoğrafı siler, revizyonları
 * bucket'ta kalırdı. Klasörü listelemek hepsini kapsıyor.
 */

const BUCKETS = ['photos', 'photo-originals'] as const;

/* Bir fotoğrafın altındaki dosya sayısı: 3 + sürümler. Üst sınır cömert
   tutuldu; varsayılan 100 sessizce kırpar ve kırpılan dosya bucket'ta
   kalırdı. */
const LISTE_SINIRI = 1000;

async function klasoruBosalt(
  supabase: Awaited<NonNullable<ReturnType<typeof getSupabase>>>,
  bucket: (typeof BUCKETS)[number],
  klasor: string
): Promise<void> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(klasor, { limit: LISTE_SINIRI });

  /* Listeleme düşerse silmeye devam edilmiyor: hangi dosyaların kaldığını
     bilmeden "temizlendi" saymak, yukarıdaki sıranın anlamını yok eder. */
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return;

  const yollar = data.map((o) => `${klasor}/${o.name}`);
  const { error: silmeHatasi } = await supabase.storage
    .from(bucket)
    .remove(yollar);
  if (silmeHatasi) throw new Error(silmeHatasi.message);
}

/**
 * Fotoğrafı kaldırır — SOFT DELETE (FAZ 3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ARTIK KALICI DEĞİL
 *
 * Bu fonksiyon eskiden satırı `delete` ile kaldırıyor ve öncesinde
 * depolamayı boşaltıyordu. FAZ 3'ün `*_hard_delete_admin` kısıtlayıcı
 * politikası kalıcı silmeyi admine kilitledikten sonra o sıra SESSİZ BİR
 * BOZULMAYA dönüştü: PostgREST `delete` sıfır satır etkilediğinde hata
 * DÖNDÜRMÜYOR. Yani dosyalar siliniyor, satır duruyor ve fonksiyon
 * "başarılı" diyordu — geriye görselleri olmayan bir galeri kaydı
 * kalıyordu.
 *
 * Şimdi sıra tersine döndü ve dosyalara hiç dokunulmuyor:
 *
 *   1. `deleted_at` yazılıyor — kayıt public sorgulardan düşüyor
 *      (`app.icerik_gorunur`) ve kotadan düşüyor
 *      (`app.active_photo_count`).
 *   2. Dosyalar YERİNDE KALIYOR, çünkü admin geri alabiliyor ve
 *      dosyalar silinmişse geri gelen kayıt boş bir çerçeve olurdu.
 *
 * `deleted_by` istemciden gönderilmiyor: `app.icerik_silme_izi()`
 * tetikleyicisi `auth.uid()` ile kendisi yazıyor ve denetim kaydını da o
 * düşürüyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIFIR SATIR ARTIK SESSİZ GEÇMİYOR
 *
 * `select('id')` ekli: RLS isteği süzdüyse dönen dizi boş kalıyor ve
 * fonksiyon hata veriyor. Başkasının fotoğrafını silmeye çalışan bir
 * çağrı "oldu" cevabı almıyor.
 *
 * `userId` yalnızca imza uyumluluğu için duruyor; yetkiyi satır
 * güvenliği veriyor.
 */
export async function deletePhoto(input: {
  userId: string;
  photoId: string;
}): Promise<void> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  const { data, error } = await supabase
    .from('astro_photos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.photoId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Fotoğraf kaldırılamadı — kayıt bulunamadı ya da yetki yok.');
  }
}

/**
 * Kaldırılmış fotoğrafı geri getirir (plan görev 5).
 *
 * Kota kontrolü BURADA DEĞİL: `deleted_at` null'a dönünce fotoğraf
 * yeniden kotaya dahil oluyor ve kota doluysa `enforce_photo_quota`
 * tetikleyicisi o anda itiraz ediyor. Yani beş fotoğrafı olan biri
 * altıncıyı geri alamıyor ve gerekçesini veritabanından duyuyor.
 */
export async function restorePhoto(photoId: string): Promise<void> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  const { data, error } = await supabase
    .from('astro_photos')
    .update({ deleted_at: null })
    .eq('id', photoId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error('Fotoğraf geri alınamadı — kayıt bulunamadı ya da yetki yok.');
  }
}

/**
 * Fotoğrafı ve bütün görsellerini KALICI olarak siler — yalnızca admin.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIRA: ÖNCE DOSYALAR, SONRA SATIR
 *
 * Bu sıra eski `deletePhoto`dan devralındı ve gerekçesi hâlâ geçerli:
 * `photos` bucket'ı genel. Satırı silip dosyayı bırakmak, "sildim" diyen
 * kullanıcının karesinin adresi bilen herkese açık kalması demek —
 * gürültüsüz bir mahremiyet sızıntısı. Dosya temizliği düşerse satıra
 * HİÇ dokunulmuyor ve hata yüzeye çıkıyor; yarım silinmiş kayıt
 * bırakmaktansa durup tekrar denemek.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SIFIR SATIR ARTIK GÜRÜLTÜLÜ
 *
 * Eski sürümün asıl kusuru sıra değil, SESSİZLİKTİ: PostgREST sıfır satır
 * etkilendiğinde hata döndürmüyor, dolayısıyla RLS isteği süzdüğünde
 * fonksiyon "başarılı" diyordu. `select('id')` bunu hataya çeviriyor.
 *
 * Bu yol yalnızca yönetim yüzeyinden çağrılıyor; sıradan kullanıcının
 * silme yolu `deletePhoto` ve o depolamaya hiç dokunmuyor. Yani "admin
 * olmayan biri dosyaları uçurup satırı bırakır" durumu bu fonksiyona
 * ulaşamıyor.
 */
export async function purgePhoto(input: {
  userId: string;
  photoId: string;
}): Promise<void> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  const klasor = `${input.userId}/${input.photoId}`;
  for (const bucket of BUCKETS) {
    await klasoruBosalt(supabase, bucket, klasor);
  }

  /* Satır gidince beğeni, yorum, puan ve sürüm satırları `on delete
     cascade` ile birlikte gidiyor — burada tek tek silinmiyor. */
  const { data, error } = await supabase
    .from('astro_photos')
    .delete()
    .eq('id', input.photoId)
    .select('id');

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error(
      'Kalıcı silme reddedildi — bu işlem yalnızca yöneticilere açık. ' +
        'Dosyalar temizlendi, satır duruyor.'
    );
  }
}
