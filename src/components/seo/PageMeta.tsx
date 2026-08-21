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
  /**
   * Sosyal paylaşım görseli (QA SEO-03). MUTLAK adres olmalı — göreli yol
   * paylaşımda kırık kart üretir; göreli değer verilirse SITE_URL ile
   * mutlaklaştırılır, SITE_URL yoksa hiç basılmaz (yanlış alan adı,
   * etiketsizlikten zararlıdır — canonical ile aynı kural).
   */
  image?: { url: string; alt?: string; width?: number; height?: number };
  /** İçerik türü: makale/haber sayfaları `article`, geri kalanı `website`. */
  ogType?: 'website' | 'article';
  /** `article` türü için yayın tarihi (ISO). */
  publishedTime?: string;
}

export function PageMeta({
  title,
  description,
  bare = false,
  noIndex = false,
  jsonLd,
  canonicalPath,
  image,
  ogType = 'website',
  publishedTime,
}: PageMetaProps) {
  const { pathname } = useLocation();
  const fullTitle = bare ? title : `${title} | ${SITE_NAME}`;
  const canonical = SITE_URL ? `${SITE_URL}${canonicalPath ?? pathname}` : null;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  const imageUrl = image
    ? /^https?:\/\//i.test(image.url)
      ? image.url
      : SITE_URL
        ? `${SITE_URL}${image.url}`
        : null
    : null;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {noIndex && <meta name="robots" content="noindex, follow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      {canonical && <meta property="og:url" content={canonical} />}
      {ogType === 'article' && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {imageUrl && (
        <>
          <meta property="og:image" content={imageUrl} />
          {image?.alt && <meta property="og:image:alt" content={image.alt} />}
          {image?.width && (
            <meta property="og:image:width" content={String(image.width)} />
          )}
          {image?.height && (
            <meta property="og:image:height" content={String(image.height)} />
          )}
          <meta name="twitter:image" content={imageUrl} />
        </>
      )}
      <meta
        name="twitter:card"
        content={imageUrl ? 'summary_large_image' : 'summary'}
      />

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
