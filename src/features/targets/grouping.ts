import type { TargetKind } from '../../domain/targets/derive';

/**
 * HEDEF TÜRLERİNİ ÜÇ ÇİPE İNDİRGEME — "Bu Gece" panelinin filtresi.
 *
 * Katalog 19 tür taşıyor (`TargetKind`). Ana sayfadaki panelde altı satır
 * gösteriliyor ve 19 seçenekli bir filtre orada iş görmez: kullanıcı gece
 * planını beş saniyede kurmak için bakıyor, açılır liste okumak için değil.
 * Tasarım bu yüzden dört çip istiyor — Tümü / Bulutsu / Küme / Galaksi.
 *
 * Üçe indirgemenin ölçüsü GÖZLEM DAVRANIŞI, taksonomi değil. Astrofotoğrafçı
 * "bu gece bulutsu mu çekeyim, küme mi" diye sorar; sorunun arkasında somut
 * bir donanım kararı vardır:
 *
 *   Bulutsu → dar bant filtre, uzun poz, ay varsa hâlâ çalışır
 *   Küme    → geniş bant, kısa poz, seeing belirleyici
 *   Galaksi → karanlık şart, ay varsa gece yanar
 *
 * Süpernova kalıntısı bu yüzden BULUTSU tarafında: köken olarak bir yıldız
 * ölümü ama çekim tarafında Ha/OIII ile çalışan bir gaz bulutu (Çarşaf,
 * Yengeç). Sınıflandırma doğruluğu için "kalıntı" ayrı bir çip olurdu ve
 * kimsenin kararını değiştirmezdi.
 *
 * ÜÇ ÇİPİN DIŞINDA KALANLAR BİLEREK GRUPSUZ. Çift yıldız, asterizm, yıldız
 * bulutu ve Güneş sistemi hedefleri hiçbir çipe girmez; yalnızca "Tümü"de
 * görünürler. Onları zorla bir gruba tıkıştırmak (asterizmi "küme" saymak
 * gibi) filtreyi yalancı yapardı: "Küme" diyen kullanıcı küme bekler.
 *
 * `Record<TargetKind, …>` KASITLI: katalog yeni bir tür kazandığında bu
 * dosya derlenmez ve karar vermek zorunda kalırsınız. `switch` ya da
 * `includes` ile yazılsaydı yeni tür sessizce "grupsuz" olurdu.
 */

export type TargetGroup = 'bulutsu' | 'kume' | 'galaksi';

/** Filtre çipinin değeri — "hepsi" hiçbir şeyi elemez. */
export type TargetGroupFilter = TargetGroup | 'hepsi';

const GROUP_OF: Record<TargetKind, TargetGroup | null> = {
  // ---- Bulutsu: gaz ve toz; dar bant filtre ile ay altında da çalışır
  'emisyon-bulutsusu': 'bulutsu',
  'yansima-bulutsusu': 'bulutsu',
  'gezegenimsi-bulutsu': 'bulutsu',
  'karanlik-bulutsu': 'bulutsu',
  'sungerimsi-kalinti': 'bulutsu',
  /* Türü kaynakta ayrıntılandırılmamış bulutsular da bu gruba giriyor:
     hangi tür olduğunu bilmiyoruz ama bulutsu olduğunu biliyoruz ve
     grup filtresi tam olarak o soruyu soruyor. */
  bulutsu: 'bulutsu',

  // ---- Küme: çözülmüş yıldızlar; seeing belirleyici
  'kuresel-kume': 'kume',
  'acik-kume': 'kume',

  // ---- Galaksi: en zayıf yüzey parlaklığı; karanlık şart
  galaksi: 'galaksi',
  'galaksi-grubu': 'galaksi',

  /*
   * ---- Grupsuz.
   *
   * Yıldız bulutu (M 24) bir küme değil, Samanyolu'nun bir penceresi:
   * yıldızlar aynı yerde değil, aynı bakış doğrultusunda. Çift yıldız ve
   * asterizm de gözlem tarafında ayrı işler — çift yıldız yüksek büyütme
   * ve iyi seeing ister, asterizm geniş alan.
   *
   * Güneş sistemi hedefleri zaten bu listeye hiç girmiyor: sabit
   * koordinatları yok ve panel kulminasyona göre sıralıyor. Yine de
   * burada duruyorlar, çünkü eksikleri derlemeyi kırar ve "unutuldu mu,
   * bilerek mi" sorusu bir daha sorulmaz.
   */
  'yildiz-bulutu': null,
  'cift-yildiz': null,
  asterizm: null,
  yildiz: null,
  diger: null,
  gezegen: null,
  ay: null,
  gunes: null,
  'kuyruklu-yildiz': null,
  'meteor-yagmuru': null,
  'genis-alan': null,
  'gokyuzu-olayi': null,
};

export function groupOfKind(kind: TargetKind): TargetGroup | null {
  return GROUP_OF[kind] ?? null;
}

export function matchesGroup(
  kind: TargetKind,
  filter: TargetGroupFilter
): boolean {
  return filter === 'hepsi' || GROUP_OF[kind] === filter;
}

/** Çip sırası tasarımdaki sıra: Tümü, Bulutsu, Küme, Galaksi. */
export const TARGET_GROUP_CHIPS: {
  value: TargetGroupFilter;
  label: string;
}[] = [
  { value: 'hepsi', label: 'Tümü' },
  { value: 'bulutsu', label: 'Bulutsu' },
  { value: 'kume', label: 'Küme' },
  { value: 'galaksi', label: 'Galaksi' },
];
