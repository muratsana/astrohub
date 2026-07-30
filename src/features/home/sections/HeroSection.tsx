import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { HeroBackdrop } from '@/components/media/HeroBackdrop';
import { ChevronDownIcon } from '@/components/ui/icons';
import { usePreviewEditor } from '@/features/preview-editor/PreviewEditorContext';
import type { EditableField, HeroSlide } from '../hero/slides';
import { commonsSrcSet, commonsWidthUrl } from '@/lib/commons';
import { cn } from '@/lib/cn';
import { upperTr } from '@/lib/text';

/**
 * Hero görselinin kopya genişlikleri ve çizim alanı (QA P0-04).
 * Konteyner 1520px'te durur; mobilde görsel tam genişliktir. Tarayıcı
 * 390px'lik ekrana artık 1800'lük değil ~640'lık kopyayı indirir.
 */
const HERO_WIDTHS = [640, 960, 1440, 1800];
const HERO_SIZES = '(min-width: 1520px) 1424px, 100vw';

/**
 * HERO — tam genişlikte slayt gösterisi.
 *
 * Yapı: arka plan görseli üzerinde kategori etiketi, büyük başlık, tek satır
 * alt metin ve tek bir CTA. Sağ/sol oklar ve alttaki çizgi göstergeleriyle
 * beş modül sırayla tanıtılır.
 *
 * Terminal diline uyarlandı: köşeli etiket, hairline çerçeveler, mono
 * göstergeler. Yuvarlak hap biçimi ve gölge yok.
 *
 * Erişilebilirlik: otomatik geçiş `prefers-reduced-motion` altında hiç
 * başlamaz, ayrıca fare üzerindeyken ve odak içerideyken durur. Slaytlar
 * `aria-roledescription="carousel"` ile duyurulur; göstergeler gerçek
 * butondur ve klavyeyle gezilir.
 */

const AUTOPLAY_MS = 7000;

export function HeroSection() {
  const { slides, enabled, selection } = usePreviewEditor();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const regionRef = useRef<HTMLElement>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  // Otomatik geçiş — hareket azaltma tercihinde hiç kurulmaz.
  useEffect(() => {
    if (paused) return;
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduced) return;

    const timer = setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, paused, go]);

  // Bölge odaktayken sol/sağ ok tuşlarıyla gezinme.
  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    }
  }

  const slide = slides[index];

  /*
    LCP GÖRSELİ ÖNDEN YÜKLENİR. İlk slaytın fotoğrafı sayfanın en büyük
    boyalı öğesi; keşfi JS'in çalışmasını beklerse LCP saniyeler kayar.
    React 19 bu <link>i <head>e taşır. Yalnızca ilk slayt: diğerleri
    kullanıcı geçtikçe yüklenir, beşini birden önden indirmek kod
    bölmeyi görsellerde tersine çevirmek olurdu.
  */
  const first = slides[0];
  const firstPreload =
    first?.image &&
    (commonsWidthUrl(first.image.url, 960) ?? first.image.url);

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label="Astrohub modülleri"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) {
          setPaused(false);
        }
      }}
      className="bg-background"
    >
      {firstPreload && (
        <link
          rel="preload"
          as="image"
          href={firstPreload}
          imageSrcSet={commonsSrcSet(first.image!.url, HERO_WIDTHS) ?? undefined}
          imageSizes={HERO_SIZES}
          fetchPriority="high"
        />
      )}
      <Container className="py-5 sm:py-6">
        <div className="relative overflow-hidden rounded-card border border-border">
          {/* Arka plan — gerçek fotoğraf, altında çizilen sahne */}
          <div className="absolute inset-0">
            <HeroBackdrop
              key={slide.id}
              scene={slide.scene}
              seed={slide.id}
              tint={slide.tint}
            />
            {slide.image && (
              <HeroPhoto
                key={`${slide.id}-photo`}
                src={slide.image.url}
                alt=""
                credit={`${slide.image.credit} · ${slide.image.licence}`}
                priority={index === 0}
              />
            )}
            {/* Metnin okunurluğu için soldan sağa koyulaşan perde */}
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-background)_0%,color-mix(in_srgb,var(--color-background)_82%,transparent)_38%,transparent_78%)]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(0deg,var(--color-background)_0%,transparent_45%)]"
            />
          </div>

          {/* İçerik */}
          <div
            className="relative flex min-h-[300px] flex-col justify-center px-5 py-8 sm:min-h-[360px] sm:px-9 lg:min-h-[400px] lg:px-12"
            aria-live="polite"
          >
            <div className="max-w-[46ch]">
              <Editable slide={slide} field="badge" className="w-fit">
                <span className="inline-block rounded-card bg-primary px-2.5 py-1 text-meta font-medium tracking-[0.04em] text-primary-foreground">
                  {slide.badge}
                </span>
              </Editable>

              <Editable slide={slide} field="title" className="mt-5 block">
                {/*
                  Büyük harf CSS ile değil, `tr-TR` yerel ayarıyla JS'te
                  yapılıyor: `text-transform` sayfanın `lang` bilgisine
                  bakar ve uygulamayı kendi iskeletine saran ortamlarda o
                  bilgi bizim değil — "i" harfi "I" olup başlık "KARENIN"
                  diye çıkıyor. Ayrıntı: lib/text.ts
                */}
                <h1 className="caps text-[28px] text-foreground sm:text-[40px] lg:text-[48px]">
                  {upperTr(slide.title)}
                </h1>
              </Editable>

              <Editable slide={slide} field="subtitle" className="mt-4 block">
                <p className="text-[13px] leading-relaxed text-muted-foreground sm:text-[14px]">
                  {slide.subtitle}
                </p>
              </Editable>

              <Editable slide={slide} field="ctaLabel" className="mt-7 block w-fit">
                <Link
                  to={slide.ctaTo}
                  // Editör açıkken bağlantı gezinmez; tıklama alanı seçer.
                  onClick={(e) => enabled && e.preventDefault()}
                  className="inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-card border border-primary bg-primary px-6 py-3 text-meta font-medium leading-none tracking-[0.03em] text-primary-foreground transition-colors hover:bg-primary-hover"
                >
                  {slide.ctaLabel}
                  <span aria-hidden>→</span>
                </Link>
              </Editable>
            </div>
          </div>

          {/* Oklar */}
          <NavArrow side="left" onClick={() => go(index - 1)} />
          <NavArrow side="right" onClick={() => go(index + 1)} />

          {/* Göstergeler */}
          <div
            role="tablist"
            aria-label="Slayt seçimi"
            className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5"
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === index}
                aria-label={`${i + 1}. slayt: ${s.badge}`}
                onClick={() => go(i)}
                className="group px-1 py-2"
              >
                <span
                  className={cn(
                    'block h-[3px] transition-all',
                    i === index
                      ? 'w-8 bg-primary'
                      : 'w-4 bg-border-strong group-hover:bg-muted-foreground'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Slayt sayacı — terminal künyesi */}
          <span className="tabular absolute right-4 top-4 rounded-card border border-border bg-background/80 px-2 py-1 text-meta tracking-[0.03em] text-muted-foreground backdrop-blur-sm">
            {String(index + 1).padStart(2, '0')} /{' '}
            {String(count).padStart(2, '0')}
          </span>

          {enabled && selection && (
            <span className="absolute left-4 top-4 rounded-card border border-cold bg-background/85 px-2 py-1 text-meta tracking-[0.03em] text-cold backdrop-blur-sm">
              Düzenleme modu
            </span>
          )}

        </div>
      </Container>
    </section>
  );
}

/**
 * Hero fotoğrafı — yüklenemezse yok olur, altındaki sahne görünür.
 *
 * `RemoteImage` KULLANILMIYOR çünkü o, hata durumunda kendi yıldız
 * alanını çiziyor; burada altta zaten slayta özel bir sahne var ve onun
 * üstüne ikinci bir yer tutucu koymak, iyi olanı kötüsüyle örtmek olurdu.
 *
 * Açılışta yumuşak bir geçiş: fotoğraf geldiği anda sert bir sıçrama
 * yerine sahneden fotoğrafa geçiyor. `loading="eager"` bilinçli — bu
 * görsel sayfanın ilk ekranında ve ertelenirse kullanıcı sahneyi görüp
 * sonra değiştiğine tanık oluyor.
 */
function HeroPhoto({
  src,
  alt,
  credit,
  priority = false,
}: {
  src: string;
  alt: string;
  credit: string;
  /** İlk slayt = LCP adayı; yüksek öncelikle iner. */
  priority?: boolean;
}) {
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  if (state === 'failed') return null;

  return (
    <>
      <img
        src={src}
        srcSet={commonsSrcSet(src, HERO_WIDTHS) ?? undefined}
        sizes={HERO_SIZES}
        alt={alt}
        loading="eager"
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onLoad={() => setState('ready')}
        onError={() => setState('failed')}
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
          state === 'ready' ? 'opacity-100' : 'opacity-0'
        )}
      />

      {/*
        KREDİ FOTOĞRAFLA BİRLİKTE GELİR, ONDAN AYRI DEĞİL.
        Önce kredi slaytın verisine bakıp koşulsuz basılıyordu; adres
        yüklenmediğinde ekranda çizilen sahne duruyor ama altında
        "NASA, ESA, Hubble" yazıyordu. Gösterilmeyen bir görseli
        kredilendirmek yanlış atıf — kredi artık yalnızca fotoğraf
        gerçekten çizildiğinde çıkıyor.

        Görünürlük CC BY 4.0'ın şartı: küçük ve kenarda ama gizli değil.
        Göstergelerin üstüne binmesin diye sağ altta.
      */}
      {state === 'ready' && (
        <span className="absolute bottom-3 right-4 z-10 max-w-[46%] truncate text-right text-meta leading-snug text-faint">
          {credit}
        </span>
      )}
    </>
  );
}

function NavArrow({
  side,
  onClick,
}: {
  side: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Önceki slayt' : 'Sonraki slayt'}
      className={cn(
        'absolute top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center',
        'rounded-card border border-border bg-background/70 text-muted-foreground backdrop-blur-sm',
        'transition-colors hover:border-primary hover:text-primary',
        side === 'left' ? 'left-3' : 'right-3'
      )}
    >
      <ChevronDownIcon
        className={cn('h-4 w-4', side === 'left' ? 'rotate-90' : '-rotate-90')}
      />
    </button>
  );
}

/**
 * Düzenlenebilir sarmalayıcı.
 *
 * Önizleme editörü kapalıyken (üretim) tamamen şeffaftır: fazladan DOM,
 * olay dinleyicisi ya da stil eklemez. Açıkken tıklanabilir bir hedef olur
 * ve seçili alanı kesikli bir çerçeveyle işaretler.
 */
function Editable({
  slide,
  field,
  children,
  className,
}: {
  slide: HeroSlide;
  field: EditableField;
  children: React.ReactNode;
  className?: string;
}) {
  const { enabled, select, selection } = usePreviewEditor();

  if (!enabled) {
    return className ? <div className={className}>{children}</div> : <>{children}</>;
  }

  const active = selection?.slideId === slide.id && selection.field === field;

  /*
   * Sarmalayıcı varsayılan olarak blok: başlık ve alt metin için doğru.
   * Ama rozet ve CTA gibi içeriği kadar yer kaplayan öğelerde blok
   * sarmalayıcı, seçim çerçevesini sütunun tamamına yayıyor ve düğmenin
   * yanında sebepsiz bir dikdörtgen bırakıyordu. Bu iki yer `w-fit` verir.
   */
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        select({ slideId: slide.id, field });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select({ slideId: slide.id, field });
        }
      }}
      className={cn(
        'relative cursor-pointer outline-offset-4 transition-shadow',
        active
          ? 'shadow-[0_0_0_1px_var(--color-cold)]'
          : 'hover:shadow-[0_0_0_1px_var(--color-border-strong)]',
        className
      )}
    >
      {children}
    </div>
  );
}
