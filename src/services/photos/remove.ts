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
 * Kaydı ve bütün görsellerini kalıcı olarak siler.
 *
 * `userId` çağırandan geliyor ama YETKİ ORADAN GELMİYOR: yol kurmak için
 * gerekli, izni veren satır güvenliği. Başkasının kimliğiyle çağrılsa da
 * `delete` sorgusu sıfır satır etkiler.
 */
export async function deletePhoto(input: {
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
  const { error } = await supabase
    .from('astro_photos')
    .delete()
    .eq('id', input.photoId);
  if (error) throw new Error(error.message);
}
