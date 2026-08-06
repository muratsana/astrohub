import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ReadingLayout } from '@/components/ui/ReadingLayout';
import { Badge } from '@/components/ui/Badge';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from '@/lib/seo';
import { articleCategoryLabels, articleHref } from './data';
import { commonsWidthUrl } from '@/lib/commons';
import { useArticles } from './useArticles';
import { BlockRenderer } from '@/components/content/BlockRenderer';
import { paragraphsToBlocks } from '@/domain/content/blocks';
import { AdminEditLink } from '@/components/admin/AdminEditLink';

/** Yazı detayı — okuma genişliği ~70 karakter, görselsiz. */
export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { items, loading } = useArticles();
  const article = slug ? items.find((a) => a.slug === slug) : undefined;

  /* Panelden yayımlanan yazı tohumda yoktur; veritabanı yanıtı gelmeden
     404 basılmaz (gerekçe: NewsDetailPage). */
  if (!article) return loading ? null : <NotFoundPage />;

  const related = items
    .filter((a) => a.slug !== article.slug && a.category === article.category)
    .slice(0, 3);

  return (
    <>
      <PageMeta
        title={article.title}
        description={article.summary}
        ogType="article"
        publishedTime={article.publishedAt}
        image={
          article.image
            ? {
                url:
                  commonsWidthUrl(article.image.url, 1200) ?? article.image.url,
                alt: article.title,
              }
            : undefined
        }
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: article.title,
            description: article.summary,
            datePublished: article.publishedAt,
            author: { '@type': 'Person', name: article.author },
            url: absoluteUrl(`/yazi/${article.slug}`),
            publisher: { '@type': 'Organization', name: SITE_NAME },
          },
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yazılar', path: '/yazilar' },
            { name: article.title, path: `/yazi/${article.slug}` },
          ]),
        ]}
      />

      <Container className="py-10 sm:py-12">
        <ReadingLayout
          aside={
            <div className="space-y-8">
              {/*
                KÜNYE YAN SÜTUNDA, METNİN ÜSTÜNDE DEĞİL.

                Rozet satırı ve yazar/tarih satırı başlıkla gövde arasında
                duruyordu; okumaya gelen kişi her seferinde onların üstünden
                atlıyordu. Yana alınca hem metin daha erken başlıyor hem de
                yan sütun HER yazıda dolu oluyor — "ilgili yazılar" boşsa
                (kategorisinde tek yazıysa) sütun boş kalmıyor.
              */}
              <section aria-labelledby="yazi-kunye">
                <h2
                  id="yazi-kunye"
                  className="label mb-3 border-b border-border pb-2"
                >
                  Künye
                </h2>
                <dl className="space-y-2.5">
                  <div>
                    <dt className="text-meta text-faint">Kategori</dt>
                    <dd className="mt-1">
                      <Badge tone="cold">
                        {articleCategoryLabels[article.category]}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-faint">Seviye</dt>
                    <dd className="mt-1">
                      <Badge
                        tone={
                          article.level === 'Başlangıç'
                            ? 'success'
                            : article.level === 'Orta'
                              ? 'primary'
                              : 'danger'
                        }
                      >
                        {article.level}
                      </Badge>
                    </dd>
                  </div>
                  {article.duration && (
                    <div>
                      <dt className="text-meta text-faint">Okuma</dt>
                      <dd className="tabular text-caption text-foreground">
                        {article.duration}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-meta text-faint">Yazar</dt>
                    <dd className="text-caption text-foreground">
                      {article.author}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-meta text-faint">Yayın</dt>
                    <dd className="tabular text-caption text-foreground">
                      {new Date(article.publishedAt).toLocaleDateString(
                        'tr-TR',
                        { day: '2-digit', month: 'long', year: 'numeric' }
                      )}
                    </dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <AdminEditLink
                    to={`/admin/content?kind=yazi&slug=${article.slug}`}
                  />
                </div>
              </section>

              {related.length > 0 && (
                <section aria-labelledby="ilgili-yazilar">
                  <h2
                    id="ilgili-yazilar"
                    className="label mb-3 border-b border-border pb-2"
                  >
                    İlgili yazılar
                  </h2>
                  <ul>
                    {related.map((r) => (
                      <li key={r.slug}>
                        <Link
                          to={articleHref(r)}
                          className="block border-b border-border py-2.5 transition-colors hover:text-primary"
                        >
                          <span className="block text-caption leading-snug text-foreground">
                            {r.title}
                          </span>
                          <span className="tabular mt-1 block text-meta text-faint">
                            {r.duration}
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
                to="/yazilar"
                className="transition-colors hover:text-primary"
              >
                ← Yazılar
              </Link>
            </nav>

            <h1 className="type-page-lg text-foreground">{article.title}</h1>

            <p className="mt-6 border-l-2 border-primary pl-4 text-body-sm leading-relaxed text-foreground">
              {article.summary}
            </p>

            <BlockRenderer
              className="mt-8"
              blocks={article.bodyBlocks ?? paragraphsToBlocks(article.body)}
            />

            <p className="mt-10 border-t border-border pt-5 text-meta leading-relaxed text-faint">
              Bu yazı topluluk katkısıyla güncellenir. Eksik ya da hatalı
              bulduğun bir nokta varsa bildirmen içeriği doğrudan iyileştirir.
            </p>
          </article>
        </ReadingLayout>
      </Container>
    </>
  );
}
