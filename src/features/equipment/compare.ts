import type { EquipmentModel } from './data';

/**
 * EKİPMAN KARŞILAŞTIRMA — hangi satır gösterilir, hangisi farklı?
 *
 * Karşılaştırma tablosunun asıl işi ortak olanı değil **farklı olanı**
 * göstermek. İki kameranın ikisinde de "Soğutma: var" yazıyorsa o satır
 * karar vermeye yardım etmiyor; farkı işaretlemek, gözü doğru yere
 * götürüyor.
 *
 * Kural katmanı arayüzden ayrı çünkü test edilmesi gereken şey burası:
 * "hangi satırlar çıkar", "hangileri farklı sayılır", "en fazla kaç model".
 */

/**
 * En fazla dört model.
 *
 * Beşinci sütun telefonda okunamaz hâle geliyor ve karşılaştırma zaten
 * bir eleme işi: kullanıcı dörde inmeden karar veremiyorsa tablo değil,
 * daha fazla eleme lazım.
 */
export const MAX_COMPARE = 4;

export interface CompareRow {
  label: string;
  /** Model sırasına göre değerler; olmayan hücrede null. */
  values: (string | null)[];
  /** En az iki modelde farklı değer var mı? */
  differs: boolean;
  /** Modellerden en az birinde bu alan yok mu? */
  partial: boolean;
}

/**
 * Spec anahtarlarını, karşılaştırılan modellerdeki **görülme sırasına**
 * göre toplar.
 *
 * Alfabetik sıralamak "Açıklık" ile "Ağırlık"ı yan yana koyup optik ve
 * mekanik bilgiyi karıştırırdı; katalogdaki yazım sırası ise zaten
 * anlamlı gruplanmış hâlde (önce optik, sonra mekanik).
 */
export function compareKeys(models: EquipmentModel[]): string[] {
  const keys: string[] = [];
  for (const model of models) {
    for (const key of Object.keys(model.specs)) {
      if (!keys.includes(key)) keys.push(key);
    }
  }
  return keys;
}

export function compareRows(models: EquipmentModel[]): CompareRow[] {
  if (models.length === 0) return [];

  const rows: CompareRow[] = compareKeys(models).map((label) => {
    const values = models.map((m) => m.specs[label] ?? null);
    const present = values.filter((v): v is string => v !== null);
    return {
      label,
      values,
      differs: new Set(present).size > 1,
      partial: present.length !== values.length,
    };
  });

  /* Kategori ve fiyat aralığı spec değil ama karşılaştırmada en çok
     bakılan iki satır; başa alınıyor. */
  const priceValues = models.map((m) => m.priceHint ?? null);
  if (priceValues.some((v) => v !== null)) {
    const present = priceValues.filter((v): v is string => v !== null);
    rows.unshift({
      label: 'Fiyat segmenti',
      values: priceValues,
      differs: new Set(present).size > 1,
      partial: present.length !== priceValues.length,
    });
  }

  return rows;
}

/**
 * Seçim listesine ekleme/çıkarma.
 *
 * Sınıra dayanınca **sessizce yoksaymıyoruz**: çağıran taraf `false`
 * dönüşünü görüp kullanıcıya "önce bir model çıkarın" diyebiliyor.
 * Tıklamanın hiçbir şey yapmaması, arayüzün bozuk olduğu izlenimi verir.
 */
export function toggleCompare(
  selected: string[],
  slug: string
): { next: string[]; full: boolean } {
  if (selected.includes(slug)) {
    return { next: selected.filter((s) => s !== slug), full: false };
  }
  if (selected.length >= MAX_COMPARE) return { next: selected, full: true };
  return { next: [...selected, slug], full: false };
}

/** Karşılaştırma bağlantısı — seçim URL'de taşınır ve paylaşılabilir. */
export function comparePath(slugs: string[]): string {
  return slugs.length > 0
    ? `/ekipman/karsilastir?m=${slugs.join(',')}`
    : '/ekipman/karsilastir';
}

/**
 * URL'den seçim okuma.
 *
 * Bilinmeyen slug'lar **atılır**, hata verilmez: eski bir bağlantıda
 * katalogdan kaldırılmış bir model olabilir ve o yüzden sayfayı tümden
 * boş göstermek, çalışan üç modeli de kaybettirirdi.
 */
export function parseCompareParam(
  value: string | null,
  known: Set<string>
): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const slug of value.split(',')) {
    const trimmed = slug.trim();
    if (!trimmed || seen.has(trimmed) || !known.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}
