import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { sortedNews, newsCategoryLabels } from '@/features/news/data';
import { articles, articleCategoryLabels } from '@/features/articles/data';

/**
 * HABERLER VE YAZILAR — tek şeritte iki modül.
 *
 * Ana sayfada ayrı iki bölüm yerine yan yana iki sütun: haber akışı sol,
 * rehberler sağ. İkisi de metin odaklı olduğu için aynı ritmi paylaşırlar.
 */
export function NewsStrip() {
  const latestNews = sortedNews().slice(0, 4);
  const latestArticles = articles.slice(0, 4);

  return (
    <Container className="py-9 sm:py-11">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <section>
          <SectionHeader title="Haberler" linkTo="/haberler" linkLabel="Tümü" />
          <ul>
            {latestNews.map((item) => (
              <li key={item.slug}>
                <Link
                  to={`/haber/${item.slug}`}
                  className="group block border-b border-border py-3 transition-colors hover:bg-surface-1"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone="primary">
                      {newsCategoryLabels[item.category]}
                    </Badge>
                    <span className="tabular text-[10px] text-faint">
                      {new Date(item.publishedAt).toLocaleDateString('tr-TR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <p className="text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {item.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionHeader title="Yazılar" linkTo="/yazilar" linkLabel="Tümü" />
          <ul>
            {latestArticles.map((article) => (
              <li key={article.slug}>
                <Link
                  to={`/yazi/${article.slug}`}
                  className="group block border-b border-border py-3 transition-colors hover:bg-surface-1"
                >
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge tone="cold">
                      {articleCategoryLabels[article.category]}
                    </Badge>
                    <span className="tabular text-[10px] text-faint">
                      {article.duration}
                    </span>
                  </div>
                  <p className="text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                    {article.title}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    {article.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
