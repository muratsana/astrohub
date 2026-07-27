/**
 * Ana navigasyon yapılandırması — şartname §5 (bilgi mimarisi) ve
 * §20 (URL yapısı) ile uyumlu. Kabul edilen ana sayfa tasarımındaki
 * üst menü sırası temel alınmıştır.
 */

export interface NavItem {
  label: string;
  to: string;
  /** Menüde kısa açıklama (açılır menülerde gösterilir). */
  description?: string;
  /** Henüz yayında olmayan bölüm — menüde "Yakında" olarak işaretlenir. */
  soon?: boolean;
}

export interface NavEntry extends NavItem {
  /** Doldurulmuşsa üst menüde açılır menü olarak sunulur (§5.2). */
  children?: NavItem[];
}

/**
 * Masaüstü üst menü (§5.1) ve menü grupları (§5.2).
 * Grup başlığının kendisi de tıklanabilir bir sayfadır; alt öğeler
 * açılır menüde listelenir.
 */
export const primaryNav: NavEntry[] = [
  {
    label: 'Keşfet',
    to: '/kesfet',
    children: [
      {
        label: 'Bu Gece Gökyüzünde',
        to: '/bu-gece',
        description: 'Ay fazı, astronomik karanlık ve hedef önerileri',
        soon: true,
      },
      {
        label: 'Astronomik Hedefler',
        to: '/hedefler',
        description: 'Messier, NGC ve IC kataloğu',
      },
      {
        label: 'Astrofotoğrafçılar',
        to: '/kesfet',
        description: 'Topluluğun aktif üreticileri',
      },
      {
        label: 'Kulüpler ve Topluluklar',
        to: '/topluluklar',
        description: 'Dernekler, üniversite kulüpleri, gözlem grupları',
        soon: true,
      },
      {
        label: 'Rasathaneler ve Planetaryumlar',
        to: '/tesisler',
        description: 'Türkiye astronomi tesisleri rehberi',
        soon: true,
      },
      {
        label: 'Yeni İçerikler',
        to: '/fotograflar',
        description: 'Topluluktan en son yayımlananlar',
      },
    ],
  },
  { label: 'Fotoğraflar', to: '/fotograflar' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  {
    label: 'Harita',
    to: '/harita',
    children: [
      {
        label: 'Işık Kirliliği Haritası',
        to: '/harita/isik-kirliligi',
        description: 'Bortle / SQM katmanı, kaynak atfıyla',
        soon: true,
      },
      {
        label: 'Kamp ve Gözlem Noktaları',
        to: '/harita/gozlem-noktalari',
        description: 'Karanlık gökyüzü ve astrocamping noktaları',
      },
      {
        label: 'Etkinlik Haritası',
        to: '/harita/etkinlikler',
        description: 'Yaklaşan etkinliklerin konumları',
        soon: true,
      },
      {
        label: 'Astronomi Tesisleri',
        to: '/tesisler',
        description: 'Rasathane ve planetaryum konumları',
        soon: true,
      },
      {
        label: 'Canlı SQM / All-Sky İstasyonları',
        to: '/harita/istasyonlar',
        description: 'Karanlık gökyüzü canlı ölçüm ağı',
        soon: true,
      },
    ],
  },
  { label: 'Eğitim', to: '/egitim' },
  {
    label: 'Araçlar',
    to: '/araclar',
    children: [
      {
        label: 'FOV Hesaplayıcı',
        to: '/araclar/fov',
        description: 'Görüş alanı ve hedef kadraj kontrolü',
      },
      {
        label: 'Pixel Scale Hesaplayıcı',
        to: '/araclar/pixel-scale',
        description: 'Örnekleme ve seeing uyumu',
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
        description: 'Montür yükü, backfocus ve guide uyumu',
        soon: true,
      },
      {
        label: 'Gözlem ve Çekim Planlayıcı',
        to: '/planlayici',
        description: 'Gece planı, hedef sırası, yükseklik grafiği',
        soon: true,
      },
      {
        label: 'Ay ve Astronomik Karanlık Takvimi',
        to: '/araclar/takvim',
        description: 'Aylık karanlık pencere takvimi',
        soon: true,
      },
    ],
  },
  { label: 'İkinci El', to: '/ikinci-el' },
];

/**
 * Mobil alt navigasyon (§5.3). Şartname beş giriş önerir; buna ortadaki
 * belirgin "+" yükleme aksiyonu ve "Daha Fazla" çekmece tetikleyicisi de
 * eklenince yedi hücre 360 px genişlikte etiketleri kırpıyordu. Bu yüzden
 * çubukta dört ana giriş + "+" + "Daha Fazla" tutulur; Profil/Üye Paneli
 * çekmecenin en üstünde birincil satır olarak sunulur.
 */
export const mobileNav: NavItem[] = [
  { label: 'Ana Sayfa', to: '/' },
  { label: 'Fotoğraflar', to: '/fotograflar' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Harita', to: '/harita' },
];

/** Çekmecenin en üstünde sabit duran birincil giriş (§5.3 "Profil"). */
export const mobileDrawerPrimary: NavItem = {
  label: 'Profil / Üye Paneli',
  to: '/panel',
};

/**
 * Mobil "Daha Fazla" çekmecesi (§5.3) — alt navigasyona sığmayan modüller.
 * Üst menü gruplarından türetilir ki iki yerde ayrı ayrı bakım gerekmesin.
 */
export const mobileDrawerGroups: { title: string; items: NavItem[] }[] = [
  ...primaryNav
    .filter((entry): entry is NavEntry & { children: NavItem[] } =>
      Boolean(entry.children)
    )
    .map((entry) => ({ title: entry.label, items: entry.children })),
  {
    title: 'Topluluk',
    items: [
      { label: 'Eğitim Merkezi', to: '/egitim' },
      { label: 'İkinci El', to: '/ikinci-el' },
      { label: 'Üye Paneli', to: '/panel' },
    ],
  },
];

/** Footer bağlantı grupları */
export const footerGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Keşfet',
    items: [
      { label: 'Fotoğraflar', to: '/fotograflar' },
      { label: 'Astronomik Hedefler', to: '/hedefler' },
      { label: 'Astrofotoğrafçılar', to: '/kesfet' },
      { label: 'Bu Gece Gökyüzünde', to: '/bu-gece' },
    ],
  },
  {
    title: 'Harita',
    items: [
      { label: 'Işık Kirliliği Haritası', to: '/harita/isik-kirliligi' },
      { label: 'Kamp ve Gözlem Noktaları', to: '/harita/gozlem-noktalari' },
      { label: 'Etkinlik Haritası', to: '/etkinlikler' },
    ],
  },
  {
    title: 'Araçlar',
    items: [
      { label: 'FOV Hesaplayıcı', to: '/araclar/fov' },
      { label: 'Pixel Scale', to: '/araclar/pixel-scale' },
      { label: 'Gözlem Planlayıcı', to: '/planlayici' },
    ],
  },
  {
    title: 'Topluluk',
    items: [
      { label: 'Eğitim', to: '/egitim' },
      { label: 'İkinci El', to: '/ikinci-el' },
      { label: 'Kulüpler ve Topluluklar', to: '/topluluklar' },
    ],
  },
];
