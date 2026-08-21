import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { NotFoundPage } from '@/components/NotFoundPage';
import {
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { useViewMode } from '@/components/ui/useViewMode';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useForumThreads } from '@/services/content/forum';
import { useExplorer } from '@/features/explorer/useExplorer';
import { forumSpec } from './forumSpec';
import {
  forumCategories,
  forumCategoryOrder,
  forumLabelOrder,
  forumLabels,
  relativeTime,
  type ForumCategoryId,
  type ForumThread,
} from './types';
import { cn } from '@/lib/cn';
import { LabelChip } from './LabelChip';
import { ChevronDownIcon } from '@/components/ui/icons';
import { ProfileInlineLink } from '@/components/user/ProfileInlineLink';

/**
 * FORUM ANA SAYFASI.
 *
 * Ana sayfa kategori kapısıdır; konu listeleri kategori alt sayfalarında
 * açılır. Böylece başlıklar filtre gibi davranmaz, kullanıcı doğrudan ilgili
 * forum bölümüne gider.
 *
 * YOĞUNLUK TERCİHİ SAKLANIYOR. Konu taramak ve konu okumak farklı işler:
 * biri başlık listesi ister, diğeri her satırda ne konuşulduğunu. Tercihi
 * her ziyarette yeniden yaptırmak, iki kullanımdan birini hep cezalandırır.
 */
export function ForumPage() {
  const params = useParams<{ category?: string }>();
  const threadCatalog = useForumThreads();
  const threads = threadCatalog.items;
  const category = getForumCategoryId(params.category);
  const invalidCategory = Boolean(params.category && !category);

  const currentCategoryInfo = category ? forumCategories[category] : null;
  const pageThreads = category
    ? threads.filter((thread) => thread.category === category)
    : threads;

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * SABİTLENMİŞ KONULAR KORUNDU: `forumSpec` her sıralamayı sabitleme
   * kontrolüyle sarıyor. Genel motor bunu bilmiyor — naif bir taşıma
   * duyuru ve kural konularını listenin ortasına gömerdi ve yeni gelen
   * kullanıcı forumun kurallarını hiç görmezdi.
   */
  const ex = useExplorer(pageThreads, forumSpec);

  /*
   * GÖRÜNÜM TERCİHİ (FAZ 11).
   *
   * Konu TARAMAK ve konu OKUMAK farklı işler: biri kısa başlık listesi
   * ister, diğeri her satırda ne konuşulduğunu. Tek düzen seçmek
   * kullanımlardan birini hep cezalandırıyordu — forum tek düzendeydi ve
   * o düzen tarayanın işine yarıyordu, okuyanın değil.
   *
   * Tercih `useViewMode` ile saklanıyor: oturum açıksa hesapta, değilse
   * yerelde. Her ziyarette yeniden seçtirmek, tercihi tercih olmaktan
   * çıkarır.
   */
  const [view, setView] = useViewMode('forum', 'list');
  const result = ex.items;
  const rozetler = ex.query.facets.rozet ?? [];
  const sections = category
    ? [{ id: category, threads: result }]
    : [];
  const labelCounts = ex.counts('rozet');
  const title = currentCategoryInfo
    ? `Forum · ${currentCategoryInfo.name}`
    : 'Forum';
  const description =
    currentCategoryInfo?.description ??
    'Astrofotoğraf ve gözlem forumu: ekipmanlar, yazılımlar, görüntü işleme, etkinlikler, topluluklar, bilimsel çalışmalar, radyo astronomi ve astro kampçılık.';
  const path = category ? forumCategoryHref(category) : '/forum';

  if (invalidCategory) {
    return <NotFoundPage />;
  }

  return (
    <>
      <PageMeta
        title={title}
        description={description}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Forum', path: '/forum' },
          ...(currentCategoryInfo
            ? [{ name: currentCategoryInfo.name, path }]
            : []),
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title={currentCategoryInfo?.name ?? 'Forum'}
          description={
            currentCategoryInfo
              ? `${currentCategoryInfo.description}. Bu başlıktaki konuları oku veya yeni bir konu aç.`
              : 'Soru sor, gözlem raporu paylaş, kurulum tartış. Ekipmanını ve koşullarını yazarsan daha hızlı yanıt alırsın.'
          }
          breadcrumb={
            currentCategoryInfo
              ? [
                  { label: 'Ana Sayfa', to: '/' },
                  { label: 'Forum', to: '/forum' },
                  { label: currentCategoryInfo.name },
                ]
              : undefined
          }
          actions={
            <ButtonLink to="/forum/yeni" size="sm">
              Yeni Konu
            </ButtonLink>
          }
        />

        {!category && (
          <ForumCategoryGrid threads={threads} currentCategory={category} />
        )}

        {category && (
          <ModuleToolbar
            columns={3}
            activeFilters={{
              chips: ex.chips,
              onRemove: ex.removeChip,
              onClearAll: ex.clearAll,
            }}
            result={{ current: ex.total, total: pageThreads.length, noun: 'konu' }}
            view={{ mode: view, onChange: setView }}
            sort={{
              id: 'forum-sort',
              value: ex.query.sort,
              onChange: ex.setSort,
              options: forumSpec.sorts.map((s) => ({
                value: s.value,
                label: s.label,
              })),
            }}
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
                placeholder="Konu veya kullanıcı"
                value={ex.searchInput}
                onChange={(e) => ex.setSearch(e.target.value)}
                className={filterControlClass}
              />
            </FilterCell>
            <FilterCell label="Rozet" active={rozetler.length > 0}>
              <ForumFacetDropdown
                allLabel="Tüm rozetler"
                selected={rozetler}
                items={forumLabelOrder.map((id) => ({
                  id,
                  name: forumLabels[id].name,
                  description: forumLabels[id].description,
                  count: labelCounts.get(id) ?? 0,
                }))}
                onToggle={(id) => ex.toggleFacet('rozet', id)}
              />
            </FilterCell>
          </ModuleToolbar>
        )}

        {category && result.length === 0 ? (
          <EmptyState
            message="Eşleşen konu yok"
            hint="Farklı bir kategori seçmeyi ya da aramayı kısaltmayı deneyin."
            action={
              <ButtonLink to="/forum/yeni" size="sm" variant="secondary">
                Konuyu Sen Aç
              </ButtonLink>
            }
          />
        ) : category ? (
          <ForumThreadSections sections={sections} view={view} />
        ) : null}
      </Container>
    </>
  );
}

function getForumCategoryId(value: string | undefined): ForumCategoryId | null {
  return value && forumCategoryOrder.includes(value as ForumCategoryId)
    ? (value as ForumCategoryId)
    : null;
}

type ForumFacetDropdownItem = {
  id: string;
  name: string;
  description: string;
  count: number;
  className?: string;
};

function ForumFacetDropdown({
  allLabel,
  selected,
  items,
  onToggle,
}: {
  allLabel: string;
  selected: string[];
  items: ForumFacetDropdownItem[];
  onToggle: (id: string) => void;
}) {
  const selectedNames = selected
    .map((id) => items.find((item) => item.id === id)?.name)
    .filter(Boolean);
  const summary =
    selectedNames.length === 0
      ? allLabel
      : selectedNames.length <= 2
        ? selectedNames.join(', ')
        : `${selectedNames.length} seçim`;

  return (
    <details className="group relative min-w-0">
      <summary
        className={cn(
          filterControlClass,
          'flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden'
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-faint transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute left-0 z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-card border border-border-strong bg-surface-1 p-1.5 shadow-overlay">
        <div className="max-h-72 overflow-y-auto">
          {items.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <label
                key={item.id}
                title={item.description}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2 rounded-card px-2.5 py-2 text-body-sm transition-colors hover:bg-surface-2',
                  checked ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  className="h-4 w-4 rounded-card border-border accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn('block truncate font-medium', item.className)}
                  >
                    {item.name}
                  </span>
                  <span className="block truncate text-meta text-faint">
                    {item.description}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-card border border-border px-1.5 py-0.5 text-meta tabular',
                    checked ? 'text-foreground' : 'text-faint'
                  )}
                >
                  {item.count}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function ForumCategoryGrid({
  threads,
  currentCategory,
}: {
  threads: ForumThread[];
  currentCategory: ForumCategoryId | null;
}) {
  return (
    <nav
      aria-label="Forum kategorileri"
      className="mb-5 divide-y divide-border border-y border-border"
    >
      {forumCategoryOrder.map((id) => {
        const info = forumCategories[id];
        const categoryThreads = threads.filter(
          (thread) => thread.category === id
        );
        const active = currentCategory === id;
        return (
          <Link
            key={id}
            to={forumCategoryHref(id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center justify-between gap-4 py-3 transition-colors hover:bg-surface-1/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              active ? 'bg-surface-1/70' : ''
            )}
          >
            <div className="min-w-0">
              <h2
                className={cn(
                  'text-body-sm font-semibold transition-colors group-hover:text-primary',
                  forumCategoryTextClass(id)
                )}
              >
                {info.name}
              </h2>
              <p className="mt-0.5 line-clamp-1 text-meta leading-snug text-muted-foreground">
                {info.description}
              </p>
            </div>
            <span className="shrink-0 text-caption font-semibold tabular text-foreground">
              {categoryThreads.length} konu
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function forumCategoryHref(id: ForumCategoryId | string) {
  return `/forum/kategori/${id}`;
}

function ForumThreadSections({
  sections,
  view,
}: {
  sections: { id: string; threads: ForumThread[] }[];
  view: 'grid' | 'list';
}) {
  return (
    <div className="space-y-4">
      {sections.map(({ id, threads }) => {
        const info = forumCategories[id as keyof typeof forumCategories];
        const categoryHref = forumCategoryHref(id);
        return (
          <section
            key={id}
            aria-labelledby={`forum-category-${id}`}
            className="space-y-2"
          >
            <header className="flex items-end justify-between gap-4 border-b border-border pb-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-5 w-1 shrink-0 rounded-card',
                    forumCategoryAccentClass(id)
                  )}
                />
                <div className="min-w-0">
                  <Link
                    to={categoryHref}
                    id={`forum-category-${id}`}
                    className={cn(
                      'block truncate text-body-base font-semibold transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      forumCategoryTextClass(id)
                    )}
                  >
                    {info.name}
                  </Link>
                  <p className="mt-1 line-clamp-1 text-body-sm leading-snug text-muted-foreground">
                    {info.description}
                  </p>
                </div>
              </div>
              <Link
                to={categoryHref}
                className="shrink-0 text-caption font-semibold tabular text-foreground transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {threads.length} konu
              </Link>
            </header>

            <div
              className={cn(
                'grid gap-2',
                view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : ''
              )}
            >
              {threads.map((thread) => (
                <ForumThreadCard key={thread.id} thread={thread} view={view} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function forumCategoryAccentClass(id: string) {
  switch (id) {
    case 'ekipmanlar':
      return 'bg-primary';
    case 'yazilimlar':
      return 'bg-[#38bdf8]';
    case 'goruntu-isleme':
      return 'bg-[#a78bfa]';
    case 'etkinlikler':
      return 'bg-[#e11d48]';
    case 'topluluklar':
      return 'bg-[#34d399]';
    case 'bilimsel-calismalar':
      return 'bg-cold';
    case 'radyo-astronomi':
      return 'bg-[#14b8a6]';
    case 'astro-kampcilik':
      return 'bg-[#f59e0b]';
    default:
      return 'bg-border-strong';
  }
}

function forumCategoryTextClass(id: string) {
  switch (id) {
    case 'ekipmanlar':
      return 'text-primary';
    case 'yazilimlar':
      return 'text-[#7dd3fc]';
    case 'goruntu-isleme':
      return 'text-[#c4b1fd]';
    case 'etkinlikler':
      return 'text-[#fb7185]';
    case 'topluluklar':
      return 'text-[#5fe0b0]';
    case 'bilimsel-calismalar':
      return 'text-cold';
    case 'radyo-astronomi':
      return 'text-[#2dd4bf]';
    case 'astro-kampcilik':
      return 'text-[#fbbf24]';
    default:
      return 'text-foreground';
  }
}

function ForumThreadCard({
  thread,
  view,
}: {
  thread: ForumThread;
  view: 'grid' | 'list';
}) {
  const info = forumCategories[thread.category];

  return (
    <article
      className={cn(
        'group min-w-0 bg-surface-1 px-3 py-3 transition-colors hover:bg-surface-2',
        view === 'list'
          ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]'
          : 'flex min-h-48 flex-col'
      )}
    >
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'rounded-card border px-2 py-0.5 text-meta font-medium',
              info.className
            )}
          >
            {info.name}
          </span>
          {(thread.labels ?? []).map((id) => (
            <LabelChip key={id} id={id} />
          ))}
          {thread.pinned && (
            <span className="rounded-card border border-primary/45 px-2 py-0.5 text-meta font-medium text-primary">
              Sabit
            </span>
          )}
          {thread.locked && (
            <span className="rounded-card border border-border px-2 py-0.5 text-meta font-medium text-faint">
              Kilitli
            </span>
          )}
          {thread.solved && (
            <span className="rounded-card border border-success/45 px-2 py-0.5 text-meta font-medium text-success">
              Çözüldü
            </span>
          )}
        </div>

        <h3 className="text-caption font-semibold text-foreground">
          <Link
            to={`/forum/${thread.slug}`}
            className="transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {thread.title}
          </Link>
        </h3>
        <p className="mt-1 text-meta text-muted-foreground">
          <ProfileInlineLink username={thread.author.username} /> ·{' '}
          {relativeTime(thread.lastActivityAt)}
        </p>
        <p
          className={cn(
            'mt-2 text-body-sm leading-relaxed text-muted-foreground',
            view === 'list' ? 'line-clamp-2' : 'line-clamp-4'
          )}
        >
          {thread.removalReason ?? thread.body}
        </p>
      </div>

      <dl
        className={cn(
          'grid shrink-0 grid-cols-2 gap-2 text-meta text-muted-foreground',
          view === 'list' ? 'min-w-44 self-center' : 'mt-auto pt-4'
        )}
      >
        <div className="rounded-card border border-border bg-background/45 px-2 py-1.5">
          <dt>Yanıt</dt>
          <dd className="tabular text-body-sm font-semibold text-foreground">
            {thread.replyCount}
          </dd>
        </div>
        <div className="rounded-card border border-border bg-background/45 px-2 py-1.5">
          <dt>Görüntülenme</dt>
          <dd className="tabular text-body-sm font-semibold text-foreground">
            {thread.viewCount.toLocaleString('tr-TR')}
          </dd>
        </div>
      </dl>
    </article>
  );
}


