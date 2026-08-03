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
type HomeSectionLayout = 'grid' | 'list';

/**
 * TEK SATIR — iki şerit de bunu kullanır.
 *
 * Önce iki şeridin işaretlemesi ayrı ayrı yazılmıştı ve BEKLENDİĞİ GİBİ
 * AYRIŞTI: haber satırı görsel kredisini basıyor, yazı satırı basmıyordu.
 * Bu yalnızca bir hizalama sorunu değildi — yazı görselleri de CC BY /
 * CC BY-SA ve o lisansların şartı atfın GÖRÜNÜR olması. Dosyanın kendi
 * açıklaması "kredi satırın altında görünür kalır" diyordu; kod bunu bir
 * sütunda yapmıyordu.
 *
 * Tek bileşen hem lisans şartını hem hizayı aynı yerden garanti ediyor.
 *
 * `line-clamp-2` YANINDA `block` OLMAMALI. İkisi de `display` yazıyor ve
 * hangisinin kazandığı sınıf sırasına değil üretilen CSS'in sırasına bağlı;
 * `block` kazanınca clamp'ın gerektirdiği `-webkit-box` gitmiş oluyor ve
 * KIRPMA HİÇ ÇALIŞMIYOR. Şeridin tırtıklı görünmesinin asıl sebebi buydu:
 * özetler iki satıra indiriliyor sanılıyordu, bazıları üç satır çiziyordu.
 *
 * YÜKSEKLİKLER `lh` İLE SABİTLENİYOR. Başlık bir satır da olsa iki
 * satırlık yer kaplıyor (`min-h`), özet de öyle. Yoksa kısa başlıklı bir
 * satır komşusundan alçak kalıyor ve iki sütun kaydıkça şerit tırtıklı
 * bitiyordu; eşitliği sağlayan şey kesmek değil, yeri HER DURUMDA ayırmak.
 *
 * `lh` satır yüksekliğinin kendisi: punto ya da `leading` değişse de
 * ayrılan yer gerçek satır sayısı kadar kalır. Aynı çözüm `EditorialList`
 * içinde de bu birimle yazılmıştı — iki yerde iki ayrı hesap tutmak,
 * birinin sessizce eskimesi demekti.
 */
function StripRow({
  to,
  badge,
  meta,
  title,
  summary,
  image,
  tint,
  seed,
}: {
  to: string;
  badge: React.ReactNode;
  meta: string;
  title: string;
  summary: string;
  image?: { url: string; credit: string };
  tint: string;
  seed: string;
}) {
  return (
    <li>
      <Link
        to={to}
        className="group flex gap-3 border-b border-border py-3 transition-colors hover:bg-surface-1"
      >
        <Thumb>
          <RemoteImage
            src={image?.url}
            alt=""
            sizes="86px"
            widths={[120, 240]}
            seed={seed}
            tint={tint}
          />
        </Thumb>

        <span className="min-w-0 flex-1">
          <span className="mb-1 flex flex-wrap items-center gap-2">
            {badge}
            <span className="tabular text-meta text-faint">{meta}</span>
          </span>

          <span className="line-clamp-2 min-h-[2lh] text-body-sm leading-snug text-foreground transition-colors group-hover:text-white">
            {title}
          </span>

          <span className="mt-1 line-clamp-2 min-h-[2lh] text-meta leading-relaxed text-muted-foreground">
            {summary}
          </span>

          {/* CC BY'nin şartı: kredi görünür olmalı. Görselsiz satırda da
              yer ayrılıyor — yoksa o satır komşularından alçak kalırdı.

              TEK SATIRA SABİTLENİYOR ama METİN KIRPILMIYOR: `truncate`
              yalnızca görsel bir taşma kuralı, dize DOM'da tam duruyor.
              Ekran okuyucu ve kopyala-yapıştır atfın tamamını alıyor —
              lisans şartı korunuyor. Sarmalamaya izin verseydik uzun bir
              kredi ("NASA, ESA, Hubble SM4 ERO Team") satırı yirmi piksel
              uzatıyor ve iki sütun birbirinden kayıyordu; 1280 ve 1024
              genişliğinde ölçülen tam olarak buydu. */}
          <span className="mt-1 block min-h-[1lh] truncate text-meta text-faint">
            {image ? `Görsel: ${image.credit}` : ''}
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * `limit` `home_modules`tan gelir; verilmezse `ROWS`.
 *
 * `title/subtitle` opsiyoneldir: panelden tek modül başlığı girilirse iki
 * sütunun üstünde ortak bir giriş olur. Girilmezse eski "Haberler" ve
 * "Yazılar" başlıkları doğrudan kalır.
 */
export function NewsStrip({
  limit = ROWS,
  layout = 'grid',
  subtitle,
  title,
}: {
  limit?: number;
  layout?: HomeSectionLayout;
  subtitle?: string;
  title?: string;
} = {}) {
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
    limit
  );
  const latestArticles = applyFeatured(
    allArticles,
    featuredArticles.slugs,
    (a) => a.slug,
    limit
  );

  return (
    <Container className="py-9 sm:py-11">
      {(title || subtitle) && (
        <SectionHeader title={title ?? 'Haberler ve Yazılar'} description={subtitle} />
      )}

      {/*
        `min-w-0` ŞART. Izgara öğesinin varsayılan `min-width` değeri `auto`,
        yani içeriğinin min-content genişliğinin altına inemiyor. Kredi
        satırındaki `truncate` (`white-space: nowrap`) o genişliği bütün
        kredi metni kadar büyütünce sütun 411px'e kilitlendi ve 390px'lik
        ekranda sayfa yatay kaydı — önizleme kapısı ölçtü.

        `truncate`in işe yaraması için kabın küçülebiliyor olması gerekiyor;
        ikisi birlikte anlamlı, tek başına `truncate` taşmayı çözmüyor.
      */}
      <div
        className={
          layout === 'list'
            ? 'grid gap-8'
            : 'grid gap-10 lg:grid-cols-2 lg:gap-12'
        }
      >
        <section className="min-w-0">
          <SectionHeader title="Haberler" linkTo="/haberler" linkLabel="Tümü" />
          <ul>
            {latestNews.map((item) => (
              <StripRow
                key={item.slug}
                to={`/haber/${item.slug}`}
                badge={
                  <Badge tone="primary">
                    {newsCategoryLabels[item.category]}
                  </Badge>
                }
                meta={new Date(item.publishedAt).toLocaleDateString('tr-TR', {
                  day: '2-digit',
                  month: 'short',
                })}
                title={item.title}
                summary={item.summary}
                image={item.image}
                tint={item.tint}
                seed={item.slug}
              />
            ))}
          </ul>
        </section>

        <section className="min-w-0">
          <SectionHeader title="Yazılar" linkTo="/yazilar" linkLabel="Tümü" />
          <ul>
            {latestArticles.map((article) => (
              <StripRow
                key={article.slug}
                to={`/yazi/${article.slug}`}
                badge={
                  <Badge tone="cold">
                    {articleCategoryLabels[article.category]}
                  </Badge>
                }
                meta={article.duration}
                title={article.title}
                summary={article.summary}
                image={article.image}
                tint={article.tint}
                seed={article.slug}
              />
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}
