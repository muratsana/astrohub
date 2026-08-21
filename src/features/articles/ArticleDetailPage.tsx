import { UpLink } from '@/components/ui/UpLink';
import { entryEditPath } from '@/components/admin/adminEditPath';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
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

/** Yazı detayı — künye üstte, içerik tam kullanılabilir genişlikte. */
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
        <article className="w-full">
          <nav aria-label="İz" className="label mb-5">
            <UpLink etiket="Yazılar" />
          </nav>

          <header className="border-b border-border pb-6">
            <h1 className="type-page-lg text-foreground">{article.title}</h1>

            <p className="mt-6 max-w-none border-l-2 border-primary pl-4 text-justify text-body-sm leading-7 text-foreground [text-align-last:left]">
              {article.summary}
            </p>
          </header>

          <section
            aria-labelledby="yazi-kunye"
            className="border-b border-border py-3"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <h2
                id="yazi-kunye"
                className="label shrink-0 text-foreground lg:w-20"
              >
                Künye
              </h2>
              <dl className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                <MetaItem label="Kategori">
                  <Badge tone="cold">
                    {articleCategoryLabels[article.category]}
                  </Badge>
                </MetaItem>
                <MetaItem label="Seviye">
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
                </MetaItem>
                <MetaItem label="Okuma">
                  <span className="tabular">{article.duration}</span>
                </MetaItem>
                <MetaItem label="Yazar">{article.author}</MetaItem>
                <MetaItem label="Yayın">
                  <span className="tabular">
                    {new Date(article.publishedAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </MetaItem>
              </dl>
              <div className="shrink-0">
                <AdminEditLink to={entryEditPath('yazi', article.slug)} />
              </div>
            </div>
          </section>

          <BlockRenderer
            className="mt-8 w-full max-w-none text-justify [text-align-last:left] [&>blockquote]:max-w-none [&>h2]:max-w-none [&>h3]:max-w-none [&>ol]:max-w-none [&>p]:max-w-none [&>ul]:max-w-none"
            blocks={article.bodyBlocks ?? paragraphsToBlocks(article.body)}
          />

          <p className="mt-10 border-t border-border pt-5 text-meta leading-relaxed text-faint">
            Bu yazı topluluk katkısıyla güncellenir. Eksik ya da hatalı bulduğun
            bir nokta varsa bildirmen içeriği doğrudan iyileştirir.
          </p>

          {related.length > 0 && (
            <section aria-labelledby="ilgili-yazilar" className="mt-10">
              <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
                <h2 id="ilgili-yazilar" className="label text-foreground">
                  İlgili yazılar
                </h2>
                <Link
                  to="/yazilar"
                  className="text-meta text-faint hover:text-primary"
                >
                  Tümü →
                </Link>
              </div>
              <ul className="grid gap-3 md:grid-cols-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to={articleHref(r)}
                      className="block h-full rounded-card border border-border bg-surface-2 px-4 py-3 transition-colors hover:border-primary/50"
                    >
                      <span className="block text-caption font-semibold leading-snug text-foreground">
                        {r.title}
                      </span>
                      <span className="tabular mt-2 block text-meta text-faint">
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

function MetaItem({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-caption">
      <dt className="text-meta text-faint">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}
