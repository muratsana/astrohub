import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  TILE_SIZE,
  latToTileY,
  lngToTileX,
  panBy,
  pointToLatLng,
  tileRenderZoom,
  visibleTiles,
  type LatLng,
  type TilePlacement,
} from './tileMath';

/**
 * DÖŞEME HARİTASI — kaydırılabilir, yakınlaştırılabilir, çerçevesiz.
 *
 * Üçüncü tarafın `<iframe>`inin yerine geçti (gerekçe `tileMath.ts`
 * başında). Burada yalnızca sunum var: konumlandırma matematiği saf
 * modülde, döşeme kaynakları çağıran bileşende.
 *
 * KATMAN HATASI GİZLENMİYOR. Döşeme sunucuları düşebilir, adresleri
 * değişebilir. Kırık `<img>` sessizce boş kalırsa kullanıcı "burada ışık
 * kirliliği yok" diye okur — olmayan bir ölçüme güven vermek olur. Bu
 * yüzden yüklenemeyen döşemeler sayılıyor ve katmanın hiçbir parçası
 * gelmiyorsa çağıran bileşene bildiriliyor.
 */

export interface TileSource {
  /** Döşeme adresi üretir. */
  url: (tile: { x: number; y: number; z: number }) => string;
  /** Bu kaynağın ürettiği en yüksek yakınlaştırma; üstünde döşeme büyütülür. */
  maxZoom: number;
  /** Hata sayımını sıfırlamak için kimlik — kaynak değişince yeniden denenir. */
  id: string;
  /** Karışım kipi; gece ışıkları görüntüsü için `screen`. */
  blend?: 'screen';
}

export interface TileMapProps {
  center: LatLng;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onCenterChange: (center: LatLng) => void;
  onZoomChange: (zoom: number) => void;
  base: TileSource;
  overlay?: TileSource;
  /** Üst katman saydamlığı, 0–1. */
  overlayOpacity?: number;
  /** Üst katmanın hiçbir döşemesi yüklenemediğinde bir kez çağrılır. */
  onOverlayFailure?: () => void;
  /** Üst katmanın ilk döşemesi geldiğinde bir kez çağrılır. */
  onOverlayLoad?: () => void;
  /** Haritaya tıklanınca (sürükleme değil) o noktanın koordinatı. */
  onPick?: (point: LatLng) => void;
  /** Harita üzerine çizilen işaret (seçili şehir). */
  marker?: LatLng;
  /** Birden çok kayıt işareti; liste/etkinlik haritaları için. */
  markers?: Array<{
    id: string;
    point: LatLng;
    label: string;
    popup?: ReactNode;
    active?: boolean;
    color?: string;
    onSelect?: () => void;
  }>;
  className?: string;
  /** Erişilebilir ad — harita klavyeyle gezilebilir bir bölge. */
  label: string;
}

interface Size {
  width: number;
  height: number;
}

export function TileMap({
  center,
  zoom,
  minZoom,
  maxZoom,
  onCenterChange,
  onZoomChange,
  base,
  overlay,
  overlayOpacity = 1,
  onOverlayFailure,
  onOverlayLoad,
  onPick,
  marker,
  markers = [],
  className,
  label,
}: TileMapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  /* Tıklama ile sürükleme aynı olay çiftinden çıkıyor; toplam hareket
     eşiğin altındaysa kullanıcı bir yeri işaretlemek istemiştir. Eşik
     yoksa harita her kaydırmadan sonra rastgele bir nokta seçer. */
  const travelRef = useRef(0);

  /* Ölçü ResizeObserver'dan: harita tam ekrana geçebiliyor ve pencere
     genişliğine bakmak o durumda yanlış sonuç verir. */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const apply = () =>
      setSize({ width: el.clientWidth, height: el.clientHeight });
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ── Sürükleme ────────────────────────────────────────────────────── */

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
    travelRef.current = 0;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (dx === 0 && dy === 0) return;
    travelRef.current += Math.abs(dx) + Math.abs(dy);
    dragRef.current = { id: drag.id, x: event.clientX, y: event.clientY };
    onCenterChange(panBy(center, dx, dy, zoom));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);

    if (onPick && travelRef.current < 5 && size.width > 0) {
      const rect = event.currentTarget.getBoundingClientRect();
      onPick(
        pointToLatLng(
          center,
          zoom,
          size.width,
          size.height,
          event.clientX - rect.left,
          event.clientY - rect.top
        )
      );
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  /* ── Yakınlaştırma ────────────────────────────────────────────────── */

  /**
   * İmlecin altındaki noktayı sabit tutarak yakınlaştırır.
   *
   * Ortaya yakınlaştırmak, kullanıcının incelediği yeri ekrandan
   * kaydırıyor; harita gibi davranan bir yüzeyde bu bir arıza olarak
   * hissediliyor.
   */
  const zoomAt = useCallback(
    (delta: number, px?: number, py?: number) => {
      const next = Math.min(maxZoom, Math.max(minZoom, zoom + delta));
      if (next === zoom) return;
      if (px !== undefined && py !== undefined && size.width > 0) {
        const anchor = pointToLatLng(
          center,
          zoom,
          size.width,
          size.height,
          px,
          py
        );
        /* Yeni yakınlaştırmada aynı ekran noktası aynı yerde kalsın:
           merkez, çapadan ekran farkı kadar geri kaydırılıyor. */
        const dx = px - size.width / 2;
        const dy = py - size.height / 2;
        onCenterChange(panBy(anchor, dx, dy, next));
      }
      onZoomChange(next);
    },
    [center, maxZoom, minZoom, onCenterChange, onZoomChange, size, zoom]
  );

  /*
    Tekerlek haritayı imlecin altındaki noktaya göre yakınlaştırır.
    `passive: false` gerektiği için React'in `onWheel`'i değil doğrudan
    dinleyici kullanılıyor — React wheel olayını edilgen bağlar ve orada
    `preventDefault` sessizce yok sayılır.
  */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAt(
        event.deltaY < 0 ? 1 : -1,
        event.clientX - rect.left,
        event.clientY - rect.top
      );
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoomAt]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 200 : 80;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      onCenterChange(panBy(center, move[0], move[1], zoom));
      return;
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAt(1);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomAt(-1);
    }
  };

  const markerPoint = marker ? projectPoint(marker, center, zoom, size) : null;

  return (
    <div
      ref={boxRef}
      role="application"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        zoomAt(1, event.clientX - rect.left, event.clientY - rect.top);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        'relative select-none overflow-hidden bg-surface-2 outline-none',
        'focus-visible:ring-1 focus-visible:ring-primary',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className
      )}
      /* Dokunmatikte kaydırma haritanın: `pan-y` bırakmak dikey
         sürüklemeyi sayfaya verir ve harita yarım çalışır. */
      style={{ touchAction: 'none' }}
    >
      <Layer source={base} center={center} zoom={zoom} size={size} />
      {overlay ? (
        <Layer
          source={overlay}
          center={center}
          zoom={zoom}
          size={size}
          opacity={overlayOpacity}
          onAllFailed={onOverlayFailure}
          onFirstLoad={onOverlayLoad}
        />
      ) : null}

      {markerPoint ? (
        <span
          aria-hidden
          className="pointer-events-none absolute z-10 block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
          style={{ left: markerPoint.x, top: markerPoint.y }}
        />
      ) : null}

      {markers.map((item) => {
        const point = projectPoint(item.point, center, zoom, size);
        if (!point) return null;
        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={item.onSelect}
            className={cn(
              'group absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background transition-[width,height,background-color]',
              item.active
                ? 'h-4 w-4 bg-primary ring-2 ring-primary/40'
                : 'h-3 w-3 bg-cold hover:h-4 hover:w-4 hover:bg-primary'
            )}
            style={{ left: point.x, top: point.y, backgroundColor: item.color }}
          >
            {item.popup ? (
              <span className="pointer-events-none absolute bottom-5 left-1/2 hidden w-64 -translate-x-1/2 rounded-card border border-border bg-background/95 px-3 py-2 text-left shadow-card backdrop-blur-sm group-hover:block group-focus-visible:block">
                {item.popup}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Tek bir döşeme katmanı.
 *
 * KAYNAĞIN AZAMİ YAKINLAŞTIRMASININ ÜSTÜNDE döşeme kesilmez, büyütülür:
 * ışık kirliliği verisi belli bir çözünürlüğe kadar üretilmiş; daha
 * yakına gidildiğinde katmanı yok saymak, veri varken yokmuş gibi
 * göstermek olurdu. Büyütülen görüntü zaten uydu kestirimi olduğunu
 * belli ediyor.
 *
 * HATA SAYIMI KATMAN DÜZEYİNDE: tek bir döşemenin gelmemesi (sunucu
 * gürültüsü) normaldir, hiçbirinin gelmemesi kaynağın çalışmadığı
 * anlamına gelir. Ayrım yapılmazsa ya boş yere uyarı basılır ya da
 * tümüyle boş bir katman sessizce "temiz gökyüzü" gibi okunur.
 */
function Layer({
  source,
  center,
  zoom,
  size,
  opacity,
  onAllFailed,
  onFirstLoad,
}: {
  source: TileSource;
  center: LatLng;
  zoom: number;
  size: Size;
  opacity?: number;
  onAllFailed?: () => void;
  onFirstLoad?: () => void;
}) {
  const stats = useRef({ id: source.id, ok: 0, failed: 0, reported: false });
  if (stats.current.id !== source.id) {
    stats.current = { id: source.id, ok: 0, failed: 0, reported: false };
  }

  const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const z = tileRenderZoom(zoom, source.maxZoom, dpr);
  const tiles: TilePlacement[] = visibleTiles({
    center,
    zoom: z,
    width: size.width,
    height: size.height,
    tileSize: TILE_SIZE * 2 ** (zoom - z),
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        ...(opacity === undefined ? null : { opacity }),
        ...(source.blend ? { mixBlendMode: source.blend } : null),
      }}
    >
      {tiles.map((tile) => (
        <img
          key={`${source.id}:${tile.key}`}
          src={source.url(tile)}
          alt=""
          draggable={false}
          decoding="async"
          onLoad={(event) => {
            event.currentTarget.style.visibility = 'visible';
            stats.current.ok += 1;
            if (stats.current.ok === 1) onFirstLoad?.();
          }}
          onError={(event) => {
            /* Kırık görsel simgesi haritanın üstünde arıza gibi durur;
               döşeme yoksa hiç görünmemeli. */
            event.currentTarget.style.visibility = 'hidden';
            const s = stats.current;
            s.failed += 1;
            if (!s.reported && s.ok === 0 && s.failed >= 4) {
              s.reported = true;
              onAllFailed?.();
            }
          }}
          className="absolute max-w-none"
          style={{
            left: tile.left,
            top: tile.top,
            width: tile.size,
            height: tile.size,
          }}
        />
      ))}
    </div>
  );
}

/** İşaretin görünüm alanı içindeki pikseli; alan dışındaysa `null`. */
function projectPoint(
  point: LatLng,
  center: LatLng,
  zoom: number,
  size: Size
): { x: number; y: number } | null {
  if (!(size.width > 0)) return null;
  const count = 2 ** zoom;

  let dxTiles = lngToTileX(point.lng, zoom) - lngToTileX(center.lng, zoom);
  /* Tarih çizgisinin öbür yanındaki nokta için kısa yolu seç; yoksa
     işaret dünyanın karşı ucuna atlar. */
  if (dxTiles > count / 2) dxTiles -= count;
  if (dxTiles < -count / 2) dxTiles += count;

  const dyTiles = latToTileY(point.lat, zoom) - latToTileY(center.lat, zoom);

  const x = dxTiles * TILE_SIZE + size.width / 2;
  const y = dyTiles * TILE_SIZE + size.height / 2;
  if (x < -20 || y < -20 || x > size.width + 20 || y > size.height + 20) {
    return null;
  }
  return { x, y };
}
