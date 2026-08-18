/**
 * Navigasyon haritası — Rasathane Terminali.
 *
 * Sekiz ana modül düz biçimde durur; üst menüde açılır menü **yoktur**.
 * Alt sayfalara ⌘K komut paletinden ve mobil çekmecedeki tam modül haritasından
 * ulaşılır. Terminal metaforuyla tutarlı: gezinme tıklanarak değil, yazılarak.
 *
 * `siteMap` tek kaynaktır — komut paleti ve mobil çekmece
 * buradan beslenir, hiçbir bağlantı iki yerde ayrı ayrı tanımlanmaz.
 *
 * Not: Ekipman üst menüde değildir — galeri, bu gece, profil ve araçların
 * içinden doğal olarak kullanılan referans alanıdır.
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
 * Üst menü — sekiz ana modül.
 *
 * Forum, sitenin "gece boyunca açık kalan" modülü: çekim aralarında
 * yazışmak için. TV ve Radyo metin girişi değil, üst çubukta durum
 * düğmesi — açılıp kapatılan bir yayın, gidilecek bir sayfa değil.
 *
 * Dar pencerede nav çekmeceye katlanır; üst menü, kullanıcının istediği ana
 * modül girişlerini taşır.
 */
export const primaryNav: NavItem[] = [
  { label: 'Galeri', to: '/galeri' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Topluluklar', to: '/topluluklar' },
  { label: 'Haberler', to: '/haberler' },
  { label: 'Yazılar', to: '/yazilar' },
  { label: 'İlanlar', to: '/ilanlar' },
  { label: 'Araçlar', to: '/araclar' },
  { label: 'Forum', to: '/forum' },
  { label: 'Saha', to: '/saha' },
];

/**
 * Footer'ın kurumsal satırı.
 *
 * `Footer.tsx`in içinde yerel bir dizi olarak duruyordu; buraya taşındı
 * çünkü §13.2 "footer linkleri"ni yönetilebilir sayıyor ve `nav_links`
 * tohumunun kodla eşleştiğini ölçebilmek için ikisinin de tek yerden
 * okunması gerekiyor.
 */
export const legalNav: NavItem[] = [
  { label: 'Hakkında', to: '/hakkinda' },
  { label: 'Terimler Sözlüğü', to: '/sozluk' },
  { label: 'Sık Sorulan Sorular', to: '/sss' },
  { label: 'KVKK', to: '/kvkk' },
  { label: 'Kullanım Koşulları', to: '/kullanim-kosullari' },
];

/**
 * Tam modül haritası. Komut paletinin "GİT" bölümü ve mobil çekmece bunu kullanır.
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
        label: 'Haftanın Fotoğrafı',
        to: '/haftanin-fotografi',
        description: 'Jürinin haftalık kazananı ve seçki arşivi',
        keywords: ['hafta', 'jüri', 'kazanan', 'seçki'],
      },
      {
        label: 'Astrofotoğrafçılar',
        to: '/kesfet',
        description: 'Topluluğun üreticileri',
        keywords: ['keşfet', 'kullanıcı', 'fotoğrafçı'],
      },
      {
        label: 'Takip Akışı',
        to: '/akis',
        description: 'Takip ettiklerinin yeni fotoğraf, ilan ve konuları',
        keywords: ['akış', 'takip', 'feed', 'yenilikler'],
      },
    ],
  },
  {
    title: 'Etkinlikler',
    items: [
      {
        label: 'Etkinlik Haritası',
        to: '/etkinlikler',
        description: 'Konum dağılımı ve size en yakın etkinlikler',
        keywords: ['şenlik', 'kamp', 'atölye', 'harita', 'yakınımda', 'konum'],
      },
      {
        label: 'Etkinlik Takvimi',
        to: '/etkinlikler/takvim',
        description: 'Ay ay hangi gece ne var — tür, şehir ve tarih süzgeciyle',
        keywords: ['takvim', 'etkinlik takvimi', 'ne zaman', 'ay', 'tarih'],
      },
      {
        label: 'Etkinlik Ekle',
        to: '/etkinlik/yeni',
        description: 'Şenlik, gözlem gecesi ya da atölye duyur',
        keywords: ['etkinlik ekle', 'duyur', 'yeni etkinlik'],
      },
      {
        label: 'Topluluğunu Ekle',
        to: '/topluluklar/ekle',
        description: 'Dernek, kulüp ya da gözlem grubunu dizine ekle',
        keywords: ['kulüp ekle', 'dernek ekle', 'topluluk ekle'],
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
      {
        label: 'Astrofotoğrafta SNR',
        to: '/yazilar/snr-rehberi',
        description:
          'Sinyal, gürültü ve süre — simülatörlü uzun rehber',
        keywords: [
          'snr',
          'sinyal gürültü',
          'gürültü',
          'poz süresi',
          'entegrasyon',
          'bortle',
          'okuma gürültüsü',
        ],
      },
      {
        label: 'Astrofotoğrafçılıkta Drizzle',
        to: '/yazilar/drizzle-rehberi',
        description:
          'Örnekleme, pixfrac ve PHD2 dithering — hesaplayıcılı uzun rehber',
        keywords: [
          'drizzle',
          'dither',
          'dithering',
          'phd2',
          'pixfrac',
          'örnekleme',
          'sampling',
          'fwhm',
          'undersampling',
        ],
      },
      {
        label: 'Kutup Hizalaması',
        to: '/yazilar/kutup-hizalamasi',
        description:
          'Sürüklenme, alan dönmesi ve PHD2 grafiği — simülatörlü uzun rehber',
        keywords: [
          'kutup hizalaması',
          'polar align',
          'polar hizalama',
          'drift',
          'sürüklenme',
          'alan dönmesi',
          'field rotation',
          'phd2',
          'guiding assistant',
          'polarscope',
          'sharpcap',
        ],
      },
      {
        label: 'Terimler Sözlüğü',
        to: '/sozluk',
        description: 'Bortle, seeing, pixel scale — kısa tanımlar',
        keywords: ['sözlük', 'terim', 'tanım', 'glossary', 'ne demek'],
      },
      {
        label: 'Sık Sorulan Sorular',
        to: '/sss',
        description: 'Kota, gizlilik, telif ve ilan güvenliği',
        keywords: ['sss', 'sık sorulan', 'faq', 'soru', 'yardım'],
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
        label: 'TV Video Arşivi',
        to: '/tv/arsiv',
        description: 'Kayıtlı yayınlar ve seriler',
        keywords: ['tv', 'arşiv', 'video', 'seri', 'kayıt', 'izle'],
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
        label: 'Kadraj ve Pixel Scale',
        to: '/araclar/kadraj',
        description: 'Görüş alanı, örnekleme ve kadraj önizlemesi',
        keywords: [
          'simulator',
          'simülatör',
          'ascom',
          'montür',
          'fov',
          'görüş alanı',
          'pixel scale',
          'setup uyumluluk',
          'ra',
          'dec',
        ],
      },
      {
        label: 'Gökyüzü Kataloğu',
        to: '/araclar/gokyuzu-katalogu',
        description: 'NGC, IC, Sharpless, Herschel 400 — 16.663 gök cismi',
        keywords: [
          'katalog',
          'gökyüzü kataloğu',
          'ngc',
          'ic',
          'sharpless',
          'sh2',
          'messier',
          'caldwell',
          'herschel',
          'barnard',
          'abell',
          'arp',
          'hickson',
          'lbn',
          'ldn',
          'vdb',
          'derin uzay',
          'dso',
        ],
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
        to: '/bu-gece/plan',
        description: 'Gece planı ve hedef sırası',
        keywords: ['plan', 'gece planı'],
      },
      {
        label: 'Poz ve Entegrasyon Planlayıcı',
        to: '/araclar/poz-plani',
        description: 'Hedef süreyi kare sayısına, geceye ve depolamaya çevirir',
        keywords: ['poz', 'entegrasyon', 'kare', 'depolama', 'dither', 'plan'],
      },
      {
        label: 'Mozaik Planlayıcı',
        to: '/araclar/kadraj/mozaik',
        description: 'Çok panelli kadraj planı ve örtüşme hesabı',
        keywords: ['mozaik', 'mosaic', 'panel'],
      },
      {
        label: 'Ay ve Karanlık Takvimi',
        to: '/bu-gece/takvim',
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
    title: 'Saha',
    items: [
      {
        label: 'Gözlem Alanları',
        to: '/saha',
        description: 'Karanlık gökyüzü noktaları ve haritası',
        keywords: ['kamp', 'astrocamping', 'nokta', 'saha', 'harita'],
      },
      {
        label: 'Saha Noktası Ekle',
        to: '/saha/yeni',
        description: 'Bildiğin karanlık gökyüzü noktasını paylaş',
        keywords: ['saha ekle', 'nokta ekle', 'kamp yeri ekle'],
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
        label: 'Ekipman Kataloğu',
        to: '/ekipman',
        description: 'Teleskop, montür, kamera, filtre, reducer, barlow',
        keywords: ['teleskop', 'montür', 'kamera', 'filtre', 'ekipman'],
      },
      {
        label: 'Mount Bridge',
        to: '/ekipman/bridge',
        description: 'ASCOM montür bağlantısı ve capture akışı',
        keywords: ['ascom', 'bridge', 'montür', 'mount', 'capture', 'nina', 'phd2'],
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
      {
        /* Dizin "Hesap" grubunda değil ama en yakın komşusu profil; üst
           menüde topluluk tarafına ait. */
        label: 'Astrofotoğrafçılar',
        to: '/astrofotografcilar',
        description: 'Şehre ve ekipmana göre gözlemci bul',
        keywords: ['kullanıcı', 'astrofotoğrafçı', 'dizin', 'bul', 'takip'],
      },
      {
        label: 'Hesabım',
        to: '/hesap',
        description: 'Profil bilgileri ve hesap ayarları',
        keywords: ['profil', 'hesap', 'ayar', 'kullanıcı adı'],
      },
      {
        /* Ekipman modülünün üç kişisel sekmesi buraya birleşti
           (bkz. `MyEquipmentPanel`); aranabilir olması için katalogla
           karışan anahtar kelimeler de burada. */
        label: 'Ekipmanlarım',
        to: '/hesap?sekme=ekipmanlarim',
        description: 'Kurduğun ekipmanlar, görünürlük ve envanter',
        keywords: ['setup', 'ekipman', 'teleskop', 'kamera', 'montür'],
      },
      {
        label: 'Üye Paneli',
        to: '/panel',
        description: 'Fotoğraflar, kota, üyelik',
      },
      {
        label: 'Gözlem Günlüğü',
        to: '/gunluk',
        description: 'Baktığın geceleri kaydet — varsayılan olarak özel',
        keywords: ['günlük', 'gözlem', 'defter', 'log', 'kayıt', 'seeing'],
      },
      {
        label: 'Arşivim',
        to: '/arsivim',
        description: 'Kişisel hedef planları ve entegrasyon ilerlemesi',
        keywords: ['arşivim', 'hedef planı', 'entegrasyon', 'capture', 'sequence'],
      },
      {
        label: 'Üyelik ve Premium',
        to: '/uyelik',
        description: 'Kademeler, kotalar ve Premium neden var',
        keywords: ['üyelik', 'premium', 'kota', 'plan', 'ücret'],
      },
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
      {
        label: 'İletişim',
        to: '/iletisim',
        description: 'Soru, geri bildirim ve iş birliği',
        keywords: ['iletişim', 'bize ulaşın', 'destek', 'geri bildirim'],
      },
      {
        label: 'KVKK ve Gizlilik',
        to: '/kvkk',
        keywords: ['gizlilik', 'veri'],
      },
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
 * BAYRAĞA BAĞLI BÖLÜMLERİN ADRES ÖNEKLERİ (§13.2).
 *
 * `radyo_acik` ve `tv_acik` kapatıldığında bu öneklerle başlayan her
 * bağlantı menüden, çekmeceden ve komut paletinden düşüyor. Tek yerde
 * durması bilinçli: bağlantı listesi dört yerden okunuyor ve "radyoyu
 * kapattık ama çekmecede kaldı" hatası tam olarak böyle doğar.
 *
 * Rotanın kendisi ayrıca `FlagRoute` ile kapalı — bağlantıyı gizlemek
 * sayfayı kapatmaz, adresi bilen yine girerdi.
 */
export const flaggedNavPrefixes = {
  radyo_acik: '/radyo',
  tv_acik: '/tv',
} as const;

/**
 * Verilen öneklerle başlayan bağlantıları eler.
 *
 * BOŞALAN GRUP DA DÜŞÜYOR: "Yayın" başlığı altında hiç giriş kalmadığında
 * başlığın kendisi de kalkmalı, yoksa çekmecede boş bir grup başlığı kalırdı.
 */
export function withoutPrefixes(
  groups: NavGroup[],
  prefixes: readonly string[]
): NavGroup[] {
  if (prefixes.length === 0) return groups;
  const gizli = (yol: string) =>
    prefixes.some((ön) => yol === ön || yol.startsWith(`${ön}/`));

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !gizli(item.to)),
    }))
    .filter((group) => group.items.length > 0);
}

/**
 * Mobil alt navigasyon. Çubukta dört giriş + ortada "+" + "Daha Fazla";
 * Üye Paneli çekmecenin en üstünde birincil satır olarak durur (yedi hücre
 * dar ekranda etiketleri kırpıyordu).
 */
export const mobileNav: NavItem[] = [
  { label: 'Galeri', to: '/galeri' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Topluluklar', to: '/topluluklar' },
  { label: 'Haberler', to: '/haberler' },
];

/** Çekmecenin en üstünde sabit duran birincil giriş. */
export const mobileDrawerPrimary: NavItem = {
  label: 'Üye Paneli',
  to: '/panel',
};

/** Mobil çekmece tam modül haritasını gösterir. */
export const footerGroups = siteMap;
