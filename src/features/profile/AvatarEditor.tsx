import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  DEFAULT_AVATAR_CROP,
  avatarSourceRect,
  renderAvatarBlob,
  type AvatarCrop,
} from '@/domain/profile/avatar';
import {
  profileAvatarUrl,
  removeProfileAvatar,
  uploadProfileAvatar,
  type Profile,
} from '@/services/content/profile';

export function AvatarEditor({
  userId,
  profile,
  onDone,
}: {
  userId: string | undefined;
  profile: Profile | null;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const currentUrl = profileAvatarUrl(profile?.avatarPath);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      imageRef.current = null;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    setCrop(DEFAULT_AVATAR_CROP);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    if (!url) return;

    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      drawPreview(canvasRef.current, image, DEFAULT_AVATAR_CROP);
    };
    image.onerror = () => setError('Fotoğraf okunamadı.');
    image.src = url;
  }, [url]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    drawPreview(canvasRef.current, image, crop);
  }, [crop]);

  async function saveAvatar() {
    if (!userId || !file) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const blob = await renderAvatarBlob(file, crop);
      await uploadProfileAvatar(userId, blob, profile?.avatarPath);
      setFile(null);
      onDone();
      setMessage('Profil fotoğrafı güncellendi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil fotoğrafı kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    if (!userId || !profile?.avatarPath) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await removeProfileAvatar(userId, profile.avatarPath);
      onDone();
      setMessage('Profil fotoğrafı silindi.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Profil fotoğrafı silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Profil fotoğrafı">
      <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
        <div className="flex flex-col items-start gap-2">
          <div className="grid h-36 w-36 place-items-center overflow-hidden rounded-full border border-border bg-surface-2">
            {url ? (
              <canvas
                ref={canvasRef}
                width={180}
                height={180}
                aria-label="Profil fotoğrafı önizlemesi"
                className="h-full w-full"
              />
            ) : currentUrl ? (
              <img
                src={currentUrl}
                alt="Mevcut profil fotoğrafı"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-center text-meta text-muted-foreground">
                Fotoğraf yok
              </span>
            )}
          </div>

          <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-card border border-border-strong px-3.5 text-meta font-medium leading-none text-foreground transition-colors hover:border-primary hover:text-primary">
            {currentUrl ? 'Fotoğraf değiştir' : 'Fotoğraf seç'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                event.currentTarget.value = '';
                setMessage(null);
                setError(null);
                if (next && !next.type.startsWith('image/')) {
                  setError('JPEG, PNG veya WebP fotoğraf seçin.');
                  return;
                }
                setFile(next);
              }}
            />
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-meta leading-relaxed text-muted-foreground">
            Fotoğraf kare profil görseline kırpılır. Büyük dosyalar yükleme
            öncesi otomatik optimize edilir; kaydedilen dosya 5 MB sınırını
            geçemez.
          </p>

          {url && (
            <div className="space-y-3 rounded-card border border-border bg-surface-2 p-3">
              <AvatarRange
                label="FOV / Zoom"
                value={crop.zoom}
                min={1}
                max={4}
                step={0.01}
                onChange={(zoom) => setCrop((v) => ({ ...v, zoom }))}
              />
              <AvatarRange
                label="Yatay kadraj"
                value={crop.panX}
                min={-1}
                max={1}
                step={0.01}
                onChange={(panX) => setCrop((v) => ({ ...v, panX }))}
              />
              <AvatarRange
                label="Dikey kadraj"
                value={crop.panY}
                min={-1}
                max={1}
                step={0.01}
                onChange={(panY) => setCrop((v) => ({ ...v, panY }))}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={busy || !userId}
                  onClick={() => void saveAvatar()}
                >
                  {busy ? 'Kaydediliyor…' : 'Profil fotoğrafı yap'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => setFile(null)}
                >
                  Vazgeç
                </Button>
              </div>
            </div>
          )}

          {currentUrl && !url && (
            <Button
              size="sm"
              variant="danger"
              disabled={busy || !userId}
              onClick={() => void removeAvatar()}
            >
              {busy ? 'Siliniyor…' : 'Fotoğrafı sil'}
            </Button>
          )}

          {message && <p className="text-meta text-success">{message}</p>}
          {error && <p className="text-meta text-danger">{error}</p>}
        </div>
      </div>
    </Panel>
  );
}

function AvatarRange({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1 text-meta">
      <span className="flex items-center justify-between gap-3 text-muted-foreground">
        {label}
        <span className="tabular text-foreground">
          {label.startsWith('FOV') ? `${value.toFixed(2)}×` : value.toFixed(2)}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

function drawPreview(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement,
  crop: AvatarCrop
) {
  if (!canvas || image.naturalWidth === 0 || image.naturalHeight === 0) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const rect = avatarSourceRect(
    { width: image.naturalWidth, height: image.naturalHeight },
    crop
  );
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.size,
    rect.size,
    0,
    0,
    canvas.width,
    canvas.height
  );
}
