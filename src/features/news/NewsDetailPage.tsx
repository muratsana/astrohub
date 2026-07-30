import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
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

  const publishedLabel = new Date(item.publishedAt).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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
        <article className="mx-auto max-w-3xl">
          <nav aria-label="İz" className="label mb-5">
            <Link to="/haberler" className="transition-colors hover:text-primary">
              ← Haberler
            </Link>
          </nav>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="primary">{newsCategoryLabels[item.category]}</Badge>
            <span className="tabular text-[11px] text-faint">
              {publishedLabel}
            </span>
          </div>

          <h1 className="text-[28px] leading-tight text-foreground sm:text-[36px]">
            {item.title}
          </h1>

          <p className="mt-4 border-l-2 border-primary pl-4 text-[14px] leading-relaxed text-foreground">
            {item.summary}
          </p>

          <PlateFrame ratio="aspect-[21/9]" className="mt-7">
            <StarField seed={item.slug} tint={item.tint} density={1.2} />
          </PlateFrame>

          <div className="mt-8 space-y-5 text-[13.5px] leading-[1.85] text-muted-foreground">
            {item.body.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>

          <footer className="mt-10 border-t border-border pt-5">
            <p className="label mb-1">Kaynak</p>
            <p className="text-[12.5px] text-foreground">
              {/*
                Kaynak adresi dış veriden gelir; `ExternalLink` güvenli
                olmayan şemalarda bağlantı kurmaz, düz metin bırakır (§15.4).
              */}
              <ExternalLink href={item.source.url} showHost>
                {item.source.name}
              </ExternalLink>
            </p>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              Haber içerikleri kaynağın yayınına dayanır; Astrohub editörü
              tarafından derlenir ve son doğrulama tarihiyle birlikte
              yayımlanır.
            </p>
          </footer>

          {related.length > 0 && (
            <section className="mt-10">
              <h2 className="label mb-3 border-b border-border pb-2">
                İlgili haberler
              </h2>
              <ul>
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to={`/haber/${r.slug}`}
                      className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 transition-colors hover:text-primary"
                    >
                      <span className="text-[12.5px] text-foreground">
                        {r.title}
                      </span>
                      <span className="tabular shrink-0 text-[10.5px] text-faint">
                        {new Date(r.publishedAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                        })}
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
