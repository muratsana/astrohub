import { photos } from '../features/photos/data';
import { targets } from '../features/targets/data';
import { events } from '../features/events/data';
import { sites } from '../features/observing-sites/data';
import { equipment, equipmentPath } from '../features/equipment/data';
import { listings } from '../features/marketplace/data';
import { cityRoutePaths } from '../features/city/routes';
import { articles } from '../features/articles/data';
import { news } from '../features/news/data';

/**
 * Sitemap girdileri (§16.2). Yalnızca indekslenebilir, herkese açık sayfalar
 * listelenir; panel/admin/auth ve yükleme akışı `robots.txt` ile birlikte
 * dışarıda bırakılır.
 *
 * Not: Bu modül derleme zamanında Node tarafında da çalıştırıldığı için
 * yalnızca göreli içe aktarma ve saf veri kullanır — React/tarayıcı
 * bağımlılığı taşımaz.
 */

export interface SitemapEntry {
  path: string;
  /** Arama motoruna göreli önem (0.0–1.0). */
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

/** Sabit (statik) sayfalar. */
export const staticEntries: SitemapEntry[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/kesfet', priority: 0.8, changefreq: 'daily' },
  { path: '/galeri', priority: 0.9, changefreq: 'daily' },
  { path: '/hedefler', priority: 0.8, changefreq: 'weekly' },
  { path: '/etkinlikler', priority: 0.9, changefreq: 'daily' },
  { path: '/saha', priority: 0.8, changefreq: 'weekly' },
  { path: '/haberler', priority: 0.9, changefreq: 'daily' },
  { path: '/araclar/isik-kirliligi', priority: 0.6, changefreq: 'monthly' },
  { path: '/bu-gece', priority: 0.6, changefreq: 'daily' },
  { path: '/planlayici', priority: 0.5, changefreq: 'monthly' },
  { path: '/ekipman', priority: 0.7, changefreq: 'weekly' },
  { path: '/araclar', priority: 0.7, changefreq: 'monthly' },
  { path: '/araclar/fov', priority: 0.7, changefreq: 'monthly' },
  { path: '/araclar/pixel-scale', priority: 0.6, changefreq: 'monthly' },
  { path: '/araclar/mosaic', priority: 0.6, changefreq: 'monthly' },
  { path: '/araclar/setup-uyumluluk', priority: 0.6, changefreq: 'monthly' },
  { path: '/araclar/takvim', priority: 0.6, changefreq: 'daily' },
  { path: '/etkinlikler/harita', priority: 0.6, changefreq: 'daily' },
  { path: '/cerezler', priority: 0.2, changefreq: 'yearly' },
  { path: '/yazilar', priority: 0.8, changefreq: 'weekly' },
  { path: '/ilanlar', priority: 0.7, changefreq: 'daily' },
  { path: '/topluluklar', priority: 0.5, changefreq: 'monthly' },
  { path: '/hakkinda', priority: 0.4, changefreq: 'yearly' },
  { path: '/kvkk', priority: 0.3, changefreq: 'yearly' },
  { path: '/kullanim-kosullari', priority: 0.3, changefreq: 'yearly' },
];

/**
 * İçerik sayfaları. MVP'de tohum verisinden türetilir; veritabanı
 * bağlandığında aynı yapı sorgu sonucundan doldurulacaktır.
 */
export function contentEntries(): SitemapEntry[] {
  return [
    ...photos.map((p) => ({
      path: `/fotograf/${p.slug}`,
      priority: 0.7,
      changefreq: 'monthly' as const,
    })),
    ...targets.map((t) => ({
      path: `/hedef/${t.slug}`,
      priority: 0.7,
      changefreq: 'monthly' as const,
    })),
    ...events.map((e) => ({
      path: `/etkinlik/${e.slug}`,
      priority: 0.8,
      changefreq: 'weekly' as const,
    })),
    ...sites.map((s) => ({
      path: `/saha/${s.slug}`,
      priority: 0.7,
      changefreq: 'monthly' as const,
    })),
    ...[...new Set(equipment.map((e) => e.category))].map((category) => ({
      path: `/ekipman/${category}`,
      priority: 0.6,
      changefreq: 'monthly' as const,
    })),
    ...equipment.map((e) => ({
      path: equipmentPath(e),
      priority: 0.5,
      changefreq: 'monthly' as const,
    })),
    ...listings.map((l) => ({
      path: `/ilan/${l.slug}`,
      priority: 0.5,
      changefreq: 'weekly' as const,
    })),
    /*
     * Şehir sayfaları: arama motoru için asıl giriş noktaları. Öncelik
     * etkinlik detaylarının üstünde tutuluyor çünkü aranan sorgu ("ankara
     * astronomi etkinlikleri") tam olarak bu sayfanın karşılığı.
     */
    ...cityRoutePaths.map((path) => ({
      path: `/${path}`,
      priority: 0.7,
      changefreq: 'weekly' as const,
    })),
    ...articles.map((a) => ({
      path: `/yazi/${a.slug}`,
      priority: 0.6,
      changefreq: 'monthly' as const,
    })),
    ...news.map((n) => ({
      path: `/haber/${n.slug}`,
      priority: 0.7,
      changefreq: 'monthly' as const,
    })),
  ];
}

/** Tüm girdilerden sitemap XML'i üretir. */
export function buildSitemapXml(siteUrl: string, lastmod: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const entries = [...staticEntries, ...contentEntries()];

  const urls = entries
    .map(
      (entry) =>
        `  <url>\n` +
        `    <loc>${base}${entry.path}</loc>\n` +
        `    <lastmod>${lastmod}</lastmod>\n` +
        `    <changefreq>${entry.changefreq}</changefreq>\n` +
        `    <priority>${entry.priority.toFixed(1)}</priority>\n` +
        `  </url>`
    )
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`
  );
}
