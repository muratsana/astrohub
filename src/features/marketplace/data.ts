import type { EquipmentCategory } from '@/features/equipment/data';

/** İlan tohum verisi (§7.13). Gerçek ilan akışı + moderasyon Faz 1.8'de. */

export type ListingCondition = 'Sıfır gibi' | 'Çok iyi' | 'İyi' | 'Yıpranmış';

export interface Listing {
  slug: string;
  title: string;
  category: EquipmentCategory;
  price: number; // TL
  city: string;
  condition: ListingCondition;
  hasInvoice: boolean;
  shippingOk: boolean;
  seller: { username: string; verified: boolean; rating: number };
  postedAt: string;
  gradient: string;
}

export const listings: Listing[] = [
  {
    slug: 'eq6r-pro-temiz',
    title: 'Sky-Watcher EQ6-R Pro — kutulu, az kullanılmış',
    category: 'montur',
    price: 42000,
    city: 'İstanbul',
    condition: 'Çok iyi',
    hasInvoice: true,
    shippingOk: true,
    seller: { username: 'mert_astro', verified: true, rating: 4.9 },
    postedAt: '2026-07-10',
    gradient: 'linear-gradient(135deg, #1e293b, #334155)',
  },
  {
    slug: 'asi533mc-pro',
    title: 'ZWO ASI533MC Pro + tilt plate',
    category: 'astro-kamera',
    price: 28500,
    city: 'Ankara',
    condition: 'Sıfır gibi',
    hasInvoice: true,
    shippingOk: true,
    seller: { username: 'deepsky_tr', verified: true, rating: 5.0 },
    postedAt: '2026-07-12',
    gradient: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
  },
  {
    slug: 'redcat51-ilk-sahibinden',
    title: 'William Optics RedCat 51 — ilk sahibinden',
    category: 'optik-tup',
    price: 24000,
    city: 'İzmir',
    condition: 'Çok iyi',
    hasInvoice: false,
    shippingOk: false,
    seller: { username: 'polaris34', verified: false, rating: 4.6 },
    postedAt: '2026-07-08',
    gradient: 'linear-gradient(135deg, #7c2d12, #b45309)',
  },
  {
    slug: 'lextreme-2inch',
    title: 'Optolong L-eXtreme 2" — kutusunda',
    category: 'filtre',
    price: 7500,
    city: 'Bursa',
    condition: 'İyi',
    hasInvoice: false,
    shippingOk: true,
    seller: { username: 'planetary_tr', verified: true, rating: 4.8 },
    postedAt: '2026-07-13',
    gradient: 'linear-gradient(135deg, #14532d, #166534)',
  },
];
