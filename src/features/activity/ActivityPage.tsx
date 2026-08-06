import { Link } from 'react-router';
import { Alert } from '@/components/ui/Alert';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { PageMeta } from '@/components/seo/PageMeta';
import { relativeTime } from '@/lib/relativeTime';
import {
  useActivityFeed,
  type ActivityItem,
  type ActivityKind,
} from '@/services/content/activity';

const kindCopy: Record<
  ActivityKind,
  { label: string; verb: string; tone: BadgeTone }
> = {
  photo: { label: 'Fotoğraf', verb: 'fotoğraf yayımladı', tone: 'primary' },
  listing: { label: 'İlan', verb: 'ilan verdi', tone: 'warning' },
  thread: { label: 'Forum', verb: 'konu açtı', tone: 'cold' },
};

function ActivityRow({ item }: { item: ActivityItem }) {
  const copy = kindCopy[item.kind];

  return (
    <li className="border-b border-border last:border-0">
      <div className="grid gap-3 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-start">
        <Badge tone={copy.tone} className="w-fit">
          {copy.label}
        </Badge>

        <div className="min-w-0">
          <p className="text-meta text-muted-foreground">
            <Link
              to={`/profil/${item.actor.username}`}
              className="font-medium text-foreground transition-colors hover:text-primary"
            >
              {item.actor.displayName}
            </Link>{' '}
            {copy.verb}
          </p>
          <Link
            to={item.href}
            className="mt-1 block truncate text-body-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            {item.title}
          </Link>
        </div>

        <time
          dateTime={item.happenedAt}
          className="tabular text-meta text-faint sm:text-right"
        >
          {relativeTime(item.happenedAt)}
        </time>
      </div>
    </li>
  );
}

export function ActivityPage() {
  const {
    items,
    followingCount,
    loading,
    error,
    configured,
    authenticated,
    refresh,
  } = useActivityFeed();

  return (
    <>
      <PageMeta
        title="Akış"
        description="Takip ettiğin astrofotoğrafçıların yeni fotoğraf, forum ve ilan hareketleri."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Akış"
          description="Takip ettiğin kişilerin yeni fotoğrafları, forum konuları ve ilanları."
          meta={
            authenticated && followingCount > 0
              ? `${followingCount} takip`
              : undefined
          }
          actions={
            authenticated ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={refresh}
              >
                Yenile
              </Button>
            ) : undefined
          }
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Keşfet', to: '/kesfet' },
            { label: 'Akış' },
          ]}
        />

        {!authenticated && !loading && (
          <EmptyState
            message="Akışı görmek için giriş yapmalısın."
            hint="Bu sayfa kişisel takip listenden oluşur; takip ilişkisi olmadan doğru akış üretilemez."
            action={
              <ButtonLink to="/giris" size="sm">
                Giriş yap
              </ButtonLink>
            }
          />
        )}

        {authenticated && !configured && (
          <EmptyState
            message="Canlı veritabanı bağlı değil."
            hint="Takip akışı Supabase'deki takip ve içerik kayıtlarından okunur."
          />
        )}

        {authenticated && configured && error && (
          <Alert tone="danger" className="mb-4">
            {error}
          </Alert>
        )}

        {authenticated && configured && loading && (
          <Panel title="Son hareketler">
            <p className="text-meta text-muted-foreground">Akış okunuyor.</p>
          </Panel>
        )}

        {authenticated &&
          configured &&
          !loading &&
          !error &&
          followingCount === 0 && (
            <EmptyState
              message="Henüz kimseyi takip etmiyorsun."
              hint="Profil sayfalarından takip ettiğin kişiler burada tek akışta görünür."
              action={
                <ButtonLink to="/kesfet" size="sm">
                  Astrofotoğrafçıları keşfet
                </ButtonLink>
              }
            />
          )}

        {authenticated &&
          configured &&
          !loading &&
          !error &&
          followingCount > 0 &&
          items.length === 0 && (
            <EmptyState
              message="Takip ettiklerinden yeni hareket yok."
              hint="Yeni fotoğraf, forum konusu veya ilan yayımlandığında bu liste dolacak."
              action={
                <ButtonLink to="/kesfet" size="sm" variant="secondary">
                  Keşfet'e dön
                </ButtonLink>
              }
            />
          )}

        {authenticated && configured && !loading && items.length > 0 && (
          <Panel title="Son hareketler" status={`${items.length} kayıt`}>
            <ul>
              {items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </ul>
          </Panel>
        )}
      </Container>
    </>
  );
}
