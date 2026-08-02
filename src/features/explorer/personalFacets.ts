import type { ExplorerSpec, FacetSpec } from './query';

/**
 * KİŞİSEL FACET'LER — "kaydettiklerim", "takip ettiklerim" (Faz 4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR KAVRAM
 *
 * Olağan bir facet KAYDIN KENDİSİNE bakar: fotoğrafın paleti, kulübün
 * şehri, ilanın durumu. `valueOf` saf bir fonksiyondur ve modül
 * yüklendiğinde tanımlanır.
 *
 * Kişisel facet OTURUMA bakar. "Bu fotoğrafı kaydettim mi" sorusunun
 * cevabı kayıtta yok — kullanıcının `collection_items` satırlarında.
 * Yani bu facet'ler bir küme geldikten SONRA kurulabiliyor ve o küme
 * kullanıcıdan kullanıcıya değişiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * OTURUM YOKSA FACET DE YOK
 *
 * Bu kuralın somut hâli `withFacets`in `null` kabul etmesi: veri
 * gelmediyse ya da oturum yoksa çağıran taraf `null` geçiyor ve facet
 * arayüzde HİÇ ÇİZİLMİYOR.
 *
 * Alternatif —"Kaydettiklerim" kutusunu herkese gösterip oturumsuz
 * kullanıcıda her zaman boş sonuç döndürmek— fazın açıkça yasakladığı
 * şeydi: çalışmayan bir kontrol. Kullanıcı kutuyu işaretler, liste
 * boşalır ve "hiç kaydetmemişim" diye düşünür; oysa sorun oturumun
 * olmaması.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KÜME YÜKLENİRKEN DE FACET YOK
 *
 * Yalnızca "oturum var mı" yetmiyor. Küme daha gelmemişken facet'i
 * çizersek, kullanıcı işaretler ve liste boş görünür; küme bir saniye
 * sonra gelince kendiliğinden dolar. Aradaki o kare, "kaydettiğim
 * fotoğraf yok" diye okunur. Hazır olmayan bir süzgeci göstermemek,
 * yanlış cevap vermekten iyi.
 */

/** Kişisel facet'lerde kullanılan tek değer — chip metni etikete bakar. */
export const PERSONAL_VALUE = 'evet';

export interface PersonalFacetInput<T> {
  /** URL parametre adı (`kaydettiklerim`, `takip`…). */
  param: string;
  label: string;
  /** Kayıt kullanıcının kümesinde mi? */
  has: (item: T) => boolean;
}

/**
 * Evet/hayır kişisel facet'i.
 *
 * `valueOf` yalnızca koşul SAĞLANDIĞINDA bir değer üretiyor, aksi hâlde
 * `null`. `clubsSpec`teki "halka açık etkinlik" deseninin aynısı: seçim
 * o kaydı geçirir, seçimsizlik hiçbir şey süzmez — üç durumlu bir onay
 * kutusu yazmaya gerek kalmıyor.
 */
export function personalFacet<T>(input: PersonalFacetInput<T>): FacetSpec<T> {
  return {
    param: input.param,
    label: input.label,
    valueOf: (item) => (input.has(item) ? PERSONAL_VALUE : null),
    labelOf: () => 'evet',
  };
}

/**
 * Tanıma facet EKLER — var olanı değiştirmeden.
 *
 * `null` ve `undefined` girdiler atlanıyor: çağıran taraf "bu facet
 * bugün kurulamıyor" derken bir koşul zinciri yazmak zorunda kalmasın.
 *
 * YENİ NESNE DÖNÜYOR, tanım MUTASYONA UĞRAMIYOR. Spec'ler modül
 * sabitleri; birine facet eklemek bütün sayfalarda görünürdü ve iki
 * farklı kullanıcının kümesi aynı sabitte birbirinin üstüne yazardı.
 */
export function withFacets<T>(
  spec: ExplorerSpec<T>,
  extra: (FacetSpec<T> | null | undefined)[]
): ExplorerSpec<T> {
  const eklenecek = extra.filter((f): f is FacetSpec<T> => Boolean(f));
  if (eklenecek.length === 0) return spec;

  /* Aynı `param` iki kez tanımlanırsa sorgu durumu iki facet'e birden
     bağlanır ve chip'ler çoğalır. Var olan kazanıyor: sayfanın kendi
     tanımı, sonradan eklenen kişisel facet'ten önceliklidir. */
  const mevcut = new Set(spec.facets.map((f) => f.param));
  return {
    ...spec,
    facets: [...spec.facets, ...eklenecek.filter((f) => !mevcut.has(f.param))],
  };
}
