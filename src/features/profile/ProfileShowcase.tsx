import { useState } from 'react';
import { Link } from 'react-router';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { useEquipmentCatalog } from '@/services/content/equipment';
import { SLOT_LABELS, type SlotId } from '@/domain/setup/types';
import {
  formatListingPrice,
  normalizeListingCurrency,
} from '@/features/marketplace/data';
import { profileAvatarUrl } from '@/services/content/profile';
import {
  useFollowList,
  usePublicEntries,
  usePublicListings,
  usePublicSetups,
  usePublicThreads,
  type FollowListKind,
  type ShowcaseSetup,
} from '@/services/content/profileShowcase';

/**
 * PROFİL VİTRİNİ — kullanıcının sitedeki üretimi tek sayfada.
 *
 * Profil yalnızca fotoğraf ızgarasıydı. Ekipman, ilan, yazı ve forum
 * konuları hiçbir yerden bu sayfaya bağlanmıyordu; gerekçe ve ölçümler
 * `profileShowcase.ts` başlığında.
 *
 * HER BÖLÜM BOŞSA HİÇ ÇİZİLMİYOR. Sekiz kullanıcılı bir sitede çoğu
 * profil çoğu bölümde boş olacak ve "Henüz ilan yok" diyen beş kutu, o
 * profili dolu değil ÖLÜ gösterirdi. Boş bölüm yok; dolu olan görünür.
 */
export function ProfileShowcase({
  userId,
  username,
}: {
  userId: string | undefined;
  username: string;
}) {
  return (
    <div className="grid gap-4">
      <EquipmentSection userId={userId} />
      <ListingsSection userId={userId} />
      <EntriesSection userId={userId} />
      <ThreadsSection userId={userId} username={username} />
    </div>
  );
}

/* ── Ekipman ────────────────────────────────────────────────────────── */

function EquipmentSection({ userId }: { userId: string | undefined }) {
  const { items, loading } = usePublicSetups(userId);
  if (loading || items.length === 0) return null;
  return <EquipmentList items={items} />;
}

/**
 * Katalog kancası AYRI BİLEŞENDE.
 *
 * `useEquipmentCatalog` 1.184 satırlık kataloğu çekiyor ve profillerin
 * çoğunda gösterilecek ekipman yok. Üstteki bileşende çağırsaydık,
 * kancalar koşullu olamadığı için o katalog HER profil ziyaretinde
 * inerdi — hiç çizilmeyecek bir liste için.
 */
function EquipmentList({ items }: { items: ShowcaseSetup[] }) {
  const catalog = useEquipmentCatalog();

  return (
    <Panel title="Ekipmanlar" status={String(items.length)} collapsible id="ekipmanlar">
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((setup) => {
          const parts = (Object.entries(setup.slots) as [SlotId, string][])
            .map(([slot, slug]) => {
              const model = catalog.items.find((m) => m.slug === slug);
              return model ? { slot, model } : null;
            })
            .filter(
              (p): p is { slot: SlotId; model: (typeof catalog.items)[number] } =>
                p !== null
            );

          return (
            <li
              key={setup.id}
              className="rounded-card border border-border bg-surface-2 p-3"
            >
              <h3 className="text-body-sm font-medium text-foreground">
                {setup.name}
              </h3>
              {setup.purpose && (
                <p className="text-meta text-cold">{setup.purpose}</p>
              )}
              <ul className="mt-2 space-y-0.5">
                {parts.map(({ slot, model }) => (
                  <li
                    key={slot}
                    className="flex items-baseline justify-between gap-2 text-meta"
                  >
                    <span className="text-muted-foreground">
                      {SLOT_LABELS[slot]}
                    </span>
                    <span className="truncate text-right text-foreground">
                      {model.brand} {model.model}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/* ── İlanlar ────────────────────────────────────────────────────────── */

function ListingsSection({ userId }: { userId: string | undefined }) {
  const { items, loading } = usePublicListings(userId);
  if (loading || items.length === 0) return null;

  return (
    <Panel title="İlanlar" status={String(items.length)} collapsible id="ilanlar">
      <ul>
        {items.map((listing) => (
          <li
            key={listing.slug}
            className="border-b border-border last:border-0"
          >
            <Link
              to={'/ilan/' + listing.slug}
              className="group flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-caption text-foreground group-hover:text-primary">
                  {listing.title}
                </span>
                {listing.city && (
                  <span className="mt-0.5 block truncate text-meta text-muted-foreground">
                    {listing.city}
                  </span>
                )}
              </span>
              <span className="tabular shrink-0 text-meta text-foreground">
                {listing.price !== null
                  ? formatListingPrice(
                      listing.price,
                      normalizeListingCurrency(listing.currency)
                    )
                  : '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── Yazılar ────────────────────────────────────────────────────────── */

/** İçerik türü → adres kökü. Bilinmeyen tür yazı sayılıyor. */
function entryPath(kind: string, slug: string): string {
  return (kind === 'haber' ? '/haber/' : '/yazi/') + slug;
}

function EntriesSection({ userId }: { userId: string | undefined }) {
  const { items, loading } = usePublicEntries(userId);
  if (loading || items.length === 0) return null;

  return (
    <Panel title="Yazılar" status={String(items.length)} collapsible id="yazilar">
      <ul>
        {items.map((entry) => (
          <li key={entry.slug} className="border-b border-border last:border-0">
            <Link
              to={entryPath(entry.kind, entry.slug)}
              className="group flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="min-w-0 truncate text-caption text-foreground group-hover:text-primary">
                {entry.title}
              </span>
              {entry.publishedAt && (
                <span className="tabular shrink-0 text-meta text-faint">
                  {new Date(entry.publishedAt).toLocaleDateString('tr-TR')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* ── Forum ──────────────────────────────────────────────────────────── */

function ThreadsSection({
  userId,
  username,
}: {
  userId: string | undefined;
  username: string;
}) {
  const { items, loading } = usePublicThreads(userId);
  if (loading || items.length === 0) return null;

  return (
    <Panel title="Forum konuları" status={String(items.length)} collapsible id="forum">
      <ul>
        {items.map((thread) => (
          <li key={thread.slug} className="border-b border-border last:border-0">
            <Link
              to={'/forum/' + thread.slug}
              className="group flex items-baseline justify-between gap-3 py-2.5"
            >
              <span className="min-w-0 truncate text-caption text-foreground group-hover:text-primary">
                {thread.title}
              </span>
              <span className="tabular shrink-0 text-meta text-muted-foreground">
                {thread.replyCount} cevap
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-meta text-faint">
        {username} kullanıcısının açtığı konular.
      </p>
    </Panel>
  );
}

/* ── Takipçi / takip listesi ────────────────────────────────────────── */

/**
 * Sayaca tıklanınca açılan liste.
 *
 * Sayaçlar (`follow_counts`) zaten vardı ama listeyi hiçbir yer
 * okumuyordu: kullanıcı "12 takipçi" görüyor, kimler olduğunu
 * öğrenemiyordu. Sayı, tıklanabilir olmadıkça bir çıkmaz.
 *
 * Liste TALEP ÜZERİNE yükleniyor: `userId` yalnızca panel açıkken
 * veriliyor, yani kapalıyken sorgu hiç atılmıyor. Her profil
 * ziyaretinde iki liste birden çekmek, kimsenin bakmadığı veri için
 * istek harcamak olurdu.
 */
export function FollowLists({
  userId,
  followers,
  following,
}: {
  userId: string | undefined;
  followers: number;
  following: number;
}) {
  const [acik, setAcik] = useState<FollowListKind | null>(null);
  const { items, loading } = useFollowList(acik ? userId : undefined, acik ?? 'takipci');

  function degistir(kind: FollowListKind) {
    setAcik((mevcut) => (mevcut === kind ? null : kind));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={acik === 'takipci' ? 'secondary' : 'ghost'}
          onClick={() => degistir('takipci')}
          aria-expanded={acik === 'takipci'}
        >
          {followers} takipçi
        </Button>
        <Button
          size="sm"
          variant={acik === 'takip' ? 'secondary' : 'ghost'}
          onClick={() => degistir('takip')}
          aria-expanded={acik === 'takip'}
        >
          {following} takip
        </Button>
      </div>

      {acik && (
        <div className="mt-2 rounded-card border border-border bg-surface-1 p-2">
          {loading ? (
            <p className="px-1 py-2 text-meta text-muted-foreground">
              Liste yükleniyor…
            </p>
          ) : items.length === 0 ? (
            <p className="px-1 py-2 text-meta text-muted-foreground">
              {acik === 'takipci'
                ? 'Henüz takipçi yok.'
                : 'Henüz kimse takip edilmiyor.'}
            </p>
          ) : (
            <ul className="grid gap-1 sm:grid-cols-2">
              {items.map((person) => (
                <li key={person.userId}>
                  <Link
                    to={'/profil/' + person.username}
                    className="group flex items-center gap-2 rounded-card px-1.5 py-1.5 transition-colors hover:bg-surface-2"
                  >
                    <Avatar person={person} />
                    <span className="min-w-0">
                      <span className="block truncate text-meta text-foreground group-hover:text-primary">
                        {person.displayName || person.username}
                      </span>
                      {person.city && (
                        <span className="block truncate text-meta text-faint">
                          {person.city}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Avatarı olmayan kullanıcı için baş harf — kırık görsel yerine. */
function Avatar({
  person,
}: {
  person: { username: string; displayName: string | null; avatarPath: string | null };
}) {
  const url = profileAvatarUrl(person.avatarPath);
  if (url) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        className="h-7 w-7 shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 text-meta text-muted-foreground"
    >
      {(person.displayName || person.username).slice(0, 1).toLocaleUpperCase('tr-TR')}
    </span>
  );
}
