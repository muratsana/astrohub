import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button, ExternalButtonLink } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import {
  fetchAllDistricts,
  type DistrictWithProvince,
} from '@/services/content/districts';
import {
  deleteAllskyCamera,
  fetchAllskyCameras,
  imageUrlFromAllskyPage,
  saveAllskyCamera,
  slugifyAllsky,
  validateAllskyCamera,
  type AllskyCameraInput,
} from '@/services/content/allsky';
import type { AllskyCamera } from '@/features/allsky/data';
import { allskyLocationSuggestions } from './allskyLocation';

const emptyDraft: AllskyCameraInput = {
  slug: '',
  title: '',
  pageUrl: '',
  imageUrl: '',
  location: '',
  owner: '',
  camera: '',
  lens: '',
  refreshSeconds: 15,
  position: 100,
  enabled: true,
  notes: '',
};

function toDraft(camera: AllskyCamera): AllskyCameraInput {
  return {
    id: camera.id,
    slug: camera.slug,
    title: camera.title,
    pageUrl: camera.pageUrl,
    imageUrl: camera.imageUrl,
    location: camera.location,
    owner: camera.owner,
    camera: camera.camera,
    lens: camera.lens,
    refreshSeconds: camera.refreshSeconds,
    position: camera.position,
    enabled: camera.enabled,
    notes: camera.notes,
  };
}

function AllskyLocationInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [items, setItems] = useState<DistrictWithProvince[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>(
    'idle'
  );
  const [open, setOpen] = useState(false);
  const loadStarted = useRef(false);

  const suggestions = useMemo(
    () => allskyLocationSuggestions(items, value),
    [items, value]
  );

  const loadLocations = useCallback(() => {
    if (loadStarted.current) return;
    loadStarted.current = true;
    setState('loading');
    fetchAllDistricts()
      .then((list) => {
        setItems(list);
        setState(list.length > 0 ? 'ready' : 'failed');
      })
      .catch(() => setState('failed'));
  }, []);

  return (
    <div className="relative">
      <Input
        id={id}
        type="search"
        autoComplete="off"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          loadLocations();
        }}
        onFocus={() => {
          setOpen(true);
          loadLocations();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        placeholder="İl ya da ilçe yazın"
      />

      {open ? (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 cursor-default"
        />
      ) : null}

      {open ? (
        <div className="absolute left-0 right-0 z-[var(--z-popover)] mt-1 overflow-hidden rounded-card border border-border-strong bg-surface-1 shadow-overlay">
          {state === 'failed' ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              Konum listesi yüklenemedi.
            </p>
          ) : value.trim() === '' ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              {state === 'loading'
                ? 'Konum listesi yükleniyor…'
                : 'İl ya da ilçe adı yazın.'}
            </p>
          ) : state === 'loading' ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              Konum listesi yükleniyor…
            </p>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-3 text-body-sm leading-relaxed text-muted-foreground">
              Eşleşen konum yok.
            </p>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {suggestions.map((suggestion) => (
                <li key={suggestion.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(suggestion.value);
                      setOpen(false);
                    }}
                    className="flex w-full items-baseline gap-2 border-b border-border px-3 py-2 text-left transition-colors last:border-0 hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-body-sm text-foreground">
                      {suggestion.districtName}
                    </span>
                    <span className="shrink-0 text-meta text-muted-foreground">
                      {suggestion.provinceName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AllskyControl({ canWrite }: { canWrite: boolean }) {
  const [items, setItems] = useState<AllskyCamera[] | null>(null);
  const [draft, setDraft] = useState<AllskyCameraInput>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchAllskyCameras({ includeDisabled: true })
      .then(setItems)
      .catch((err: unknown) =>
        setError(
          err instanceof Error ? err.message : 'Allsky kayıtları okunamadı'
        )
      );
  }, []);

  useEffect(load, [load]);

  function update<K extends keyof AllskyCameraInput>(
    key: K,
    value: AllskyCameraInput[K]
  ) {
    setDraft((current) => {
      const next = { ...current, [key]: value };
      if (key === 'title' && !current.slug.trim()) {
        next.slug = slugifyAllsky(String(value));
      }
      return next;
    });
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const problem = validateAllskyCamera(draft);
    if (problem) {
      setError(problem);
      return;
    }

    await run(async () => {
      await saveAllskyCamera(draft);
      setDraft(emptyDraft);
      setMessage('Allsky kaydı kaydedildi.');
    });
  }

  function inferImageUrl() {
    const nextUrl = imageUrlFromAllskyPage(draft.pageUrl);
    if (!nextUrl) {
      setError('Sayfa adresinden görüntü adresi üretilemedi.');
      return;
    }
    update('imageUrl', nextUrl);
    setError(null);
  }

  return (
    <div className="space-y-4">
      <Panel
        title="Allsky Kameraları"
        status={items ? `${items.length} kayıt` : 'okunuyor…'}
      >
        <p className="mb-4 max-w-3xl text-body-sm leading-relaxed text-muted-foreground">
          Navbar’daki Allsky sayfasında gösterilecek canlı kamera adresleri
          burada yönetilir. Public sayfa yalnızca aktif kayıtların canlı görüntü
          adresini çizer.
        </p>

        {error ? <Alert className="mb-3">{error}</Alert> : null}
        {message ? (
          <Alert tone="success" className="mb-3">
            {message}
          </Alert>
        ) : null}

        <div className="grid gap-3">
          {items === null ? (
            <p className="py-6 text-center text-meta text-muted-foreground">
              Kayıtlar yükleniyor…
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-card border border-border px-3 py-3 text-body-sm text-muted-foreground">
              Henüz Allsky kamerası tanımlı değil.
            </p>
          ) : (
            items.map((camera) => (
              <article
                key={camera.id}
                className="grid gap-3 rounded-card border border-border bg-background px-3 py-3 lg:grid-cols-[minmax(0,1fr)_14rem]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-body-sm font-semibold text-foreground">
                      {camera.title}
                    </h3>
                    <Badge tone={camera.enabled ? 'success' : 'warning'}>
                      {camera.enabled ? 'Aktif' : 'Kapalı'}
                    </Badge>
                    <Badge>{camera.refreshSeconds} sn</Badge>
                  </div>
                  <p className="mt-1 truncate text-meta text-muted-foreground">
                    {camera.location || 'Konum yok'} ·{' '}
                    {camera.owner || 'Sahip yok'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
                  <ExternalButtonLink
                    href={camera.pageUrl}
                    variant="secondary"
                    size="sm"
                  >
                    Kaynak
                  </ExternalButtonLink>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setDraft(toDraft(camera))}
                  >
                    Düzenle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={!canWrite || busy}
                    onClick={() =>
                      run(async () => {
                        await deleteAllskyCamera(camera.id);
                        setMessage('Allsky kaydı silindi.');
                      })
                    }
                  >
                    Sil
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel
        title={draft.id ? 'Allsky Kaydını Düzenle' : 'Allsky Kaydı Ekle'}
        status={canWrite ? 'admin' : 'salt okunur'}
      >
        <fieldset disabled={!canWrite || busy} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Başlık" htmlFor="allsky-title">
              <Input
                id="allsky-title"
                value={draft.title}
                onChange={(event) => update('title', event.target.value)}
                placeholder="Ozdens ALLSKY CAM"
              />
            </Field>
            <Field label="Slug" htmlFor="allsky-slug">
              <Input
                id="allsky-slug"
                value={draft.slug}
                onChange={(event) => update('slug', event.target.value)}
                placeholder="ozdens-beypazari"
              />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <Field label="Sayfa adresi" htmlFor="allsky-page-url">
              <Input
                id="allsky-page-url"
                value={draft.pageUrl}
                onChange={(event) => update('pageUrl', event.target.value)}
                placeholder="https://example.com/allsky/index.php"
              />
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={inferImageUrl}
              >
                Görüntüyü tahmin et
              </Button>
            </div>
          </div>

          <Field label="Canlı görüntü adresi" htmlFor="allsky-image-url">
            <Input
              id="allsky-image-url"
              value={draft.imageUrl}
              onChange={(event) => update('imageUrl', event.target.value)}
              placeholder="https://example.com/allsky/image.jpg"
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Konum" htmlFor="allsky-location">
              <AllskyLocationInput
                id="allsky-location"
                value={draft.location}
                onChange={(value) => update('location', value)}
              />
            </Field>
            <Field label="Sahip" htmlFor="allsky-owner">
              <Input
                id="allsky-owner"
                value={draft.owner}
                onChange={(event) => update('owner', event.target.value)}
                placeholder="Emre OZDEN"
              />
            </Field>
            <Field label="Kamera" htmlFor="allsky-camera">
              <Input
                id="allsky-camera"
                value={draft.camera}
                onChange={(event) => update('camera', event.target.value)}
                placeholder="ZWOASI676MC"
              />
            </Field>
            <Field label="Lens" htmlFor="allsky-lens">
              <Input
                id="allsky-lens"
                value={draft.lens}
                onChange={(event) => update('lens', event.target.value)}
                placeholder="2.1 mm"
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-[10rem_10rem_minmax(0,1fr)]">
            <Field label="Yenileme" htmlFor="allsky-refresh">
              <Input
                id="allsky-refresh"
                type="number"
                min={5}
                value={draft.refreshSeconds}
                onChange={(event) =>
                  update('refreshSeconds', Number(event.target.value))
                }
              />
            </Field>
            <Field label="Sıra" htmlFor="allsky-position">
              <Input
                id="allsky-position"
                type="number"
                min={1}
                value={draft.position}
                onChange={(event) =>
                  update('position', Number(event.target.value))
                }
              />
            </Field>
            <label className="flex items-end gap-2 pb-2 text-body-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(event) => update('enabled', event.target.checked)}
              />
              Aktif olarak yayınla
            </label>
          </div>

          <Field label="Not" htmlFor="allsky-notes">
            <textarea
              id="allsky-notes"
              value={draft.notes}
              onChange={(event) => update('notes', event.target.value)}
              rows={3}
              className="w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
              placeholder="Kısa açıklama"
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <SpecList className="max-w-md">
              <SpecRow
                label="Yayın"
                value={draft.enabled ? 'Aktif' : 'Kapalı'}
              />
              <SpecRow
                label="Görüntü"
                value={draft.imageUrl ? 'Tanımlı' : 'Eksik'}
                tone={draft.imageUrl ? 'cold' : 'muted'}
              />
            </SpecList>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setDraft(emptyDraft)}
              >
                Temizle
              </Button>
              <Button type="button" disabled={busy} onClick={submit}>
                Kaydet
              </Button>
            </div>
          </div>
        </fieldset>
      </Panel>
    </div>
  );
}
