/**
 * TARAYICI DEPOSU ENVANTERİ (§15.7).
 *
 * KVKK aydınlatma metni "hangi verileri saklıyorsunuz" sorusuna cevap
 * vermek zorunda. Bu dosya o cevabın **tek kaynağı**: yeni bir anahtar
 * eklendiğinde burada da görünmezse envanter yalan söyler, bu yüzden
 * anahtarlar burada tanımlanır ve modüller buradan okur.
 *
 * NEDEN ÇEREZ BANNER'I YOK
 * Astrohub şu an hiçbir izleme çerezi yazmıyor. Yazılan her şey
 * `localStorage`'da ve tamamı kullanıcının kendi tercihleri: tema, konum,
 * görünüm, ses düzeyi. KVKK ve ePrivacy açık rızayı **zorunlu olmayan**
 * çerezler için ister; zorunlu olanlar (ve kullanıcının kendi ayarları)
 * için istemez. Var olmayan bir izlemeyi onaylatan bir banner göstermek
 * kullanıcıyı yanıltmak olurdu. Bunun yerine bu sayfa ne saklandığını
 * gösteriyor ve silmeyi bir tıka indiriyor.
 *
 * Analitik eklendiğinde: `analytics` kaydı `consentRequired: true` ile
 * buraya girer ve rıza kutusu görünür hâle gelir.
 */

export type StoragePurpose = 'tercih' | 'islevsel' | 'analitik';

export interface StorageItem {
  key: string;
  label: string;
  purpose: StoragePurpose;
  description: string;
  /** Açık rıza gerektirir mi? (izleme/analitik) */
  consentRequired: boolean;
  /** Anahtar bir önekse (ör. modül bazlı görünüm tercihi). */
  prefix?: boolean;
}

export const storageInventory: StorageItem[] = [
  {
    key: 'astrohub:theme',
    label: 'Tema tercihi',
    purpose: 'tercih',
    description:
      'Açık / koyu / saha teması seçiminiz. Saklanmazsa her ziyarette koyu temaya dönülür.',
    consentRequired: false,
  },
  {
    key: 'astrohub:location',
    label: 'Gözlem konumu',
    purpose: 'islevsel',
    description:
      'Seçtiğiniz şehir ya da izin verdiyseniz cihaz konumunuz. Efemeris ve hava hesapları bunu kullanır. Koordinat sunucumuza gönderilmez; hava servisine istek atılırken kullanılır.',
    consentRequired: false,
  },
  {
    key: 'astrohub:view:',
    label: 'Görünüm tercihleri',
    purpose: 'tercih',
    description:
      'Her modülde ızgara mı liste mi tercih ettiğiniz. Modül başına ayrı bir anahtar tutulur.',
    consentRequired: false,
    prefix: true,
  },
  {
    key: 'astrohub:map:tiles',
    label: 'Harita döşemeleri izni',
    purpose: 'tercih',
    description:
      'Işık kirliliği haritasının görüntüleri üçüncü taraf sunucularından (CARTO, djlorenz.github.io) yüklenir; haritayı açtığınızda IP adresiniz ve baktığınız bölge oraya gider. Bu anahtar yalnızca "izin verdim" bilgisini tutar. Silerseniz harita bir daha sorar.',
    consentRequired: false,
  },
  {
    key: 'astrohub:radio:volume',
    label: 'Radyo ses düzeyi',
    purpose: 'tercih',
    description: 'Radyo oynatıcısının ses seviyesi.',
    consentRequired: false,
  },
  {
    key: 'astrohub:preview-hero',
    label: 'Önizleme düzenleyici',
    purpose: 'islevsel',
    description:
      'Yalnızca tasarım önizleme derlemesinde kullanılır; yayın sürümünde yazılmaz.',
    consentRequired: false,
  },
];

export const purposeLabels: Record<StoragePurpose, string> = {
  tercih: 'Tercih',
  islevsel: 'İşlevsel',
  analitik: 'Analitik',
};

export interface StoredEntry {
  item: StorageItem;
  /** Bu envanter kaydına karşılık gelen gerçek anahtarlar. */
  keys: string[];
}

/**
 * Envanterdeki kayıtların tarayıcıda gerçekten var olanlarını döndürür.
 *
 * Envanteri değil **gerçeği** göstermek önemli: kullanıcı "konumum
 * saklanıyor" yazısını görüp de aslında hiç saklanmamış olmasını
 * anlamsız bulur. Var olmayan kayıtlar listede "saklanmıyor" olarak
 * işaretlenir.
 */
export function readStoredEntries(): StoredEntry[] {
  if (typeof localStorage === 'undefined') {
    return storageInventory.map((item) => ({ item, keys: [] }));
  }

  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) allKeys.push(key);
  }

  return storageInventory.map((item) => ({
    item,
    keys: item.prefix
      ? allKeys.filter((k) => k.startsWith(item.key))
      : allKeys.filter((k) => k === item.key),
  }));
}

/** Bir envanter kaydına ait tüm anahtarları siler. */
export function clearStorageItem(item: StorageItem): void {
  if (typeof localStorage === 'undefined') return;

  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (item.prefix ? key.startsWith(item.key) : key === item.key) {
      doomed.push(key);
    }
  }
  doomed.forEach((key) => localStorage.removeItem(key));
}

/**
 * Astrohub'a ait tüm anahtarları siler.
 *
 * Yalnızca `astrohub:` öneki taşıyanlar silinir — aynı alan adında başka
 * bir uygulamanın verisi varsa ona dokunmak bizim işimiz değil.
 */
export function clearAllStorage(): number {
  if (typeof localStorage === 'undefined') return 0;

  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('astrohub:')) doomed.push(key);
  }
  doomed.forEach((key) => localStorage.removeItem(key));
  return doomed.length;
}

/** Rıza gerektiren (izleme amaçlı) kayıt var mı? */
export function hasConsentRequiredItems(): boolean {
  return storageInventory.some((item) => item.consentRequired);
}
