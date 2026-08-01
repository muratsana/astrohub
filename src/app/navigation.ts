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
 * Not: Hedef kataloğu üst menüde değildir — galeri, bu gece ve araçların
 * içinden doğal olarak kullanılan bir referans modülüdür. Ekipman ise
 * üst menüde: artık bir katalog değil, setup kuran ve uyumluluk hesaplayan
 * kendi başına gezilen bir modül.
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

/**
 * Üst menü — dokuz ana modül.
 *
 * Forum, sitenin "gece boyunca açık kalan" modülü: çekim aralarında
 * yazışmak için. TV ve Radyo metin girişi değil, üst çubukta durum
 * düğmesi — açılıp kapatılan bir yayın, gidilecek bir sayfa değil.
 *
 * Dokuz giriş `xl` kırılımının altında sığmıyor; nav orada çekmeceye
 * katlanıyor ve dar pencerede hamburger düğmesi görünüyor — bu tasarlanan
 * davranış, taşma değil. Onuncu giriş `xl`'de de taşırır; eklemeden önce
 * `scripts/check-preview.mjs` ile 390/1024/1440 px'te ölçün.
 */
export const primaryNav: NavItem[] = [
  { label: 'Galeri', to: '/galeri' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Haberler', to: '/haberler' },
  { label: 'Yazılar', to: '/yazilar' },
  { label: 'Forum', to: '/forum' },
  { label: 'Ekipman', to: '/ekipman' },
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
        description: 'Konum dağılımı ve size en yakın etkinlikler',
        keywords: ['harita', 'yakınımda', 'konum'],
      },
      {
        label: 'Kulüpler ve Topluluklar',
        to: '/topluluklar',
        description: 'Dernek, üniversite kulübü ve gözlem grupları',
        keywords: ['dernek', 'kulüp', 'topluluk', 'grup'],
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
    title: 'Forum',
    items: [
      {
        label: 'Forum Ana Sayfa',
        to: '/forum',
        description: 'Kategoriler ve son konular',
        keywords: ['forum', 'tartışma', 'soru', 'konu'],
      },
      {
        label: 'Yeni Konu Aç',
        to: '/forum/yeni',
        description: 'Soru sor ya da tartışma başlat',
        keywords: ['konu aç', 'soru sor', 'yeni'],
      },
    ],
  },
  {
    title: 'Yayın',
    items: [
      {
        label: 'Astrohub.tv',
        to: '/tv',
        description: 'Canlı yayın, gözlem geceleri ve atölye kayıtları',
        keywords: ['tv', 'canlı', 'yayın', 'youtube', 'video', 'izle'],
      },
      {
        label: 'Astrohub Radyo',
        to: '/radyo',
        description: 'Gece çekimi için kesintisiz çalma listesi',
        keywords: ['radyo', 'müzik', 'çalma listesi', 'spotify', 'mp3'],
      },
      {
        label: 'Podcast Arşivi',
        to: '/radyo/podcast',
        description: 'Kayıtlı yayınlar ve konuk programları',
        keywords: ['podcast', 'bölüm', 'arşiv', 'sohbet', 'kayıt'],
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
        description: 'Şehir ile saha arasındaki SQM/Bortle farkı',
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
        keywords: ['plan', 'gece planı'],
      },
      {
        label: 'Mozaik Planlayıcı',
        to: '/araclar/mosaic',
        description: 'Çok panelli kadraj planı ve örtüşme hesabı',
        keywords: ['mozaik', 'mosaic', 'panel'],
      },
      {
        label: 'Setup Uyumluluk Kontrolü',
        to: '/araclar/setup-uyumluluk',
        description: 'Yük, backfocus, guide uyumu',
      },
      {
        label: 'Ay ve Karanlık Takvimi',
        to: '/araclar/takvim',
        description: 'Aylık karanlık pencere takvimi',
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
      {
        label: 'İlan Ver',
        to: '/ilan/yeni',
        description: 'Elindeki ekipman için ilan aç',
        keywords: ['sat', 'ilan ver', 'yeni ilan', 'satmak'],
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      {
        label: 'Hesabım',
        to: '/hesap',
        description: 'Profil bilgileri ve hesap ayarları',
        keywords: ['profil', 'hesap', 'ayar', 'kullanıcı adı'],
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
        description: 'Ziyarete açık astronomi tesisleri',
        keywords: ['rasathane', 'planetaryum', 'gözlemevi', 'bilim merkezi'],
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
        description: 'Teleskop, montür, kamera, filtre, reducer, barlow',
        keywords: ['teleskop', 'montür', 'kamera', 'filtre', 'ekipman'],
      },
      {
        label: 'Ekipman Karşılaştırma',
        to: '/ekipman/karsilastir',
        description: 'Dört modeli teknik özellikleriyle yan yana koy',
        keywords: ['karşılaştır', 'compare', 'fark', 'hangisi'],
      },
    ],
  },
  {
    title: 'Hesap',
    items: [
      { label: 'Üye Paneli', to: '/panel', description: 'Fotoğraflar, kota, üyelik' },
      {
        label: 'Kaydedilenler',
        to: '/panel/kaydedilenler',
        description: 'Sonra bakmak üzere ayırdığın fotoğraflar',
        keywords: ['kaydet', 'favori', 'koleksiyon', 'saved'],
      },
      {
        label: 'Bildirimler',
        to: '/bildirimler',
        description: 'Takip, yorum, etkinlik ve sistem bildirimleri',
        keywords: ['bildirim', 'uyarı', 'zil', 'okunmamış'],
      },
      {
        label: 'Mesajlar',
        to: '/mesajlar',
        description: 'Üyelerle birebir yazışma',
        keywords: ['mesaj', 'sohbet', 'yazış', 'dm', 'satıcı'],
      },
      {
        label: 'Yönetim Paneli',
        to: '/admin',
        description: 'Moderasyon kuyruğu (yetki gerektirir)',
        keywords: ['admin', 'moderasyon', 'yönetim'],
      },
      { label: 'Giriş Yap', to: '/giris' },
      { label: 'Üye Ol', to: '/kayit' },
    ],
  },
  {
    title: 'Kurumsal',
    items: [
      { label: 'Hakkında', to: '/hakkinda' },
      { label: 'KVKK ve Gizlilik', to: '/kvkk', keywords: ['gizlilik', 'veri'] },
      {
        label: 'Çerez Tercihleri',
        to: '/cerezler',
        description: 'Tarayıcıda ne saklanıyor, nasıl silinir',
        keywords: ['çerez', 'cookie', 'depolama', 'localstorage'],
      },
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
