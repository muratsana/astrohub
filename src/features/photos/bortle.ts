import type { BortleClass } from '@/domain/astronomy/skyQuality';
import { cities, type City } from '@/features/location/cities';

/**
 * KONUMDAN BORTLE TÜRETME.
 *
 * Bileşenden ayrı bir dosyada çünkü saf bir eşleme kuralı ve test
 * edilebilir olması gerekiyor: il adı eşleştirme Türkçe küçük harf
 * kuralına bağlı ve orada sessizce kırılması kolay bir yer var.
 *
 * SIRA ÖNEMLİ: fotoğrafın kendi kaydı → konum etiketinden çözülen il.
 * İl karşılığı KABA ve `source` alanıyla öyle işaretleniyor; çağıran
 * taraf bunu ölçüm gibi sunmuyor.
 */
export interface BortleGuess {
  value: BortleClass;
  /** `kayit` = fotoğrafın kendi değeri, `il` = il ortalamasından türetildi. */
  source: 'kayit' | 'il';
}

function clampClass(value: number | undefined): BortleClass | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 9) return null;
  return rounded as BortleClass;
}

export function deriveBortle(input: {
  bortle?: number;
  city?: string;
  locationLabel?: string;
}): BortleGuess | null {
  const own = clampClass(input.bortle);
  if (own) return { value: own, source: 'kayit' };

  /*
   * İl adı iki yerden gelebiliyor: `city` alanı (etiketin son parçası)
   * ya da etiketin tamamı. İkisi de aranıyor çünkü "Saklıkent, Antalya"
   * ile "Antalya" aynı ile denk düşmeli — ilkinde `city` doluyken
   * ikincisinde etiketin kendisi il adı.
   *
   * Eşleşme YEREL küçük harfle. `toLowerCase()` Türkçede "İzmir"i
   * "i̇zmir" yapıyor (noktalı i + birleşen nokta) ve katalogdaki "izmir"
   * ile eşleşmiyor; il tanınmaz, gösterge sessizce çizilmezdi.
   */
  const haystack = [input.city, input.locationLabel]
    .filter((s): s is string => Boolean(s))
    .map((s) => s.toLocaleLowerCase('tr-TR'));

  if (haystack.length === 0) return null;

  for (const h of haystack) {
    const match = matchProvince(h);
    if (!match) continue;
    const derived = clampClass(match.bortle);
    return derived ? { value: derived, source: 'il' } : null;
  }

  return null;
}

/**
 * Bir etikette geçen ili bulur — EN SONDAKİ eşleşme kazanır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN "İLK BULUNAN" DEĞİL
 *
 * Liste 15 ilken sıra önemsizdi; 81 ile çıkınca bir il adı BAŞKA BİR
 * İLİN İLÇE ADI olabiliyor. Örnek: "Aksaray, İstanbul". Aksaray hem bir
 * il hem de İstanbul'un bir semti; katalogda alfabetik olarak İstanbul'un
 * önünde. "İlk eşleşen" kuralıyla fotoğraf Aksaray iline bağlanır ve
 * İstanbul'un Bortle 9'u yerine hiçbir değer üretilmezdi.
 *
 * Türkçe adres yazımı "ilçe, il" biçiminde daralarak değil GENİŞLEYEREK
 * gider: en sondaki parça en büyük idari birimdir. Bu yüzden eşleşmenin
 * KONUMU sıralamadan daha iyi bir işaret — en sağdaki il adı alınıyor.
 */
function matchProvince(haystack: string): City | null {
  let best: City | null = null;
  let bestIndex = -1;

  for (const city of cities) {
    /*
     * `toLowerCase()` DEĞİL: Türkçede "İzmir" → "i̇zmir" (noktalı i +
     * birleşen nokta) olur ve etiketteki "izmir" ile eşleşmez; il
     * tanınmaz, gösterge sessizce çizilmezdi.
     */
    const index = haystack.lastIndexOf(city.name.toLocaleLowerCase('tr-TR'));
    if (index > bestIndex) {
      bestIndex = index;
      best = city;
    }
  }

  return best;
}
