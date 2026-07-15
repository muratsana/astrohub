/** Ekipman veritabanı tohum verisi (§8.3). Faz 1.5'te admin yönetimli DB'ye taşınır. */

export type EquipmentCategory =
  | 'optik-tup'
  | 'montur'
  | 'astro-kamera'
  | 'filtre'
  | 'guide'
  | 'aksesuar';

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
}

export const equipment: EquipmentModel[] = [
  {
    slug: 'sw-esprit-100',
    brand: 'Sky-Watcher',
    model: 'Esprit 100ED',
    category: 'optik-tup',
    specs: { Açıklık: '100 mm', Odak: '550 mm', 'f/': '5.5', Tip: 'Üçlü APO' },
    priceHint: 'Üst segment',
  },
  {
    slug: 'wo-redcat-51',
    brand: 'William Optics',
    model: 'RedCat 51',
    category: 'optik-tup',
    specs: { Açıklık: '51 mm', Odak: '250 mm', 'f/': '4.9', Tip: 'Petzval APO' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'sw-200p-f4',
    brand: 'Sky-Watcher',
    model: '200P f/4 Newton',
    category: 'optik-tup',
    specs: { Açıklık: '203 mm', Odak: '800 mm', 'f/': '4', Tip: 'Newton' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'sw-eq6r-pro',
    brand: 'Sky-Watcher',
    model: 'EQ6-R Pro',
    category: 'montur',
    specs: { 'Yük kapasitesi': '20 kg', Tip: 'Ekvatoryal (GoTo)', Ağırlık: '17.7 kg' },
    priceHint: 'Üst segment',
  },
  {
    slug: 'ioptron-gem28',
    brand: 'iOptron',
    model: 'GEM28',
    category: 'montur',
    specs: { 'Yük kapasitesi': '12.7 kg', Tip: 'Ekvatoryal (GoTo)', Ağırlık: '4.5 kg' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'sw-star-adventurer-gti',
    brand: 'Sky-Watcher',
    model: 'Star Adventurer GTi',
    category: 'montur',
    specs: { 'Yük kapasitesi': '5 kg', Tip: 'Taşınabilir GoTo', Ağırlık: '2.6 kg' },
    priceHint: 'Giriş segment',
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
  },
  {
    slug: 'antlia-3nm-sho',
    brand: 'Antlia',
    model: '3nm SHO Seti (36mm)',
    category: 'filtre',
    specs: { 'Bant genişliği': '3 nm', Boyut: '36 mm', Set: 'Ha / OIII / SII' },
    priceHint: 'Üst segment',
  },
  {
    slug: 'optolong-lextreme',
    brand: 'Optolong',
    model: 'L-eXtreme',
    category: 'filtre',
    specs: { 'Bant genişliği': '7 nm dual', Boyut: '2"', Set: 'Ha + OIII' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'zwo-asi174mini',
    brand: 'ZWO',
    model: 'ASI174MM Mini',
    category: 'guide',
    specs: { Sensör: '1/1.2" mono', Piksel: '5.86 µm', Kullanım: 'OAG guide' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'zwo-oag-l',
    brand: 'ZWO',
    model: 'OAG-L',
    category: 'guide',
    specs: { Tip: 'Off-axis guider', Prizma: '12×12 mm', Backfocus: '16.5 mm' },
    priceHint: 'Orta segment',
  },
  {
    slug: 'pegasus-pocket-powerbox',
    brand: 'Pegasus Astro',
    model: 'Pocket Powerbox Advance',
    category: 'aksesuar',
    specs: { Çıkış: '4× 12V + 2× dew', Kontrol: 'USB', Sensör: 'Sıcaklık/nem' },
    priceHint: 'Orta segment',
  },
];
