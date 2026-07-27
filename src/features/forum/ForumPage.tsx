import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PinIcon, LockIcon, ChatIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { forumThreads } from './data';
import {
  forumCategories,
  forumCategoryOrder,
  filterThreads,
  sortThreads,
  relativeTime,
  type ForumCategoryId,
  type ForumThread,
} from './types';
import { cn } from '@/lib/cn';

/**
 * FORUM ANA SAYFASI.
 *
 * Klasik forum "kategori tablosu + konu listesi" yerine tek bir konu akışı
 * ve üstte kategori filtresi tercih edildi. Sebep: kategori tablosu, içeriği
 * bir tık geriye iter ve boş kategoriler forumu ölü gösterir. Akış hep
 * doludur; kategori bir filtredir, bir kapı değil.
 */
export function ForumPage() {
  const [category, setCategory] = useState<ForumCategoryId | 'hepsi'>('hepsi');
  const [search, setSearch] = useState('');
  const [onlyUnsolved, setOnlyUnsolved] = useState(false);

  const result = useMemo(
    () => sortThreads(filterThreads(forumThreads, { category, search, onlyUnsolved })),
    [category, search, onlyUnsolved]
  );

  return (
    <>
      <PageMeta
        title="Forum"
        description="Astrofotoğraf ve gözlem forumu: ekipman, görüntü işleme, yazılım, saha ve gözlem raporları."
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
              'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors',
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
                  'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors',
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

        <FilterBar columns={2}>
          <FilterCell label="Ara" htmlFor="forum-search">
            <Input
              id="forum-search"
              type="search"
              placeholder="Konu başlığı, etiket veya kullanıcı"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={filterControlClass}
            />
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
              total={forumThreads.length}
              noun="konu"
            />
          }
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
                <ThreadRow thread={thread} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

function ThreadRow({ thread }: { thread: ForumThread }) {
  const info = forumCategories[thread.category];

  return (
    <Link
      to={`/forum/${thread.slug}`}
      className="group flex items-start gap-3 px-3 py-3 transition-colors hover:bg-surface-2"
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
          {thread.solved && (
            <span className="shrink-0 rounded-[2px] border border-success/45 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em] text-success">
              Çözüldü
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">
          {thread.body}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'rounded-[2px] border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.1em]',
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
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="tabular inline-flex items-center gap-1 text-[11px] text-cold">
          <ChatIcon className="h-3 w-3" />
          {thread.replyCount}
        </span>
        <span className="tabular text-[10px] text-faint">
          {thread.viewCount.toLocaleString('tr-TR')} görüntülenme
        </span>
      </div>
    </Link>
  );
}
