/**
 * Ana navigasyon yapılandırması — şartname §5 (bilgi mimarisi) ve
 * §20 (URL yapısı) ile uyumlu. Kabul edilen ana sayfa tasarımındaki
 * üst menü sırası temel alınmıştır.
 */

export interface NavItem {
  label: string;
  to: string;
}

/** Masaüstü üst menü (§5.1) */
export const primaryNav: NavItem[] = [
  { label: 'Keşfet', to: '/kesfet' },
  { label: 'Fotoğraflar', to: '/fotograflar' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Harita', to: '/harita' },
  { label: 'Eğitim', to: '/egitim' },
  { label: 'Araçlar', to: '/araclar' },
  { label: 'İkinci El', to: '/ikinci-el' },
];

/** Mobil alt navigasyon (§5.3) */
export const mobileNav: NavItem[] = [
  { label: 'Ana Sayfa', to: '/' },
  { label: 'Fotoğraflar', to: '/fotograflar' },
  { label: 'Etkinlikler', to: '/etkinlikler' },
  { label: 'Harita', to: '/harita' },
  { label: 'Profil', to: '/panel' },
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
