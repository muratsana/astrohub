import type { BortleClass } from '@/domain/astronomy/skyQuality';
import { cities } from '@/features/location/cities';

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

  const match = cities.find((c) => {
    const name = c.name.toLocaleLowerCase('tr-TR');
    return haystack.some((h) => h.includes(name));
  });

  const derived = match ? clampClass(match.bortle) : null;
  return derived ? { value: derived, source: 'il' } : null;
}
