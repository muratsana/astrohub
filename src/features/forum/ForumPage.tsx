import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input, Select } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
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
import {
  forumCategories,
  forumCategoryOrder,
  forumLabels,
  forumLabelOrder,
  forumDensities,
  forumSortOptions,
  filterThreads,
  sortThreads,
  relativeTime,
  type ForumCategoryId,
  type ForumDensity,
  type ForumLabelId,
  type ForumSortId,
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
  const [category, setCategory] = useState<ForumCategoryId | 'hepsi'>('hepsi');
  const [label, setLabel] = useState<ForumLabelId | 'hepsi'>('hepsi');
  const [search, setSearch] = useState('');
  const [onlyUnsolved, setOnlyUnsolved] = useState(false);
  const [sort, setSort] = useState<ForumSortId>('son-etkinlik');
  const [density, setDensity] = useStoredChoice<ForumDensity>(
    'forum',
    forumDensities,
    'detayli'
  );

  const threads = useForumThreads().items;

  const result = useMemo(
    () =>
      sortThreads(
        filterThreads(threads, { category, label, search, onlyUnsolved }),
        sort
      ),
    [threads, category, label, search, onlyUnsolved, sort]
  );

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
        <PageHeader
          title="Forum"
          description="Soru sor, gözlem raporu paylaş, kurulum tartış. Yanıt alma ihtimalini en çok artıran şey ekipmanını ve koşullarını yazmak."
          actions={
            <ButtonLink to="/forum/yeni" size="sm">
              Yeni Konu
            </ButtonLink>
          }
        />

        {/* Kategori filtresi — galerideki aile rozetleriyle aynı desen */}
        <div
          role="tablist"
          aria-label="Kategori"
          className="mb-4 flex flex-wrap items-center gap-1.5"
        >
          <button
            role="tab"
            aria-selected={category === 'hepsi'}
            onClick={() => setCategory('hepsi')}
            className={cn(
              'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
              category === 'hepsi'
                ? 'border-foreground/40 bg-surface-2 text-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            Tümü
          </button>

          {forumCategoryOrder.map((id) => {
            const info = forumCategories[id];
            const active = category === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={active}
                title={info.description}
                onClick={() => setCategory(id)}
                className={cn(
                  'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
                  active
                    ? info.className
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {info.name}
              </button>
            );
          })}
        </div>

        <FilterBar columns={3}>
          <FilterCell label="Ara" htmlFor="forum-search">
            <Input
              id="forum-search"
              type="search"
              placeholder="Konu başlığı, rozet veya kullanıcı"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell label="Rozet" htmlFor="forum-label">
            <Select
              id="forum-label"
              value={label}
              onChange={(e) =>
                setLabel(e.target.value as ForumLabelId | 'hepsi')
              }
              className={filterControlClass}
            >
              <option value="hepsi">Tümü</option>
              {forumLabelOrder.map((id) => (
                <option key={id} value={id}>
                  {forumLabels[id].name}
                </option>
              ))}
            </Select>
          </FilterCell>
          <FilterToggle
            id="forum-unsolved"
            label="Yalnızca yanıt bekleyenler"
            checked={onlyUnsolved}
            onChange={setOnlyUnsolved}
          />
        </FilterBar>

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={threads.length}
              noun="konu"
            />
          }
          sort={{
            id: 'forum-sort',
            value: sort,
            onChange: (value) => setSort(value as ForumSortId),
            options: forumSortOptions,
          }}
          extra={<DensityToggle density={density} onChange={setDensity} />}
        />

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
              <li key={thread.id} className="border-b border-border last:border-0">
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
const densityOptions: { value: ForumDensity; label: string; title: string }[] = [
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
    <div
      role="group"
      aria-label="Görünüm"
      className="inline-flex shrink-0 overflow-hidden rounded-card border border-border"
    >
      {densityOptions.map(({ value, label, title }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          aria-pressed={density === value}
          title={title}
          className={cn(
            'flex h-8 items-center border-l border-border px-2.5 text-[10px] tracking-[0.03em] transition-colors first:border-l-0',
            density === value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
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
          <h2 className="text-[13px] font-medium leading-snug text-foreground group-hover:text-primary">
            {thread.title}
          </h2>
          {labels.map((id) => (
            <LabelChip key={id} id={id} />
          ))}
          {thread.solved && (
            <span className="shrink-0 rounded-[2px] border border-success/45 px-1.5 py-0.5 text-[9px] font-medium tracking-[0.02em] text-success">
              Çözüldü
            </span>
          )}
        </div>

        {/* Yalnızca başlık görünümünde açılış mesajı ve künye satırı düşer;
            kategori rozeti başlığın yanına taşınır ki filtre bağlamı
            kaybolmasın. */}
        {density === 'detayli' ? (
          <>
            <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
              {thread.body}
            </p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={cn(
                  'rounded-[2px] border px-1.5 py-0.5 text-[9px] font-medium tracking-[0.02em]',
                  info.className
                )}
              >
                {info.name}
              </span>
              <span className="tabular text-[10px] text-muted-foreground">
                @{thread.author.username}
              </span>
              <span aria-hidden className="text-[10px] text-faint">
                ·
              </span>
              <span className="tabular text-[10px] text-faint">
                {relativeTime(thread.lastActivityAt)}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={cn(
                'rounded-[2px] border px-1.5 py-0.5 text-[9px] font-medium tracking-[0.02em]',
                info.className
              )}
            >
              {info.name}
            </span>
            <span className="tabular text-[10px] text-faint">
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
        <span className="tabular inline-flex items-center gap-1 text-[11px] text-cold">
          <ChatIcon className="h-3 w-3" />
          {thread.replyCount}
        </span>
        <span className="tabular text-[10px] text-faint">
          {thread.viewCount.toLocaleString('tr-TR')}
          {density === 'detayli' ? ' görüntülenme' : ''}
        </span>
      </div>
    </Link>
  );
}
