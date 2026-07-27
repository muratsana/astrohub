/**
 * Navigasyon haritası — Rasathane Terminali.
 *
 * Karar: üst menüde açılır menü **yoktur**. Yedi ana giriş düz biçimde
 * durur; alt sayfalara ⌘K komut paletinden ve footer'daki tam modül
 * haritasından ulaşılır. Bu, terminal metaforuyla tutarlı: gezinme
 * tıklanarak değil, yazılarak yapılır.
 *
 * `siteMap` tek kaynaktır — footer, komut paleti ve mobil çekmece hep
 * buradan beslenir, hiçbir bağlantı iki yerde ayrı ayrı tanımlanmaz.
 */

export interface NavItem {
  label: string;
  to: string;
  /** Komut paletinde gösterilen kısa açıklama. */
  description?: string;
  /** Henüz yayında olmayan bölüm — "yakında" olarak işaretlenir. */
  soon?: boolean;
  /** Palet aramasında eşleşmesi istenen ek terimler. */
  keywords?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

/** Üst menü (§5.1) — yedi ana giriş, düz. */
export const primaryNav: NavItem[] = [
  { label: 'Kayıtlar', to: '/fotograflar' },
  { label: 'Hedefler', to: '/hedefler' },
  { label: 'Etkinlik', to: '/etkinlikler' },
  { label: 'Saha', to: '/harita' },
  { label: 'Ekipman', to: '/ekipman' },
  { label: 'Araçlar', to: '/araclar' },
  { label: 'Eğitim', to: '/egitim' },
];

/**
 * Tam modül haritası. Footer ve komut paletinin "GİT" bölümü bunu kullanır.
 * Üst menüde görünmeyen her sayfa burada görünür olmalıdır — aksi hâlde
 * erişilemez hâle gelir.
 */
export const siteMap: NavGroup[] = [
  {
    title: 'Kayıt',
    items: [
      {
        label: 'Fotoğraf Arşivi',
        to: '/fotograflar',
        description: 'Tüm kayıtlar, filtreli',
        keywords: ['galeri', 'arşiv', 'foto'],
      },
      {
        label: 'Kayıt Aç',
        to: '/fotograflar/yukle',
        description: 'Yeni astrofotoğraf yükle',
        keywords: ['yükle', 'upload', 'ekle'],
      },
      {
        label: 'Astrofotoğrafçılar',
        to: '/kesfet',
        description: 'Topluluğun üreticileri',
        keywords: ['keşfet', 'kullanıcı'],
      },
    ],
  },
  {
    title: 'Gökyüzü',
    items: [
      {
        label: 'Bu Gece Gökyüzünde',
        to: '/bu-gece',
        description: 'Ay fazı, karanlık penceresi, hedef önerileri',
        keywords: ['tonight', 'gece', 'karanlık'],
      },
      {
        label: 'Hedef Kataloğu',
        to: '/hedefler',
        description: 'Messier, NGC, IC',
        keywords: ['messier', 'ngc', 'ic', 'katalog'],
      },
      {
        label: 'Gözlem ve Çekim Planlayıcı',
        to: '/planlayici',
        description: 'Gece planı ve hedef sırası',
        soon: true,
        keywords: ['plan', 'gece planı'],
      },
      {
        label: 'Ay ve Karanlık Takvimi',
        to: '/araclar/takvim',
        description: 'Aylık karanlık pencere takvimi',
        soon: true,
        keywords: ['takvim', 'ay fazı'],
      },
    ],
  },
  {
    title: 'Saha',
    items: [
      {
        // Kanonik adres `/harita`; `/harita/gozlem-noktalari` aynı sayfayı
        // sunan bir takma addır (§20) ve menüde tekrar edilmez.
        label: 'Gözlem Noktaları',
        to: '/harita',
        description: 'Bortle, SQM, kamp olanakları',
        keywords: ['kamp', 'astrocamping', 'nokta', 'saha', 'harita'],
      },
      {
        label: 'Işık Kirliliği Haritası',
        to: '/harita/isik-kirliligi',
        description: 'Bortle/SQM katmanı',
        soon: true,
        keywords: ['bortle', 'sqm', 'ışık kirliliği'],
      },
      {
        label: 'Etkinlik Haritası',
        to: '/harita/etkinlikler',
        description: 'Yaklaşan etkinliklerin konumları',
        soon: true,
      },
      {
        label: 'Canlı SQM / All-Sky',
        to: '/harita/istasyonlar',
        description: 'Karanlık gökyüzü ölçüm ağı',
        soon: true,
        keywords: ['istasyon', 'allsky'],
      },
    ],
  },
  {
    title: 'Etkinlik',
    items: [
      {
        label: 'Etkinlik Takvimi',
        to: '/etkinlikler',
        description: 'Türkiye astronomi etkinlikleri',
        keywords: ['şenlik', 'kamp', 'atölye'],
      },
      {
        label: 'Kulüpler ve Topluluklar',
        to: '/topluluklar',
        description: 'Dernek ve üniversite kulüpleri',
        soon: true,
      },
      {
        label: 'Rasathane ve Planetaryumlar',
        to: '/tesisler',
        description: 'Türkiye astronomi tesisleri',
        soon: true,
      },
    ],
  },
  {
    title: 'Ekipman',
    items: [
      {
        label: 'Ekipman Veritabanı',
        to: '/ekipman',
        description: 'Teleskop, montür, kamera, filtre',
        keywords: ['teleskop', 'montür', 'kamera', 'filtre'],
      },
      {
        label: 'İkinci El İlanlar',
        to: '/ikinci-el',
        description: 'Ekipman pazaryeri',
        keywords: ['satılık', 'pazar', 'ilan'],
      },
    ],
  },
  {
    title: 'Araçlar',
    items: [
      {
        label: 'Tüm Araçlar',
        to: '/araclar',
        description: 'Hesaplayıcı ve planlayıcıların listesi',
        keywords: ['araç', 'hesaplayıcı', 'tools'],
      },
      {
        label: 'FOV Hesaplayıcı',
        to: '/araclar/fov',
        description: 'Görüş alanı ve kadraj kontrolü',
        keywords: ['fov', 'görüş alanı', 'kadraj'],
      },
      {
        label: 'Pixel Scale Hesaplayıcı',
        to: '/araclar/pixel-scale',
        description: 'Örnekleme ve seeing uyumu',
        keywords: ['pixel scale', 'örnekleme', 'sampling'],
      },
      {
        label: 'Mosaic Planlayıcı',
        to: '/araclar/mosaic',
        description: 'Çok panelli kadraj planı',
        soon: true,
      },
      {
        label: 'Setup Uyumluluk Kontrolü',
        to: '/araclar/setup-uyumluluk',
        description: 'Yük, backfocus, guide uyumu',
        soon: true,
      },
    ],
  },
  {
    title: 'Öğrenme',
    items: [
      {
        label: 'Eğitim Merkezi',
        to: '/egitim',
        description: 'Başlangıçtan ileri seviyeye rehberler',
        keywords: ['ders', 'rehber', 'işleme'],
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      { label: 'Üye Paneli', to: '/panel', description: 'Kayıtlar, kota, üyelik' },
      { label: 'Giriş Yap', to: '/giris' },
      { label: 'Üye Ol', to: '/kayit' },
    ],
  },
  {
    title: 'Kurumsal',
    items: [
      { label: 'Hakkında', to: '/hakkinda' },
      { label: 'KVKK ve Gizlilik', to: '/kvkk', keywords: ['gizlilik', 'veri'] },
      { label: 'Kullanım Koşulları', to: '/kullanim-kosullari' },
    ],
  },
];

/** Tüm modül haritasını düz bir listeye indirger (palet indeksi için). */
export function allNavItems(): NavItem[] {
  return siteMap.flatMap((group) => group.items);
}

/**
 * Mobil alt navigasyon (§5.3). Çubukta dört giriş + ortada "+" + "Daha
 * Fazla"; Profil/Üye Paneli çekmecenin en üstünde birincil satır olarak
 * durur (yedi hücre dar ekranda etiketleri kırpıyordu).
 */
export const mobileNav: NavItem[] = [
  { label: 'Ana', to: '/' },
  { label: 'Kayıt', to: '/fotograflar' },
  { label: 'Etkinlik', to: '/etkinlikler' },
  { label: 'Saha', to: '/harita' },
];

/** Çekmecenin en üstünde sabit duran birincil giriş. */
export const mobileDrawerPrimary: NavItem = {
  label: 'Üye Paneli',
  to: '/panel',
};

/** Footer ve mobil çekmece aynı haritayı gösterir. */
export const footerGroups = siteMap;
