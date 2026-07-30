import { useLocation } from 'react-router';
import { SITE_NAME, SITE_URL } from '@/lib/seo';

/**
 * Sayfa başlığı ve meta etiketleri (§16.2 SEO).
 *
 * React 19 belge metadata'sını kullanır: bileşen içinde render edilen
 * `<title>`, `<meta>` ve `<link rel="canonical">` etiketleri React
 * tarafından otomatik olarak `<head>`e taşınır. Bu sayede ek bir
 * bağımlılık (Helmet vb.) olmadan route başına metadata verilebilir.
 */

export interface PageMetaProps {
  /** Sayfa başlığı — "… | Astrohub" biçiminde tamamlanır. */
  title: string;
  description?: string;
  /** Ana sayfada başlık tek başına kullanılır (site adı eklenmez). */
  bare?: boolean;
  /** `noindex` gerektiren sayfalar: panel, arama, 404 (§16.2). */
  noIndex?: boolean;
  /** Sayfaya özgü yapılandırılmış veri (JSON-LD) nesnesi ya da nesneleri. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /**
   * Kanonik yol — varsayılan olarak ziyaret edilen adrestir.
   *
   * Aynı içeriğe birden çok adresten ulaşılabilen sayfalarda (ör. ekipman
   * detayında marka parçası doğrulanmaz) kanonik adresi sayfanın kendisi
   * bildirmelidir; aksi hâlde arama motoru aynı içeriği iki kez indeksler.
   */
  canonicalPath?: string;
}

export function PageMeta({
  title,
  description,
  bare = false,
  noIndex = false,
  jsonLd,
  canonicalPath,
}: PageMetaProps) {
  const { pathname } = useLocation();
  const fullTitle = bare ? title : `${title} | ${SITE_NAME}`;
  const canonical = SITE_URL ? `${SITE_URL}${canonicalPath ?? pathname}` : null;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex, follow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      <meta name="twitter:card" content="summary_large_image" />

      {blocks.map((block, i) => (
        <script
          // Sıra sabit; JSON-LD blokları her render'da yeniden üretilir.
          key={i}
          type="application/ld+json"
          // JSON.stringify çıktısı güvenlidir; `<` kaçışı ek koruma sağlar.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(block).replace(/</g, '\\u003c'),
          }}
        />
      ))}
    </>
  );
}
