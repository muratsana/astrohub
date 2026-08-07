import { useEffect, useMemo, useRef, useState } from 'react';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { CloseIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import {
  cozumGeometrisi,
  useAlandakiCisimler,
} from '@/services/content/fieldObjects';
import type { AstroPhoto } from './types';

/**
 * FOTOĞRAF GÖRÜNTÜLEYİCİ — detay sayfasının üst bloğu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAPANAN HATA: DETAY SAYFASI FOTOĞRAFI HİÇ GÖSTERMİYORDU
 *
 * Sayfa her kayıt için `PhotoPlaceholder`ı gradyanla çiziyor ve
 * `photo.image.url` alanına hiç bakmıyordu. Yani galeri kartında gerçek
 * fotoğraf görünüyor, tıklayınca açılan DETAY sayfasında yer tutucu
 * gradyan çıkıyordu — kullanıcının yüklediği kare sitede hiçbir yerde
 * tam boy görünmüyordu.
 *
 * Köşedeki "Tam çözünürlük Faz 1.2'de (görsel pipeline)" rozeti bunu
 * bir eksiklik gibi göstererek gizliyordu; oysa boru hattı çalışıyordu,
 * yalnızca bu sayfa ondan haberdar değildi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "TAM ÇÖZÜNÜRLÜK" NE DEMEK — DÜRÜST OLMAK ZORUNDA
 *
 * Yayımlanan kopya en uzun kenarı 2048 px olan gösterim kopyası
 * (`DISPLAY_MAX_EDGE`). Kullanıcının yüklediği ham dosya gizli
 * bucket'ta duruyor ve yalnızca sahibi erişiyor (§15.3, 0012).
 *
 * Bu yüzden büyüteç "orijinali göster" demiyor; kopyanın GERÇEK piksel
 * ölçüsünü yazıyor ve o ölçüde açıyor. Ölçü bilinmiyorsa (0035 öncesi
 * satırlar) yakınlaştırma hiç sunulmuyor: bulanık bir büyütmeyi "tam
 * çözünürlük" diye sunmak, rozetin yaptığı hatanın tersten tekrarı
 * olurdu.
 */
export function PhotoViewer({ photo }: { photo: AstroPhoto }) {
  const [lightbox, setLightbox] = useState(false);
  const [solved, setSolved] = useState(false);

  const url = photo.image?.url;
  const alt = `${photo.title} — ${photo.target.catalog}`;
  const solve = photo.solve;
  const canAnnotate = solve.durum === 'cozuldu';

  return (
    <>
      <div className="relative overflow-hidden rounded-card border border-border bg-surface-2">
        {url ? (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label={`${alt} — büyüt`}
            className="block w-full cursor-zoom-in"
          >
            <img
              src={url}
              alt={alt}
              /*
               * `object-contain` ve serbest yükseklik: astrofotoğraflar
               * 16:9 değil. Kadraj panoramik de olabilir kare de; sabit
               * bir en-boy oranı ya siyah bant bırakır ya kadrajı keser.
               * Kesmek bir astrofotoğrafta kabul edilemez — kadraj
               * eserin parçası.
               */
              className="max-h-[78vh] w-full bg-black object-contain"
              /* İlk ekranda görünen tek büyük görsel: LCP adayı. */
              fetchPriority="high"
              decoding="async"
            />
          </button>
        ) : (
          <PhotoPlaceholder
            gradient={photo.gradient}
            alt={alt}
            rounded="rounded-none"
            className="aspect-[16/9] w-full sm:aspect-[2/1]"
          />
        )}

        {canAnnotate && url && (
          <PlateSolveOverlay photo={photo} visible={solved} />
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap gap-2">
            {canAnnotate && url && (
              <button
                type="button"
                onClick={() => setSolved((v) => !v)}
                aria-pressed={solved}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-meta font-medium backdrop-blur-sm transition-colors',
                  solved
                    ? 'border-cold bg-cold/20 text-cold'
                    : 'border-border-strong bg-black/60 text-muted-foreground hover:text-foreground'
                )}
              >
                ⌖ Alan çözümü {solved ? 'açık' : 'kapalı'}
              </button>
            )}
            {solve.durum === 'kuyrukta' && (
              <span className="rounded-full border border-border-strong bg-black/60 px-3 py-1.5 text-meta text-muted-foreground backdrop-blur-sm">
                ⌖ Alan çözümü sırada…
              </span>
            )}
          </div>

          {photo.pixels && (
            <span className="tabular pointer-events-auto rounded-full bg-black/60 px-3 py-1 text-meta text-muted-foreground backdrop-blur-sm">
              {photo.pixels.width} × {photo.pixels.height} px
            </span>
          )}
        </div>
      </div>

      {lightbox && url && (
        <Lightbox
          url={url}
          alt={alt}
          pixels={photo.pixels}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  );
}

/**
 * TAM EKRAN GÖRÜNTÜLEYİCİ.
 *
 * İki kip var ve ikisi de bir SORUYA cevap veriyor:
 *   sığdır → "kadraj nasıl?"   (tamamı ekranda)
 *   1:1    → "detay nasıl?"    (piksel piksel, yıldızlar keskin mi)
 *
 * Ara yakınlaştırma kademesi YOK. Astrofotoğrafta anlamlı olan bu iki
 * uç; aradaki her oran görüntüyü yeniden örnekler ve "yıldızlar biraz
 * bulanık mı" sorusunu cevaplanamaz hale getirir.
 *
 * `Escape` ile kapanıyor ve açılırken sayfa kaydırması kilitleniyor —
 * arkada kayan bir sayfa, sürükleyerek gezinmeyi imkânsız kılardı.
 */
function Lightbox({
  url,
  alt,
  pixels,
  onClose,
}: {
  url: string;
  alt: string;
  pixels?: { width: number; height: number };
  onClose: () => void;
}) {
  const [actual, setActual] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
        <p className="tabular min-w-0 truncate text-meta text-muted-foreground">
          {alt}
          {pixels && ` · ${pixels.width} × ${pixels.height} px`}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {pixels && (
            <button
              type="button"
              onClick={() => setActual((v) => !v)}
              aria-pressed={actual}
              className={cn(
                'rounded-card border px-3 py-1.5 text-meta font-medium transition-colors',
                actual
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border-strong text-muted-foreground hover:text-foreground'
              )}
            >
              {actual ? 'Ekrana sığdır' : '1:1 göster'}
            </button>
          )}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-card border border-border-strong p-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/*
        1:1 kipinde kutu kaydırılabilir oluyor ve görsel doğal boyutunda
        çiziliyor; sığdır kipinde tersi. `overflow-auto` iki kipte de
        duruyor çünkü dar ekranda sığdırılmış görsel bile taşabiliyor.
      */}
      <div
        className={cn(
          'flex-1 overflow-auto',
          actual ? 'cursor-grab' : 'flex items-center justify-center p-4'
        )}
      >
        <img
          src={url}
          alt={alt}
          className={actual ? 'max-w-none' : 'max-h-full max-w-full object-contain'}
          style={actual && pixels ? { width: pixels.width } : undefined}
        />
      </div>
    </div>
  );
}

/**
 * ALAN ÇÖZÜMÜ KATMANI — ölçülen değerlerden çizilen künye.
 *
 * astrometry.net kendi açıklamalı görselini üretiyor ama onu İNDİRMİYORUZ.
 * Sebep depolama değil, doğruluk: o görsel bizim gösterdiğimiz kopyanın
 * değil, servise gönderilen kopyanın ölçüsünde. Üst üste bindirince
 * işaretler kayardı.
 *
 * Bunun yerine katman ÖLÇÜLEN değerlerden vektör olarak çiziliyor:
 *   · kuzey/doğu gülü — alanın dönüklüğü (`rotationDeg`)
 *   · merkez artısı   — çözümün bulduğu alan merkezi
 *   · ölçek çubuğu    — `scaleArcsecPx`ten türeyen gerçek yay ölçüsü
 *   · KATALOG ETİKETLERİ — kadrajdaki gök cisimlerinin adları, gerçek
 *     koordinatlarından gnomonik izdüşümle yerleştirilmiş
 *
 * Hepsi ÖLÇÜM; hiçbiri künyeden ya da kullanıcı girdisinden gelmiyor.
 * Etiketler kullanıcının yazdığı hedef adını DEĞİL, kataloğun o
 * koordinatta ne olduğunu söylüyor — ikisi çeliştiğinde fark görünür
 * olsun diye.
 *
 * Renkler sabit, token değil: katman her zaman fotoğrafın üstünde ve
 * fotoğraf üç temada da koyu. Açık temanın `--color-primary` değeri
 * (#9b5000) siyah bir gökyüzünde okunmuyor.
 */
const SOLVE_LINE = '#58a6ff';
const SOLVE_TEXT = '#e6edf3';

function PlateSolveOverlay({
  photo,
  visible,
}: {
  photo: AstroPhoto;
  visible: boolean;
}) {
  const { solve } = photo;

  /*
    Katalog sorgusu yalnızca katman AÇIKKEN atılıyor: katmanı hiç
    açmayan kullanıcı için her fotoğraf sayfasında boşuna bir istek
    olurdu. `cozumGeometrisi` eksik alanlarda `null` dönüyor ve sorgu
    da kurulmuyor.
  */
  const geometri = useMemo(() => cozumGeometrisi(solve), [solve]);
  const { data: cisimlerHam } = useAlandakiCisimler(geometri, visible);
  const cisimler = cisimlerHam ?? [];

  /*
   * Ölçek çubuğunun uzunluğu ÖLÇÜDEN türetiliyor, sabit değil: alan
   * genişliğinin kabaca beşte birine denk gelen "yuvarlak" bir yay
   * değeri seçiliyor (1', 2', 5', 10'…). Sabit uzunlukta bir çubuk dar
   * alanlı bir fotoğrafta kadrajı aşar, geniş alanlıda görünmez kalırdı.
   */
  const bar = useMemo(() => {
    const width = solve.fieldWidthDeg;
    if (!width || width <= 0) return null;

    const targetArcmin = (width * 60) / 5;
    const steps = [1, 2, 5, 10, 15, 30, 60, 120, 300];
    const pick = steps.find((s) => s >= targetArcmin) ?? steps[steps.length - 1];
    return { arcmin: pick, fraction: pick / 60 / width };
  }, [solve.fieldWidthDeg]);

  if (!visible) return null;

  const rotation = solve.rotationDeg ?? 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-opacity"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        {/* Merkez artısı — çizgiler ince ve kısa: kadrajı kapatmamalı. */}
        <line
          x1="50" y1="45" x2="50" y2="55"
          stroke={SOLVE_LINE} strokeWidth="0.25" vectorEffect="non-scaling-stroke"
        />
        <line
          x1="45" y1="50" x2="55" y2="50"
          stroke={SOLVE_LINE} strokeWidth="0.25" vectorEffect="non-scaling-stroke"
        />
        <circle
          cx="50" cy="50" r="6"
          fill="none" stroke={SOLVE_LINE} strokeWidth="0.25"
          strokeDasharray="2 2" vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/*
        GÜL VE ÖLÇEK ÇUBUĞU SVG'NİN DIŞINDA. `preserveAspectRatio="none"`
        merkez artısını kadraja oturtuyor ama aynı esnetme gülü de ezerdi
        — kuzey oku eğik bir fotoğrafta yamuk çıkardı. Bunlar normal
        yerleşimde, piksel biriminde duruyor.
      */}
      <div className="absolute right-3 top-3 h-14 w-14">
        <svg viewBox="-20 -20 40 40" className="h-full w-full">
          <g transform={`rotate(${-rotation})`}>
            <line x1="0" y1="0" x2="0" y2="-14" stroke={SOLVE_LINE} strokeWidth="1.2" />
            <text x="0" y="-15.5" fill={SOLVE_TEXT} fontSize="7" textAnchor="middle">
              K
            </text>
            <line x1="0" y1="0" x2="-14" y2="0" stroke={SOLVE_LINE} strokeWidth="1.2" />
            <text x="-16" y="2.5" fill={SOLVE_TEXT} fontSize="7" textAnchor="middle">
              D
            </text>
          </g>
        </svg>
      </div>

      {cisimler.length > 0 && (
        /*
          Etiketler yüzde konumla yerleştiriliyor, SVG içinde değil:
          `preserveAspectRatio="none"` yazıyı da esnetir ve dar kadrajlı
          bir fotoğrafta metin okunmaz hâle gelirdi.
        */
        <div className="absolute inset-0">
          {cisimler.map((c) => (
            <div
              key={c.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${Math.max(0, Math.min(100, c.nokta.x * 100))}%`,
                top: `${Math.max(0, Math.min(100, c.nokta.y * 100))}%`,
              }}
            >
              <span
                className="block size-2 rounded-full border"
                style={{ borderColor: SOLVE_LINE }}
              />
              <span
                className="tabular absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black/65 px-1.5 py-0.5 text-meta leading-tight backdrop-blur-[2px]"
                style={{ color: SOLVE_TEXT }}
              >
                {c.katalog}
              </span>
            </div>
          ))}
        </div>
      )}

      {bar && (
        /*
         * Kutu KADRAJIN TAM GENİŞLİĞİNDE (`inset-x-0`), içeriden değil.
         * Yüzde her zaman kapsayıcıya göre hesaplanır; kutu daraltılmış
         * olsaydı "%20" görüntünün değil o kutunun beşte biri olur ve
         * çubuk yazdığı yay değerinden kısa çıkardı. Kenar boşluğu
         * yüzdeyi bozmayan bir sol kaydırmayla veriliyor.
         */
        <div className="absolute inset-x-0 bottom-14">
          {/*
            Genişlik GERÇEK oranı gösteriyor: çubuk kadrajın ne kadarını
            kapsıyorsa o kadar uzun. Asgari genişlik verilmedi — sabit bir
            piksele uzatılmış çubuk, yazdığı yay değerinden uzun görünür
            ve ölçek çubuğunun tek işini yapmaz olurdu. Üst sınır
            yalnızca bozuk veriye karşı emniyet.
          */}
          <div
            className="ml-3 border-x border-b"
            style={{
              borderColor: SOLVE_LINE,
              height: 6,
              width: `${Math.min(40, bar.fraction * 100)}%`,
            }}
          />
          <span
            className="tabular ml-3 mt-1 block text-meta"
            style={{ color: SOLVE_TEXT }}
          >
            {bar.arcmin}′
          </span>
        </div>
      )}
    </div>
  );
}
