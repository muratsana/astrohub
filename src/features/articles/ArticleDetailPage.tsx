import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from '@/lib/seo';
import { articleCategoryLabels } from './data';
import { commonsWidthUrl } from '@/lib/commons';
import { useArticles } from './useArticles';

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
        <article className="mx-auto max-w-3xl">
          <nav aria-label="İz" className="label mb-5">
            <Link to="/yazilar" className="transition-colors hover:text-primary">
              ← Yazılar
            </Link>
          </nav>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="cold">{articleCategoryLabels[article.category]}</Badge>
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
            <span className="tabular text-meta text-faint">
              {article.duration}
            </span>
          </div>

          <h1 className="type-page-lg text-foreground">
            {article.title}
          </h1>

          <p className="tabular mt-3 text-meta text-muted-foreground">
            {article.author} ·{' '}
            {new Date(article.publishedAt).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <p className="mt-6 border-l-2 border-primary pl-4 text-body-sm leading-relaxed text-foreground">
            {article.summary}
          </p>

          <div className="mt-8 space-y-5 text-body-sm leading-[1.85] text-muted-foreground">
            {article.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <p className="mt-10 border-t border-border pt-5 text-meta leading-relaxed text-faint">
            Bu yazı topluluk katkısıyla güncellenir. Eksik ya da hatalı bulduğun
            bir nokta varsa bildirmen içeriği doğrudan iyileştirir.
          </p>

          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="label mb-3 border-b border-border pb-2">
                İlgili yazılar
              </h2>
              <ul>
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to={`/yazi/${r.slug}`}
                      className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 transition-colors hover:text-primary"
                    >
                      <span className="text-caption text-foreground">
                        {r.title}
                      </span>
                      <span className="tabular shrink-0 text-meta text-faint">
                        {r.duration}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>
      </Container>
    </>
  );
}
