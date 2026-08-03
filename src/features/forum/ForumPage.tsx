import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useStoredChoice } from '@/components/ui/useViewMode';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PinIcon, LockIcon, ChatIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useForumThreads } from '@/services/content/forum';
import { useExplorer } from '@/features/explorer/useExplorer';
import { forumSpec } from './forumSpec';
import {
  forumCategories,
  forumCategoryOrder,
  forumLabels,
  forumLabelOrder,
  forumDensities,
  relativeTime,
  type ForumDensity,
  type ForumThread,
} from './types';
import { LabelChip } from './LabelChip';
import { cn } from '@/lib/cn';

/**
 * FORUM ANA SAYFASI.
 *
 * Klasik forum "kategori tablosu + konu listesi" yerine tek bir konu akışı
 * ve üstte kategori filtresi tercih edildi. Sebep: kategori tablosu, içeriği
 * bir tık geriye iter ve boş kategoriler forumu ölü gösterir. Akış hep
 * doludur; kategori bir filtredir, bir kapı değil.
 *
 * YOĞUNLUK TERCİHİ SAKLANIYOR. Konu taramak ve konu okumak farklı işler:
 * biri başlık listesi ister, diğeri her satırda ne konuşulduğunu. Tercihi
 * her ziyarette yeniden yaptırmak, iki kullanımdan birini hep cezalandırır.
 */
export function ForumPage() {
  const [density, setDensity] = useStoredChoice<ForumDensity>(
    'forum',
    forumDensities,
    'detayli'
  );

  const threadCatalog = useForumThreads();
  const threads = threadCatalog.items;

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * SABİTLENMİŞ KONULAR KORUNDU: `forumSpec` her sıralamayı sabitleme
   * kontrolüyle sarıyor. Genel motor bunu bilmiyor — naif bir taşıma
   * duyuru ve kural konularını listenin ortasına gömerdi ve yeni gelen
   * kullanıcı forumun kurallarını hiç görmezdi.
   */
  const ex = useExplorer(threads, forumSpec);
  const result = ex.items;
  const category = ex.query.facets.kategori?.[0] ?? 'hepsi';

  const tekSec = (param: string, next: string) => {
    const mevcut = ex.query.facets[param]?.[0];
    if (mevcut) ex.toggleFacet(param, mevcut);
    if (next !== 'hepsi' && next !== mevcut) ex.toggleFacet(param, next);
  };
  const setCategory = (next: string) => tekSec('kategori', next);

  return (
    <>
      <PageMeta
        title="Forum"
        description="Astrofotoğraf ve gözlem forumu: optik tüpler, montürler, filtreler, kameralar, görüntü işleme, yazılım ve astro kampçılık."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Forum', path: '/forum' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <section className="mb-4 rounded-card border border-border-strong bg-surface-1/80 p-3 shadow-overlay sm:p-4">
          <div className="flex flex-col gap-3 border-b border-border pb-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="label text-primary">Topluluk Forumu</p>
              <h1 className="type-page mt-1 text-foreground">Forum</h1>
              <p className="mt-1 max-w-[62ch] text-meta leading-relaxed text-muted-foreground">
                Soru sor, gözlem raporu paylaş, kurulum tartış. Ekipmanını ve
                koşullarını yazarsan daha hızlı yanıt alırsın.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <span className="tabular rounded-card border border-border bg-background/55 px-2.5 py-1.5 text-meta text-muted-foreground">
                {ex.total} / {threads.length} konu
              </span>
              <ButtonLink to="/forum/yeni" size="sm">
                Yeni Konu
              </ButtonLink>
            </div>
          </div>

          <FilterBar
            activeCount={ex.chips.length}
            columns={4}
            className="mb-0 mt-3"
          >
            <FilterCell
              label="Ara"
              htmlFor="forum-search"
              active={ex.searchInput.trim().length > 0}
              className="min-w-[20rem] flex-[2_1_20rem]"
            >
              <Input
                id="forum-search"
                type="search"
                placeholder="Konu, rozet veya kullanıcı"
                value={ex.searchInput}
                onChange={(e) => ex.setSearch(e.target.value)}
                className={filterControlClass}
              />
            </FilterCell>
            <FilterCell
              label="Kategori"
              htmlFor="forum-category"
              active={category !== 'hepsi'}
            >
              <Select
                id="forum-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={filterControlClass}
              >
                <option value="hepsi">Tüm kategoriler</option>
                {forumCategoryOrder.map((id) => (
                  <option key={id} value={id}>
                    {forumCategories[id].name}
                  </option>
                ))}
              </Select>
            </FilterCell>
            <FilterCell
              label="Rozet"
              htmlFor="forum-label"
              active={(ex.query.facets.rozet?.[0] ?? 'hepsi') !== 'hepsi'}
            >
              <Select
                id="forum-label"
                value={ex.query.facets.rozet?.[0] ?? 'hepsi'}
                onChange={(e) => tekSec('rozet', e.target.value)}
                className={filterControlClass}
              >
                <option value="hepsi">Tüm rozetler</option>
                {forumLabelOrder.map((id) => (
                  <option key={id} value={id}>
                    {forumLabels[id].name}
                  </option>
                ))}
              </Select>
            </FilterCell>
            <FilterCell label="Sırala" htmlFor="forum-sort" className="max-w-[14rem]">
              <Select
                id="forum-sort"
                value={ex.query.sort}
                onChange={(e) => ex.setSort(e.target.value)}
                className={filterControlClass}
              >
                {forumSpec.sorts.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </FilterCell>
            <FilterToggle
              id="forum-unsolved"
              label="Yanıt bekleyenler"
              checked={(ex.query.facets.cozulmemis?.length ?? 0) > 0}
              onChange={() => ex.toggleFacet('cozulmemis', 'evet')}
            />
            <div className="flex min-h-14 items-center rounded-card border border-border-strong bg-surface-1 px-3 shadow-overlay transition-colors hover:border-foreground/25 hover:bg-surface-2">
              <DensityToggle density={density} onChange={setDensity} />
            </div>
          </FilterBar>
        </section>

        <CatalogSourceNote selection={threadCatalog} />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen konu yok"
            hint="Farklı bir kategori seçmeyi ya da aramayı kısaltmayı deneyin."
            action={
              <ButtonLink to="/forum/yeni" size="sm" variant="secondary">
                Konuyu Sen Aç
              </ButtonLink>
            }
          />
        ) : (
          <ul className="rounded-card border border-border bg-surface-1">
            {result.map((thread) => (
              <li
                key={thread.id}
                className="border-b border-border last:border-0"
              >
                <ThreadRow thread={thread} density={density} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

/**
 * YOĞUNLUK ANAHTARI.
 *
 * Simge yerine metin: ızgara/liste ikilisinde simge tanıdıktır ama
 * "yalnızca başlık" ile "başlık ve metin" arasındaki farkı anlatan
 * yerleşik bir simge yok. Öğrenilmesi gereken iki simge, okunması
 * gereken iki kelimeden pahalı.
 */
const densityOptions: { value: ForumDensity; label: string; title: string }[] =
  [
    { value: 'baslik', label: 'Başlık', title: 'Yalnızca başlıkları göster' },
    {
      value: 'detayli',
      label: 'Başlık + metin',
      title: 'Başlık ve mesajın ilk satırını göster',
    },
  ];

function DensityToggle({
  density,
  onChange,
}: {
  density: ForumDensity;
  onChange: (next: ForumDensity) => void;
}) {
  return (
    <SegmentedControl
      role="group"
      size="xs"
      ariaLabel="Görünüm"
      value={density}
      onChange={onChange}
      options={densityOptions.map((o) => ({
        value: o.value,
        label: o.label,
        tooltip: o.title,
      }))}
      className="shrink-0"
    />
  );
}

function ThreadRow({
  thread,
  density,
}: {
  thread: ForumThread;
  density: ForumDensity;
}) {
  const info = forumCategories[thread.category];
  const labels = thread.labels ?? [];

  return (
    <Link
      to={`/forum/${thread.slug}`}
      className={cn(
        'group flex items-start gap-3 px-3 transition-colors hover:bg-surface-2',
        density === 'baslik' ? 'py-2' : 'py-3'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {thread.pinned && (
            <PinIcon
              className="h-3 w-3 shrink-0 text-primary"
              aria-label="Sabitlenmiş konu"
            />
          )}
          {thread.locked && (
            <LockIcon
              className="h-3 w-3 shrink-0 text-faint"
              aria-label="Kilitli konu"
            />
          )}
          <h2 className="text-body-sm font-medium leading-snug text-foreground group-hover:text-primary">
            {thread.title}
          </h2>
          {labels.map((id) => (
            <LabelChip key={id} id={id} />
          ))}
          {thread.solved && (
            <span className="shrink-0 rounded-card border border-success/45 px-1.5 py-0.5 text-meta font-medium tracking-[0.02em] text-success">
              Çözüldü
            </span>
          )}
        </div>

        {/* Yalnızca başlık görünümünde açılış mesajı ve künye satırı düşer;
            kategori rozeti başlığın yanına taşınır ki filtre bağlamı
            kaybolmasın. */}
        {density === 'detayli' ? (
          <>
            <p className="mt-1 line-clamp-1 text-meta leading-relaxed text-muted-foreground">
              {thread.body}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  'rounded-card border px-1.5 py-0.5 text-meta font-medium tracking-[0.02em]',
                  info.className
                )}
              >
                {info.name}
              </span>
              <span className="tabular text-meta text-muted-foreground">
                @{thread.author.username}
              </span>
              <span aria-hidden className="text-meta text-faint">
                ·
              </span>
              <span className="tabular text-meta text-faint">
                {relativeTime(thread.lastActivityAt)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                'rounded-card border px-1.5 py-0.5 text-meta font-medium tracking-[0.02em]',
                info.className
              )}
            >
              {info.name}
            </span>
            <span className="tabular text-meta text-faint">
              {relativeTime(thread.lastActivityAt)}
            </span>
          </div>
        )}
      </div>

      <div
        className={cn(
          'flex shrink-0 pt-0.5',
          density === 'detayli'
            ? 'flex-col items-end gap-1'
            : 'items-center gap-2'
        )}
      >
        <span className="tabular inline-flex items-center gap-1 text-meta text-cold">
          <ChatIcon className="h-3 w-3" />
          {thread.replyCount}
        </span>
        <span className="tabular text-meta text-faint">
          {thread.viewCount.toLocaleString('tr-TR')}
          {density === 'detayli' ? ' görüntülenme' : ''}
        </span>
      </div>
    </Link>
  );
}
