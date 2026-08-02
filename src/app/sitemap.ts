import { photos } from '../features/photos/data';
import { targets } from '../features/targets/data';
import { events } from '../features/events/data';
import { sites } from '../features/observing-sites/data';
import { equipment, equipmentPath } from '../features/equipment/data';
import { listings } from '../features/marketplace/data';
import { cityRoutePaths } from '../features/city/routes';
import { clubs } from '../features/clubs/data';
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
  /**
   * Kaydın kendi güncellenme tarihi (YYYY-MM-DD). Verilmezse derleme
   * tarihi yazılır — tohum sayfalar için doğru olan bu; veritabanından
   * gelen kayıtlar gerçek yayın tarihini taşır (QA SEO-02).
   */
  lastmod?: string;
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
  { path: '/araclar/poz-plani', priority: 0.6, changefreq: 'monthly' },
  { path: '/araclar/setup-uyumluluk', priority: 0.6, changefreq: 'monthly' },
  { path: '/araclar/takvim', priority: 0.6, changefreq: 'daily' },
  { path: '/etkinlikler/harita', priority: 0.6, changefreq: 'daily' },
  { path: '/cerezler', priority: 0.2, changefreq: 'yearly' },
  { path: '/yazilar', priority: 0.8, changefreq: 'weekly' },
  /* Sözlük ve SSS indekslenmeli: ikisi de arama motorundan gelen
     "X ne demek" / "kota nedir" sorularının doğal karşılığı. Gözlem
     günlüğü (`/gunluk`) BİLEREK LİSTEDE YOK — kişisel ve `noIndex`. */
  { path: '/sozluk', priority: 0.6, changefreq: 'monthly' },
  { path: '/sss', priority: 0.5, changefreq: 'monthly' },
  { path: '/ilanlar', priority: 0.7, changefreq: 'daily' },
  { path: '/topluluklar', priority: 0.6, changefreq: 'monthly' },
  { path: '/tesisler', priority: 0.6, changefreq: 'monthly' },
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
    ...clubs.map((c) => ({
      path: `/topluluk/${c.slug}`,
      priority: 0.5,
      changefreq: 'monthly' as const,
    })),
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

/**
 * Panelden yayımlanan içerik (content_entries) sitemap'e derleme sırasında
 * eklenir. supabase-js bilerek kullanılmıyor: derleme betiğinin ihtiyacı
 * tek bir GET; PostgREST'e düz `fetch` yeterli ve derlemeye bağımlılık
 * eklemiyor. Yalnızca `yayinda` kayıtlar — taslaklar RLS'te de kapalı ama
 * niyet burada da okunmalı (QA SEO-02).
 */
export interface DbEntryRow {
  kind: 'haber' | 'yazi';
  slug: string;
  published_at: string;
}

export function dbRowsToEntries(rows: DbEntryRow[]): SitemapEntry[] {
  return rows.map((row) => ({
    path: `/${row.kind === 'haber' ? 'haber' : 'yazi'}/${row.slug}`,
    priority: row.kind === 'haber' ? 0.7 : 0.6,
    changefreq: 'monthly' as const,
    lastmod: row.published_at?.slice(0, 10) || undefined,
  }));
}

export async function fetchDbSitemapEntries(
  supabaseUrl: string,
  anonKey: string
): Promise<SitemapEntry[]> {
  const endpoint =
    `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/content_entries` +
    `?select=kind,slug,published_at&status=eq.yayinda`;
  const response = await fetch(endpoint, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`content_entries okunamadı: HTTP ${response.status}`);
  }
  return dbRowsToEntries((await response.json()) as DbEntryRow[]);
}

/**
 * Tüm girdilerden sitemap XML'i üretir.
 *
 * `extra` (veritabanı kayıtları) tohum girdilerle AYNI YOLU taşıyorsa
 * kazanır: panelden düzenlenen içerik tohumun üstüne geçmişti (mergeWithSeed
 * kuralı); sitemap'te de aynı kayıt iki kez görünmemeli.
 */
export function buildSitemapXml(
  siteUrl: string,
  lastmod: string,
  extra: SitemapEntry[] = []
): string {
  const base = siteUrl.replace(/\/$/, '');

  const byPath = new Map<string, SitemapEntry>();
  for (const entry of [...staticEntries, ...contentEntries(), ...extra]) {
    byPath.set(entry.path, entry);
  }

  const urls = [...byPath.values()]
    .map(
      (entry) =>
        `  <url>\n` +
        `    <loc>${base}${entry.path}</loc>\n` +
        `    <lastmod>${entry.lastmod ?? lastmod}</lastmod>\n` +
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
