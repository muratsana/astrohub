import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  AVATAR_MAX_ZOOM,
  AVATAR_MIN_ZOOM,
  DEFAULT_AVATAR_CROP,
  avatarCropAfterDrag,
  avatarCropAfterZoom,
  avatarSourceRect,
  avatarStageFit,
  renderAvatarBlob,
  type AvatarCrop,
} from '@/domain/profile/avatar';
import {
  profileAvatarUrl,
  removeProfileAvatar,
  uploadProfileAvatar,
  type Profile,
} from '@/services/content/profile';

/**
 * PROFİL FOTOĞRAFI — SEÇİM FOTOĞRAFIN ÜSTÜNDE YAPILIYOR.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KAYDIRICI YETMİYORDU
 *
 * Kadraj yalnızca üç kaydırıcıyla ayarlanıyordu ve tek görsel geri
 * bildirim 144 pikselik yuvarlak SONUÇ önizlemesiydi. Orada yalnızca
 * içeride kalan görünüyor; dışarıda ne bırakıldığı görünmüyor. "Yüzü
 * biraz sola al" gibi basit bir istek, kaydırıcıyı deneme yanılmayla
 * itmek demekti — hele dikey bir fotoğrafta hangi kaydırıcının işe
 * yaradığı bile belli değildi (kısa kenarda kadrajın gidecek yeri yok).
 *
 * Sahne bunu tersine çeviriyor: fotoğrafın TAMAMI duruyor, seçim
 * çerçevesi onun üstünde. Kullanıcı çerçeveyi parmağıyla/imleciyle
 * taşıyor, tekerlek ya da kıstırma ile alanı daraltıp genişletiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYDIRICILAR NEDEN DURUYOR
 *
 * Tuval sürüklemesi KLAVYEYLE yapılamaz. Kaydırıcıları kaldırmak,
 * fareyi kullanamayan herkesten profil fotoğrafı kadrajını almak
 * olurdu. İkisi aynı `AvatarCrop` durumuna yazıyor: hangisi
 * kullanılırsa diğeri anında onu gösteriyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KARE SEÇİM, DAİRE KILAVUZU
 *
 * Kaydedilen dosya KARE (`AVATAR_SIZE`), ama site fotoğrafı çoğu yerde
 * yuvarlak gösteriyor. Çerçevenin içine kesikli bir daire çiziliyor:
 * köşelerde kalanın kırpılacağını kullanıcı kaydetmeden önce görüyor.
 */

/** Sahnenin tuval içi çözünürlüğü; CSS boyutu esnek. */
const STAGE = 320;
/** Sürükleme için: bir tekerlek adımının FOV'a etkisi. */
const WHEEL_SENSITIVITY = 0.0016;
/*
 * GİRDİ İÇİN ÜST SINIR — 5 MB DEĞİL.
 *
 * Kayıt sınırı 5 MB ve 5 MB üstü dosyalar reddedilmiyor, yeniden
 * kodlanıp küçültülüyor. Ama bir sınır yine de gerekiyor: telefonla
 * çekilmiş 60 MB'lık ham bir kare `createImageBitmap` aşamasında
 * sekmeyi kilitliyor ve kullanıcı hata değil donma görüyor. 40 MB
 * makul her fotoğrafı içeriyor, kilitlenmeyi dışarıda bırakıyor.
 */
const MAX_INPUT_BYTES = 40 * 1024 * 1024;

interface Boyut {
  width: number;
  height: number;
}

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
  const [boyut, setBoyut] = useState<Boyut | null>(null);
  const [crop, setCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  /*
   * Sürükleme sırasında EN GÜNCEL kadraj gerekiyor. `crop` durumunu
   * olay işleyicisinin kapanışından okumak, iki `pointermove` arasında
   * React yeniden çizmediğinde eski değeri okumak demekti: hareket
   * "kayıyor" ve parmak fotoğraftan uzaklaşıyordu.
   */
  const cropRef = useRef<AvatarCrop>(DEFAULT_AVATAR_CROP);
  /** Etkin işaretçiler: bir tane sürükleme, iki tane kıstırma. */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<number | null>(null);

  const currentUrl = profileAvatarUrl(profile?.avatarPath);

  const updateCrop = useCallback(
    (next: AvatarCrop | ((prev: AvatarCrop) => AvatarCrop)) => {
      setCrop((prev) => {
        const value = typeof next === 'function' ? next(prev) : next;
        cropRef.current = value;
        return value;
      });
    },
    []
  );

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setBoyut(null);
      imageRef.current = null;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    updateCrop(DEFAULT_AVATAR_CROP);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, updateCrop]);

  useEffect(() => {
    if (!url) return;

    const image = new Image();
    image.onload = () => {
      imageRef.current = image;
      setBoyut({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => setError('Fotoğraf okunamadı.');
    image.src = url;
  }, [url]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !boyut) return;
    drawPreview(canvasRef.current, image, crop);
    drawStage(stageRef.current, image, crop);
  }, [crop, boyut]);

  /*
   * TEKERLEK YERLİ DİNLEYİCİYLE BAĞLANIYOR.
   *
   * React'in `onWheel`ı pasif dinleyici olarak eklenebiliyor ve pasif
   * dinleyicide `preventDefault` çalışmıyor: yakınlaştırmak isteyen
   * kullanıcı bunun yerine SAYFAYI kaydırırdı.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !boyut) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      updateCrop((prev) =>
        avatarCropAfterZoom(prev, Math.exp(-event.deltaY * WHEEL_SENSITIVITY))
      );
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [boyut, updateCrop]);

  /** CSS pikselini kaynak pikseline çeviriyor (sahne ölçeği + sığdırma). */
  function toSource(stage: HTMLCanvasElement, delta: number): number {
    const rect = stage.getBoundingClientRect();
    if (!boyut || rect.width === 0) return 0;
    const fit = avatarStageFit(boyut, STAGE);
    return (delta * (STAGE / rect.width)) / fit.scale;
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!boyut) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pinchRef.current = null;
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const pointers = pointersRef.current;
    const previous = pointers.get(event.pointerId);
    if (!previous || !boyut) return;

    const stage = event.currentTarget;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const mesafe = Math.hypot(a.x - b.x, a.y - b.y);
      const onceki = pinchRef.current;
      pinchRef.current = mesafe;
      if (onceki && onceki > 0 && mesafe > 0) {
        updateCrop((prev) => avatarCropAfterZoom(prev, mesafe / onceki));
      }
      return;
    }

    const dx = toSource(stage, event.clientX - previous.x);
    const dy = toSource(stage, event.clientY - previous.y);
    if (dx === 0 && dy === 0) return;
    updateCrop((prev) => avatarCropAfterDrag(boyut, prev, dx, dy));
  }

  function onPointerEnd(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

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
                if (next && next.size > MAX_INPUT_BYTES) {
                  setError(
                    'Fotoğraf 40 MB üstünde; tarayıcıda açılamıyor. Daha küçük bir kopya seçin.'
                  );
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
              <canvas
                ref={stageRef}
                width={STAGE}
                height={STAGE}
                aria-label="Kadraj alanı: çerçeveyi sürükleyerek taşıyın, tekerlek veya iki parmakla FOV ayarlayın"
                className="aspect-square w-full max-w-[20rem] cursor-move touch-none select-none rounded-card bg-surface-1"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onPointerLeave={onPointerEnd}
              />
              <p className="text-meta leading-snug text-muted-foreground">
                Çerçeveyi sürükleyerek istediğiniz alanı seçin; tekerlek ya da
                iki parmakla yakınlaştırın. Kesikli daire, fotoğrafın yuvarlak
                gösterildiği yerlerde görünecek kısmı işaretler. Klavye
                kullanıyorsanız aşağıdaki kaydırıcılar aynı işi yapar.
              </p>

              <AvatarRange
                label="FOV / Zoom"
                value={crop.zoom}
                min={AVATAR_MIN_ZOOM}
                max={AVATAR_MAX_ZOOM}
                step={0.01}
                onChange={(zoom) => updateCrop((v) => ({ ...v, zoom }))}
              />
              <AvatarRange
                label="Yatay kadraj"
                value={crop.panX}
                min={-1}
                max={1}
                step={0.01}
                onChange={(panX) => updateCrop((v) => ({ ...v, panX }))}
              />
              <AvatarRange
                label="Dikey kadraj"
                value={crop.panY}
                min={-1}
                max={1}
                step={0.01}
                onChange={(panY) => updateCrop((v) => ({ ...v, panY }))}
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
                  onClick={() => updateCrop(DEFAULT_AVATAR_CROP)}
                >
                  Kadrajı sıfırla
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

/**
 * Sahne: fotoğrafın tamamı + üstünde seçim çerçevesi.
 *
 * Dışarıda kalan alan KARARTILIYOR, silinmiyor. Kırpılan kısmı tamamen
 * gizlemek, kullanıcının "biraz yukarıda ne var" sorusunu yanıtsız
 * bırakırdı; kadrajı taşırken hedefi görmek gerekiyor.
 */
function drawStage(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement,
  crop: AvatarCrop
) {
  if (!canvas || image.naturalWidth === 0 || image.naturalHeight === 0) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const source = { width: image.naturalWidth, height: image.naturalHeight };
  const fit = avatarStageFit(source, canvas.width);
  const rect = avatarSourceRect(source, crop);

  const x = fit.offsetX + rect.x * fit.scale;
  const y = fit.offsetY + rect.y * fit.scale;
  const size = rect.size * fit.scale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    fit.offsetX,
    fit.offsetY,
    source.width * fit.scale,
    source.height * fit.scale
  );

  /* Çerçeve dışı karartma: dış dikdörtgen ve iç kare aynı yolda, çift
     kesişim kuralıyla iç kare boşta kalıyor. */
  context.save();
  context.fillStyle = 'rgba(3, 6, 15, 0.62)';
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.rect(x, y, size, size);
  context.fill('evenodd');
  context.restore();

  context.save();
  context.strokeStyle = 'rgba(125, 211, 252, 0.95)';
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, size - 2, size - 2);

  context.setLineDash([6, 5]);
  context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, Math.max(1, size / 2 - 2), 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
