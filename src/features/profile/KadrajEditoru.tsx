import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import {
  EN_AZ_ZOOM,
  EN_COK_ZOOM,
  VARSAYILAN_KADRAJ,
  kaynakDikdortgen,
  renderKadrajBlob,
  sahneOturmasi,
  suruklediktenSonra,
  yakinlastiktanSonra,
  type HedefOlcu,
  type Kadraj,
} from '@/domain/profile/avatar';

/**
 * KADRAJ EDİTÖRÜ — AVATAR VE KAPAK İÇİN ORTAK.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN KAYDIRICI YETMİYORDU
 *
 * Kadraj yalnızca üç kaydırıcıyla ayarlanıyordu ve tek görsel geri
 * bildirim küçük SONUÇ önizlemesiydi. Orada yalnızca içeride kalan
 * görünüyor; dışarıda ne bırakıldığı görünmüyor. "Yüzü biraz sola al"
 * gibi basit bir istek, kaydırıcıyı deneme yanılmayla itmek demekti.
 *
 * Sahne bunu tersine çeviriyor: fotoğrafın TAMAMI duruyor, seçim
 * çerçevesi onun üstünde. Kullanıcı çerçeveyi parmağıyla taşıyor,
 * tekerlek ya da kıstırma ile alanı daraltıp genişletiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYDIRICILAR NEDEN DURUYOR
 *
 * Tuval sürüklemesi KLAVYEYLE yapılamaz. Kaydırıcıları kaldırmak,
 * fareyi kullanamayan herkesten kadrajı almak olurdu. İkisi aynı
 * duruma yazıyor: hangisi kullanılırsa diğeri anında onu gösteriyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TEK BİLEŞEN
 *
 * Avatar kare, kapak 3:1. Farkları yalnızca en-boy oranı ve hedef
 * ölçü. İki ayrı editör yazmak, kullanıcının aynı hareketi iki ayrı
 * kodda yaşaması demekti — birinde kenara dayanma düzeltilir,
 * diğerinde unutulurdu.
 */

/** Sahnenin tuval içi genişliği; yüksekliği en-boy oranından çıkıyor. */
const SAHNE_GENISLIK = 480;
/** Bir tekerlek adımının FOV'a etkisi. */
const TEKERLEK_HASSASIYETI = 0.0016;
/*
 * GİRDİ İÇİN ÜST SINIR — 5 MB DEĞİL.
 *
 * Kayıt sınırı 5 MB ve üstü reddedilmiyor, yeniden kodlanıp
 * küçültülüyor. Ama bir sınır yine de gerekiyor: telefonla çekilmiş
 * 60 MB'lık ham bir kare `createImageBitmap` aşamasında sekmeyi
 * kilitliyor ve kullanıcı hata değil DONMA görüyor.
 */
const EN_BUYUK_GIRDI = 40 * 1024 * 1024;

interface Boyut {
  width: number;
  height: number;
}

export function KadrajEditoru({
  baslik,
  aciklama,
  enBoy,
  hedef,
  mevcutUrl,
  onizlemeSinifi,
  secEtiketi,
  degistirEtiketi,
  kaydetEtiketi,
  silEtiketi,
  onKaydet,
  onSil,
  hazir,
}: {
  baslik: string;
  aciklama: string;
  enBoy: number;
  hedef: HedefOlcu;
  mevcutUrl: string | null;
  /** Küçük sonuç önizlemesinin çerçeve sınıfları (yuvarlak / geniş). */
  onizlemeSinifi: string;
  secEtiketi: string;
  degistirEtiketi: string;
  kaydetEtiketi: string;
  silEtiketi: string;
  onKaydet: (blob: Blob) => Promise<void>;
  onSil: (() => Promise<void>) | null;
  hazir: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [boyut, setBoyut] = useState<Boyut | null>(null);
  const [kadraj, setKadraj] = useState<Kadraj>(VARSAYILAN_KADRAJ);
  const [busy, setBusy] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const onizlemeRef = useRef<HTMLCanvasElement>(null);
  const sahneRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  /*
   * Sürükleme sırasında EN GÜNCEL kadraj gerekiyor. Durumu olay
   * işleyicisinin kapanışından okumak, iki `pointermove` arasında React
   * yeniden çizmediğinde eski değeri okumak demekti: hareket "kayıyor"
   * ve parmak fotoğraftan uzaklaşıyordu.
   */
  const kadrajRef = useRef<Kadraj>(VARSAYILAN_KADRAJ);
  const isaretciler = useRef(new Map<number, { x: number; y: number }>());
  const kistirma = useRef<number | null>(null);

  const sahneYukseklik = Math.round(SAHNE_GENISLIK / enBoy);

  const kadrajiYaz = useCallback(
    (sonraki: Kadraj | ((onceki: Kadraj) => Kadraj)) => {
      setKadraj((onceki) => {
        const deger =
          typeof sonraki === 'function' ? sonraki(onceki) : sonraki;
        kadrajRef.current = deger;
        return deger;
      });
    },
    []
  );

  useEffect(() => {
    if (!file) {
      setUrl(null);
      setBoyut(null);
      imgRef.current = null;
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    kadrajiYaz(VARSAYILAN_KADRAJ);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, kadrajiYaz]);

  useEffect(() => {
    if (!url) return;
    const image = new Image();
    image.onload = () => {
      imgRef.current = image;
      setBoyut({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => setHata('Fotoğraf okunamadı.');
    image.src = url;
  }, [url]);

  useEffect(() => {
    const image = imgRef.current;
    if (!image || !boyut) return;
    onizlemeCiz(onizlemeRef.current, image, kadraj, enBoy);
    sahneCiz(sahneRef.current, image, kadraj, enBoy);
  }, [kadraj, boyut, enBoy]);

  /*
   * TEKERLEK YERLİ DİNLEYİCİYLE. React'in `onWheel`ı pasif dinleyici
   * olarak eklenebiliyor ve pasif dinleyicide `preventDefault`
   * çalışmıyor: yakınlaştırmak isteyen kullanıcı bunun yerine SAYFAYI
   * kaydırırdı.
   */
  useEffect(() => {
    const sahne = sahneRef.current;
    if (!sahne || !boyut) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      kadrajiYaz((onceki) =>
        yakinlastiktanSonra(onceki, Math.exp(-event.deltaY * TEKERLEK_HASSASIYETI))
      );
    };
    sahne.addEventListener('wheel', onWheel, { passive: false });
    return () => sahne.removeEventListener('wheel', onWheel);
  }, [boyut, kadrajiYaz]);

  /** CSS pikselini kaynak pikseline çevirir. */
  function kaynagaCevir(sahne: HTMLCanvasElement, delta: number): number {
    const rect = sahne.getBoundingClientRect();
    if (!boyut || rect.width === 0) return 0;
    const oturma = sahneOturmasi(boyut, SAHNE_GENISLIK, sahneYukseklik);
    return (delta * (SAHNE_GENISLIK / rect.width)) / oturma.scale;
  }

  function isaretciBasti(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!boyut) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    isaretciler.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    kistirma.current = null;
  }

  function isaretciHareket(event: React.PointerEvent<HTMLCanvasElement>) {
    const kume = isaretciler.current;
    const onceki = kume.get(event.pointerId);
    if (!onceki || !boyut) return;
    const sahne = event.currentTarget;
    kume.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (kume.size >= 2) {
      const [a, b] = [...kume.values()];
      const mesafe = Math.hypot(a.x - b.x, a.y - b.y);
      const oncekiMesafe = kistirma.current;
      kistirma.current = mesafe;
      if (oncekiMesafe && oncekiMesafe > 0 && mesafe > 0) {
        kadrajiYaz((k) => yakinlastiktanSonra(k, mesafe / oncekiMesafe));
      }
      return;
    }

    const dx = kaynagaCevir(sahne, event.clientX - onceki.x);
    const dy = kaynagaCevir(sahne, event.clientY - onceki.y);
    if (dx === 0 && dy === 0) return;
    kadrajiYaz((k) => suruklediktenSonra(boyut, k, dx, dy, enBoy));
  }

  function isaretciBitti(event: React.PointerEvent<HTMLCanvasElement>) {
    isaretciler.current.delete(event.pointerId);
    kistirma.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function kaydet() {
    if (!file || !hazir) return;
    setBusy(true);
    setMesaj(null);
    setHata(null);
    try {
      const blob = await renderKadrajBlob(file, kadraj, hedef);
      await onKaydet(blob);
      setFile(null);
      setMesaj('Kaydedildi.');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function sil() {
    if (!onSil || !hazir) return;
    setBusy(true);
    setMesaj(null);
    setHata(null);
    try {
      await onSil();
      setMesaj('Silindi.');
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Silinemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title={baslik}>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <div
            className={`grid place-items-center overflow-hidden border border-border bg-surface-2 ${onizlemeSinifi}`}
          >
            {url ? (
              <canvas
                ref={onizlemeRef}
                width={hedef.width > 600 ? 480 : 180}
                height={
                  hedef.width > 600 ? Math.round(480 / enBoy) : Math.round(180 / enBoy)
                }
                aria-label={`${baslik} önizlemesi`}
                className="h-full w-full"
              />
            ) : mevcutUrl ? (
              <img
                src={mevcutUrl}
                alt={`Mevcut ${baslik.toLowerCase()}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="px-2 text-center text-meta text-muted-foreground">
                Görsel yok
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-card border border-border-strong px-3.5 text-meta font-medium leading-none text-foreground transition-colors hover:border-primary hover:text-primary">
              {mevcutUrl ? degistirEtiketi : secEtiketi}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={busy}
                onChange={(event) => {
                  const next = event.target.files?.[0] ?? null;
                  event.currentTarget.value = '';
                  setMesaj(null);
                  setHata(null);
                  if (next && !next.type.startsWith('image/')) {
                    setHata('JPEG, PNG veya WebP fotoğraf seçin.');
                    return;
                  }
                  if (next && next.size > EN_BUYUK_GIRDI) {
                    setHata(
                      'Fotoğraf 40 MB üstünde; tarayıcıda açılamıyor. Daha küçük bir kopya seçin.'
                    );
                    return;
                  }
                  setFile(next);
                }}
              />
            </label>

            {mevcutUrl && !url && onSil && (
              <Button
                size="sm"
                variant="danger"
                disabled={busy || !hazir}
                onClick={() => void sil()}
              >
                {busy ? 'Siliniyor…' : silEtiketi}
              </Button>
            )}
          </div>

          <p className="min-w-[14rem] flex-1 text-meta leading-relaxed text-muted-foreground">
            {aciklama}
          </p>
        </div>

        {url && (
          <div className="space-y-3 rounded-card border border-border bg-surface-2 p-3">
            <canvas
              ref={sahneRef}
              width={SAHNE_GENISLIK}
              height={sahneYukseklik}
              aria-label="Kadraj alanı: çerçeveyi sürükleyerek taşıyın, tekerlek veya iki parmakla FOV ayarlayın"
              className="w-full max-w-[30rem] cursor-move touch-none select-none rounded-card bg-surface-1"
              style={{ aspectRatio: `${SAHNE_GENISLIK} / ${sahneYukseklik}` }}
              onPointerDown={isaretciBasti}
              onPointerMove={isaretciHareket}
              onPointerUp={isaretciBitti}
              onPointerCancel={isaretciBitti}
              onPointerLeave={isaretciBitti}
            />
            <p className="text-meta leading-snug text-muted-foreground">
              Çerçeveyi sürükleyerek istediğiniz alanı seçin; tekerlek ya da iki
              parmakla yakınlaştırın. Klavye kullanıyorsanız aşağıdaki
              kaydırıcılar aynı işi yapar.
            </p>

            <KadrajKaydirici
              label="FOV / Zoom"
              value={kadraj.zoom}
              min={EN_AZ_ZOOM}
              max={EN_COK_ZOOM}
              step={0.01}
              onChange={(zoom) => kadrajiYaz((k) => ({ ...k, zoom }))}
            />
            <KadrajKaydirici
              label="Yatay kadraj"
              value={kadraj.panX}
              min={-1}
              max={1}
              step={0.01}
              onChange={(panX) => kadrajiYaz((k) => ({ ...k, panX }))}
            />
            <KadrajKaydirici
              label="Dikey kadraj"
              value={kadraj.panY}
              min={-1}
              max={1}
              step={0.01}
              onChange={(panY) => kadrajiYaz((k) => ({ ...k, panY }))}
            />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy || !hazir} onClick={() => void kaydet()}>
                {busy ? 'Kaydediliyor…' : kaydetEtiketi}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => kadrajiYaz(VARSAYILAN_KADRAJ)}
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

        {mesaj && <p className="text-meta text-success">{mesaj}</p>}
        {hata && <p className="text-meta text-danger">{hata}</p>}
      </div>
    </Panel>
  );
}

function KadrajKaydirici({
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

function onizlemeCiz(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement,
  kadraj: Kadraj,
  enBoy: number
) {
  if (!canvas || image.naturalWidth === 0) return;
  const context = canvas.getContext('2d');
  if (!context) return;
  const dik = kaynakDikdortgen(
    { width: image.naturalWidth, height: image.naturalHeight },
    kadraj,
    enBoy
  );
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    dik.x,
    dik.y,
    dik.width,
    dik.height,
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
function sahneCiz(
  canvas: HTMLCanvasElement | null,
  image: HTMLImageElement,
  kadraj: Kadraj,
  enBoy: number
) {
  if (!canvas || image.naturalWidth === 0) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const kaynak = { width: image.naturalWidth, height: image.naturalHeight };
  const oturma = sahneOturmasi(kaynak, canvas.width, canvas.height);
  const dik = kaynakDikdortgen(kaynak, kadraj, enBoy);

  const x = oturma.offsetX + dik.x * oturma.scale;
  const y = oturma.offsetY + dik.y * oturma.scale;
  const w = dik.width * oturma.scale;
  const h = dik.height * oturma.scale;

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    image,
    oturma.offsetX,
    oturma.offsetY,
    kaynak.width * oturma.scale,
    kaynak.height * oturma.scale
  );

  /* Çerçeve dışı karartma: dış dikdörtgen ve iç seçim aynı yolda, çift
     kesişim kuralıyla iç alan boşta kalıyor. */
  context.save();
  context.fillStyle = 'rgba(3, 6, 15, 0.62)';
  context.beginPath();
  context.rect(0, 0, canvas.width, canvas.height);
  context.rect(x, y, w, h);
  context.fill('evenodd');
  context.restore();

  context.save();
  context.strokeStyle = 'rgba(125, 211, 252, 0.95)';
  context.lineWidth = 2;
  context.strokeRect(x + 1, y + 1, w - 2, h - 2);

  /* Kare seçimde kesikli daire: site avatarı çoğu yerde yuvarlak
     gösteriyor ve köşede kalanın kırpılacağı kaydetmeden önce
     görünmeli. Geniş kadrajda böyle bir kırpma yok. */
  if (enBoy === 1) {
    context.setLineDash([6, 5]);
    context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    context.lineWidth = 1;
    context.beginPath();
    context.arc(x + w / 2, y + h / 2, Math.max(1, w / 2 - 2), 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
}
