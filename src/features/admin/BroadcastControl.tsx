import { useCallback, useEffect, useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import {
  broadcastKindLabels,
  type BroadcastKind,
  type YoutubeRef,
} from '@/features/tv/types';
import {
  fetchBroadcasts,
  createBroadcast,
  validateBroadcast,
  setBroadcastPublished,
  setLive,
  endLive,
  deleteBroadcast,
  fetchTracks,
  createTrack,
  validateTrack,
  validateTrackIdentity,
  updateTrackIdentity,
  setTrackPublished,
  deleteRadioTrackWithFile,
  saveTrackOrder,
  type AdminBroadcast,
  type AdminTrack,
} from './broadcastAdmin';
import { Alert } from '@/components/ui/Alert';
import { RadioVault } from './RadioVault';

/**
 * TV VE RADYO KONTROL MODÜLLERİ.
 *
 * İkisi de aynı deseni izliyor: listele, ekle, yayına al/indir, sil.
 * Ortak bir "kaynak yöneticisi" soyutlaması **yazılmadı** — iki listenin
 * alanları ve eylemleri farklı (TV'de canlıya alma, radyoda yol/bağlantı
 * ayrımı) ve o farkları tek bileşende parametreleştirmek, iki basit
 * listeyi tek karmaşık listeye çevirirdi.
 *
 * YAYINA ALMA İKİ ADIMDIR. Kayıt eklenince otomatik yayına girmez;
 * `published` ayrı bir eylemdir. Yanlış bir YouTube kimliğiyle kaydedilen
 * bir yayının anında ana sayfada belirmesi, düzeltmek için geçen sürede
 * izleyiciye kırık bir oynatıcı göstermek demekti.
 */
export function BroadcastControl() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TvControl />
      <RadioControl />
    </div>
  );
}

/* ══════════════════════════════ TV ══════════════════════════════ */

function TvControl() {
  const [items, setItems] = useState<AdminBroadcast[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [refKind, setRefKind] = useState<YoutubeRef>('video');
  const [youtubeId, setYoutubeId] = useState('');
  const [kind, setKind] = useState<BroadcastKind>('scheduled');
  const [startsAt, setStartsAt] = useState('');

  const load = useCallback(() => {
    setError(null);
    fetchBroadcasts()
      .then(setItems)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Program okunamadı')
      );
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const input = {
      slug: slug.trim(),
      title: title.trim(),
      description: '',
      kind,
      refKind,
      youtubeId: youtubeId.trim(),
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
    };

    const problem = validateBroadcast(input);
    if (problem) {
      setError(problem);
      return;
    }

    await run(async () => {
      await createBroadcast(input);
      setSlug('');
      setTitle('');
      setYoutubeId('');
      setStartsAt('');
      setOpen(false);
    });
  }

  return (
    <Panel
      title="TV Kontrolü"
      status={items ? `${items.length} kayıt` : 'okunuyor…'}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Yayın YouTube üzerinden dağıtılır; burada yalnızca kimlik ve program
        tutulur. Tam adres istenmez — gömme adresi kodda kurulur, böylece bu
        alan oynatıcıyı başka bir siteye çeviremez.
      </p>

      {error && <Alert className="mb-3">{error}</Alert>}

      {items && items.length > 0 && (
        <ul className="mb-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-b border-border py-2 last:border-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={item.kind === 'live' ? 'primary' : 'muted'}>
                  {broadcastKindLabels[item.kind]}
                </Badge>
                {!item.published && <Badge tone="warning">Taslak</Badge>}
                <span className="min-w-0 flex-1 truncate text-meta text-foreground">
                  {item.title}
                </span>
              </div>

              <p className="tabular mt-0.5 text-meta text-faint">
                {item.refKind === 'channel' ? 'kanal' : 'video'} ·{' '}
                {item.youtubeId}
              </p>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.kind === 'live' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void run(() => endLive(item.id))}
                  >
                    Yayını bitir
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => setLive(item.id))}
                  >
                    Canlıya al
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    void run(() =>
                      setBroadcastPublished(item.id, !item.published)
                    )
                  }
                >
                  {item.published ? 'Yayından indir' : 'Yayına al'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => void run(() => deleteBroadcast(item.id))}
                >
                  Sil
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && (
        <p className="mb-3 py-4 text-center text-body-sm text-muted-foreground">
          Program boş. İlk yayını aşağıdan ekleyin.
        </p>
      )}

      {open ? (
        <div className="space-y-2 rounded-card border border-border bg-surface-2 p-3">
          <Field label="Kısa ad" id="tv-slug">
            <Input
              id="tv-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="perseid-gecesi"
              className="h-8 text-meta"
            />
          </Field>

          <Field label="Başlık" id="tv-title">
            <Input
              id="tv-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-meta"
            />
          </Field>

          <Field label="Kaynak" id="tv-ref">
            <Select
              id="tv-ref"
              value={refKind}
              onChange={(e) => setRefKind(e.target.value as YoutubeRef)}
              className="h-8 text-meta"
            >
              <option value="video">Video (izleme adresindeki v=)</option>
              <option value="channel">Kanal (UC… ile başlar)</option>
            </Select>
          </Field>

          <Field label="YouTube kimliği" id="tv-id">
            <Input
              id="tv-id"
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              placeholder={refKind === 'video' ? 'dQw4w9WgXcQ' : 'UC…'}
              className="h-8 text-meta"
            />
          </Field>

          <Field label="Tür" id="tv-kind">
            <Select
              id="tv-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as BroadcastKind)}
              className="h-8 text-meta"
            >
              <option value="scheduled">Programda</option>
              <option value="archive">Arşiv</option>
            </Select>
          </Field>

          <Field label="Başlangıç (isteğe bağlı)" id="tv-start">
            <Input
              id="tv-start"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-8 text-meta"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button size="sm" disabled={busy} onClick={() => void submit()}>
              Kaydet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </div>

          <p className="text-meta leading-snug text-faint">
            Kayıt taslak olarak eklenir. Yayına almak ayrı bir adımdır — yanlış
            bir kimlik anında izleyiciye kırık oynatıcı göstermesin.
          </p>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Yayın ekle
        </Button>
      )}
    </Panel>
  );
}

/* ══════════════════════════════ RADYO ══════════════════════════════ */

function RadioControl() {
  const [items, setItems] = useState<AdminTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [source, setSource] = useState<'mp3' | 'spotify'>('mp3');
  const [path, setPath] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    title: string;
    artist: string;
  } | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchTracks()
      .then(setItems)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Liste okunamadı')
      );
  }, []);

  useEffect(load, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem uygulanamadı');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    const input = { title, artist, source, path, note: '' };
    const problem = validateTrack(input);
    if (problem) {
      setError(problem);
      return;
    }

    await run(async () => {
      await createTrack(input);
      setTitle('');
      setArtist('');
      setPath('');
      setOpen(false);
    });
  }

  async function saveIdentity(trackId: string) {
    if (!editing || editing.id !== trackId) return;
    const input = {
      title: editing.title,
      artist: editing.artist,
    };
    const problem = validateTrackIdentity(input);
    if (problem) {
      setError(problem);
      return;
    }

    await run(async () => {
      await updateTrackIdentity(trackId, input);
      setEditing(null);
    });
  }

  async function reorder(fromId: string, toId: string) {
    if (!items || fromId === toId || busy) return;
    const from = items.findIndex((item) => item.id === fromId);
    const to = items.findIndex((item) => item.id === toId);
    if (from < 0 || to < 0) return;
    const previous = items;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setItems(next);
    setBusy(true);
    setError(null);
    try {
      await saveTrackOrder(next.map((item) => item.id));
    } catch (reason) {
      setItems(previous);
      setError(reason instanceof Error ? reason.message : 'Sıra kaydedilemedi');
    } finally {
      setBusy(false);
      setDragging(null);
    }
  }

  function moveBy(trackId: string, delta: -1 | 1) {
    if (!items) return;
    const index = items.findIndex((item) => item.id === trackId);
    const target = items[index + delta];
    if (target) void reorder(trackId, target.id);
  }

  return (
    <Panel
      title="Radyo Kontrolü"
      status={items ? `${items.length} kayıt` : 'okunuyor…'}
    >
      <p className="mb-3 text-meta leading-relaxed text-muted-foreground">
        Radyo sitenin kendi yayınıdır; listeyi editör hazırlar. Yayın kesintisiz
        döngüde çalar — son parça bitince baştan başlar.
      </p>

      {/* Kasa: dosyalar buradan yükleniyor, yol elle yazılmıyor. */}
      <div className="mb-4">
        <RadioVault onUploaded={load} />
      </div>

      {error && <Alert className="mb-3">{error}</Alert>}

      {items && items.length > 0 && (
        <ul className="mb-3">
          {items.map((track) => (
            <li
              key={track.id}
              draggable={!busy && editing?.id !== track.id}
              onDragStart={() => setDragging(track.id)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dragging && void reorder(dragging, track.id)}
              onKeyDown={(event) => {
                if (!event.altKey) return;
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  moveBy(track.id, -1);
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  moveBy(track.id, 1);
                }
              }}
              tabIndex={0}
              className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
            >
              <span
                aria-label="Sürükleyerek sırala; klavyede Alt ve ok tuşlarını kullan"
                title="Sürükle veya Alt+↑/↓"
                className="cursor-grab select-none text-muted-foreground"
              >
                ⠿
              </span>
              <span className="tabular w-5 text-center text-meta text-faint">
                {(items?.findIndex((item) => item.id === track.id) ?? 0) + 1}
              </span>
              <Badge tone={track.source === 'spotify' ? 'cold' : 'muted'}>
                {track.source === 'spotify' ? 'Spotify' : 'MP3'}
              </Badge>
              {!track.published && <Badge tone="warning">Taslak</Badge>}

              {editing?.id === track.id ? (
                <>
                  <div className="grid min-w-[14rem] flex-1 gap-1.5 sm:grid-cols-2">
                    <Input
                      aria-label="Parça adı"
                      value={editing.title}
                      onChange={(event) =>
                        setEditing((current) =>
                          current?.id === track.id
                            ? { ...current, title: event.target.value }
                            : current
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveIdentity(track.id);
                        }
                        if (event.key === 'Escape') setEditing(null);
                      }}
                      className="h-8 text-meta"
                    />
                    <Input
                      aria-label="Sanatçı"
                      placeholder="Sanatçı"
                      value={editing.artist}
                      onChange={(event) =>
                        setEditing((current) =>
                          current?.id === track.id
                            ? { ...current, artist: event.target.value }
                            : current
                        )
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveIdentity(track.id);
                        }
                        if (event.key === 'Escape') setEditing(null);
                      }}
                      className="h-8 text-meta"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void saveIdentity(track.id)}
                  >
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setEditing(null)}
                  >
                    Vazgeç
                  </Button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-meta text-foreground">
                    {track.title}
                    <span className="text-muted-foreground">
                      {' '}
                      · {track.artist || 'Bilinmiyor'}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      setEditing({
                        id: track.id,
                        title: track.title,
                        artist: track.artist || '',
                      })
                    }
                  >
                    Düzenle
                  </Button>
                </>
              )}

              <Button
                aria-label={`${track.title} parçasını yukarı taşı`}
                title="Yukarı taşı"
                size="sm"
                variant="ghost"
                disabled={busy || items[0]?.id === track.id}
                onClick={() => moveBy(track.id, -1)}
              >
                ↑
              </Button>
              <Button
                aria-label={`${track.title} parçasını aşağı taşı`}
                title="Aşağı taşı"
                size="sm"
                variant="ghost"
                disabled={busy || items[items.length - 1]?.id === track.id}
                onClick={() => moveBy(track.id, 1)}
              >
                ↓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(() => setTrackPublished(track.id, !track.published))
                }
              >
                {track.published ? 'İndir' : 'Yayına al'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    deleteRadioTrackWithFile(track.id, track.source, track.path)
                  )
                }
              >
                Sil
              </Button>
            </li>
          ))}
        </ul>
      )}

      {items && items.length === 0 && (
        <p className="mb-3 py-4 text-center text-body-sm text-muted-foreground">
          Çalma listesi boş.
        </p>
      )}

      {open ? (
        <div className="space-y-2 rounded-card border border-border bg-surface-2 p-3">
          <Field label="Başlık" id="radio-title">
            <Input
              id="radio-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-meta"
            />
          </Field>

          <Field label="Sanatçı" id="radio-artist">
            <Input
              id="radio-artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="h-8 text-meta"
            />
          </Field>

          <Field label="Kaynak" id="radio-source">
            <Select
              id="radio-source"
              value={source}
              onChange={(e) => setSource(e.target.value as 'mp3' | 'spotify')}
              className="h-8 text-meta"
            >
              <option value="mp3">MP3 (radio bucket'ındaki yol)</option>
              <option value="spotify">Spotify bağlantısı</option>
            </Select>
          </Field>

          <Field
            label={source === 'mp3' ? 'Dosya yolu' : 'Spotify bağlantısı'}
            id="radio-path"
          >
            <Input
              id="radio-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder={
                source === 'mp3'
                  ? 'gece/nocturne.mp3'
                  : 'https://open.spotify.com/track/…'
              }
              className="h-8 text-meta"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button size="sm" disabled={busy} onClick={() => void submit()}>
              Kaydet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          Parça ekle
        </Button>
      )}
    </Panel>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label mb-0.5 block">
        {label}
      </label>
      {children}
    </div>
  );
}
