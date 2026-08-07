import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useNavigate } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { DistrictSelect } from '@/components/ui/DistrictSelect';
import { Field } from '@/components/ui/Field';
import { Input, Select } from '@/components/ui/Input';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageMeta } from '@/components/seo/PageMeta';
import { useAuth } from '@/features/auth/AuthContext';
import { cities as turkeyCities } from '@/features/location/cities';
import {
  clubKindLabels,
  clubTopicLabels,
  clubTopicOrder,
  type ClubKind,
  type ClubTopic,
} from './data';
import {
  CLUB_PHOTO_MAX_BYTES,
  CLUB_PHOTO_MAX_EDGE,
  CLUB_PHOTO_LIMIT,
  createClubSubmission,
  validateClubDraft,
  type ClubDraft,
} from '@/services/clubs/submission';
import { formatBytes } from '@/domain/membership/quota';

type PhotoCrop = { zoom: number; x: number; y: number };
type PhotoItem = { id: string; file: File; crop: PhotoCrop };

const emptyCrop: PhotoCrop = { zoom: 1, x: 0, y: 0 };

function photoItem(file: File): PhotoItem {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 10)}`,
    file,
    crop: emptyCrop,
  };
}

function useObjectUrl(file: File): string {
  const [url, setUrl] = useState('');

  useEffect(() => {
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);

  return url;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Fotoğraf önizlenemedi.'));
    };
    image.src = url;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Fotoğraf kırpılamadı.')),
      'image/jpeg',
      0.88
    );
  });
}

async function cropPhoto(file: File, crop: PhotoCrop): Promise<File> {
  const image = await loadImage(file);
  const zoom = Math.max(1, Math.min(3, crop.zoom));
  const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const rangeX = (image.naturalWidth - side) / 2;
  const rangeY = (image.naturalHeight - side) / 2;
  const sx = (image.naturalWidth - side) / 2 + (crop.x / 100) * rangeX;
  const sy = (image.naturalHeight - side) / 2 + (crop.y / 100) * rangeY;
  const size = Math.min(CLUB_PHOTO_MAX_EDGE, Math.round(side));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Tarayıcı görsel işleme desteklemiyor.');
  ctx.drawImage(image, sx, sy, side, side, 0, 0, size, size);
  const blob = await canvasBlob(canvas);
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-kirpildi.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
}

function PhotoFrame({ item }: { item: PhotoItem }) {
  const url = useObjectUrl(item.file);

  return (
    <div className="relative aspect-square overflow-hidden rounded-card bg-background">
      {url && (
        <img
          src={url}
          alt={`${item.file.name} önizlemesi`}
          className="h-full w-full object-cover"
          style={{
            transform: `translate(${item.crop.x / 4}%, ${item.crop.y / 4}%) scale(${item.crop.zoom})`,
          }}
        />
      )}
    </div>
  );
}

function ClubPhotoPicker({
  items,
  onChange,
  onError,
}: {
  items: PhotoItem[];
  onChange: (items: PhotoItem[]) => void;
  onError: (message: string | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = items.find((item) => item.id === editingId) ?? null;
  const remaining = CLUB_PHOTO_LIMIT - items.length;

  function add(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;
    if (remaining <= 0) {
      onError(`En fazla ${CLUB_PHOTO_LIMIT} fotoğraf eklenebilir.`);
      return;
    }
    onError(null);
    onChange([...items, ...selected.slice(0, remaining).map(photoItem)]);
    if (selected.length > remaining) {
      onError(`İlk ${CLUB_PHOTO_LIMIT} fotoğraf alındı; fazlası eklenmedi.`);
    }
  }

  function updateCrop(id: string, crop: Partial<PhotoCrop>) {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, crop: { ...item.crop, ...crop } } : item
      )
    );
  }

  function promote(id: string) {
    const selected = items.find((item) => item.id === id);
    if (!selected) return;
    onChange([selected, ...items.filter((item) => item.id !== id)]);
  }

  async function applyCrop(item: PhotoItem) {
    try {
      const file = await cropPhoto(item.file, item.crop);
      onChange(
        items.map((candidate) =>
          candidate.id === item.id
            ? { ...candidate, file, crop: emptyCrop }
            : candidate
        )
      );
      setEditingId(null);
      onError(null);
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Fotoğraf kırpılamadı.');
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="club-photos"
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border bg-surface-2/40 px-4 py-8 text-center transition-colors hover:border-primary hover:bg-surface-2"
      >
        <span className="text-body-sm font-medium text-foreground">
          Fotoğraf ekle
        </span>
        <span className="max-w-md text-meta text-muted-foreground">
          Logo, afiş veya grup görseli yükleyin. En fazla {CLUB_PHOTO_LIMIT}{' '}
          görsel, dosya başına {formatBytes(CLUB_PHOTO_MAX_BYTES)}.
        </span>
      </label>
      <input
        id="club-photos"
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={add}
      />

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="rounded-card border border-border bg-surface-1 p-2"
            >
              <PhotoFrame item={item} />
              <div className="mt-2 min-w-0">
                <p className="truncate text-body-sm text-foreground">
                  {index === 0 ? 'Tanıtım fotoğrafı · ' : ''}
                  {item.file.name}
                </p>
                <p className="text-meta text-faint">
                  {formatBytes(item.file.size)}
                </p>
              </div>
              <div className="mt-2 flex gap-2">
                {index > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => promote(item.id)}
                  >
                    Tanıtım yap
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant={index > 0 ? 'ghost' : 'secondary'}
                  onClick={() =>
                    setEditingId(editingId === item.id ? null : item.id)
                  }
                >
                  Kırp / zoom
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onChange(
                      items.filter((candidate) => candidate.id !== item.id)
                    );
                    if (editingId === item.id) setEditingId(null);
                  }}
                >
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="grid gap-3 rounded-card border border-border bg-surface-2 p-3 sm:grid-cols-[180px_minmax(0,1fr)]">
          <PhotoFrame item={editing} />
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-meta text-muted-foreground">
                <span>Zoom</span>
                <span>{editing.crop.zoom.toFixed(1)}x</span>
              </div>
              <input
                className="w-full accent-primary"
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={editing.crop.zoom}
                onChange={(e) =>
                  updateCrop(editing.id, { zoom: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <div className="mb-1 text-meta text-muted-foreground">
                Yatay kaydır
              </div>
              <input
                className="w-full accent-primary"
                type="range"
                min="-100"
                max="100"
                value={editing.crop.x}
                onChange={(e) =>
                  updateCrop(editing.id, { x: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <div className="mb-1 text-meta text-muted-foreground">
                Dikey kaydır
              </div>
              <input
                className="w-full accent-primary"
                type="range"
                min="-100"
                max="100"
                value={editing.crop.y}
                onChange={(e) =>
                  updateCrop(editing.id, { y: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => applyCrop(editing)}
              >
                Kırpımı uygula
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => updateCrop(editing.id, emptyCrop)}
              >
                Sıfırla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function blankDraft(): ClubDraft {
  return {
    name: '',
    kind: 'dernek',
    city: 'İstanbul',
    foundedOn: '',
    place: '',
    topics: [],
    summary: '',
    contactEmail: '',
    website: '',
    socialUrl: '',
    whatsappUrl: '',
    publicEvents: true,
    sharedEquipment: false,
  };
}

export function NewClubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState<ClubDraft>(() => blankDraft());
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const photos = useMemo(
    () => photoItems.map((item) => item.file),
    [photoItems]
  );

  const problem = validateClubDraft(draft, photos);

  const set = <K extends keyof ClubDraft>(key: K, value: ClubDraft[K]) =>
    setDraft({ ...draft, [key]: value });

  function toggleTopic(topic: ClubTopic) {
    set(
      'topics',
      draft.topics.includes(topic)
        ? draft.topics.filter((t) => t !== topic)
        : [...draft.topics, topic]
    );
  }

  async function submit() {
    if (!user) {
      navigate('/giris');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createClubSubmission({ ...draft, userId: user.id, photos });
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Topluluk gönderilemedi');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageMeta
        title="Topluluğunu Ekle"
        description="Astronomi kulübünüzü veya gözlem topluluğunuzu Astrohub dizinine gönderin."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Topluluklar', to: '/topluluklar' },
            { label: 'Topluluğunu ekle' },
          ]}
          title="Topluluğunu Ekle"
          description="Gönderimler admin onayından sonra topluluk dizininde yayımlanır. Maksimum 3 logo, afiş veya grup fotoğrafı eklenebilir."
        />

        <Panel title={done ? 'Gönderim alındı' : 'Topluluk bilgileri'}>
          {done ? (
            <div className="space-y-3">
              <Alert>
                Topluluk kaydı admin onayına gönderildi. Onaylandıktan sonra
                topluluklar sayfasında görünecek.
              </Alert>
              <ButtonLink to="/topluluklar" variant="secondary">
                Topluluklara dön
              </ButtonLink>
            </div>
          ) : (
            <>
              {error && <Alert className="mb-3">{error}</Alert>}
              {!user && (
                <Alert className="mb-3">
                  Göndermek için giriş yapmanız gerekir. Formu
                  doldurabilirsiniz; gönderirken giriş sayfasına
                  yönlendirileceksiniz.
                </Alert>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Topluluk adı" htmlFor="club-name">
                  <Input
                    id="club-name"
                    value={draft.name}
                    onChange={(e) => set('name', e.target.value)}
                  />
                </Field>
                <Field label="Tür" htmlFor="club-kind">
                  <Select
                    id="club-kind"
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
                <Field label="İl" htmlFor="club-city">
                  <Select
                    id="club-city"
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
                <Field label="İlçe" htmlFor="club-district">
                  <DistrictSelect
                    id="club-district"
                    provinceName={draft.city}
                    value={draft.district ?? ''}
                    onChange={(v) => set('district', v)}
                  />
                </Field>
                <Field label="Kuruluş tarihi" htmlFor="club-founded">
                  <Input
                    id="club-founded"
                    type="date"
                    value={draft.foundedOn}
                    onChange={(e) => set('foundedOn', e.target.value)}
                  />
                </Field>
                <Field label="İletişim e-postası" htmlFor="club-email">
                  <Input
                    id="club-email"
                    type="email"
                    value={draft.contactEmail}
                    onChange={(e) => set('contactEmail', e.target.value)}
                  />
                </Field>
                <Field label="Web sayfası" htmlFor="club-web" hint="Opsiyonel">
                  <Input
                    id="club-web"
                    placeholder="https://..."
                    value={draft.website}
                    onChange={(e) => set('website', e.target.value)}
                  />
                </Field>
                <Field
                  label="Sosyal medya"
                  htmlFor="club-social"
                  hint="Opsiyonel"
                >
                  <Input
                    id="club-social"
                    placeholder="https://..."
                    value={draft.socialUrl}
                    onChange={(e) => set('socialUrl', e.target.value)}
                  />
                </Field>
                <Field
                  label="WhatsApp grubu"
                  htmlFor="club-whatsapp"
                  hint="Opsiyonel"
                >
                  <Input
                    id="club-whatsapp"
                    placeholder="https://chat.whatsapp.com/..."
                    value={draft.whatsappUrl}
                    onChange={(e) => set('whatsappUrl', e.target.value)}
                  />
                </Field>
                <Field
                  label="Logo / grup fotoğrafı"
                  htmlFor="club-photos"
                  hint={`En fazla ${CLUB_PHOTO_LIMIT} görsel · JPEG, PNG veya WebP`}
                >
                  <ClubPhotoPicker
                    items={photoItems}
                    onChange={setPhotoItems}
                    onError={setError}
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
                  <Field label="Açıklama" htmlFor="club-summary">
                    <textarea
                      id="club-summary"
                      value={draft.summary}
                      onChange={(e) => set('summary', e.target.value)}
                      className="min-h-32 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary focus:bg-surface-2"
                    />
                  </Field>
                </div>
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

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button disabled={busy || Boolean(problem)} onClick={submit}>
                  Onaya gönder
                </Button>
                <ButtonLink to="/topluluklar" variant="ghost">
                  Vazgeç
                </ButtonLink>
                {problem && (
                  <span className="text-meta text-warning">{problem}</span>
                )}
              </div>
            </>
          )}
        </Panel>
      </Container>
    </>
  );
}
