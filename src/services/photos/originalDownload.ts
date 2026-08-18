import { getSupabase } from '@/services/supabase/client';

/**
 * SAHİBİN ORİJİNAL DOSYA İNDİRMESİ (X04).
 *
 * ══════════════════════════════════════════════════════════════════════
 * POLİTİKA
 *
 * Orijinal (tam çözünürlük arşiv) `photo-originals` gizli kovasında ve
 * public modelde hiç görünmüyor — başkası indiremez. Ama kaydın SAHİBİ
 * kendi eserinin orijinaline erişebilmeli: yerel kopyasını kaybeden
 * kullanıcı için tek yedek bu. Erişim istemcide bir bayrakla değil,
 * veritabanı ve depo RLS'iyle sınırlı: `original_path` yalnızca sahibin
 * okuyabildiği satırdan geliyor, imzalı adres yalnızca sahibin
 * erişebildiği kovadan üretiliyor. Yani bu fonksiyon başkası için
 * çağrılsa bile RLS null döndürüyor.
 *
 * İmzalı adres kısa ömürlü (60 sn): indirmeyi başlatmaya yetiyor,
 * paylaşılabilir kalıcı bir bağlantı olmuyor.
 */
export async function ownerOriginalDownloadUrl(
  photoId: string,
  downloadName = 'orijinal.jpg',
  expiresIn = 60
): Promise<string | null> {
  const promise = getSupabase();
  if (!promise) return null;
  const supabase = await promise;

  const { data, error } = await supabase
    .from('astro_photos')
    .select('original_path')
    .eq('id', photoId)
    .single();
  if (error || !data?.original_path) return null;

  /* `download` seçeneği sunucuya Content-Disposition: attachment yazdırıyor;
     böylece farklı kaynaktaki adres bile indiriliyor — `<a download>`
     niteliği cross-origin'de yok sayıldığı için (G01/B02 dersi) sunucu
     tarafı disposition tek güvenilir yol. */
  const { data: imzali, error: imzaHatasi } = await supabase.storage
    .from('photo-originals')
    .createSignedUrl(data.original_path as string, expiresIn, {
      download: downloadName,
    });
  if (imzaHatasi || !imzali?.signedUrl) return null;

  return imzali.signedUrl;
}
