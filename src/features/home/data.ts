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

/**
 * Editoryal giriş alanı — sağ sütundaki dikey fotoğraf seçkisi (§7.1).
 * id alanı fotoğraf detay slug'ıdır (features/photos/data.ts ile eşleşir).
 */
export const heroPhotos: PhotoItem[] = [
  {
    id: 'ngc6302-kelebek-sho',
    title: 'Kelebek Bulutsusu',
    user: 'astrocan',
    gradient:
      'radial-gradient(120% 90% at 50% 40%, #2b6cb0 0%, #6b46c1 35%, #1a1035 70%, #050a12 100%)',
  },
  {
    id: 'm31-andromeda-lrgb',
    title: 'Andromeda Galaksisi',
    user: 'mert_astro',
    gradient:
      'radial-gradient(90% 70% at 55% 45%, #d6bca0 0%, #7c5c46 30%, #241a2e 65%, #050a12 100%)',
  },
  {
    id: 'ic434-at-basi-sho',
    title: 'At Başı Bulutsusu',
    user: 'gokhanuzun',
    gradient:
      'radial-gradient(120% 100% at 45% 55%, #c026d3 0%, #9d174d 35%, #3b0a24 70%, #050a12 100%)',
  },
  {
    id: 'ay-kopernik-krateri',
    title: 'Ay',
    user: 'cemyildirim',
    gradient:
      'radial-gradient(70% 70% at 60% 40%, #e5e7eb 0%, #9ca3af 30%, #4b5563 55%, #111827 100%)',
  },
];

/**
 * Öne çıkan astrofotoğraflar bölümü (§7.1).
 * id alanı fotoğraf detay slug'ıdır (features/photos/data.ts ile eşleşir).
 */
export const featuredPhotos: PhotoItem[] = [
  {
    id: 'samanyolu-kemeri-kapadokya',
    title: 'Samanyolu Kemeri',
    user: 'nightscaper',
    gradient:
      'linear-gradient(160deg, #1e293b 0%, #4c1d95 40%, #be185d 75%, #f59e0b 100%)',
    integration: '3 dk',
    likes: 388,
    comments: 33,
  },
  {
    id: 'rozet-bulutsusu-sho',
    title: 'Rozet Bulutsusu',
    user: 'deepsky_tr',
    gradient:
      'radial-gradient(100% 100% at 50% 50%, #ef4444 0%, #7f1d1d 45%, #2a0a16 80%, #050a12 100%)',
    integration: '9 sa',
    likes: 288,
    comments: 41,
  },
  {
    id: 'yildiz-izleri-agri',
    title: 'Yıldız İzleri',
    user: 'polaris34',
    gradient: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 55%, #475569 100%)',
    integration: '2 sa',
    likes: 176,
    comments: 12,
  },
  {
    id: 'ic434-at-basi-sho',
    title: 'At Başı & Alev',
    user: 'gokhanuzun',
    gradient:
      'radial-gradient(120% 90% at 40% 60%, #dc2626 0%, #991b1b 40%, #1f0a0a 80%, #050a12 100%)',
    integration: '7 sa',
    likes: 421,
    comments: 58,
  },
  {
    id: 'jupiter-buyuk-kirmizi-leke',
    title: 'Jüpiter ve Büyük Kırmızı Leke',
    user: 'planetary_tr',
    gradient:
      'radial-gradient(80% 80% at 50% 45%, #d9c4a0 0%, #b08355 35%, #6b4a2e 65%, #1a1208 100%)',
    integration: '8 dk',
    likes: 203,
    comments: 27,
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
    to: '/galeri',
    icon: 'image',
    accent: 'var(--color-accent-violet)',
  },
  {
    id: 'light-map',
    title: 'Işık Kirliliği Haritası',
    subtitle: 'Bölgenin gökyüzü kalitesini öğren',
    to: '/araclar/isik-kirliligi',
    icon: 'map',
    accent: 'var(--color-accent-blue)',
  },
  {
    id: 'learning',
    title: 'Eğitim',
    subtitle: 'Makaleler, videolar ve rehberler',
    to: '/yazilar',
    icon: 'graduation',
    accent: 'var(--color-accent-green)',
  },
  {
    id: 'fov',
    title: 'FoV Setup Simülatörü',
    subtitle: 'Kadraj, pixel scale ve setup uyumunu tek ekranda gör',
    to: '/araclar/kadraj',
    icon: 'calculator',
    accent: 'var(--color-primary)',
  },
  {
    id: 'marketplace',
    title: 'İkinci El İlanlar',
    subtitle: 'Ekipman al & sat',
    to: '/ilanlar',
    icon: 'tag',
    accent: 'var(--color-accent-orange)',
  },
  {
    id: 'sites',
    title: 'Kamp Alanları',
    subtitle: "Türkiye'de gözlem noktaları",
    to: '/saha',
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
    id: 'gurultu-gain-poz',
    title: 'Gürültü, Gain ve Poz Süresi',
    category: 'Teknik',
    level: 'Orta',
    gradient: 'linear-gradient(135deg, #7c2d12, #b45309, #f59e0b)',
  },
  {
    id: 'odak-fov-piksel-olcegi',
    title: 'Odak, FOV ve Piksel Ölçeği',
    category: 'Teknik',
    level: 'Orta',
    gradient: 'linear-gradient(135deg, #0f172a, #334155)',
  },
  {
    id: 'lrgb-darbant-paletler',
    title: 'Filtreler: LRGB, Dar Bant ve Paletler',
    category: 'Teknik',
    level: 'İleri',
    gradient: 'linear-gradient(135deg, #581c87, #be185d)',
  },
  {
    id: 'kutup-hizalamasi',
    title: 'Kutup Hizalaması',
    category: 'Teknik',
    level: 'Orta',
    gradient: 'linear-gradient(135deg, #1e3a5f, #475569)',
  },
];
