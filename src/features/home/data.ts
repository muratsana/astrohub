/**
 * Ana sayfa demo içeriği. MVP'de gerçek veriler Supabase'den TanStack Query
 * ile gelecektir; şimdilik tasarımı doğrulamak için statik örnekler.
 *
 * Görseller için harici dosya yerine CSS gradient placeholder kullanılır
 * (offline uyumlu; ana sayfada büyük orijinal indirmeme ilkesi — §16.4).
 */

export interface PhotoItem {
  id: string;
  title: string;
  user: string;
  /** Placeholder gradyanı (uzay/nebula hissi) */
  gradient: string;
  integration?: string;
  likes?: number;
  comments?: number;
}

/** Editoryal giriş alanı — sağ sütundaki dikey fotoğraf seçkisi (§7.1) */
export const heroPhotos: PhotoItem[] = [
  {
    id: 'ngc7009',
    title: 'Kelebek Bulutsusu',
    user: 'astrocan',
    gradient:
      'radial-gradient(120% 90% at 50% 40%, #2b6cb0 0%, #6b46c1 35%, #1a1035 70%, #050a12 100%)',
  },
  {
    id: 'm31',
    title: 'Andromeda Galaksisi',
    user: 'mert_astro',
    gradient:
      'radial-gradient(90% 70% at 55% 45%, #d6bca0 0%, #7c5c46 30%, #241a2e 65%, #050a12 100%)',
  },
  {
    id: 'ic434',
    title: 'At Başı Bulutsusu',
    user: 'gokhanuzun',
    gradient:
      'radial-gradient(120% 100% at 45% 55%, #c026d3 0%, #9d174d 35%, #3b0a24 70%, #050a12 100%)',
  },
  {
    id: 'moon',
    title: 'Ay',
    user: 'cemyildirim',
    gradient:
      'radial-gradient(70% 70% at 60% 40%, #e5e7eb 0%, #9ca3af 30%, #4b5563 55%, #111827 100%)',
  },
];

/** Öne çıkan astrofotoğraflar bölümü (§7.1) */
export const featuredPhotos: PhotoItem[] = [
  {
    id: 'milkyway-arch',
    title: 'Samanyolu Kemeri',
    user: 'nightscaper',
    gradient:
      'linear-gradient(160deg, #1e293b 0%, #4c1d95 40%, #be185d 75%, #f59e0b 100%)',
    integration: '2.4 sa',
    likes: 312,
    comments: 24,
  },
  {
    id: 'rosette',
    title: 'Rozet Bulutsusu',
    user: 'deepsky_tr',
    gradient:
      'radial-gradient(100% 100% at 50% 50%, #ef4444 0%, #7f1d1d 45%, #2a0a16 80%, #050a12 100%)',
    integration: '9.1 sa',
    likes: 288,
    comments: 41,
  },
  {
    id: 'startrail',
    title: 'Yıldız İzleri',
    user: 'polaris34',
    gradient:
      'linear-gradient(180deg, #0f172a 0%, #1e3a5f 55%, #475569 100%)',
    integration: '1.0 sa',
    likes: 176,
    comments: 12,
  },
  {
    id: 'horsehead2',
    title: 'At Başı & Alev',
    user: 'orionfan',
    gradient:
      'radial-gradient(120% 90% at 40% 60%, #dc2626 0%, #991b1b 40%, #1f0a0a 80%, #050a12 100%)',
    integration: '12.5 sa',
    likes: 421,
    comments: 58,
  },
  {
    id: 'galactic-core',
    title: 'Galaktik Merkez',
    user: 'skyhunter',
    gradient:
      'linear-gradient(160deg, #0b1220 0%, #78350f 45%, #b45309 70%, #fbbf24 100%)',
    integration: '3.3 sa',
    likes: 254,
    comments: 19,
  },
];

/** Yaklaşan astronomi etkinlikleri (§7.1) */
export interface EventItem {
  id: string;
  date: string;
  title: string;
  city: string;
  type: string;
  free: boolean;
  camping: boolean;
  gradient: string;
}

export const upcomingEvents: EventItem[] = [
  {
    id: 'perseid-2026',
    date: '12 Ağu 2026',
    title: 'Perseid Meteor Yağmuru Gözlem Kampı',
    city: 'Antalya',
    type: 'Gözlem Şenliği',
    free: false,
    camping: true,
    gradient: 'linear-gradient(135deg, #1e293b, #4c1d95)',
  },
  {
    id: 'karanlik-gokyuzu',
    date: '20 Ağu 2026',
    title: 'Karanlık Gökyüzü Astrofotoğraf Atölyesi',
    city: 'Erzurum',
    type: 'Atölye',
    free: false,
    camping: true,
    gradient: 'linear-gradient(135deg, #0f172a, #7f1d1d)',
  },
  {
    id: 'halk-gozlemi',
    date: '28 Ağu 2026',
    title: 'Halka Açık Teleskop Gözlemi',
    city: 'İstanbul',
    type: 'Halk Gözlemi',
    free: true,
    camping: false,
    gradient: 'linear-gradient(135deg, #1e3a5f, #334155)',
  },
];

/** Hızlı erişim modülleri (§7.1) — ana sayfada tek satır */
export interface QuickModule {
  id: string;
  title: string;
  subtitle: string;
  to: string;
  icon: 'image' | 'map' | 'graduation' | 'calculator' | 'tag' | 'mountain';
  accent: string;
}

export const quickModules: QuickModule[] = [
  {
    id: 'photos',
    title: 'Fotoğraflar',
    subtitle: 'En iyi astrofotoğrafları keşfet',
    to: '/fotograflar',
    icon: 'image',
    accent: 'var(--color-accent-violet)',
  },
  {
    id: 'light-map',
    title: 'Işık Kirliliği Haritası',
    subtitle: 'Bölgenin gökyüzü kalitesini öğren',
    to: '/harita/isik-kirliligi',
    icon: 'map',
    accent: 'var(--color-accent-blue)',
  },
  {
    id: 'learning',
    title: 'Eğitim',
    subtitle: 'Makaleler, videolar ve rehberler',
    to: '/egitim',
    icon: 'graduation',
    accent: 'var(--color-accent-green)',
  },
  {
    id: 'fov',
    title: 'FOV Hesaplayıcı',
    subtitle: 'Teleskop görüş alanını hesapla',
    to: '/araclar/fov',
    icon: 'calculator',
    accent: 'var(--color-primary)',
  },
  {
    id: 'marketplace',
    title: 'İkinci El İlanlar',
    subtitle: 'Ekipman al & sat',
    to: '/ikinci-el',
    icon: 'tag',
    accent: 'var(--color-accent-orange)',
  },
  {
    id: 'sites',
    title: 'Kamp Alanları',
    subtitle: "Türkiye'de gözlem noktaları",
    to: '/harita/gozlem-noktalari',
    icon: 'mountain',
    accent: 'var(--color-accent-teal)',
  },
];

/** Popüler eğitim içerikleri / makaleler (§7.1) */
export interface ArticleItem {
  id: string;
  title: string;
  category: string;
  level: 'Başlangıç' | 'Orta' | 'İleri';
  gradient: string;
}

export const popularArticles: ArticleItem[] = [
  {
    id: 'ilk-setup',
    title: 'İlk Astrofotoğraf Setup’ını Kurmak',
    category: 'Başlangıç Rehberi',
    level: 'Başlangıç',
    gradient: 'linear-gradient(135deg, #7c2d12, #b45309, #f59e0b)',
  },
  {
    id: 'kalibrasyon',
    title: 'Dark, Flat ve Bias: Kalibrasyon Temelleri',
    category: 'İşleme',
    level: 'Orta',
    gradient: 'linear-gradient(135deg, #0f172a, #334155)',
  },
  {
    id: 'sho-palet',
    title: 'SHO Paleti ile Narrowband İşleme',
    category: 'İşleme Laboratuvarı',
    level: 'İleri',
    gradient: 'linear-gradient(135deg, #581c87, #be185d)',
  },
  {
    id: 'polar-align',
    title: 'Polar Alignment Nasıl Yapılır?',
    category: 'Teknik',
    level: 'Başlangıç',
    gradient: 'linear-gradient(135deg, #1e3a5f, #475569)',
  },
];
