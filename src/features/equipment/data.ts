/** Ekipman veritabanı tohum verisi (§8.3). Faz 1.5'te admin yönetimli DB'ye taşınır. */

export type EquipmentCategory =
  'optik-tup' | 'montur' | 'astro-kamera' | 'filtre' | 'guide' | 'aksesuar';

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  'optik-tup': 'Optik Tüp',
  montur: 'Montür',
  'astro-kamera': 'Astro Kamera',
  filtre: 'Filtre',
  guide: 'Guide Sistemi',
  aksesuar: 'Aksesuar',
};

export interface EquipmentModel {
  slug: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
  /** Kategoriye göre değişen öne çıkan teknik özellikler (§9.2 iki katman) */
  specs: Record<string, string>;
  priceHint?: string; // yaklaşık segment
  /** Modelin ne işe yaradığını ve kime uygun olduğunu anlatan kısa metin. */
  summary?: string;
  /** Bu modelle çalışırken bilinmesi gereken pratik notlar. */
  notes?: string[];
}

export const equipment: EquipmentModel[] = [
  {
    slug: 'sw-esprit-100',
    brand: 'Sky-Watcher',
    model: 'Esprit 100ED',
    category: 'optik-tup',
    specs: { Açıklık: '100 mm', Odak: '550 mm', 'f/': '5.5', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      'Üçlü apokromatik cam, tam kare sensörü dolduran düz alan ve 550 mm odak: kısa odak geniş alanla uzun odak detayı arasında en dengeli aralık.',
    notes: [
      'Standart backfocus 55 mm — flattener ile birlikte satılır.',
      '6.4 kg tüp ağırlığı, görüntüleme için en az 13 kg sınıfı montür ister.',
    ],
  },
  {
    slug: 'wo-redcat-51',
    brand: 'William Optics',
    model: 'RedCat 51',
    category: 'optik-tup',
    specs: {
      Açıklık: '51 mm',
      Odak: '250 mm',
      'f/': '4.9',
      Tip: 'Petzval APO',
    },
    priceHint: 'Orta segment',
    summary:
      'Petzval tasarımı sayesinde düzeltici gerektirmeyen, 250 mm odakta çok geniş alan veren taşınabilir bir astrograf. İlk ciddi astrofoto optiği olarak sık önerilir.',
    notes: [
      'Sabit odak kilidi vardır; sıcaklık değişiminde odak kayması düşüktür.',
      'Hafifliği taşınabilir montürlerle uyumlu kılar.',
    ],
  },
  {
    slug: 'sw-200p-f4',
    brand: 'Sky-Watcher',
    model: '200P f/4 Newton',
    category: 'optik-tup',
    specs: { Açıklık: '203 mm', Odak: '800 mm', 'f/': '4', Tip: 'Newton' },
    priceHint: 'Orta segment',
    summary:
      'f/4 hızıyla kısa pozlarda derin sinyal toplayan 8 inç Newton. Aynı açıklıkta en ekonomik çözüm, karşılığında koma düzeltici ve kolimasyon disiplini ister.',
    notes: [
      'Koma düzeltici zorunludur; düzelticisiz köşe yıldızları kanat açar.',
      'Her kurulumda kolimasyon kontrolü gerekir.',
      "Tüp uzunluğu rüzgâra açık alanlarda guiding'i zorlar.",
    ],
  },
  {
    slug: 'sw-eq6r-pro',
    brand: 'Sky-Watcher',
    model: 'EQ6-R Pro',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '20 kg',
      Tip: 'Ekvatoryal (GoTo)',
      Ağırlık: '17.7 kg',
    },
    priceHint: 'Üst segment',
    summary:
      "20 kg nominal kapasiteli belt-drive ekvatoryal montür. Orta sınıf astrofotoğrafın omurgası; 8–10 kg'lık kurulumları rahat taşır.",
    notes: [
      "Görüntüleme için gerçekçi yük sınırı ~12 kg (nominal kapasitenin %60'ı).",
      '17.7 kg gövde ağırlığı sahaya taşımayı tek başına zorlaştırır.',
    ],
  },
  {
    slug: 'ioptron-gem28',
    brand: 'iOptron',
    model: 'GEM28',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '12.7 kg',
      Tip: 'Ekvatoryal (GoTo)',
      Ağırlık: '4.5 kg',
    },
    priceHint: 'Orta segment',
    summary:
      '12.7 kg kapasiteye karşılık 4.5 kg gövde: taşınabilirlik/kapasite oranı yüksek seyahat montürü.',
    notes: [
      "Kısa ve orta odaklı APO'larla iyi eşleşir.",
      "Uzun Newton'larda rüzgâr etkisi belirginleşir.",
    ],
  },
  {
    slug: 'sw-star-adventurer-gti',
    brand: 'Sky-Watcher',
    model: 'Star Adventurer GTi',
    category: 'montur',
    specs: {
      'Yük kapasitesi': '5 kg',
      Tip: 'Taşınabilir GoTo',
      Ağırlık: '2.6 kg',
    },
    priceHint: 'Giriş segment',
    summary:
      'Sırt çantasına giren GoTo takip montürü. Kamera + kısa odak lens ya da hafif bir astrograf için tasarlandı.',
    notes: [
      "5 kg nominal kapasite; görüntülemede 2.5–3 kg'ı geçmemek gerekir.",
      'Geniş alan ve Samanyolu çekimleri için yeterli.',
    ],
  },
  {
    slug: 'zwo-asi2600mm',
    brand: 'ZWO',
    model: 'ASI2600MM Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C mono',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'APS-C mono sensör, 3.76 µm piksel ve düşük okuma gürültüsü. Dar bant SHO çalışmalarının referans kamerası.',
    notes: [
      'Mono sensör filtre tekerleği ve filtre seti gerektirir — bütçe hesabı kamera ile bitmez.',
      'Backfocus 17.5 mm; ara halka hesabına bunu dâhil edin.',
    ],
  },
  {
    slug: 'zwo-asi533mc',
    brand: 'ZWO',
    model: 'ASI533MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: '1" renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '3008×3008',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      'Kare 1 inç renkli sensör; tek pozda renk verdiği için tek gecelik çekimlerde verimli. Kare kadraj, kompozisyonu döndürme derdinden kurtarır.',
    notes: [
      'Amp glow göstermez, kalibrasyon basittir.',
      'Küçük sensör kısa odakta dar alan demektir; mozaik ihtiyacı doğabilir.',
    ],
  },
  {
    slug: 'antlia-3nm-sho',
    brand: 'Antlia',
    model: '3nm SHO Seti (36mm)',
    category: 'filtre',
    specs: { 'Bant genişliği': '3 nm', Boyut: '36 mm', Set: 'Ha / OIII / SII' },
    priceHint: 'Üst segment',
    summary:
      '3 nm bant genişliği ay ışığını ve şehir parazitini büyük ölçüde keser. Bortle 6+ gökyüzünde dar bant çekimi mümkün kılar.',
    notes: [
      'Dar bant, f/4 ve altı hızlı optiklerde bant kayması yaşayabilir.',
      '36 mm boyut, APS-C sensörde vinyetlemesiz kapsama sağlar.',
    ],
  },
  {
    slug: 'optolong-lextreme',
    brand: 'Optolong',
    model: 'L-eXtreme',
    category: 'filtre',
    specs: { 'Bant genişliği': '7 nm dual', Boyut: '2"', Set: 'Ha + OIII' },
    priceHint: 'Orta segment',
    summary:
      'Ha ve OIII bantlarını tek filtrede birleştirir; renkli kameralarla tek gecede iki kanal toplamayı sağlar.',
    notes: [
      'Renkli (OSC) kameralar için tasarlandı; mono kamerada tekil filtreler daha verimli.',
      '7 nm bant, ay ışığında 3 nm kadar agresif değildir.',
    ],
  },
  {
    slug: 'zwo-asi174mini',
    brand: 'ZWO',
    model: 'ASI174MM Mini',
    category: 'guide',
    specs: { Sensör: '1/1.2" mono', Piksel: '5.86 µm', Kullanım: 'OAG guide' },
    priceHint: 'Orta segment',
    summary:
      "5.86 µm piksel ve büyük sensör alanı, OAG'de yıldız bulmayı kolaylaştırır — dar prizma alanında en kritik özellik.",
    notes: [
      'OAG kullanımı için tasarlanmıştır; ayrı guide teleskopunda da çalışır.',
      'Büyük piksel, uzun odakta guide ölçeğini kabalaştırır.',
    ],
  },
  {
    slug: 'zwo-oag-l',
    brand: 'ZWO',
    model: 'OAG-L',
    category: 'guide',
    specs: { Tip: 'Off-axis guider', Prizma: '12×12 mm', Backfocus: '16.5 mm' },
    priceHint: 'Orta segment',
    summary:
      'Off-axis guider: guide kamerayı ana optiğin ışık yolundan besler, diferansiyel esnemeyi ortadan kaldırır.',
    notes: [
      '16.5 mm backfocus tüketir — ara halka hesabını buna göre yapın.',
      'Uzun odakta ayrı guide teleskopuna göre belirgin üstündür.',
    ],
  },
  {
    slug: 'pegasus-pocket-powerbox',
    brand: 'Pegasus Astro',
    model: 'Pocket Powerbox Advance',
    category: 'aksesuar',
    specs: { Çıkış: '4× 12V + 2× dew', Kontrol: 'USB', Sensör: 'Sıcaklık/nem' },
    priceHint: 'Orta segment',
    summary:
      'Sahada kablo karmaşasını tek kutuya indirir: dört 12V çıkış, iki ısıtıcı bandı kanalı ve USB üzerinden kontrol.',
    notes: [
      'Çiy noktası sensörü ısıtıcıyı otomatik yönetir.',
      'Tek kablo ile montüre güç ve veri taşımayı mümkün kılar.',
    ],
  },
];

/**
 * Marka adını URL parçasına çevirir: "Sky-Watcher" → "sky-watcher".
 *
 * URL deseni §20'de `/ekipman/:brand/:slug` olarak sabitlendi. Markanın
 * URL'de olması, "ZWO ürünleri" gibi bir kırılımı ileride kırık bağlantı
 * üretmeden açmayı mümkün kılıyor.
 */
export function brandSlug(brand: string): string {
  return brand
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Modelin detay sayfası yolu. */
export function equipmentPath(model: EquipmentModel): string {
  return `/ekipman/${brandSlug(model.brand)}/${model.slug}`;
}

/**
 * Model slug'ından kaydı bulur.
 *
 * Marka parçası **doğrulanmaz**, yalnızca okunabilirlik ve gelecekteki marka
 * kırılımı için URL'de durur: marka adı düzeltilirse (yazım hatası, birleşme)
 * eski bağlantı çalışmaya devam etmeli. Kanonik adres `equipmentPath` ile
 * üretilir ve sayfa kendi canonical etiketini basar.
 */
export function getEquipmentBySlug(slug: string): EquipmentModel | undefined {
  return equipment.find((e) => e.slug === slug);
}

/** Aynı kategorideki diğer modeller (karşılaştırma önerisi için). */
export function relatedEquipment(
  model: EquipmentModel,
  limit = 4
): EquipmentModel[] {
  return equipment
    .filter((e) => e.category === model.category && e.slug !== model.slug)
    .slice(0, limit);
}
