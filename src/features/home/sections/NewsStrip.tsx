import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { RemoteImage } from '@/components/media/RemoteImage';
import { newsCategoryLabels } from '@/features/news/data';
import { articleCategoryLabels } from '@/features/articles/data';
import { useNewsItems } from '@/features/news/useNews';
import { useArticles } from '@/features/articles/useArticles';
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
 * Hem haber hem yazı için telifi uygun görseller kullanılıyor (NASA kamu
 * malı, ESA/Hubble ve ESO CC BY 4.0, Commons CC BY-SA); kredi satırın
 * altında görünür kalır — lisansın şartı bu. Yazı görselleri konuyla
 * ilgili seçildi: polar alignment yazısının yanında kutup yıldızı
 * izleri, narrowband yazısının yanında Hubble paletiyle işlenmiş bir
 * kare. Görselin işi süslemek değil, yazının ne hakkında olduğunu bir
 * bakışta söylemek.
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

  /*
    PANELDEN YAZILAN İÇERİK TOHUM VERİYLE BİRLEŞİYOR (useNews/useArticles).
    Eşleme daha önce burada gömülüydü; liste ve detay sayfaları da aynı
    birleşime bağlanınca tek kaynağa taşındı — şeritte görünen haber artık
    kendi adresinde de var.
  */
  const { items: allNews } = useNewsItems();
  const { items: allArticles } = useArticles();

  const latestNews = applyFeatured(
    allNews,
    featuredNews.slugs,
    (n) => n.slug,
    ROWS
  );
  const latestArticles = applyFeatured(
    allArticles,
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
                      sizes="86px"
                      widths={[120, 240]}
                      seed={item.slug}
                      tint={item.tint}
                    />
                  </Thumb>

                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone="primary">
                        {newsCategoryLabels[item.category]}
                      </Badge>
                      <span className="tabular text-meta text-faint">
                        {new Date(item.publishedAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </span>
                    <span className="block text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                      {item.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-meta leading-relaxed text-muted-foreground">
                      {item.summary}
                    </span>
                    {/* CC BY'nin şartı: kredi görünür olmalı. */}
                    {item.image && (
                      <span className="mt-1 block text-meta text-faint">
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
                    <RemoteImage
                      src={article.image?.url}
                      alt=""
                      sizes="86px"
                      widths={[120, 240]}
                      seed={article.slug}
                      tint={article.tint}
                    />
                  </Thumb>

                  <span className="min-w-0 flex-1">
                    <span className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge tone="cold">
                        {articleCategoryLabels[article.category]}
                      </Badge>
                      <span className="tabular text-meta text-faint">
                        {article.duration}
                      </span>
                    </span>
                    <span className="block text-[13px] leading-snug text-foreground transition-colors group-hover:text-primary">
                      {article.title}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-meta leading-relaxed text-muted-foreground">
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
