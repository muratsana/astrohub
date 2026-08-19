/**
 * SERİ-GAP ANALİZİ — katalogda eksik kalan seri üyelerini bulur (F06).
 *
 * ══════════════════════════════════════════════════════════════════════
 * SORUN
 *
 * Katalog el ile ve parça parça büyüdü. Bir markanın bir serisinden üç
 * model girilmiş, dördüncüsü unutulmuş oluyor: "ASI533MC Pro" var ama
 * "ASI533MM Pro" yok; "Esprit 100ED" ve "120ED" var, "80ED" yok.
 * Kullanıcı aradığı modeli bulamayınca ya yanlış bir modeli seçiyor ya
 * da serbest metin yazıyor — künye iki türlü de bozuluyor.
 *
 * Eksik olanı MAKİNE UYDURAMAZ: bir serinin gerçekte hangi üyeleri
 * olduğunu üretici bilir. Bu analiz "şurada bir boşluk var, bak" diyor;
 * ne ekleneceğine insan karar veriyor. Uydurulmuş bir model kaydı,
 * eksik kayıttan daha zararlı olurdu — kullanıcı ona güvenip künyesine
 * yazar.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SERİ NASIL ÇIKARILIYOR
 *
 * Model adından sayılar ve sonek harfleri soyuluyor: "Esprit 100ED" ve
 * "Esprit 120ED" → "Esprit"; "ASI533MC Pro" → "ASI". Aynı marka + aynı
 * kök = aynı seri. Seri üyelerinin sayısal parçaları (100, 120) ve
 * varyant sonekleri (MC/MM, Pro) toplanıyor.
 */

export interface CatalogEntry {
  slug: string;
  brand: string;
  model: string;
  category: string;
}

export interface SeriesGroup {
  brand: string;
  /** Seri kökü — "Esprit", "ASI", "EAGLE". */
  series: string;
  category: string;
  members: CatalogEntry[];
  /** Üyelerde geçen sayısal değerler (açıklık, sensör kodu…). */
  numbers: number[];
  /** Üyelerde geçen varyant sonekleri — "Pro", "MC", "MM". */
  variants: string[];
}

/** Model adının seri kökü: sayılar ve bilinen sonekler atılıyor. */
export function seriesRoot(model: string): string {
  return model
    .replace(/\d+(\.\d+)?/g, ' ')
    .replace(/\b(pro|mc|mm|ed|apo|air|plus|mini|s|le|iii|ii|iv|v)\b/gi, ' ')
    .replace(/[^\p{L}\s-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Model adındaki sayılar — "Esprit 100ED" → [100]. */
export function modelNumbers(model: string): number[] {
  return (model.match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

/**
 * Model adındaki varyant sonekleri — "ASI533MC Pro" → ["MC","PRO"].
 *
 * İKİ İNCELİK, ikisi de gerçek veride yakalandı:
 *
 * 1. `\b` ile başlayan desen YETMİYOR — "ASI533MC"de rakamla harf
 *    arasında sözcük sınırı yok ve MC hiç yakalanmıyordu.
 *
 * 2. MC/MM BÜYÜK HARF OLMAK ZORUNDA. Küçük harfli "mm" milimetredir:
 *    "Hyperion 24mm" bir okülerin odak uzunluğu, mono sensör değil.
 *    Büyük-küçük harf duyarsız arama katalogda 20'den fazla yanlış
 *    "MM varyantı" üretiyordu (canlı veride ölçüldü). Sensör kodu her
 *    zaman büyük harf: ASI533MM, ASI2600MC.
 */
const BUYUK_HARF_SONEKLER = /(?:\b|\d)(MC|MM)\b/g;
const HARF_DUYARSIZ_SONEKLER =
  /(?:\b|\d)(Pro|ED|APO|Air|Plus|Mini|LE|III|II|IV)\b/gi;

export function modelVariants(model: string): string[] {
  const bulunan = [
    ...(model.match(BUYUK_HARF_SONEKLER) ?? []),
    ...(model.match(HARF_DUYARSIZ_SONEKLER) ?? []),
  ];
  return [
    ...new Set(bulunan.map((v) => v.replace(/^\d/, '').toUpperCase())),
  ];
}

/**
 * Katalogu serilere böler. Tek üyeli seriler de döner — bir serinin
 * yalnızca bir üyesi olması başlı başına bir sinyal (F05'teki EAGLE
 * durumu gibi: seride tek kayıt var, gerisi eksik).
 */
export function groupSeries(entries: CatalogEntry[]): SeriesGroup[] {
  const gruplar = new Map<string, SeriesGroup>();

  for (const entry of entries) {
    const kok = seriesRoot(entry.model);
    if (!kok) continue; // Yalnızca sayıdan ibaret ad — seri çıkarılamıyor.
    const anahtar = `${entry.brand.toLowerCase()}|${kok.toLowerCase()}|${entry.category}`;
    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      mevcut.members.push(entry);
      mevcut.numbers.push(...modelNumbers(entry.model));
      mevcut.variants.push(...modelVariants(entry.model));
    } else {
      gruplar.set(anahtar, {
        brand: entry.brand,
        series: kok,
        category: entry.category,
        members: [entry],
        numbers: modelNumbers(entry.model),
        variants: modelVariants(entry.model),
      });
    }
  }

  return [...gruplar.values()].map((g) => ({
    ...g,
    numbers: [...new Set(g.numbers)].sort((a, b) => a - b),
    variants: [...new Set(g.variants)].sort(),
  }));
}

/**
 * MC/MM sensör varyantının anlamlı olduğu kategoriler.
 *
 * `guide` dışarıda: guide kameraları neredeyse yalnız mono üretiliyor ve
 * renkli karşılığının yokluğu bir eksiklik değil (gerçek veride ZWO ASI
 * guide serisi böyle çıktı).
 */
const KAMERA_KATEGORILERI = ['astro-kamera', 'fotograf-makinesi'];

export interface SeriesGap {
  brand: string;
  series: string;
  category: string;
  /** Neden bir boşluk olduğu düşünülüyor. */
  reason: string;
  members: string[];
}

/**
 * Boşluk adaylarını çıkarır. İKİ SİNYAL:
 *
 *   1. VARYANT ASİMETRİSİ — serinin bir üyesinde olan varyant başka bir
 *      üyesinde yok. "ASI533MC Pro" varsa "ASI533MM Pro" da olmalı;
 *      üretici çoğu sensörü hem renkli hem mono satıyor.
 *   2. TEK ÜYELİ SERİ — markanın bilinen bir serisinden katalogda tek
 *      kayıt var. Seri gerçekten tek üyeli olabilir; o yüzden bu bir
 *      "bak" sinyali, bir hata değil.
 *
 * Sayısal boşluk (100 ve 120 var, 110 yok) BİLEREK sinyal sayılmıyor:
 * üretici 110'u hiç yapmamış olabilir ve o listeyi uydurmak kataloğa
 * var olmayan ürün sokardı.
 */
export function findSeriesGaps(groups: SeriesGroup[]): SeriesGap[] {
  const bulgular: SeriesGap[] = [];

  for (const grup of groups) {
    const uyeAdlari = grup.members.map((m) => m.model);

    if (grup.members.length === 1) {
      bulgular.push({
        brand: grup.brand,
        series: grup.series,
        category: grup.category,
        reason: 'Seride tek kayıt var — serinin diğer üyeleri eksik olabilir.',
        members: uyeAdlari,
      });
      continue;
    }

    /*
     * MC/MM ASİMETRİSİ YALNIZCA KAMERALARDA ANLAMLI.
     *
     * Kamerada MC renkli, MM mono sensördür ve üretici çoğu sensörü
     * ikisinden de yapar — biri varken diğerinin yokluğu bir boşluktur.
     * AMA optik tüpte "MC" Maksutov-Cassegrain demek (Bresser Messier
     * MC-127 gerçek veride yakalandı): orada MM diye bir karşılık yok ve
     * uyarı üretmek yanlış olurdu. Kural bu yüzden kategoriye bağlı.
     */
    if (KAMERA_KATEGORILERI.includes(grup.category)) {
      const mc = grup.variants.includes('MC');
      const mm = grup.variants.includes('MM');
      if (mc !== mm) {
        bulgular.push({
          brand: grup.brand,
          series: grup.series,
          category: grup.category,
          reason: `Seride ${mc ? 'MC' : 'MM'} varyantı var ama ${mc ? 'MM' : 'MC'} yok.`,
          members: uyeAdlari,
        });
      }
    }
  }

  return bulgular;
}
