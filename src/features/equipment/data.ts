/** Ekipman veritabanı tohum verisi (§8.3). Faz 1.5'te admin yönetimli DB'ye taşınır. */

export type EquipmentCategory =
  | 'optik-tup'
  | 'lens'
  | 'montur'
  | 'astro-kamera'
  | 'filtre'
  | 'guide'
  | 'aksesuar';

export const equipmentCategoryLabels: Record<EquipmentCategory, string> = {
  'optik-tup': 'Optik Tüp',
  lens: 'Fotoğraf Lensi',
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

  /* ─────────────── OPTİK TÜPLER ─────────────── */
  {
    slug: 'sw-evostar-72ed',
    brand: 'Sky-Watcher',
    model: 'Evostar 72ED',
    category: 'optik-tup',
    specs: { Açıklık: '72 mm', Odak: '420 mm', 'f/': '5.8', Tip: 'İkili ED' },
    priceHint: 'Giriş segment',
    summary:
      'İlk astrograf olarak en sık önerilen ikili ED refraktör. 420 mm odak geniş alan verir, 2 kg ağırlık taşınabilir montürlerle çalışır.',
    notes: [
      'Düz alan için ayrı flattener gerekir; düzelticisiz köşelerde bozulma belirgindir.',
      'İkili cam, üçlü APO kadar renk düzeltmesi vermez — parlak yıldızlarda hafif mor hâle görülebilir.',
    ],
  },
  {
    slug: 'sw-esprit-120',
    brand: 'Sky-Watcher',
    model: 'Esprit 120ED',
    category: 'optik-tup',
    specs: { Açıklık: '120 mm', Odak: '840 mm', 'f/': '7', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      '840 mm odakta üçlü apokromat: galaksi ve gezegenimsi bulutsu gibi küçük hedeflerde ölçek verirken tam kare sensörü düz alanla doldurur.',
    notes: [
      'Yaklaşık 9 kg tüp ağırlığı, görüntüleme için 20 kg sınıfı montür ister.',
      'Uzun odak, guiding hassasiyetini doğrudan artırır — OAG önerilir.',
    ],
  },
  {
    slug: 'wo-gt71',
    brand: 'William Optics',
    model: 'GT71',
    category: 'optik-tup',
    specs: { Açıklık: '71 mm', Odak: '420 mm', 'f/': '5.9', Tip: 'İkili FPL-53' },
    priceHint: 'Orta segment',
    summary:
      'FPL-53 camlı ikili apokromat; 420 mm odakla geniş alan bulutsularında dengeli bir başlangıç optiği.',
    notes: ['Flat6AII düzelticiyle f/4.9 indirgeme mümkün.'],
  },
  {
    slug: 'askar-fra400',
    brand: 'Askar',
    model: 'FRA400',
    category: 'optik-tup',
    specs: { Açıklık: '72 mm', Odak: '400 mm', 'f/': '5.6', Tip: 'Petzval quintuplet' },
    priceHint: 'Orta segment',
    summary:
      'Beş elemanlı Petzval tasarımı: düzeltici gerektirmez, tam kare kapsama alanı sunar. 0.7× reducer ile 280 mm f/3.9 çalışabilir.',
    notes: [
      'Düzeltici gerekmemesi backfocus hesabını basitleştirir.',
      'Reducer takıldığında kapsama alanı APS-C ile sınırlanır.',
    ],
  },
  {
    slug: 'sw-quattro-150p',
    brand: 'Sky-Watcher',
    model: 'Quattro 150P',
    category: 'optik-tup',
    specs: { Açıklık: '150 mm', Odak: '600 mm', 'f/': '4', Tip: 'Newton' },
    priceHint: 'Orta segment',
    summary:
      'f/4 hızında 6 inç Newton. Aynı açıklıkta apokromat fiyatının çok altında; karşılığında kolimasyon ve koma düzeltici disiplini ister.',
    notes: [
      'Aplanatik koma düzeltici zorunludur.',
      'Açık tüp, çiylenme ve toz açısından refraktörden hassastır.',
    ],
  },
  {
    slug: 'celestron-edgehd-8',
    brand: 'Celestron',
    model: 'EdgeHD 8"',
    category: 'optik-tup',
    specs: { Açıklık: '203 mm', Odak: '2032 mm', 'f/': '10', Tip: 'Schmidt-Cassegrain' },
    priceHint: 'Üst segment',
    summary:
      '2032 mm odakta düz alanlı SCT. Gezegen, gezegenimsi bulutsu ve küçük galaksilerde ölçek verir; 0.7× reducer ile 1422 mm f/7 çalışır.',
    notes: [
      'Uzun odak, guiding hatasını büyütür — OAG neredeyse zorunlu.',
      'Kapalı tüp termal dengeye geç gelir; çekimden en az 45 dk önce dışarı çıkarın.',
    ],
  },
  {
    slug: 'ts-optics-photoline-130',
    brand: 'TS Optics',
    model: 'PhotoLine 130 f/7',
    category: 'optik-tup',
    specs: { Açıklık: '130 mm', Odak: '910 mm', 'f/': '7', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
    summary:
      '130 mm açıklıkla ışık toplama ve 910 mm odakla ölçeği birleştiren üçlü apokromat; reducer ile f/5.6 çalışabilir.',
    notes: ['10 kg üzeri tüp ağırlığı, 25 kg sınıfı montür ister.'],
  },

  /* ─────────────── FOTOĞRAF LENSLERİ ─────────────── */
  {
    slug: 'samyang-135mm-f2',
    brand: 'Samyang',
    model: '135mm f/2 ED UMC',
    category: 'lens',
    specs: { Odak: '135 mm', 'f/': '2.0', Bağlantı: 'Çoklu', Tip: 'Manuel odak' },
    priceHint: 'Orta segment',
    summary:
      'Geniş alan astrofotoğrafının referans lensi. f/2 hızı ve keskin köşeleriyle Ha bölgelerini kısa pozlarda çıkarır; takip montürüyle bile derin sonuç verir.',
    notes: [
      'f/2.8’e kısmak köşe yıldızlarını belirgin düzeltir.',
      'Manuel odak; canlı görüntüde parlak bir yıldızla odaklanmak gerekir.',
    ],
  },
  {
    slug: 'sigma-art-14mm-f18',
    brand: 'Sigma',
    model: 'Art 14mm f/1.8 DG HSM',
    category: 'lens',
    specs: { Odak: '14 mm', 'f/': '1.8', Bağlantı: 'Çoklu', Tip: 'Ultra geniş' },
    priceHint: 'Üst segment',
    summary:
      'Samanyolu manzara çekimlerinin en hızlı ultra geniş seçeneklerinden. 14 mm’de f/1.8, tek karede yeryüzü ve gökyüzünü birlikte tutar.',
    notes: [
      'Ön eleman kabarık; standart vidalı filtre takılamaz.',
      '1.1 kg ağırlık, hafif takip montürlerinde denge sorunu yaratır.',
    ],
  },
  {
    slug: 'canon-rf-50mm-f18',
    brand: 'Canon',
    model: 'RF 50mm f/1.8 STM',
    category: 'lens',
    specs: { Odak: '50 mm', 'f/': '1.8', Bağlantı: 'Canon RF', Tip: 'Standart' },
    priceHint: 'Giriş segment',
    summary:
      'Ucuz ve hafif standart lens; f/2.8–f/4 aralığına kısıldığında geniş alan takım yıldız çekimleri için yeterli keskinlik verir.',
    notes: ['Tam açıkta köşelerde koma belirgindir; kısmak gerekir.'],
  },
  {
    slug: 'nikon-z-20mm-f18',
    brand: 'Nikon',
    model: 'NIKKOR Z 20mm f/1.8 S',
    category: 'lens',
    specs: { Odak: '20 mm', 'f/': '1.8', Bağlantı: 'Nikon Z', Tip: 'Geniş açı' },
    priceHint: 'Üst segment',
    summary:
      'Köşe performansı yüksek geniş açı; 20 mm odak, Samanyolu yayını manzarayla birlikte çerçeveler ve 77 mm vidalı filtre kabul eder.',
    notes: ['Vidalı filtre kabul etmesi, ışık kirliliği filtresi kullanımını mümkün kılar.'],
  },

  /* ─────────────── MONTÜRLER ─────────────── */
  {
    slug: 'sw-heq5-pro',
    brand: 'Sky-Watcher',
    model: 'HEQ5 Pro',
    category: 'montur',
    specs: { Tip: 'Ekvatoryal (GoTo)', 'Yük kapasitesi': '11 kg', Ağırlık: '9.7 kg' },
    priceHint: 'Orta segment',
    summary:
      'Astrofotoğrafa giriş montürünün klasiği. 11 kg nominal kapasiteyle 5–6 kg’lık görüntüleme kurulumlarını taşır ve tek kişi sahaya götürebilir.',
    notes: [
      'Görüntülemede gerçekçi sınır ~6.5 kg (nominalin %60’ı).',
      'Belt-drive dönüşümü periyodik hatayı belirgin düşürür.',
    ],
  },
  {
    slug: 'zwo-am5',
    brand: 'ZWO',
    model: 'AM5 Harmonik',
    category: 'montur',
    specs: { Tip: 'Harmonik dişli (GoTo)', 'Yük kapasitesi': '20 kg', Ağırlık: '5.5 kg' },
    priceHint: 'Üst segment',
    summary:
      'Harmonik dişli montür: 5.5 kg gövdeyle karşı ağırlıksız 13 kg taşır. Taşınabilirlik/kapasite oranında sınıfının en yükseklerinden.',
    notes: [
      'Harmonik dişlide periyodik hata yüksek frekanslıdır; guiding neredeyse zorunlu.',
      'Karşı ağırlıksız kullanım rüzgârda denge marjını daraltır.',
    ],
  },
  {
    slug: 'ioptron-cem70',
    brand: 'iOptron',
    model: 'CEM70',
    category: 'montur',
    specs: { Tip: 'Merkez dengeli ekvatoryal', 'Yük kapasitesi': '31.7 kg', Ağırlık: '15.4 kg' },
    priceHint: 'Üst segment',
    summary:
      'Merkez dengeli tasarım yükü tek noktada toplar; 31.7 kg kapasiteyle uzun odaklı SCT ve büyük refraktörleri taşır.',
    notes: ['Yerleşik kutup arama kamerası seçeneği kurulum süresini kısaltır.'],
  },
  {
    slug: 'sw-eq8-r-pro',
    brand: 'Sky-Watcher',
    model: 'EQ8-R Pro',
    category: 'montur',
    specs: { Tip: 'Ekvatoryal (GoTo)', 'Yük kapasitesi': '50 kg', Ağırlık: '25.5 kg' },
    priceHint: 'Profesyonel',
    summary:
      'Sabit gözlemevi sınıfı montür. 50 kg kapasite, uzun odaklı büyük açıklıkları taşır; taşınabilirlik hedeflenmemiştir.',
    notes: ['25.5 kg gövde tek kişiyle taşınmaz; sabit kurulum içindir.'],
  },

  /* ─────────────── ASTRO KAMERALAR ─────────────── */
  {
    slug: 'zwo-asi2600mc',
    brand: 'ZWO',
    model: 'ASI2600MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'ASI2600MM’in renkli kardeşi. Filtre tekerleği gerektirmediği için toplam maliyeti düşük; tek gecede renkli sonuç verir.',
    notes: [
      'Dar bant için dual-band filtre gerekir; SHO paleti mono kadar esnek değildir.',
      'Backfocus 17.5 mm.',
    ],
  },
  {
    slug: 'zwo-asi294mc',
    brand: 'ZWO',
    model: 'ASI294MC Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: '4/3" renkli',
      Piksel: '4.63 µm',
      Çözünürlük: '4144×2822',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      '4.63 µm büyük piksel, kısa odaklı optiklerde iyi örnekleme verir ve düşük ışıkta duyarlılığı yüksektir.',
    notes: ['Bin1 modunda amp glow görülebilir; dark kalibrasyonu önemlidir.'],
  },
  {
    slug: 'qhy-268m',
    brand: 'QHYCCD',
    model: 'QHY268M',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C mono',
      Piksel: '3.76 µm',
      Çözünürlük: '6280×4210',
      Soğutma: '-35°C',
    },
    priceHint: 'Üst segment',
    summary:
      'IMX571 tabanlı mono kamera; ASI2600MM ile aynı sensörü farklı gövde ve okuma modlarıyla kullanır.',
    notes: ['Mod seçimi (Photographic / High Gain) gürültü karakterini değiştirir.'],
  },
  {
    slug: 'player-one-poseidon-c',
    brand: 'Player One',
    model: 'Poseidon-C Pro',
    category: 'astro-kamera',
    specs: {
      Sensör: 'APS-C renkli',
      Piksel: '3.76 µm',
      Çözünürlük: '6248×4176',
      Soğutma: '-35°C',
    },
    priceHint: 'Orta segment',
    summary:
      'IMX571 renkli sensörü daha uygun fiyatla sunan alternatif gövde; DPS teknolojisiyle amp glow bastırılıyor.',
    notes: ['Backfocus 17.5 mm — ZWO muadilleriyle aynı ara halka hesabı geçerli.'],
  },
  {
    slug: 'zwo-asi678mc',
    brand: 'ZWO',
    model: 'ASI678MC',
    category: 'astro-kamera',
    specs: {
      Sensör: '1/1.8" renkli',
      Piksel: '2 µm',
      Çözünürlük: '3840×2160',
      Kullanım: 'Gezegen / video',
    },
    priceHint: 'Giriş segment',
    summary:
      '2 µm piksel ve yüksek kare hızı: gezegen görüntülemede "lucky imaging" için tasarlandı. Soğutmasız, video akışı odaklı.',
    notes: [
      'Derin uzayda küçük sensör dar alan verir; gezegen ve Ay için tercih edilir.',
      'Yüksek kare hızı USB 3.0 ve hızlı disk ister.',
    ],
  },

  /* ─────────────── FİLTRELER ─────────────── */
  {
    slug: 'optolong-lpro',
    brand: 'Optolong',
    model: 'L-Pro',
    category: 'filtre',
    specs: { Tip: 'Geniş bant', Boyut: '2"', Kullanım: 'Işık kirliliği' },
    priceHint: 'Orta segment',
    summary:
      'Geniş bant ışık kirliliği filtresi: sodyum ve cıva hatlarını bastırır, yıldız renklerini büyük ölçüde korur. Galaksi ve küme çekimlerinde dar banda alternatiftir.',
    notes: ['Dar bant kadar agresif değildir; Bortle 7+ altında kazancı sınırlıdır.'],
  },
  {
    slug: 'idas-nbz',
    brand: 'IDAS',
    model: 'NBZ (Ha+OIII)',
    category: 'filtre',
    specs: { 'Bant genişliği': '12 nm dual', Boyut: '2"', Set: 'Ha + OIII' },
    priceHint: 'Üst segment',
    summary:
      'Renkli kameralar için dual-band filtre. 12 nm bant, hızlı optiklerde (f/2–f/4) bant kaymasına dar bantlardan daha dayanıklı.',
    notes: ['Hızlı optiklerde 3 nm filtrelere göre belirgin avantajı vardır.'],
  },
  {
    slug: 'baader-uv-ir-cut',
    brand: 'Baader',
    model: 'UV/IR-Cut',
    category: 'filtre',
    specs: { Tip: 'Geniş bant', Boyut: '2"', Kullanım: 'Luminans / OSC' },
    priceHint: 'Giriş segment',
    summary:
      'Morötesi ve kızılötesini keserek apokromatik olmayan optiklerde odak kaymasını ve hâleyi engeller. Renkli kameralarda temel filtre.',
    notes: ['Işık kirliliği bastırmaz; yalnızca bant sınırlar.'],
  },
  {
    slug: 'chroma-3nm-ha',
    brand: 'Chroma',
    model: '3nm Ha',
    category: 'filtre',
    specs: { 'Bant genişliği': '3 nm', Boyut: '36 mm', Set: 'Tekil Ha' },
    priceHint: 'Profesyonel',
    summary:
      'Referans sınıfı dar bant filtre. Yansıma hâlesi bastırma performansıyla parlak yıldızların yanındaki hedeflerde tercih edilir.',
    notes: ['Fiyatı yüksek; kazancı özellikle parlak yıldız içeren alanlarda görülür.'],
  },
  {
    slug: 'baader-solar-continuum',
    brand: 'Baader',
    model: 'Solar Continuum',
    category: 'filtre',
    specs: { 'Bant genişliği': '10 nm', Boyut: '2"', Kullanım: 'Güneş (beyaz ışık)' },
    priceHint: 'Orta segment',
    summary:
      '540 nm çevresinde dar bant: beyaz ışık güneş gözleminde granülasyon ve leke detayını belirgin artırır.',
    notes: [
      'TEK BAŞINA KULLANILMAZ — mutlaka objektif önü güneş filtresiyle birlikte.',
      'Filtresiz güneş gözlemi kalıcı görme kaybına yol açar.',
    ],
  },

  /* ─────────────── GUIDE ve AKSESUAR ─────────────── */
  {
    slug: 'zwo-asi120mm-mini',
    brand: 'ZWO',
    model: 'ASI120MM Mini',
    category: 'guide',
    specs: { Sensör: '1/3" mono', Piksel: '3.75 µm', Kullanım: 'Guide' },
    priceHint: 'Giriş segment',
    summary:
      'En yaygın guide kamerası. Küçük sensörü ayrı guide teleskopuyla iyi çalışır; OAG’de yıldız bulmak zorlaşabilir.',
    notes: ['OAG kullanacaksanız daha büyük sensörlü bir kamera tercih edin.'],
  },
  {
    slug: 'sv-bony-sv106-guidescope',
    brand: 'SVBONY',
    model: 'SV106 50mm Guide Scope',
    category: 'guide',
    specs: { Açıklık: '50 mm', Odak: '190 mm', Tip: 'Guide teleskopu' },
    priceHint: 'Giriş segment',
    summary:
      'Hafif 50 mm guide teleskopu. Kısa ve orta odaklı ana optiklerde yeterli; uzun odakta diferansiyel esneme sorun çıkarır.',
    notes: ['1000 mm üzeri ana odakta OAG’ye geçmek gerekir.'],
  },
  {
    slug: 'zwo-eaf',
    brand: 'ZWO',
    model: 'EAF Elektronik Odaklayıcı',
    category: 'aksesuar',
    specs: { Tip: 'Elektronik odak', Kontrol: 'USB', Kullanım: 'Otomatik odak' },
    priceHint: 'Orta segment',
    summary:
      'Sıcaklık değiştikçe odak kayar; elektronik odaklayıcı gece boyunca otomatik yeniden odaklama yapar ve odak için tüpe dokunmayı ortadan kaldırır.',
    notes: ['Otomatik odak rutini, uzun gecelerde kaybedilen kare sayısını belirgin düşürür.'],
  },
  {
    slug: 'zwo-efw-7x36',
    brand: 'ZWO',
    model: 'EFW 7×36mm',
    category: 'aksesuar',
    specs: { Tip: 'Filtre tekerleği', Yuva: '7 × 36 mm', Kontrol: 'USB' },
    priceHint: 'Orta segment',
    summary:
      'Mono kamerayla SHO + LRGB çalışmak için yedi yuvalı motorlu filtre tekerleği. Filtre değişimini gece boyunca otomatikleştirir.',
    notes: ['20 mm backfocus tüketir; ara halka hesabına dâhil edin.'],
  },
  {
    slug: 'pegasus-falcon-rotator',
    brand: 'Pegasus Astro',
    model: 'Falcon Rotator',
    category: 'aksesuar',
    specs: { Tip: 'Alan döndürücü', Kontrol: 'USB', Kullanım: 'Kadraj açısı' },
    priceHint: 'Üst segment',
    summary:
      'Kamerayı optiğe göre döndürerek kadraj açısını yazılımdan ayarlar. Mozaik ve panel hizalamada elle döndürmenin getirdiği hatayı ortadan kaldırır.',
    notes: ['Backfocus tüketir; kurulum planına dâhil edilmeli.'],
  },
  {
    slug: 'losmandy-dovetail',
    brand: 'Losmandy',
    model: 'D Serisi Kırlangıç Kuyruğu',
    category: 'aksesuar',
    specs: { Tip: 'Bağlantı rayı', Genişlik: '75 mm', Kullanım: 'Tüp bağlantısı' },
    priceHint: 'Orta segment',
    summary:
      'Geniş (75 mm) bağlantı rayı: ağır tüplerde Vixen tipi dar raya göre belirgin daha rijit bağlantı verir ve esnemeyi azaltır.',
    notes: ['Montürün Losmandy uyumlu satıcı çenesi olmalı.'],
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
