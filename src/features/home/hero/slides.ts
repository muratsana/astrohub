import type { HeroScene } from '@/components/media/HeroBackdrop';

/**
 * HERO SLAYTLARI — ana sayfanın üst carousel'i.
 *
 * Beş slayt, beş ana modülü tanıtır. İçerik burada saf veri olarak durur:
 * önizleme editörü bu yapıyı doğrudan düzenler, bileşen yalnızca render eder.
 */

export interface HeroSlide {
  id: string;
  /** Sol üstteki kategori etiketi. */
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  /** Modüle özgü arka plan sahnesi. */
  scene: HeroScene;
  /** Sahne rengi "r,g,b". */
  tint: string;
}

export const defaultHeroSlides: HeroSlide[] = [
  {
    id: 'galeri',
    badge: 'Galeri',
    title: 'Her karenin bir künyesi var',
    subtitle:
      'Astrofotoğrafını hedefi, optiği, filtresi ve gökyüzü koşullarıyla birlikte arşivle.',
    ctaLabel: 'Galeriye bak',
    ctaTo: '/galeri',
    scene: 'nebula',
    tint: '232,120,96',
  },
  {
    id: 'etkinlikler',
    badge: 'Etkinlikler',
    title: 'Yaklaşan gözlem etkinlikleri',
    subtitle: 'Şehrindeki gözlem şenliklerini ve kampları kaçırma.',
    ctaLabel: 'Etkinliklere bak',
    ctaTo: '/etkinlikler',
    scene: 'gathering',
    tint: '150,185,235',
  },
  {
    id: 'saha',
    badge: 'Saha',
    title: 'Karanlık gökyüzünü bul',
    subtitle:
      'Bortle sınıfı, SQM ölçümü ve kamp olanaklarıyla değerlendirilmiş gözlem alanları.',
    ctaLabel: 'Sahayı aç',
    ctaTo: '/saha',
    scene: 'ridge',
    tint: '132,190,220',
  },
  {
    id: 'araclar',
    badge: 'Araçlar',
    title: 'Geceni önceden planla',
    subtitle:
      'FOV ve pixel scale hesapla, ay fazını ve astronomik karanlığı gör.',
    ctaLabel: 'Araçları aç',
    ctaTo: '/araclar',
    scene: 'instrument',
    tint: '232,157,46',
  },
  {
    id: 'yazilar',
    badge: 'Yazılar & Haberler',
    title: 'Gökyüzü gündemi ve rehberler',
    subtitle:
      'Kalibrasyondan narrowband işlemeye rehberler, güncel astronomi haberleri.',
    ctaLabel: 'Yazıları oku',
    ctaTo: '/yazilar',
    scene: 'chart',
    tint: '178,150,235',
  },
];

/** Editörde düzenlenebilen metin alanları. */
export const editableFields = [
  { key: 'badge', label: 'Etiket' },
  { key: 'title', label: 'Başlık' },
  { key: 'subtitle', label: 'Alt metin' },
  { key: 'ctaLabel', label: 'Buton yazısı' },
  { key: 'ctaTo', label: 'Buton adresi' },
] as const;

export type EditableField = (typeof editableFields)[number]['key'];
