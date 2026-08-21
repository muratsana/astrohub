import { useState, type ReactNode } from 'react';
import { adminEditPath } from '@/components/admin/adminEditPath';
import { AdminEditLink } from '@/components/admin/AdminEditLink';
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
import { createReply, useForumThread } from '@/services/content/forum';
import { useFlag } from '@/features/site/SiteConfigContext';
import { FlagClosedNote } from '@/features/site/FlagClosedNote';
import { cn } from '@/lib/cn';
import { Alert } from '@/components/ui/Alert';
import { LabelChip } from './LabelChip';
import { ReportButton } from '@/features/admin/ReportButton';
import { RemovedNotice } from '@/features/admin/RemovedNotice';
import { profileAvatarUrl } from '@/services/content/profile';
import { ProfileInlineLink } from '@/components/user/ProfileInlineLink';

/** Konu detayı: açılış mesajı + yanıtlar + yanıt kutusu. */
export function ThreadPage() {
  const { slug } = useParams<{ slug: string }>();
  const threadQuery = useForumThread(slug);
  /* Erken `return`dan ÖNCE: kanca çağrıları koşulsuz olmalı. */
  const yorumlarAcik = useFlag('yorumlar_acik');
  const thread = threadQuery.data ?? null;

  if (!thread) {
    if (threadQuery.isLoading || threadQuery.isFetching) {
      return (
        <>
          <PageMeta
            title="Konu yükleniyor"
            description="Forum konusu yükleniyor."
            noIndex
          />
          <Container className="py-8 sm:py-10">
            <Panel title="Konu yükleniyor">
              <p role="status" className="text-body-sm text-muted-foreground">
                Yeni konu veritabanından okunuyor…
              </p>
            </Panel>
          </Container>
        </>
      );
    }
    return <NotFoundPage />;
  }

  const info = forumCategories[thread.category];
  const openingPost: ForumPost = {
    id: `${thread.id}-op`,
    author: thread.author,
    createdAt: thread.createdAt,
    body: thread.body,
    /* Açılış mesajının kaldırma gerekçesi KONUNUN üzerinde duruyor
       (`forum_threads.removal_reason`) — açılış mesajının ayrı bir
       `forum_posts` satırı yok. */
    removalReason: thread.removalReason,
  };

  return (
    <>
      <PageMeta
        title={thread.title}
        /* Kaldırılmış konuda gövde boş; açıklamayı meta'ya da yazıyoruz.
           Boş bir description arama sonucunda ve paylaşım kartında
           başlığın altını boş bırakırdı — kaldırıldığı orada da
           anlaşılsın. */
        description={thread.removalReason ?? thread.body.slice(0, 160)}
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
              {/* Rozetler künyenin başında: konunun TÜRÜ, sayısal
                  istatistiklerinden önce okunmalı. */}
              {(thread.labels ?? []).map((id) => (
                <LabelChip key={id} id={id} />
              ))}
              {thread.replyCount} yanıt ·{' '}
              {thread.viewCount.toLocaleString('tr-TR')} görüntülenme
            </span>
          }
          actions={
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-meta text-muted-foreground">
                {info.name}
              </span>
              {/* Kaldırılmış konuda şikâyet düğmesi yok — karar zaten
                  verilmiş; ikinci bir şikâyet kuyruğu boş yere şişirir. */}
              {!thread.removalReason && (
                <ReportButton
                  compact
                  targetType="forum_thread"
                  targetId={thread.id}
                  targetPath={`/forum/${thread.slug}`}
                />
              )}
              {/* Konu başlığını ya da gövdesini düzeltmenin panelden
                  geçen bir yolu vardı ama buradan görünmüyordu. */}
              <AdminEditLink to={adminEditPath('thread', thread.slug)} />
            </span>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
          <div className="space-y-2.5">
            <PostCard
              post={openingPost}
              opening
              threadPath={`/forum/${thread.slug}`}
            />

            {thread.replies.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                threadPath={`/forum/${thread.slug}`}
              />
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
              <ReplyBox
                thread={thread}
                onSent={() => void threadQuery.refetch()}
              />
            )}
          </div>

          <aside className="space-y-4">
            <Panel title="Konu bilgisi">
              <dl className="space-y-2 text-body-sm">
                <Row
                  label="Açan"
                  value={<ProfileInlineLink username={thread.author.username} />}
                />
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="label shrink-0">{label}</dt>
      <dd className="tabular text-right text-foreground">{value}</dd>
    </div>
  );
}

function PostCard({
  post,
  opening,
  threadPath,
}: {
  post: ForumPost;
  opening?: boolean;
  /* Gönderinin kendi adresi yok; şikâyet kaydı konuya işaret ediyor. */
  threadPath: string;
}) {
  return (
    <article
      className={cn(
        'rounded-card border',
        opening
          ? 'border-primary/45 bg-primary/[0.055]'
          : 'border-border bg-surface-1',
        post.solution ? 'border-success/50' : ''
      )}
    >
      <header
        className={cn(
          'flex gap-3 border-b px-3 py-3',
          opening ? 'border-primary/25 bg-primary/[0.045]' : 'border-border'
        )}
      >
        <ForumAvatar author={post.author} opening={opening} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <ProfileInlineLink
              username={post.author.username}
              className="text-body-sm font-semibold text-foreground"
            >
              {post.author.displayName}
            </ProfileInlineLink>
            <ProfileInlineLink
              username={post.author.username}
              className="tabular text-meta text-muted-foreground"
            >
              @{post.author.username}
            </ProfileInlineLink>
            <span
              className={cn(
                'rounded-card border px-2 py-0.5 text-meta font-medium',
                opening
                  ? 'border-primary/40 text-primary'
                  : 'border-border text-faint'
              )}
            >
              {opening ? 'İlk mesaj' : 'Cevap'}
            </span>
            {post.solution && (
              <span className="rounded-card border border-success/45 px-2 py-0.5 text-meta font-medium text-success">
                Çözüm
              </span>
            )}
            <span className="tabular ml-auto text-meta text-faint">
              {relativeTime(post.createdAt)}
            </span>
          </div>
          {opening && (
            <p className="mt-1 text-meta text-muted-foreground">
              Konuyu açan mesaj
            </p>
          )}
        </div>
        {/*
          Gönderinin kendi adresi yok; moderatör konuya gidiyor ve
          gönderiyi orada görüyor. Hedef KİMLİĞİ yine de gönderinin
          kendisi: konu kimliği yazılsaydı hangi iletinin şikâyet
          edildiği kaybolurdu.

          KALDIRILMIŞ GÖNDERİ ŞİKÂYET EDİLEMİYOR: ortada şikâyet edilecek
          metin kalmadı ve gelen kayıt moderatöre boş bir hedef gösterir.
        */}
        {!post.removalReason && (
          <ReportButton
            compact
            targetType="forum_post"
            targetId={post.id}
            targetPath={threadPath}
          />
        )}
      </header>

      {post.removalReason ? (
        <RemovedNotice reason={post.removalReason} className="m-3" />
      ) : (
        /*
          Gövde düz metindir ve React tarafından kaçırılarak basılır.
          `dangerouslySetInnerHTML` bilerek kullanılmıyor — zengin metin
          eklendiğinde önce sanitize katmanı gelecek (bkz. lib/sanitize.ts).
        */
        <p
          className={cn(
            'whitespace-pre-line px-3 py-3 text-caption leading-[1.7]',
            opening ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {post.body}
        </p>
      )}
    </article>
  );
}

function ForumAvatar({
  author,
  opening,
}: {
  author: ForumPost['author'];
  opening?: boolean;
}) {
  const url = profileAvatarUrl(author.avatarPath);
  const initials = author.displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toLocaleUpperCase('tr-TR');

  return (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border text-caption font-semibold',
        opening
          ? 'border-primary/55 bg-primary/15 text-primary'
          : 'border-border bg-surface-2 text-muted-foreground'
      )}
      aria-hidden={url ? undefined : true}
    >
      {url ? (
        <img
          src={url}
          alt={`${author.displayName} avatarı`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        initials || author.username[0]?.toLocaleUpperCase('tr-TR') || '?'
      )}
    </span>
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
