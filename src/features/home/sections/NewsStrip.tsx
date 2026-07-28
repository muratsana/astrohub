import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { RemoteImage } from '@/components/media/RemoteImage';
import { StarField } from '@/components/media/StarField';
import { sortedNews, newsCategoryLabels } from '@/features/news/data';
import { articles, articleCategoryLabels } from '@/features/articles/data';
import { applyFeatured, useFeatured } from '@/services/content/featured';

/**
 * HABERLER VE YAZILAR — tek şeritte iki modül.
 *
 * Ana sayfada ayrı iki bölüm yerine yan yana iki sütun: haber akışı sol,
 * rehberler sağ. İkisi de metin odaklı olduğu için aynı ritmi paylaşırlar.
 *
 * MİNİ GÖRSEL KARTLARI. Satırlar önce yalnızca metindi ve şerit, ana
 * sayfanın geri kalanı (galeri karoları, ölçüm hücreleri) yanında düz bir
 * metin bloğu gibi duruyordu. Artık her satırın solunda küçük bir levha
 * var:
 *
 *   haber  telifi uygun bir görsel varsa o (NASA kamu malı, ESA/ESO
 *          CC BY) — kredi satırın altında görünür kalır, lisansın şartı
 *   yazı   yıldız alanı; rehberlerin fotoğrafı yok ve bulmak için
 *          internetten görsel çekmek telif sorunudur
 *
 * Görsel yüklenemezse `RemoteImage` sessizce yıldız alanına düşer; kırık
 * ikon, yer tutucudan kötüdür.
 */

/** Sabit ölçülü küçük levha — satırlar arası dikey hiza bunun üzerinden. */
function Thumb({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative block h-14 w-[74px] shrink-0 overflow-hidden rounded-card border border-border bg-surface-2 sm:h-16 sm:w-[86px]">
      {children}
    </span>
  );
}

/** Şerit başına satır sayısı — ana sayfa iki şeridi de dörtle sınırlar. */
const ROWS = 4;

export function NewsStrip() {
  /*
    SIRAYI YÖNETİCİ BELİRLER, TARİH DEĞİL.
    Önce ikisi de "en yeni dört" idi. Bu, editoryal bir kararı tarih
    alanına devrediyordu: iyi bir rehber bir hafta sonra ana sayfadan
    düşüyor, güncel ama önemsiz bir duyuru üste çıkıyordu. Yönetim
    panelinden seçim yapılmadıysa davranış eskisiyle aynı kalır.
  */
  const featuredNews = useFeatured('haber');
  const featuredArticles = useFeatured('yazi');

  const latestNews = applyFeatured(
    sortedNews(),
    featuredNews.slugs,
    (n) => n.slug,
    ROWS
  );
  const latestArticles = applyFeatured(
    articles,
    featuredArticles.slugs,
    (a) => a.slug,
    ROWS
  );

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
                  className="group flex gap-3 border-b border-border py-3 transition-colors hover:bg-surface-1"
                >
                  <Thumb>
                    <RemoteImage
                      src={item.image?.url}
                      alt=""
                      seed={item.slug}
                      tint={item.tint}
                    />
                  </Thumb>

                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone="primary">
                        {newsCategoryLabels[item.category]}
                      </Badge>
                      <span className="tabular text-[10px] text-faint">
                        {new Date(item.publishedAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </span>
                    <span className="block text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                      {item.summary}
                    </span>
                    {/* CC BY'nin şartı: kredi görünür olmalı. */}
                    {item.image && (
                      <span className="mt-1 block text-[9.5px] text-faint">
                        Görsel: {item.image.credit}
                      </span>
                    )}
                  </span>
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
                  className="group flex gap-3 border-b border-border py-3 transition-colors hover:bg-surface-1"
                >
                  <Thumb>
                    <StarField seed={article.slug} tint={article.tint} />
                  </Thumb>

                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone="cold">
                        {articleCategoryLabels[article.category]}
                      </Badge>
                      <span className="tabular text-[10px] text-faint">
                        {article.duration}
                      </span>
                    </span>
                    <span className="block text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                      {article.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-[11px] leading-relaxed text-muted-foreground">
                      {article.summary}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
