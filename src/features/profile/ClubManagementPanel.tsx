import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { RichContentEditor } from '@/features/admin/RichContentEditor';
import {
  assignClubManager,
  createClubPost,
  inviteClubMember,
  reviewClubMembership,
  updateManagedClub,
  useClubPortal,
  useManagedClubs,
  type ManagedClub,
} from '@/services/content/clubManagement';

export function ClubManagementPanel({ userId }: { userId: string | undefined }) {
  const managed = useManagedClubs(userId);
  const [selectedSlug, setSelectedSlug] = useState('');
  const selectedClub = useMemo(
    () => managed.clubs.find((club) => club.slug === selectedSlug) ?? null,
    [managed.clubs, selectedSlug]
  );

  useEffect(() => {
    if (selectedSlug && managed.clubs.some((club) => club.slug === selectedSlug)) {
      return;
    }
    setSelectedSlug(managed.clubs[0]?.slug ?? '');
  }, [managed.clubs, selectedSlug]);

  if (!userId) {
    return (
      <Panel title="Kulüp Yönetimi">
        <p className="text-body-sm text-muted-foreground">
          Kulüp yönetimi için giriş yapın.
        </p>
      </Panel>
    );
  }

  return (
    <div className="grid gap-4">
      <Panel title="Kulüp Yönetimi" status={`${managed.clubs.length} kulüp`}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <p className="text-body-sm leading-relaxed text-muted-foreground">
              Size atanmış veya sizin gönderdiğiniz kulüpler burada yönetilir.
              İçerik değişebilir; yayın/onay alanları admin kontrolünde kalır.
            </p>
            {managed.error && (
              <p className="mt-2 text-meta text-danger">{managed.error}</p>
            )}
          </div>
          <select
            value={selectedSlug}
            onChange={(event) => setSelectedSlug(event.target.value)}
            className="h-10 min-w-64 rounded-card border border-border bg-surface-2 px-2.5 text-meta text-foreground outline-none focus:border-primary"
          >
            {managed.clubs.length === 0 ? (
              <option value="">Yönetilebilir kulüp yok</option>
            ) : (
              managed.clubs.map((club) => (
                <option key={club.slug} value={club.slug}>
                  {club.name}
                </option>
              ))
            )}
          </select>
        </div>
      </Panel>

      {managed.loading ? (
        <Panel title="Yükleniyor">
          <p className="text-body-sm text-muted-foreground">
            Kulüp yönetim kayıtları yükleniyor…
          </p>
        </Panel>
      ) : selectedClub ? (
        <ClubPortal
          club={selectedClub}
          userId={userId}
          refreshClubs={managed.refresh}
        />
      ) : (
        <Panel title="Yönetilebilir Kulüp Yok">
          <p className="text-body-sm leading-relaxed text-muted-foreground">
            Size atanmış veya sizin gönderdiğiniz bir kulüp bulunamadı. Yeni
            kulüp eklemek için Topluluklar sayfasındaki formu kullanın.
          </p>
        </Panel>
      )}
    </div>
  );
}

function ClubPortal({
  club,
  userId,
  refreshClubs,
}: {
  club: ManagedClub;
  userId: string;
  refreshClubs: () => void;
}) {
  const portal = useClubPortal(club.slug);
  const [draft, setDraft] = useState(club);
  const [inviteEmail, setInviteEmail] = useState('');
  const [postKind, setPostKind] = useState<'duyuru' | 'haber'>('duyuru');
  const [postAudience, setPostAudience] = useState<'members' | 'public'>(
    'members'
  );
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    setDraft(club);
  }, [club]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    setFailure(null);
    try {
      await action();
      setMessage('İşlem tamamlandı.');
      portal.refresh();
      refreshClubs();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'İşlem tamamlanamadı.');
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.45fr)]">
      <Panel
        title={club.name}
        status={club.listed && club.status === 'yayinda' ? 'yayında' : club.status}
      >
        {message && (
          <p className="mb-3 rounded-card border border-success/35 bg-success/10 px-3 py-2 text-body-sm text-success">
            {message}
          </p>
        )}
        {failure && (
          <p className="mb-3 rounded-card border border-danger/45 bg-danger/10 px-3 py-2 text-body-sm text-danger">
            {failure}
          </p>
        )}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">Onaylı kulüp</Badge>
            <Link
              to={`/topluluk/${club.slug}`}
              className="text-meta text-primary hover:underline"
            >
              Public sayfayı aç
            </Link>
            <ButtonLink
              to={`/etkinlik/yeni?topluluk=${club.slug}&ad=${encodeURIComponent(club.name)}`}
              size="sm"
              variant="secondary"
            >
              Etkinlik oluştur
            </ButtonLink>
          </div>
          <Field
            label="Kulüp içeriği"
            htmlFor="club-management-content"
            hint="Başlık, bağlantı, liste, görsel, galeri, tablo ve bilgi kutusu desteklenir."
          >
            <div id="club-management-content">
              <RichContentEditor
                blocks={draft.bodyBlocks}
                onChange={(blocks) =>
                  setDraft((value) => ({ ...value, bodyBlocks: blocks }))
                }
                placeholder="Kulübün güncel tanıtımı, üyelik koşulları, toplantı düzeni ve ortak ekipman bilgileri..."
                minHeightClassName="min-h-80"
                editorClassName="pb-12"
              />
            </div>
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="İletişim e-postası" htmlFor="club-management-email">
              <Input
                id="club-management-email"
                type="email"
                value={draft.contactEmail}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    contactEmail: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Web sitesi" htmlFor="club-management-website">
              <Input
                id="club-management-website"
                placeholder="https://"
                value={draft.website}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, website: event.target.value }))
                }
              />
            </Field>
            <Field label="Sosyal medya" htmlFor="club-management-social">
              <Input
                id="club-management-social"
                placeholder="https://"
                value={draft.socialUrl}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    socialUrl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="WhatsApp" htmlFor="club-management-whatsapp">
              <Input
                id="club-management-whatsapp"
                placeholder="https://chat.whatsapp.com/..."
                value={draft.whatsappUrl}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    whatsappUrl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Telegram" htmlFor="club-management-telegram">
              <Input
                id="club-management-telegram"
                placeholder="https://t.me/..."
                value={draft.telegramUrl}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    telegramUrl: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.publicEvents}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    publicEvents: event.target.checked,
                  }))
                }
              />
              Halka açık etkinlik yapıyor
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.sharedEquipment}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    sharedEquipment: event.target.checked,
                  }))
                }
              />
              Ortak ekipman sunuyor
            </label>
          </div>
          <Button
            disabled={busy === 'save'}
            onClick={() =>
              void run('save', () =>
                updateManagedClub(club.slug, {
                  bodyBlocks: draft.bodyBlocks,
                  contactEmail: draft.contactEmail,
                  website: draft.website,
                  socialUrl: draft.socialUrl,
                  whatsappUrl: draft.whatsappUrl,
                  telegramUrl: draft.telegramUrl,
                  publicEvents: draft.publicEvents,
                  sharedEquipment: draft.sharedEquipment,
                })
              )
            }
          >
            {busy === 'save' ? 'Kaydediliyor…' : 'Kulüp içeriğini kaydet'}
          </Button>
        </div>
      </Panel>

      <div className="grid gap-4 content-start">
        <Panel title="Üyelik İstekleri" status={`${portal.requests.length}`}>
          {portal.loading ? (
            <p className="text-body-sm text-muted-foreground">Yükleniyor…</p>
          ) : portal.requests.length > 0 ? (
            <ul className="divide-y divide-border">
              {portal.requests.map((request) => (
                <li key={request.id} className="py-2">
                  {request.username ? (
                    <Link
                      to={`/profil/${request.username}`}
                      className="truncate text-body-sm text-foreground transition-colors hover:text-primary"
                    >
                      {request.displayName || request.username}
                    </Link>
                  ) : (
                    <p className="truncate text-body-sm text-foreground">
                      {request.userId}
                    </p>
                  )}
                  <p className="text-meta text-muted-foreground">
                    {new Date(request.requestedAt).toLocaleDateString('tr-TR')} ·{' '}
                    {request.status}
                  </p>
                  {request.status === 'pending' && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === request.id}
                        onClick={() =>
                          void run(request.id, () =>
                            reviewClubMembership(request.id, 'approved', userId)
                          )
                        }
                      >
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === request.id}
                        onClick={() =>
                          void run(request.id, () =>
                            reviewClubMembership(request.id, 'rejected', userId)
                          )
                        }
                      >
                        Reddet
                      </Button>
                    </div>
                  )}
                  {request.status === 'approved' &&
                    request.userId !== club.managerUserId && (
                      <div className="mt-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy === `manager-${request.id}`}
                          onClick={() =>
                            void run(`manager-${request.id}`, () =>
                              assignClubManager(club.slug, request.userId)
                            )
                          }
                        >
                          Yönetici yap
                        </Button>
                      </div>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-muted-foreground">
              Bekleyen üyelik isteği yok.
            </p>
          )}
        </Panel>

        <Panel title="Davet Et" status={`${portal.invites.length}`}>
          <div className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              placeholder="uye@example.com"
              onChange={(event) => setInviteEmail(event.target.value)}
            />
            <Button
              size="sm"
              disabled={busy === 'invite'}
              onClick={() =>
                void run('invite', async () => {
                  await inviteClubMember(club.slug, inviteEmail);
                  setInviteEmail('');
                })
              }
            >
              Davet
            </Button>
          </div>
          {portal.invites.length > 0 && (
            <ul className="mt-3 divide-y divide-border">
              {portal.invites.slice(0, 6).map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0 truncate text-meta text-foreground">
                    {invite.email}
                  </span>
                  <Badge tone={invite.status === 'accepted' ? 'success' : 'cold'}>
                    {invite.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Duyuru ve Haber">
          <div className="grid gap-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <select
                value={postKind}
                onChange={(event) =>
                  setPostKind(event.target.value as 'duyuru' | 'haber')
                }
                className="h-10 rounded-card border border-border bg-surface-2 px-2.5 text-meta text-foreground outline-none focus:border-primary"
              >
                <option value="duyuru">Üyelere duyuru</option>
                <option value="haber">Haber</option>
              </select>
              <select
                value={postKind === 'duyuru' ? 'members' : postAudience}
                disabled={postKind === 'duyuru'}
                onChange={(event) =>
                  setPostAudience(event.target.value as 'members' | 'public')
                }
                className="h-10 rounded-card border border-border bg-surface-2 px-2.5 text-meta text-foreground outline-none focus:border-primary disabled:opacity-60"
              >
                <option value="members">Sadece üyeler</option>
                <option value="public">Public haber</option>
              </select>
            </div>
            <Input
              value={postTitle}
              placeholder="Başlık"
              onChange={(event) => setPostTitle(event.target.value)}
            />
            <textarea
              value={postBody}
              placeholder="İçerik"
              rows={5}
              onChange={(event) => setPostBody(event.target.value)}
              className="w-full resize-y rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm leading-relaxed text-foreground outline-none focus:border-primary"
            />
            <Button
              size="sm"
              disabled={busy === 'post'}
              onClick={() =>
                void run('post', async () => {
                  await createClubPost(club.slug, {
                    kind: postKind,
                    audience: postAudience,
                    title: postTitle,
                    body: postBody,
                  });
                  setPostTitle('');
                  setPostBody('');
                })
              }
            >
              Yayınla
            </Button>
          </div>
          {portal.posts.length > 0 && (
            <ul className="mt-3 divide-y divide-border">
              {portal.posts.slice(0, 6).map((post) => (
                <li key={post.id} className="py-2">
                  <p className="text-body-sm text-foreground">{post.title}</p>
                  <p className="text-meta text-muted-foreground">
                    {post.kind} · {post.audience === 'members' ? 'üyeler' : 'public'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {portal.error && (
            <p className="mt-2 text-meta text-danger">{portal.error}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
