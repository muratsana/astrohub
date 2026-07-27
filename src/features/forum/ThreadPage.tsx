import { useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LockIcon, PinIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { NotFoundPage } from '@/components/NotFoundPage';
import { forumThreads } from './data';
import { forumCategories, relativeTime, type ForumPost } from './types';
import { cn } from '@/lib/cn';

/** Konu detayı: açılış mesajı + yanıtlar + yanıt kutusu. */
export function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const thread = forumThreads.find((t) => t.slug === slug);

  if (!thread) return <NotFoundPage />;

  const info = forumCategories[thread.category];
  const openingPost: ForumPost = {
    id: `${thread.id}-op`,
    author: thread.author,
    createdAt: thread.createdAt,
    body: thread.body,
  };

  return (
    <>
      <PageMeta
        title={thread.title}
        description={thread.body.slice(0, 160)}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Forum', path: '/forum' },
          { name: thread.title, path: `/forum/${thread.slug}` },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Forum', to: '/forum' },
            { label: info.name },
          ]}
          title={thread.title}
          meta={
            <span className="inline-flex items-center gap-2">
              {thread.pinned && (
                <PinIcon className="h-3 w-3 text-primary" aria-label="Sabitlenmiş" />
              )}
              {thread.locked && (
                <LockIcon className="h-3 w-3 text-faint" aria-label="Kilitli" />
              )}
              {thread.replyCount} yanıt ·{' '}
              {thread.viewCount.toLocaleString('tr-TR')} görüntülenme
            </span>
          }
          actions={
            <span
              className={cn(
                'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em]',
                info.className
              )}
            >
              {info.name}
            </span>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div className="space-y-2.5">
            <PostCard post={openingPost} opening />

            {thread.replies.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {thread.replies.length < thread.replyCount && (
              <p className="rounded-card border border-border bg-surface-1 px-3 py-2.5 text-[11px] text-muted-foreground">
                Kalan {thread.replyCount - thread.replies.length} yanıt, forum
                veritabanı bağlandığında burada görünecek.
              </p>
            )}

            {thread.locked ? (
              <p className="flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-[11px] text-muted-foreground">
                <LockIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
                Bu konu kilitli; yeni yanıt yazılamaz.
              </p>
            ) : (
              <Panel title="Yanıt yaz">
                <textarea
                  rows={4}
                  placeholder="Ekipmanını ve koşullarını da yazarsan çok daha isabetli yanıt alırsın."
                  aria-label="Yanıt metni"
                  className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
                />
                <div className="mt-2.5 flex items-center justify-between gap-3">
                  <p className="text-[10px] text-faint">
                    Yanıt gönderme, hesap sistemi bağlandığında etkinleşir.
                  </p>
                  <Button size="sm" disabled>
                    Gönder
                  </Button>
                </div>
              </Panel>
            )}
          </div>

          <aside className="space-y-4">
            <Panel title="Konu bilgisi">
              <dl className="space-y-2 text-[11.5px]">
                <Row label="Açan" value={`@${thread.author.username}`} />
                <Row label="Açılış" value={relativeTime(thread.createdAt)} />
                <Row
                  label="Son etkinlik"
                  value={relativeTime(thread.lastActivityAt)}
                />
                <Row
                  label="Durum"
                  value={thread.solved ? 'Çözüldü' : 'Yanıt bekliyor'}
                />
              </dl>

              {thread.tags && thread.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1 border-t border-border pt-3">
                  {thread.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>
              )}
            </Panel>

            <ButtonLink to="/forum" variant="secondary" size="sm" className="w-full">
              Foruma Dön
            </ButtonLink>
          </aside>
        </div>
      </Container>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label shrink-0">{label}</dt>
      <dd className="tabular text-right text-foreground">{value}</dd>
    </div>
  );
}

function PostCard({ post, opening }: { post: ForumPost; opening?: boolean }) {
  return (
    <article
      className={cn(
        'rounded-card border bg-surface-1',
        post.solution ? 'border-success/45' : 'border-border'
      )}
    >
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[12px] font-medium text-foreground">
          {post.author.displayName}
        </span>
        <span className="tabular text-[10px] text-muted-foreground">
          @{post.author.username}
        </span>
        {post.author.badge && <Badge tone="cold">{post.author.badge}</Badge>}
        {opening && <Badge tone="primary">Konuyu açan</Badge>}
        {post.solution && <Badge tone="success">Çözüm</Badge>}
        <span className="tabular ml-auto text-[10px] text-faint">
          {relativeTime(post.createdAt)}
        </span>
      </header>

      {/*
        Gövde düz metindir ve React tarafından kaçırılarak basılır.
        `dangerouslySetInnerHTML` bilerek kullanılmıyor — zengin metin
        eklendiğinde önce sanitize katmanı gelecek (bkz. lib/sanitize.ts).
      */}
      <p className="whitespace-pre-line px-3 py-3 text-[12.5px] leading-[1.7] text-muted-foreground">
        {post.body}
      </p>
    </article>
  );
}
