import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { DistrictSelect } from '@/components/ui/DistrictSelect';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Panel } from '@/components/ui/Panel';
import { ProvinceSelect } from '@/components/ui/ProvinceSelect';
import {
  CONTENT_STATUSES,
  contentStatusLabels,
  type ContentStatus,
} from '@/domain/content/status';
import { eventTypeLabels, type EventType } from '@/features/events/types';
import { cn } from '@/lib/cn';
import {
  EVENT_TYPES,
  describeEventProblem,
  describeEventPublishWarning,
  emptyEventDraft,
  fetchAdminEventRegistrations,
  fetchAdminEvent,
  fetchAdminEventBySlug,
  fetchAdminEvents,
  saveAdminEvent,
  setEventCancelled,
  type EventDraft,
  type EventListRow,
  type EventRegistrationRow,
} from './eventsAdmin';

/**
 * ETKİNLİK YÖNETİMİ.
 *
 * Etkinlikler panelde `RecordsControl` üzerinden yalnızca MODERE
 * edilebiliyordu: listele, durum değiştir, sil. Başlıktaki yazım
 * hatasını düzeltmek, saati kaydırmak ya da eksik koordinatı girmek
 * mümkün değildi — çünkü etkinlik tablosuna yazan tek arayüz kullanıcıya
 * açık katkı formuydu ve o form 30 kolonun 12'sine dokunuyordu.
 *
 * Bu ekran haber/yazı tarafındaki `ContentControl` ile aynı düzeni
 * izliyor: solda liste, sağda tam düzenleme. Kasten AYNI: yönetici iki
 * ayrı zihinsel model taşımak zorunda kalmasın.
 *
 * SİLME BURADA YOK. Soft-delete ve geri alma `RecordsControl`'de duruyor
 * ve orada iki adımlı onayı var; ikinci bir silme düğmesi eklemek aynı
 * yıkıcı eylemi iki farklı korumayla sunmak olurdu.
 */
export function EventControl({
  canWrite,
  targetSlug,
}: {
  canWrite: boolean;
  /** `/admin/events?slug=…` ile gelen kullanıcı doğrudan o kaydı açar. */
  targetSlug?: string;
}) {
  const [rows, setRows] = useState<EventListRow[]>([]);
  const [search, setSearch] = useState('');
  const [listError, setListError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [registrations, setRegistrations] = useState<EventRegistrationRow[]>([]);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const load = useCallback(async (term: string) => {
    setLoading(true);
    try {
      setRows(await fetchAdminEvents({ search: term }));
      setListError(null);
    } catch (error) {
      /* Okuma hatası "kayıt yok" diye sunulmuyor: boş liste ile kırık
         bağlantı aynı ekranı verirse yönetici veri kaybettiğini sanır. */
      setListError(
        error instanceof Error ? error.message : 'Etkinlikler okunamadı.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(search), 250);
    return () => window.clearTimeout(timer);
  }, [load, search]);

  useEffect(() => {
    if (!targetSlug) return;
    let active = true;
    void (async () => {
      try {
        const found = await fetchAdminEventBySlug(targetSlug);
        if (!active) return;
        if (found) setDraft(found);
        else setFormError(`"${targetSlug}" adresli etkinlik bulunamadı.`);
      } catch (error) {
        if (active)
          setFormError(
            error instanceof Error ? error.message : 'Etkinlik açılamadı.'
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [targetSlug]);

  async function openEvent(id: string) {
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      setDraft(await fetchAdminEvent(id));
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Etkinlik açılamadı.'
      );
    } finally {
      setBusy(false);
    }
  }

  const loadRegistrations = useCallback(async (eventId: string) => {
    try {
      setRegistrations(await fetchAdminEventRegistrations(eventId));
      setRegistrationError(null);
    } catch (error) {
      setRegistrations([]);
      setRegistrationError(
        error instanceof Error ? error.message : 'Kayıtlar okunamadı.'
      );
    }
  }, []);

  useEffect(() => {
    if (!draft?.id) {
      setRegistrations([]);
      setRegistrationError(null);
      return;
    }
    void loadRegistrations(draft.id);
  }, [draft?.id, loadRegistrations]);

  async function save() {
    if (!draft) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const id = await saveAdminEvent(draft);
      setDraft({ ...draft, id });
      setNotice('Etkinlik kaydedildi.');
      await loadRegistrations(id);
      await load(search);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Etkinlik kaydedilemedi.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleCancelled() {
    if (!draft?.id) return;
    const next = draft.cancelledAt ? null : new Date().toISOString();
    setBusy(true);
    setFormError(null);
    try {
      await setEventCancelled(draft.id, next !== null);
      setDraft({ ...draft, cancelledAt: next });
      setNotice(next ? 'Etkinlik iptal olarak işaretlendi.' : 'İptal kaldırıldı.');
      await load(search);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'İptal durumu değiştirilemedi.'
      );
    } finally {
      setBusy(false);
    }
  }

  const problem = draft ? describeEventProblem(draft) : null;
  const publishWarning = draft ? describeEventPublishWarning(draft) : null;

  function set<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <Panel title="Etkinlikler" titleAs="h3">
        <div className="space-y-3">
          <Field label="Ara" htmlFor="event-search">
            <Input
              id="event-search"
              value={search}
              placeholder="Başlık, il veya adres eki"
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>

          {canWrite && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setDraft(emptyEventDraft());
                setFormError(null);
                setNotice(null);
              }}
            >
              Yeni etkinlik
            </Button>
          )}

          {listError && <Alert tone="danger">{listError}</Alert>}

          {loading && !rows.length && (
            <p className="text-meta text-muted-foreground">Yükleniyor…</p>
          )}

          {!loading && !listError && rows.length === 0 && (
            <EmptyState
              message="Etkinlik yok"
              hint="Arama ölçütüne uyan etkinlik bulunamadı."
            />
          )}

          <ul className="space-y-1">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => void openEvent(row.id)}
                  className={cn(
                    'w-full rounded-card border px-2.5 py-2 text-left transition-colors',
                    draft?.id === row.id
                      ? 'border-primary'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <span className="block text-body-sm text-foreground">
                    {row.title}
                  </span>
                  <span className="mt-0.5 block text-meta text-muted-foreground">
                    {[
                      row.city,
                      row.startsAt
                        ? new Date(row.startsAt).toLocaleDateString('tr-TR')
                        : null,
                      contentStatusLabels[row.status as ContentStatus] ??
                        row.status,
                      row.cancelledAt ? 'İPTAL' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <Panel
        title={draft ? (draft.id ? 'Etkinliği düzenle' : 'Yeni etkinlik') : 'Etkinlik'}
        titleAs="h3"
      >
        {!draft ? (
          <EmptyState
            message="Etkinlik seçin"
            hint="Soldaki listeden bir etkinliğe tıklayın ya da yeni bir tane açın."
          />
        ) : (
          <div className="space-y-3">
            {formError && <Alert tone="danger">{formError}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {publishWarning && <Alert tone="warning">{publishWarning}</Alert>}
            {draft.cancelledAt && (
              <Alert tone="warning">
                Bu etkinlik iptal işaretli. Kayıt yayında kalıyor ki takip
                edenler iptali görebilsin.
              </Alert>
            )}

            <Field label="Etkinlik adı" htmlFor="event-title">
              <Input
                id="event-title"
                value={draft.title}
                disabled={!canWrite}
                onChange={(event) => set('title', event.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tür" htmlFor="event-type">
                <Select
                  id="event-type"
                  value={draft.type}
                  disabled={!canWrite}
                  onChange={(event) =>
                    set('type', event.target.value as EventType)
                  }
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {eventTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Durum" htmlFor="event-status">
                <Select
                  id="event-status"
                  value={draft.status}
                  disabled={!canWrite}
                  onChange={(event) =>
                    set('status', event.target.value as ContentStatus)
                  }
                >
                  {CONTENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {contentStatusLabels[status]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="İl" htmlFor="event-city">
                <ProvinceSelect
                  id="event-city"
                  value={draft.city}
                  onChange={(value) =>
                    setDraft((current) =>
                      current ? { ...current, city: value, district: '' } : current
                    )
                  }
                />
              </Field>
              <Field label="İlçe" htmlFor="event-district">
                <DistrictSelect
                  id="event-district"
                  provinceName={draft.city}
                  value={draft.district}
                  onChange={(value) => set('district', value)}
                />
              </Field>
            </div>

            <Field label="Mekan" htmlFor="event-venue">
              <Input
                id="event-venue"
                value={draft.venue}
                disabled={!canWrite}
                onChange={(event) => set('venue', event.target.value)}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Başlangıç" htmlFor="event-start">
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={draft.startsAt}
                  disabled={!canWrite}
                  onChange={(event) => set('startsAt', event.target.value)}
                />
              </Field>
              <Field
                label="Bitiş"
                htmlFor="event-end"
                hint="Boş bırakılabilir."
              >
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={draft.endsAt}
                  disabled={!canWrite}
                  onChange={(event) => set('endsAt', event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Enlem"
                htmlFor="event-lat"
                hint="Enlem ve boylam birlikte girilir ya da ikisi de boş kalır."
              >
                <Input
                  id="event-lat"
                  inputMode="decimal"
                  value={draft.latitude}
                  disabled={!canWrite}
                  onChange={(event) => set('latitude', event.target.value)}
                />
              </Field>
              <Field label="Boylam" htmlFor="event-lon">
                <Input
                  id="event-lon"
                  inputMode="decimal"
                  value={draft.longitude}
                  disabled={!canWrite}
                  onChange={(event) => set('longitude', event.target.value)}
                />
              </Field>
            </div>

            <Field label="Açıklama" htmlFor="event-description">
              <textarea
                id="event-description"
                rows={6}
                value={draft.description}
                disabled={!canWrite}
                onChange={(event) => set('description', event.target.value)}
                className="w-full rounded-card border border-border bg-surface-1 px-2.5 py-2 text-body-sm leading-relaxed text-foreground outline-none focus:border-primary"
              />
            </Field>

            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="label mb-1 text-muted-foreground">
                Özellikler
              </legend>
              {(
                [
                  ['free', 'Ücretsiz'],
                  ['camping', 'Kamp var'],
                  ['kidsFriendly', 'Çocuk dostu'],
                  ['astrophotoFocused', 'Astrofotoğraf odaklı'],
                  ['telescopesProvided', 'Teleskop sağlanıyor'],
                  ['organizerVerified', 'Düzenleyen doğrulanmış'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-body-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={draft[key]}
                    disabled={!canWrite}
                    onChange={(event) => set(key, event.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Kontenjan"
                htmlFor="event-capacity"
                hint="Boş bırakılırsa sınır yok."
              >
                <Input
                  id="event-capacity"
                  inputMode="numeric"
                  value={draft.capacity}
                  disabled={!canWrite}
                  onChange={(event) => set('capacity', event.target.value)}
                />
              </Field>
              <Field label="Düzenleyen" htmlFor="event-organizer">
                <Input
                  id="event-organizer"
                  value={draft.organizerName}
                  disabled={!canWrite}
                  onChange={(event) => set('organizerName', event.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Kaynak adı"
                htmlFor="event-source"
                hint="Tarih değişirse okuyucu kime bakacağını bilmeli."
              >
                <Input
                  id="event-source"
                  value={draft.sourceName}
                  disabled={!canWrite}
                  onChange={(event) => set('sourceName', event.target.value)}
                />
              </Field>
              <Field label="Son doğrulama" htmlFor="event-verified">
                <Input
                  id="event-verified"
                  type="date"
                  value={draft.sourceLastVerifiedAt}
                  disabled={!canWrite}
                  onChange={(event) =>
                    set('sourceLastVerifiedAt', event.target.value)
                  }
                />
              </Field>
            </div>

            <section className="rounded-card border border-border bg-surface-1 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="label text-foreground">Kayıt portalı</p>
                  <p className="mt-1 text-meta leading-snug text-muted-foreground">
                    Adminin açtığı Astrohub etkinliklerinde kullanıcı kayıtları
                    burada toplanır.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-body-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.registrationPortalEnabled}
                    disabled={!canWrite}
                    onChange={(event) =>
                      set('registrationPortalEnabled', event.target.checked)
                    }
                  />
                  Açık
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Portal etiketi" htmlFor="event-portal-label">
                  <Input
                    id="event-portal-label"
                    value={draft.registrationPortalLabel}
                    disabled={!canWrite || !draft.registrationPortalEnabled}
                    onChange={(event) =>
                      set('registrationPortalLabel', event.target.value)
                    }
                  />
                </Field>
                <Field
                  label="Kayıtlı kullanıcı"
                  htmlFor="event-registration-count"
                >
                  <Input
                    id="event-registration-count"
                    value={`${registrations.length} kayıt`}
                    disabled
                    readOnly
                  />
                </Field>
              </div>

              <Field
                label="Portal notu"
                htmlFor="event-portal-note"
                hint="Detay sayfasında kayıt düğmelerinin üstünde görünür."
              >
                <textarea
                  id="event-portal-note"
                  rows={3}
                  value={draft.registrationPortalNote}
                  disabled={!canWrite || !draft.registrationPortalEnabled}
                  onChange={(event) =>
                    set('registrationPortalNote', event.target.value)
                  }
                  className="w-full rounded-card border border-border bg-surface-2 px-2.5 py-2 text-body-sm leading-relaxed text-foreground outline-none focus:border-primary"
                />
              </Field>

              {registrationError && (
                <Alert variant="text" className="mt-2">
                  {registrationError}
                </Alert>
              )}

              {draft.id && (
                <div className="mt-3 border-t border-border pt-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="label text-muted-foreground">Kayıtlar</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void loadRegistrations(draft.id!)}
                    >
                      Yenile
                    </Button>
                  </div>

                  {registrations.length === 0 ? (
                    <p className="text-meta text-faint">
                      Bu etkinlik için henüz kayıt yok.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border overflow-hidden rounded-card border border-border">
                      {registrations.map((registration) => {
                        const name =
                          registration.displayName ||
                          registration.username ||
                          registration.userId;
                        return (
                          <li
                            key={registration.userId}
                            className="grid gap-1 bg-surface-2 px-3 py-2 text-body-sm"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-foreground">
                                {name}
                              </span>
                              <span className="tabular text-meta text-muted-foreground">
                                {new Date(
                                  registration.createdAt
                                ).toLocaleString('tr-TR', {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            {registration.note && (
                              <p className="text-meta leading-snug text-muted-foreground">
                                {registration.note}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </section>

            <Field
              label="Adres eki"
              htmlFor="event-slug"
              hint={
                draft.id
                  ? 'Değiştirmek eski bağlantıları kırar.'
                  : 'Boş bırakılırsa başlıktan üretilir.'
              }
            >
              <Input
                id="event-slug"
                value={draft.slug}
                disabled={!canWrite}
                onChange={(event) => set('slug', event.target.value)}
              />
            </Field>

            {problem && <Alert tone="warning">{problem}</Alert>}

            {canWrite && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || Boolean(problem)}
                  onClick={() => void save()}
                >
                  {busy ? 'Kaydediliyor…' : 'Kaydet'}
                </Button>
                {draft.id && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void toggleCancelled()}
                  >
                    {draft.cancelledAt ? 'İptali kaldır' : 'İptal işaretle'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
