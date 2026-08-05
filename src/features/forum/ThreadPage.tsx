import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LockIcon, PinIcon } from '@/components/ui/icons';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { NotFoundPage } from '@/components/NotFoundPage';
import {
  forumCategories,
  relativeTime,
  type ForumPost,
  type ForumThread,
} from './types';
import { useAuth } from '@/features/auth/AuthContext';
import { createReply, useForumThreads } from '@/services/content/forum';
import { useFlag } from '@/features/site/SiteConfigContext';
import { FlagClosedNote } from '@/features/site/FlagClosedNote';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';

/** Konu detayı: açılış mesajı + yanıtlar + yanıt kutusu. */
export function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useForumThreads();
  /* Erken `return`dan ÖNCE: kanca çağrıları koşulsuz olmalı. */
  const yorumlarAcik = useFlag('yorumlar_acik');
  const thread = catalog.items.find((t) => t.slug === slug);

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
          breadcrumb={[{ label: 'Forum', to: '/forum' }, { label: info.name }]}
          title={thread.title}
          meta={
            <span className="inline-flex items-center gap-2">
              {thread.pinned && (
                <PinIcon
                  className="h-3 w-3 text-primary"
                  aria-label="Sabitlenmiş"
                />
              )}
              {thread.locked && (
                <LockIcon className="h-3 w-3 text-faint" aria-label="Kilitli" />
              )}
              {thread.replyCount} yanıt ·{' '}
              {thread.viewCount.toLocaleString('tr-TR')} görüntülenme
            </span>
          }
          actions={
            <span className="text-meta text-muted-foreground">{info.name}</span>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div className="space-y-2.5">
            <PostCard post={openingPost} opening />

            {thread.replies.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}

            {thread.replies.length < thread.replyCount && (
              <p className="rounded-card border border-border bg-surface-1 px-3 py-2.5 text-meta text-muted-foreground">
                Kalan {thread.replyCount - thread.replies.length} yanıt, forum
                veritabanı bağlandığında burada görünecek.
              </p>
            )}

            {thread.locked ? (
              <p className="flex items-center gap-2 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-meta text-muted-foreground">
                <LockIcon className="h-3.5 w-3.5 shrink-0 text-faint" />
                Bu konu kilitli; yeni yanıt yazılamaz.
              </p>
            ) : !yorumlarAcik ? (
              /* Konu kilidi ÖNCE geliyor: kilit bu konuya ait bir karar,
                 bayrak site geneline ait. Kilitli bir konuda "yorumlar
                 kapalı" demek, kapatınca açılacakmış izlenimi verirdi. */
              <FlagClosedNote>
                Yorumlar şu an kapalı; yeni yanıt yazılamıyor.
              </FlagClosedNote>
            ) : (
              <ReplyBox thread={thread} onSent={catalog.refresh} />
            )}
          </div>

          <aside className="space-y-4">
            <Panel title="Konu bilgisi">
              <dl className="space-y-2 text-body-sm">
                <Row label="Açan" value={`@${thread.author.username}`} />
                <Row label="Açılış" value={relativeTime(thread.createdAt)} />
                <Row
                  label="Son etkinlik"
                  value={relativeTime(thread.lastActivityAt)}
                />
              </dl>
            </Panel>

            <ButtonLink
              to="/forum"
              variant="secondary"
              size="sm"
              className="w-full"
            >
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
        <span className="text-meta font-medium text-foreground">
          {post.author.displayName}
        </span>
        <span className="tabular text-meta text-muted-foreground">
          @{post.author.username}
        </span>
        {opening && <span className="text-meta text-faint">konuyu açan</span>}
        <span className="tabular ml-auto text-meta text-faint">
          {relativeTime(post.createdAt)}
        </span>
      </header>

      {/*
        Gövde düz metindir ve React tarafından kaçırılarak basılır.
        `dangerouslySetInnerHTML` bilerek kullanılmıyor — zengin metin
        eklendiğinde önce sanitize katmanı gelecek (bkz. lib/sanitize.ts).
      */}
      <p className="whitespace-pre-line px-3 py-3 text-caption leading-[1.7] text-muted-foreground">
        {post.body}
      </p>
    </article>
  );
}

/**
 * YANIT KUTUSU.
 *
 * Gönderim `forum_posts` tablosuna yazıyor; RLS hem kendi adına yazmayı
 * hem konunun kilitli olmamasını şart koşuyor. Kilit kontrolü burada da
 * var ama onun yerine geçmiyor — kilitli bir konuda kutuyu hiç
 * göstermemek, gönderdikten sonra hata almaktan iyi.
 *
 * Gönderim sonrası metin temizleniyor ve liste tazeleniyor. Yanıtı
 * ekranda iyimser olarak göstermiyoruz: forum sıralaması ve yanıt sayısı
 * veritabanı tetikleyicisiyle güncelleniyor, iyimser bir kopya ikisiyle
 * çelişirdi.
 */
function ReplyBox({
  thread,
  onSent,
}: {
  thread: ForumThread;
  onSent: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await createReply({ threadId: thread.id, body, authorId: user.id });
      setBody('');
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Yanıt gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Yanıt yaz">
      <textarea
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ekipmanını ve koşullarını da yazarsan çok daha isabetli yanıt alırsın."
        aria-label="Yanıt metni"
        className="w-full resize-y rounded-card border border-border bg-surface-2 px-3 py-2 text-meta leading-relaxed text-foreground outline-none placeholder:text-faint focus:border-primary"
      />

      {error && (
        <Alert variant="text" className="mt-2">
          {error}
        </Alert>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-meta text-faint">
          {user ? (
            'Düz metin olarak yayımlanır.'
          ) : (
            <>
              Yanıt yazmak için{' '}
              <Link to="/giris" className="text-primary hover:underline">
                giriş yapın
              </Link>
              .
            </>
          )}
        </p>
        <Button
          size="sm"
          disabled={busy || !user || body.trim().length < 2}
          onClick={() => void send()}
        >
          {busy ? 'Gönderiliyor…' : 'Gönder'}
        </Button>
      </div>
    </Panel>
  );
}
