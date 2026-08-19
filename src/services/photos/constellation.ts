import { getSupabase } from '@/services/supabase/client';

/**
 * PLATE SOLVE SONRASI TAKIMYILDIZ TÜRETME (B07).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN IAU SINIR TABLOSU DEĞİL
 *
 * "Doğru" yol, IAU'nun 1930 sınır poligonlarını taşımak olurdu — ama o
 * tablo katalogda yok ve ezberden yazılan bir sınır listesi, kullanıcının
 * künyesine yanlış takımyıldız yazardı. Uydurulmuş veri, eksik veriden
 * zararlıdır.
 *
 * Bunun yerine ELDEKİ OTANTİK VERİ kullanılıyor: `celestial_objects`
 * tablosundaki 16.644 nesnenin her biri hem koordinat hem takımyıldız
 * taşıyor. Verilen koordinata en yakın dokuz nesnenin çoğunluk oyu
 * takımyıldızı veriyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İSABET ÖLÇÜLDÜ: %91
 *
 * Sınav yöntemi: 300 nesne rastgele seçilip "bilinmiyor" sayıldı, kendi
 * kayıtları hariç tutularak tahmin üretildi ve gerçek etiketle
 * karşılaştırıldı. Tek komşuda %89, dokuz komşulu çoğunlukta %91.
 * Hatalar takımyıldız SINIRLARINDA yoğunlaşıyor — beklenen davranış.
 *
 * ══════════════════════════════════════════════════════════════════════
 * TAHMİN, BEYAN DEĞİL
 *
 * %91 bir künye alanını sessizce doldurmak için yeterli değil. Sonuç bir
 * ÖNERİ olarak dönüyor; kullanıcının kendi girdiği takımyıldızı ezmiyor
 * ve arayüzde "tahmin" olduğu söylenerek gösteriliyor.
 */

export interface ConstellationGuess {
  /** Türkçe takımyıldız adı (katalogdaki biçim). */
  name: string;
  /**
   * Ölçülen isabet oranı — arayüz bunu kullanıcıya söylüyor ki değeri
   * bir ölçüm sanmasın.
   */
  accuracy: number;
}

/** Örneklem sınavında ölçülen isabet (300 nesne, dokuz komşulu oy). */
export const CONSTELLATION_GUESS_ACCURACY = 0.91;

/**
 * Çözülmüş koordinattan takımyıldız önerir. Katalog erişilemezse ya da
 * sonuç boşsa `null` — çağıran taraf alanı boş bırakıyor.
 */
export async function guessConstellation(
  raDeg: number,
  decDeg: number
): Promise<ConstellationGuess | null> {
  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg)) return null;
  const promise = getSupabase();
  if (!promise) return null;

  const supabase = await promise;
  const { data, error } = await supabase.rpc('takimyildiz_tahmini', {
    p_ra_deg: raDeg,
    p_dec_deg: decDeg,
  });
  if (error || !data || typeof data !== 'string') return null;
  return { name: data, accuracy: CONSTELLATION_GUESS_ACCURACY };
}
