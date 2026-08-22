import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Field } from '@/components/ui/Field';
import {
  archiveClub,
  createAdminClub,
  describeClubInfoProblem,
  draftFromClub,
  emptyClubDraft,
  fetchAdminClubs,
  restoreClub,
  saveClubInfo,
  setClubListed,
  setClubStatus,
  unverifyClub,
  verifyClub,
  type AdminClub,
  type ClubInfoDraft,
} from './clubsAdmin';
import {
  clubKindLabels,
  clubTopicLabels,
  clubTopicOrder,
  type ClubKind,
  type ClubTopic,
} from '@/features/clubs/data';
import { cities as turkeyCities } from '@/features/location/cities';
import { CLUB_PHOTO_LIMIT } from '@/services/clubs/submission';

export function ClubControl({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<AdminClub[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [deleteSlug, setDeleteSlug] = useState<string | null>(null);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [draft, setDraft] = useState<ClubInfoDraft | null>(null);
  const [editPhotos, setEditPhotos] = useState<File[]>([]);
  const [newDraft, setNewDraft] = useState<ClubInfoDraft>(() =>
    emptyClubDraft()
  );
  const [newPhotos, setNewPhotos] = useState<File[]>([]);

  const load = useCallback(() => {
    setError(null);
    fetchAdminClubs({ archived })
      .then(setItems)
      .catch((e: unknown) => {
        setItems([]);
        setError(e instanceof Error ? e.message : 'Dizin okunamadı');
      });
  }, [archived]);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setDeleteSlug(null);
      setDeleteChecked(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  function edit(club: AdminClub) {
    setOpen(club.slug);
    setDraft(draftFromClub(club));
    setEditPhotos([]);
  }

  const verified =
    items?.filter((c) => !c.deletedAt && c.verifiedAt).length ?? 0;
  const pending =
    items?.filter((c) => !c.deletedAt && c.status === 'incelemede').length ?? 0;
  const newProblem = describeClubInfoProblem(newDraft, newPhotos);
  const editing = items?.find((c) => c.slug === open) ?? null;
  const editProblem =
    draft && editing
      ? describeClubInfoProblem(draft, editPhotos, editing.photoPaths.length)
      : null;

  return (
    <Panel
      title="Kulüp dizini"
      status={
        items
          ? `${items.length} kayıt · ${pending} onay bekliyor · ${verified} doğrulanmış`
          : 'okunuyor…'
      }
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Admin doğrudan yayımlanmış topluluk ekler. Kullanıcı gönderimleri
        <em> onay bekliyor</em> durumunda gelir; onaylanmadan ziyaretçi
        listesine düşmez.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={!archived ? 'secondary' : 'ghost'}
          disabled={busy}
          onClick={() => {
            setArchived(false);
            setOpen(null);
            setDeleteSlug(null);
            setDeleteChecked(false);
          }}
        >
          Aktif topluluklar
        </Button>
        <Button
          size="sm"
          variant={archived ? 'secondary' : 'ghost'}
          disabled={busy}
          onClick={() => {
            setArchived(true);
            setOpen(null);
            setDeleteSlug(null);
            setDeleteChecked(false);
          }}
        >
          Arşiv
        </Button>
        {archived && (
          <span className="text-meta text-faint">
            Silinen topluluklar ziyaretçiye görünmez; buradan geri alınabilir.
          </span>
        )}
      </div>

      {canWrite && !archived && (
        <div className="mb-4 rounded-card border border-border p-3">
          <h3 className="mb-3 text-caption font-medium text-foreground">
            Yeni topluluk ekle
          </h3>
          <ClubForm
            idPrefix="club-new"
            draft={newDraft}
            onChange={setNewDraft}
            photos={newPhotos}
            onPhotos={setNewPhotos}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={busy || Boolean(newProblem)}
              onClick={() =>
                run(async () => {
                  await createAdminClub(newDraft, newPhotos);
                  setNewDraft(emptyClubDraft());
                  setNewPhotos([]);
                })
              }
            >
              Topluluğu yayımla
            </Button>
            {newProblem && (
              <span className="text-meta text-warning">{newProblem}</span>
            )}
          </div>
        </div>
      )}

      {items && items.length === 0 && !error && (
        <p className="py-4 text-center text-body-sm text-muted-foreground">
          {archived
            ? 'Arşivde topluluk yok.'
            : 'Dizinde kayıt yok. Yeni toplulukları elle ekleyebilirsiniz.'}
        </p>
      )}

      <ul>
        {(items ?? []).map((club) => (
          <li
            key={club.slug}
            className="border-b border-border py-2.5 last:border-0"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-caption font-medium text-foreground">
                  {club.name}
                </span>
                <span className="block truncate text-meta text-faint">
                  {club.city} · {club.slug}
                  {club.infoCheckedOn && ` · son kontrol ${club.infoCheckedOn}`}
                </span>
              </span>

              <StatusBadge status={club.status} />
              {club.deletedAt && <Badge tone="danger">Arşivde</Badge>}
              {club.verifiedAt ? (
                <Badge tone="success">Doğrulanmış</Badge>
              ) : (
                <Badge tone="muted">Doğrulanmamış</Badge>
              )}
              {!club.listed && <Badge tone="warning">Listede değil</Badge>}

              {canWrite && (
                <>
                  {archived ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => run(() => restoreClub(club.slug))}
                    >
                      Geri yükle
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant={club.listed ? 'secondary' : 'ghost'}
                        disabled={busy}
                        onClick={() =>
                          run(() => setClubListed(club.slug, !club.listed))
                        }
                      >
                        Yayında
                      </Button>
                      <Button
                        size="sm"
                        variant={club.verifiedAt ? 'secondary' : 'ghost'}
                        disabled={busy}
                        onClick={() =>
                          run(() =>
                            club.verifiedAt
                              ? unverifyClub(club.slug)
                              : verifyClub(club.slug)
                          )
                        }
                      >
                        Doğrulanmış
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy || club.status === 'yayinda'}
                        onClick={() =>
                          run(() => setClubStatus(club.slug, 'yayinda'))
                        }
                      >
                        Kabul et
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy || club.status === 'reddedildi'}
                        onClick={() =>
                          run(() => setClubStatus(club.slug, 'reddedildi'))
                        }
                      >
                        Reddet
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          open === club.slug ? setOpen(null) : edit(club)
                        }
                      >
                        {open === club.slug ? 'Kapat' : 'Düzenle'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          setDeleteSlug(club.slug);
                          setDeleteChecked(false);
                          setOpen(null);
                        }}
                      >
                        Sil
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>

            {canWrite && deleteSlug === club.slug && !archived && (
              <div className="mt-3 rounded-card border border-danger/50 bg-danger/5 p-3">
                <p className="text-body-sm font-medium text-foreground">
                  {club.name} arşive alınacak.
                </p>
                <p className="mt-1 text-meta leading-relaxed text-muted-foreground">
                  Kayıt veritabanından silinmez; ziyaretçi listelerinden kalkar
                  ve Arşiv görünümünden geri yüklenebilir.
                </p>
                <label className="mt-3 flex items-center gap-2 text-body-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={deleteChecked}
                    onChange={(event) =>
                      setDeleteChecked(event.currentTarget.checked)
                    }
                  />
                  Bu topluluğu arşive almak istediğimi onaylıyorum.
                </label>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy || !deleteChecked}
                    onClick={() => run(() => archiveClub(club.slug))}
                  >
                    Arşive al
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setDeleteSlug(null);
                      setDeleteChecked(false);
                    }}
                  >
                    Vazgeç
                  </Button>
                </div>
              </div>
            )}

            {canWrite && open === club.slug && draft && !archived && (
              <div className="mt-3 rounded-card border border-border p-3">
                <ClubForm
                  idPrefix={`club-${club.slug}`}
                  draft={draft}
                  onChange={setDraft}
                  photos={editPhotos}
                  onPhotos={setEditPhotos}
                  existingPhotoCount={club.photoPaths.length}
                />
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={busy || Boolean(editProblem)}
                    onClick={() =>
                      run(async () => {
                        await saveClubInfo(
                          club.slug,
                          draft,
                          editPhotos,
                          club.photoPaths
                        );
                        setOpen(null);
                        setEditPhotos([]);
                      })
                    }
                  >
                    Kaydet
                  </Button>
                  {editProblem && (
                    <span className="text-meta text-warning">
                      {editProblem}
                    </span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function StatusBadge({ status }: { status: AdminClub['status'] }) {
  if (status === 'incelemede') return <Badge tone="warning">Onay bekliyor</Badge>;
  if (status === 'reddedildi') return <Badge tone="danger">Reddedildi</Badge>;
  return <Badge tone="success">Yayında</Badge>;
}

function ClubForm({
  idPrefix,
  draft,
  onChange,
  photos,
  onPhotos,
  existingPhotoCount = 0,
}: {
  idPrefix: string;
  draft: ClubInfoDraft;
  onChange: (draft: ClubInfoDraft) => void;
  photos?: File[];
  onPhotos?: (photos: File[]) => void;
  existingPhotoCount?: number;
}) {
  const set = <K extends keyof ClubInfoDraft>(
    key: K,
    value: ClubInfoDraft[K]
  ) => onChange({ ...draft, [key]: value });

  function toggleTopic(topic: ClubTopic) {
    set(
      'topics',
      draft.topics.includes(topic)
        ? draft.topics.filter((t) => t !== topic)
        : [...draft.topics, topic]
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Topluluk adı" htmlFor={`${idPrefix}-name`}>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <Field label="Tür" htmlFor={`${idPrefix}-kind`}>
        <Select
          id={`${idPrefix}-kind`}
          value={draft.kind}
          onChange={(e) => set('kind', e.target.value as ClubKind)}
        >
          {Object.entries(clubKindLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="İl" htmlFor={`${idPrefix}-city`}>
        <Select
          id={`${idPrefix}-city`}
          value={draft.city}
          onChange={(e) => set('city', e.target.value)}
        >
          {turkeyCities.map((city) => (
            <option key={city.id} value={city.name}>
              {city.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Kuruluş tarihi" htmlFor={`${idPrefix}-founded`}>
        <Input
          id={`${idPrefix}-founded`}
          type="date"
          value={draft.foundedOn}
          onChange={(e) => set('foundedOn', e.target.value)}
        />
      </Field>
      <Field label="İletişim e-postası" htmlFor={`${idPrefix}-mail`}>
        <Input
          id={`${idPrefix}-mail`}
          type="email"
          value={draft.contactEmail}
          onChange={(e) => set('contactEmail', e.target.value)}
        />
      </Field>
      <Field label="Web sayfası" htmlFor={`${idPrefix}-web`} hint="Opsiyonel">
        <Input
          id={`${idPrefix}-web`}
          placeholder="https://..."
          value={draft.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </Field>
      <Field
        label="Sosyal medya"
        htmlFor={`${idPrefix}-social`}
        hint="Opsiyonel"
      >
        <Input
          id={`${idPrefix}-social`}
          placeholder="https://..."
          value={draft.socialUrl}
          onChange={(e) => set('socialUrl', e.target.value)}
        />
      </Field>
      <Field
        label="WhatsApp grubu"
        htmlFor={`${idPrefix}-whatsapp`}
        hint="Opsiyonel"
      >
        <Input
          id={`${idPrefix}-whatsapp`}
          placeholder="https://chat.whatsapp.com/..."
          value={draft.whatsappUrl}
          onChange={(e) => set('whatsappUrl', e.target.value)}
        />
      </Field>
      <Field
        label="Telegram grubu"
        htmlFor={`${idPrefix}-telegram`}
        hint="Opsiyonel"
      >
        <Input
          id={`${idPrefix}-telegram`}
          placeholder="https://t.me/..."
          value={draft.telegramUrl}
          onChange={(e) => set('telegramUrl', e.target.value)}
        />
      </Field>
      <div className="sm:col-span-2">
        <span className="label mb-2 block">Konular</span>
        <div className="grid gap-2 sm:grid-cols-4">
          {clubTopicOrder.map((topic) => (
            <label
              key={topic}
              className="flex items-center gap-2 rounded-card border border-border px-2 py-2 text-meta text-muted-foreground"
            >
              <input
                type="checkbox"
                checked={draft.topics.includes(topic)}
                onChange={() => toggleTopic(topic)}
              />
              {clubTopicLabels[topic]}
            </label>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <Field label="Açıklama" htmlFor={`${idPrefix}-summary`}>
          <textarea
            id={`${idPrefix}-summary`}
            value={draft.summary}
            onChange={(e) => set('summary', e.target.value)}
            className="min-h-28 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
          />
        </Field>
      </div>
      {onPhotos && (
        <Field
          label="Logo / grup fotoğrafı"
          htmlFor={`${idPrefix}-photos`}
          hint={`Toplam en fazla ${CLUB_PHOTO_LIMIT} görsel · JPEG, PNG veya WebP`}
        >
          <Input
            id={`${idPrefix}-photos`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) =>
              onPhotos(
                Array.from(e.target.files ?? []).slice(
                  0,
                  Math.max(0, CLUB_PHOTO_LIMIT - existingPhotoCount)
                )
              )
            }
          />
          <p className="mt-1 text-meta text-faint">
            {existingPhotoCount > 0
              ? `${existingPhotoCount} mevcut görsel · ${Math.max(
                  0,
                  CLUB_PHOTO_LIMIT - existingPhotoCount
                )} yeni görsel eklenebilir.`
              : 'Logo, afiş veya grup fotoğrafı eklenebilir.'}
          </p>
          {photos && photos.length > 0 && (
            <p className="mt-1 text-meta text-faint">
              {photos.length} yeni görsel seçildi.
            </p>
          )}
        </Field>
      )}
      <div className="flex flex-wrap gap-3 text-body-sm text-muted-foreground sm:col-span-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.publicEvents}
            onChange={(e) => set('publicEvents', e.target.checked)}
          />
          Halka açık etkinlik yapıyor
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.sharedEquipment}
            onChange={(e) => set('sharedEquipment', e.target.checked)}
          />
          Ortak ekipman sunuyor
        </label>
      </div>
    </div>
  );
}
