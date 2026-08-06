import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ReadingLayout } from '@/components/ui/ReadingLayout';
import { Badge } from '@/components/ui/Badge';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from '@/lib/seo';
import { newsCategoryLabels } from './data';
import { useNewsItems } from './useNews';
import { commonsWidthUrl } from '@/lib/commons';
import { ExternalLink } from '@/components/ExternalLink';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { paragraphsToBlocks } from '@/domain/content/blocks';
import { AdminEditLink } from '@/components/admin/AdminEditLink';

/** Haber detayı — okuma genişliği sınırlı, kaynak künyesi görünür. */
export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, loading } = useNewsItems();
  const item = slug ? items.find((n) => n.slug === slug) : undefined;

  /* Panelden yayımlanan haber tohumda yoktur; veritabanı yanıtı gelmeden
     404 basmak, var olan habere "yok" demek olurdu. Yanıt geldikten sonra
     hâlâ yoksa gerçekten yoktur. */
  if (!item) return loading ? null : <NotFoundPage />;

  const related = items
    .filter((n) => n.slug !== item.slug && n.category === item.category)
    .slice(0, 3);

  const publishedLabel = new Date(item.publishedAt).toLocaleDateString(
    'tr-TR',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  );

  return (
    <>
      <PageMeta
        title={item.title}
        description={item.summary}
        ogType="article"
        publishedTime={item.publishedAt}
        image={
          item.image
            ? {
                // Paylaşım kartı için 1200 genişlik yeterli; orijinal
                // dosya boyutunu bot'a indirtmenin anlamı yok.
                url: commonsWidthUrl(item.image.url, 1200) ?? item.image.url,
                alt: item.title,
              }
            : undefined
        }
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'NewsArticle',
            headline: item.title,
            description: item.summary,
            datePublished: item.publishedAt,
            url: absoluteUrl(`/haber/${item.slug}`),
            publisher: { '@type': 'Organization', name: SITE_NAME },
          },
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Haberler', path: '/haberler' },
            { name: item.title, path: `/haber/${item.slug}` },
          ]),
        ]}
      />

      <Container className="py-10 sm:py-12">
        <ReadingLayout
          aside={
            <div className="space-y-8">
              {/* Kaynak yan sütunda: haberde "bunu kim yayınladı" sorusu
                  metnin sonunda değil, okurken sorulur. Yan sütun da her
                  haberde dolu kalıyor — ilgili haber olmasa bile. */}
              <section aria-labelledby="haber-kunye">
                <h2
                  id="haber-kunye"
                  className="label mb-3 border-b border-border pb-2"
                >
                  Künye
                </h2>
                <dl className="space-y-2.5">
                  <div>
                    <dt className="text-meta text-faint">Kategori</dt>
                    <dd className="mt-1">
                      <Badge tone="primary">
                        {newsCategoryLabels[item.category]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-faint">Yayın</dt>
                    <dd className="tabular text-caption text-foreground">
                      {publishedLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-faint">Kaynak</dt>
                    <dd className="text-caption text-foreground">
                      {/*
                        Kaynak adresi dış veriden gelir; `ExternalLink`
                        güvenli olmayan şemalarda bağlantı kurmaz, düz
                        metin bırakır (§15.4).
                      */}
                      <ExternalLink href={item.source.url} showHost>
                        {item.source.name}
                      </ExternalLink>
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <AdminEditLink
                    to={`/admin/content?kind=haber&slug=${item.slug}`}
                  />
                </div>
              </section>

              {related.length > 0 && (
                <section aria-labelledby="ilgili-haberler">
                  <h2
                    id="ilgili-haberler"
                    className="label mb-3 border-b border-border pb-2"
                  >
                    İlgili haberler
                  </h2>
                  <ul>
                    {related.map((r) => (
                      <li key={r.slug}>
                        <Link
                          to={`/haber/${r.slug}`}
                          className="block border-b border-border py-2.5 transition-colors hover:text-primary"
                        >
                          <span className="block text-caption leading-snug text-foreground">
                            {r.title}
                          </span>
                          <span className="tabular mt-1 block text-meta text-faint">
                            {new Date(r.publishedAt).toLocaleDateString(
                              'tr-TR',
                              {
                                day: '2-digit',
                                month: 'long',
                              }
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          }
        >
          <article>
            <nav aria-label="İz" className="label mb-5">
              <Link
                to="/haberler"
                className="transition-colors hover:text-primary"
              >
                ← Haberler
              </Link>
            </nav>

            <h1 className="type-page-lg text-foreground">{item.title}</h1>

            <p className="mt-4 border-l-2 border-primary pl-4 text-body-sm leading-relaxed text-foreground">
              {item.summary}
            </p>

            <PlateFrame ratio="aspect-[21/9]" className="mt-7">
              <StarField seed={item.slug} tint={item.tint} density={1.2} />
            </PlateFrame>

            <BlockRenderer
              className="mt-8"
              blocks={item.bodyBlocks ?? paragraphsToBlocks(item.body)}
            />

            <footer className="mt-10 border-t border-border pt-5">
              <p className="text-meta leading-relaxed text-faint">
                Haber içerikleri kaynağın yayınına dayanır; Astrohub editörü
                tarafından derlenir ve son doğrulama tarihiyle birlikte
                yayımlanır.
              </p>
            </footer>
          </article>
        </ReadingLayout>
      </Container>
    </>
  );
}
