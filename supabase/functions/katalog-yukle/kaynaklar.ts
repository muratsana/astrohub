/**
 * KATALOG KAYNAKLARI — nereden geliyor, neden orası.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ÜÇÜNCÜ TARAF KATALOG, NEDEN ELLE YAZILMIŞ LİSTE DEĞİL
 *
 * Depodaki `catalog.ts` 230 satır elle girilmiş hedef taşıyordu. O liste
 * bir başlangıç olarak doğruydu ama "eksiksiz" olamaz: NGC tek başına
 * 7.840, IC 5.386 kayıt. Elle girilen her satır ayrıca bir yazım hatası
 * riski — ve 19.000 satırda o risk kesinliğe döner.
 *
 * Bu yüzden ölçülen değerler (koordinat, kadir, açısal boyut) BİRİNCİL
 * kataloglardan çekiliyor. Türkçe adlar, açıklamalar ve editör notları
 * bizim; sayılar kaynağın.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYNAK SEÇİMİ
 *
 * OpenNGC — NGC ve IC'nin bakımı yapılan, açık lisanslı (CC-BY-SA-4.0)
 * sürümü. Ham NGC/IC yayınlarındaki konum ve tip hataları düzeltilmiş,
 * her satır kaynağıyla birlikte veriliyor. Messier ve Caldwell numaraları
 * da kendi sütunlarında geliyor, yani bu üç katalog tek kaynaktan tutarlı
 * çıkıyor.
 *
 * VizieR — Sh2, Barnard, LBN, LDN, vdB, Ced, RCW, Arp, HCG ve GCVS için CDS'in
 * yayımladığı orijinal katalog tabloları. Bunlar OpenNGC'de YOK: NGC/IC
 * numarası olmayan binlerce bulutsu ve karanlık bulut yalnızca bu
 * kataloglarda numaralı.
 *
 * VI/42 (Roman 1987) — IAU takımyıldız sınırları. VizieR kataloglarının
 * çoğu takımyıldız sütunu taşımıyor; koordinattan hesaplamak zorundayız
 * ve bunun tek doğru yolu resmî sınır tablosu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN ÇALIŞMA ANINDA İNDİRİLİYOR, NEDEN DEPODA DEĞİL
 *
 * Üretilen SQL ~19.000 nesne + ~30.000 katalog kodu; depoda 4 MB'lık bir
 * üretilmiş dosya demek. Her yenilemede yeni bir 4 MB blob — git geçmişi
 * birkaç yenilemede kataloğun kendisinden büyük olurdu.
 *
 * Bunun bedeli şu: içe aktarma İNTERNETE bağımlı. Kabul edilebilir çünkü
 * içe aktarma yılda birkaç kez çalışan bir bakım işi, kurulum adımı
 * değil — `01_katalog.sql` uygulamayı ayağa kaldırmaya yetiyor.
 */

export interface VizierAlan {
  /** VizieR sütun adı. */
  ad: string;
  /** Normalleştirilmiş isimde kullanılacak anahtar. */
  anahtar: string;
}

export interface VizierKaynak {
  /** Katalog önekimiz: "Sh2-155" için `Sh2-`, "Barnard 33" için `Barnard `. */
  onek: string;
  /** Ayırıcı: bazı kataloglar tire, çoğu boşluk kullanır. */
  ayirici: string;
  /** VizieR tablo yolu. */
  tablo: string;
  /** Numara sütunu. */
  numara: string;
  /** Numara sütunu sayısal değil, doğrudan katalog adıysa. */
  metinKod?: boolean;
  /**
   * Numara sütunu doğrudan sayı değilse kullanılan çıkarım deseni.
   *
   * Örn. V/84 gezegenimsi bulutsu kataloğunda Abell kayıtları `Name`
   * sütununda "A 39" olarak gelir; birinci yakalama grubu katalog
   * numarasına çevrilir.
   */
  numaraDeseni?: string;
  /** Büyük eksen sütunu (yay dakikası) — yoksa boş. */
  capSutun?: string;
  /** Küçük eksen sütunu (yay dakikası). */
  capSutun2?: string;
  /** Alan sütunu (derece kare) — çaptan yoksa buradan hesaplanır. */
  alanSutun?: string;
  /** Kadir sütunu. */
  kadirSutun?: string;
  /** Bizim tür sınıfımız. */
  tur: string;
  /** İnsan okunur katalog adı — içe aktarma raporunda görünüyor. */
  baslik: string;
  /** Rapor anahtarı. Aynı önek birden çok tablodan geliyorsa ayrıştırır. */
  raporAnahtari?: string;
  /** VizieR sorgusuna eklenecek güvenli filtre parçası. */
  filtre?: string;
}

/**
 * SIRALAMA ÖNEMLİ.
 *
 * Aynı gök cismi birden çok katalogda numaralı olabilir. Konum eşleşmesi
 * ilk gelen kaydı ASIL sayıp sonrakileri ona takma ad olarak bağlıyor.
 * Sh2 önce geliyor çünkü Türkiye'den çekilen emisyon bulutsularının
 * yaygın adlandırması o; LDN en sonda çünkü 1.791 kaydın çoğu tek başına
 * bir hedef değil, daha büyük bir kompleksin parçası.
 */
export const VIZIER_KAYNAKLAR: VizierKaynak[] = [
  {
    onek: 'Sh2',
    ayirici: '-',
    tablo: 'VII/20/catalog',
    numara: 'Sh2',
    capSutun: 'Diam',
    tur: 'emisyon-bulutsusu',
    baslik: 'Sharpless (Sh2)',
  },
  {
    onek: 'Abell',
    ayirici: ' ',
    tablo: 'V/84/main',
    numara: 'Name',
    numaraDeseni: '^A *(\\d+)$',
    tur: 'gezegenimsi-bulutsu',
    baslik: 'Abell gezegenimsi bulutsuları',
    raporAnahtari: 'abell_pn',
    filtre: '&Name=A*',
  },
  {
    onek: 'Abell',
    ayirici: ' ',
    tablo: 'V/84/pospn',
    numara: 'Name',
    numaraDeseni: '^A *(\\d+)$',
    tur: 'gezegenimsi-bulutsu',
    baslik: 'Abell olası gezegenimsi bulutsuları',
    raporAnahtari: 'abell_pn_olasi',
    filtre: '&Name=A*',
  },
  {
    onek: 'Barnard',
    ayirici: ' ',
    tablo: 'VII/220A/barnard',
    numara: 'Barn',
    capSutun: 'Diam',
    tur: 'karanlik-bulutsu',
    baslik: 'Barnard karanlık bulutları',
  },
  {
    onek: 'vdB',
    ayirici: ' ',
    tablo: 'VII/21/catalog',
    numara: 'VdB',
    tur: 'yansima-bulutsusu',
    baslik: 'van den Bergh yansıma bulutsuları',
  },
  {
    onek: 'RCW',
    ayirici: ' ',
    tablo: 'VII/216/rcw',
    numara: 'RCW',
    capSutun: 'Diam1',
    capSutun2: 'Diam2',
    tur: 'emisyon-bulutsusu',
    baslik: 'RCW (güney H II bölgeleri)',
  },
  {
    onek: 'Ced',
    ayirici: ' ',
    tablo: 'VII/231/catalog',
    numara: 'Ced',
    tur: 'bulutsu',
    baslik: 'Cederblad',
  },
  {
    onek: 'HCG',
    ayirici: ' ',
    tablo: 'VII/213/groups',
    numara: 'HCG',
    tur: 'galaksi-grubu',
    baslik: 'Hickson sıkışık galaksi grupları',
  },
  {
    onek: 'Arp',
    ayirici: ' ',
    tablo: 'VII/192/arplist',
    numara: 'Arp',
    capSutun: 'dim1',
    kadirSutun: 'VT',
    tur: 'galaksi',
    baslik: 'Arp tuhaf galaksiler',
  },
  {
    onek: 'LBN',
    ayirici: ' ',
    tablo: 'VII/9/catalog',
    numara: 'Seq',
    capSutun: 'Diam1',
    capSutun2: 'Diam2',
    tur: 'bulutsu',
    baslik: 'Lynds parlak bulutsular (LBN)',
  },
  {
    onek: 'LDN',
    ayirici: ' ',
    tablo: 'VII/7A/ldn',
    numara: 'LDN',
    alanSutun: 'Area',
    tur: 'karanlik-bulutsu',
    baslik: 'Lynds karanlık bulutsular (LDN)',
  },
  {
    onek: '',
    ayirici: '',
    tablo: 'B/gcvs/gcvs_cat',
    numara: 'GCVS',
    metinKod: true,
    kadirSutun: 'magMax',
    tur: 'yildiz',
    baslik: 'GCVS değişen yıldızlar',
    raporAnahtari: 'gcvs',
  },
];

const VIZIER = 'https://vizier.cds.unistra.fr/viz-bin/asu-tsv';

/** Bir VizieR kaynağı için indirme adresi. */
export function vizierUrl(kaynak: VizierKaynak): string {
  const sutunlar = [
    kaynak.numara,
    kaynak.capSutun,
    kaynak.capSutun2,
    kaynak.alanSutun,
    kaynak.kadirSutun,
  ]
    .filter(Boolean)
    .map((s) => `&-out=${s}`)
    .join('');

  return (
    `${VIZIER}?-source=${encodeURIComponent(kaynak.tablo)}` +
    `&-out.max=unlimited&-out.add=_RAJ2000,_DEJ2000&-oc.form=dec${sutunlar}` +
    (kaynak.filtre ?? '')
  );
}

/** IAU takımyıldız sınırları (Roman 1987). */
export const SINIR_URL =
  `${VIZIER}?-source=VI%2F42%2Fdata&-out.max=unlimited` +
  '&-out=RA_low&-out=RA_up&-out=DE_low&-out=const';

const OPENNGC =
  'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files';

export const OPENNGC_URL = `${OPENNGC}/NGC.csv`;
export const OPENNGC_EK_URL = `${OPENNGC}/addendum.csv`;
