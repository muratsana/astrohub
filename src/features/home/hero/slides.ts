import type { HeroScene } from '@/components/media/HeroBackdrop';
import { commonsImage } from '@/lib/commons';

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
  /**
   * Gerçek fotoğraf — varsa çizilen sahnenin üstüne biner.
   *
   * SAHNE YEDEK OLARAK KALIYOR, silinmedi: adres bir gün taşınırsa ya da
   * ağ yoksa hero boş bir kutuya dönmemeli. Fotoğraf yüklenemezse
   * altındaki tuval sahnesi görünür ve kimse bir şey kaybetmez.
   *
   * LİSANS. Yalnızca yeniden kullanımına izin veren kaynaklar: NASA/ESA
   * yayınları kamu malı, ESO görselleri CC BY 4.0. Kredi ekranda
   * gösteriliyor — CC BY'nin şartı bu ve gösterilmediğinde lisans
   * ihlali olur. Dosya adları Commons üzerinde tek tek doğrulandı.
   */
  image?: {
    url: string;
    credit: string;
    licence: string;
  };
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
    image: {
      url: commonsImage('Pillars of creation 2014 HST WFC3-UVIS full-res.jpg', 1800),
      credit: 'NASA, ESA, Hubble — Yaratılış Sütunları',
      licence: 'Kamu malı',
    },
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
    image: {
      url: commonsImage('Two telescopes observing the night sky at the Paranal Observatory.jpg', 1800),
      credit: 'ESO — Paranal Gözlemevi',
      licence: 'CC BY 4.0',
    },
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
    image: {
      url: commonsImage('Milky Way over the VLT (dsc4081-cc).jpg', 1800),
      credit: 'ESO — VLT üzerinde Samanyolu',
      licence: 'CC BY 4.0',
    },
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
    image: {
      url: commonsImage('Laser Towards Milky Ways Centre.jpg', 1800),
      credit: 'ESO — Samanyolu merkezine lazer',
      licence: 'CC BY 4.0',
    },
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
    image: {
      url: commonsImage('Orion Nebula - Hubble 2006 mosaic.jpg', 1800),
      credit: 'NASA, ESA, M. Robberto (STScI/ESA)',
      licence: 'Kamu malı',
    },
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
