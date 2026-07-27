/**
 * Navigasyon haritası — Rasathane Terminali.
 *
 * Yedi ana modül düz biçimde durur; üst menüde açılır menü **yoktur**.
 * Alt sayfalara ⌘K komut paletinden ve footer'daki tam modül haritasından
 * ulaşılır. Terminal metaforuyla tutarlı: gezinme tıklanarak değil, yazılarak.
 *
 * `siteMap` tek kaynaktır — footer, komut paleti ve mobil çekmece hep
 * buradan beslenir, hiçbir bağlantı iki yerde ayrı ayrı tanımlanmaz.
 *
 * Not: Hedef kataloğu ve ekipman veritabanı üst menüde değildir. Bunlar
 * başka modüllerin (galeri, bu gece, araçlar) içinden doğal olarak
 * kullanılan referans modülleridir; footer ve palette tam erişilebilir.
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

/** Üst menü — yedi ana modül. */
export const primaryNav: NavItem[] = [
  { label: 'Galeri', to: '/galeri' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Haberler', to: '/haberler' },
  { label: 'Yazılar', to: '/yazilar' },
  { label: 'Araçlar', to: '/araclar' },
  { label: 'İlanlar', to: '/ilanlar' },
  { label: 'Saha', to: '/saha' },
];

/**
 * Tam modül haritası. Footer ve komut paletinin "GİT" bölümü bunu kullanır.
 * Üst menüde görünmeyen her sayfa burada görünür olmalıdır — aksi hâlde
 * erişilemez hâle gelir.
 */
export const siteMap: NavGroup[] = [
  {
    title: 'Galeri',
    items: [
      {
        label: 'Fotoğraf Galerisi',
        to: '/galeri',
        description: 'Topluluğun künyeli astrofotoğraf arşivi',
        keywords: ['galeri', 'arşiv', 'foto', 'astrofotoğraf'],
      },
      {
        label: 'Fotoğraf Yükle',
        to: '/galeri/yukle',
        description: 'Yeni kayıt aç — hedef, setup, pozlama',
        keywords: ['yükle', 'upload', 'ekle', 'paylaş'],
      },
      {
        label: 'Astrofotoğrafçılar',
        to: '/kesfet',
        description: 'Topluluğun üreticileri',
        keywords: ['keşfet', 'kullanıcı', 'fotoğrafçı'],
      },
    ],
  },
  {
    title: 'Etkinlikler',
    items: [
      {
        label: 'Etkinlik Takvimi',
        to: '/etkinlikler',
        description: 'Türkiye astronomi etkinlikleri',
        keywords: ['şenlik', 'kamp', 'atölye', 'takvim'],
      },
      {
        label: 'Etkinlik Haritası',
        to: '/etkinlikler/harita',
        description: 'Yaklaşan etkinliklerin konumları',
        soon: true,
      },
      {
        label: 'Kulüpler ve Topluluklar',
        to: '/topluluklar',
        description: 'Dernek ve üniversite kulüpleri',
        soon: true,
      },
    ],
  },
  {
    title: 'Haberler',
    items: [
      {
        label: 'Güncel Haberler',
        to: '/haberler',
        description: 'Astronomi ve uzay gündemi',
        keywords: ['haber', 'gündem', 'duyuru'],
      },
    ],
  },
  {
    title: 'Yazılar',
    items: [
      {
        label: 'Tüm Yazılar',
        to: '/yazilar',
        description: 'Rehberler, eğitim yazıları, işleme dersleri',
        keywords: ['makale', 'eğitim', 'rehber', 'ders', 'işleme'],
      },
    ],
  },
  {
    title: 'Araçlar',
    items: [
      {
        label: 'Tüm Araçlar',
        to: '/araclar',
        description: 'Hesaplayıcı ve haritaların listesi',
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
        label: 'Işık Kirliliği Haritası',
        to: '/araclar/isik-kirliligi',
        description: 'Bortle / SQM katmanı',
        soon: true,
        keywords: ['bortle', 'sqm', 'ışık kirliliği', 'harita'],
      },
      {
        label: 'Bu Gece Gökyüzünde',
        to: '/bu-gece',
        description: 'Ay fazı, karanlık penceresi, hedef önerileri',
        keywords: ['tonight', 'gece', 'karanlık', 'efemeris'],
      },
      {
        label: 'Gözlem ve Çekim Planlayıcı',
        to: '/planlayici',
        description: 'Gece planı ve hedef sırası',
        soon: true,
        keywords: ['plan', 'gece planı'],
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
    title: 'İlanlar',
    items: [
      {
        label: 'İkinci El İlanlar',
        to: '/ilanlar',
        description: 'Ekipman alım-satım pazaryeri',
        keywords: ['satılık', 'pazar', 'ilan', 'ikinci el'],
      },
    ],
  },
  {
    title: 'Saha',
    items: [
      {
        label: 'Gözlem Alanları',
        to: '/saha',
        description: 'Karanlık gökyüzü noktaları ve haritası',
        keywords: ['kamp', 'astrocamping', 'nokta', 'saha', 'harita'],
      },
      {
        label: 'Canlı SQM / All-Sky',
        to: '/saha/istasyonlar',
        description: 'Karanlık gökyüzü ölçüm ağı',
        soon: true,
        keywords: ['istasyon', 'allsky'],
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
    title: 'Referans',
    items: [
      {
        label: 'Hedef Kataloğu',
        to: '/hedefler',
        description: 'Messier, NGC, IC',
        keywords: ['messier', 'ngc', 'ic', 'katalog', 'hedef'],
      },
      {
        label: 'Ekipman Veritabanı',
        to: '/ekipman',
        description: 'Teleskop, montür, kamera, filtre',
        keywords: ['teleskop', 'montür', 'kamera', 'filtre', 'ekipman'],
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      { label: 'Üye Paneli', to: '/panel', description: 'Fotoğraflar, kota, üyelik' },
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
 * Mobil alt navigasyon. Çubukta dört giriş + ortada "+" + "Daha Fazla";
 * Üye Paneli çekmecenin en üstünde birincil satır olarak durur (yedi hücre
 * dar ekranda etiketleri kırpıyordu).
 */
export const mobileNav: NavItem[] = [
  { label: 'Ana', to: '/' },
  { label: 'Galeri', to: '/galeri' },
  { label: 'Etkinlik', to: '/etkinlikler' },
  { label: 'Saha', to: '/saha' },
];

/** Çekmecenin en üstünde sabit duran birincil giriş. */
export const mobileDrawerPrimary: NavItem = {
  label: 'Üye Paneli',
  to: '/panel',
};

/** Footer ve mobil çekmece aynı haritayı gösterir. */
export const footerGroups = siteMap;
