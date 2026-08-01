import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { Panel } from '@/components/ui/Panel';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { relativeTime } from '@/lib/relativeTime';
import { cn } from '@/lib/cn';
import { lowerTr } from '@/lib/text';
import {
  conversationLabel,
  useConversations,
  type ConversationSummary,
} from '@/services/content/messages';
import { ConversationView } from './ConversationView';

/**
 * MESAJLAR — liste ve konuşma aynı rotada.
 *
 * `/mesajlar` listeyi, `/mesajlar/:id` konuşmayı açıyor; geniş ekranda
 * ikisi yan yana. Ayrı sayfalara bölmek, masaüstünde her sohbet
 * değişiminde listeyi yeniden yüklemek olurdu — gelen kutusu böyle
 * çalışmaz.
 *
 * DAR EKRANDA TEK SÜTUN. Sohbet açıkken liste gizleniyor: 390px'te iki
 * sütun, ikisini de kullanılamaz genişliğe sıkıştırırdı. Geri dönüş yolu
 * konuşmanın üstündeki bağlantı.
 */

function ConversationRow({
  item,
  active,
}: {
  item: ConversationSummary;
  active: boolean;
}) {
  const name = conversationLabel(item);

  return (
    <li className="border-b border-border last:border-0">
      <Link
        to={`/mesajlar/${item.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-start justify-between gap-3 py-2.5 transition-colors',
          active && 'text-primary'
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'truncate text-caption',
                active
                  ? 'text-primary'
                  : 'text-foreground group-hover:text-primary'
              )}
            >
              {name}
            </span>
            {item.muted && (
              <span className="shrink-0 text-meta text-faint">sessiz</span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-meta text-muted-foreground">
            {/* Silinen mesajın gövdesi boş geliyor (0043); listede "boş
                satır" yerine ne olduğunu yazıyoruz. */}
            {item.lastMessage
              ? item.lastMessage
              : item.lastMessage === ''
                ? 'Mesaj silindi'
                : 'Henüz mesaj yok'}
          </span>
        </span>

        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-meta text-faint">
            {relativeTime(item.lastMessageAt)}
          </span>
          {item.unread > 0 && (
            <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-meta font-medium leading-none text-primary-foreground tabular-nums">
              {item.unread > 99 ? '99+' : item.unread}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function MessagesPage() {
  const { user, loading: authLoading, configured } = useAuth();
  const { id } = useParams<{ id?: string }>();
  const [query, setQuery] = useState('');
  const { items, loading, error, unreadTotal } = useConversations();

  /*
   * ARAMA İSTEMCİDE. Sohbet listesi zaten tümüyle indirilmiş bir kaç
   * düzine satır; sunucuya gitmek her tuş vuruşunda bir istek demekti.
   * Mesaj İÇİNDE arama ayrı bir iş ve konuşma görünümünde duruyor.
   */
  const filtered = useMemo(() => {
    const needle = lowerTr(query.trim());
    if (!needle) return items;
    return items.filter((item) =>
      lowerTr(conversationLabel(item)).includes(needle)
    );
  }, [items, query]);

  const activeConversation = id
    ? items.find((item) => item.id === id)
    : undefined;

  return (
    <>
      <PageMeta
        title={activeConversation ? conversationLabel(activeConversation) : 'Mesajlar'}
        description="Üyelerle birebir yazışma."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Mesajlar"
          description="Satıcıya soru sor, gözlem planı yap, fotoğrafı konuş."
          meta={unreadTotal > 0 ? `${unreadTotal} okunmamış` : undefined}
        />

        {!authLoading && !user && (
          <EmptyState
            message="Mesajlaşmak için giriş yapmalısın."
            hint="Yazışmalar hesabına bağlıdır; oturum olmadan gösterilemez."
            action={
              <ButtonLink to="/giris" size="sm">
                Giriş yap
              </ButtonLink>
            }
          />
        )}

        {user && configured && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
            {/* Sohbet listesi — dar ekranda sohbet açıkken gizli. */}
            <div className={cn(id && 'hidden lg:block')}>
              <Panel bodyClassName="px-4 py-1">
                <div className="border-b border-border py-2.5">
                  <Input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Sohbetlerde ara"
                    aria-label="Sohbetlerde ara"
                  />
                </div>

                {loading && items.length === 0 ? (
                  <p className="py-10 text-center text-meta text-muted-foreground">
                    Sohbetler okunuyor…
                  </p>
                ) : error ? (
                  <p className="py-10 text-center text-body-sm text-danger">
                    {error}
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="py-10 text-center text-meta leading-relaxed text-muted-foreground">
                    {items.length === 0
                      ? 'Henüz sohbetin yok. Bir ilan sayfasından satıcıya ya da bir profilden üyeye yazabilirsin.'
                      : 'Aramaya uyan sohbet yok.'}
                  </p>
                ) : (
                  <ul>
                    {filtered.map((item) => (
                      <ConversationRow
                        key={item.id}
                        item={item}
                        active={item.id === id}
                      />
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            {/* Konuşma */}
            <div className={cn(!id && 'hidden lg:block')}>
              {id ? (
                <ConversationView
                  conversationId={id}
                  title={
                    activeConversation
                      ? conversationLabel(activeConversation)
                      : 'Sohbet'
                  }
                  otherId={activeConversation?.otherId ?? null}
                  otherUsername={activeConversation?.otherUsername ?? null}
                  muted={activeConversation?.muted ?? false}
                />
              ) : (
                <Panel>
                  <p className="py-10 text-center text-meta leading-relaxed text-muted-foreground">
                    Soldan bir sohbet seç.
                  </p>
                </Panel>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
