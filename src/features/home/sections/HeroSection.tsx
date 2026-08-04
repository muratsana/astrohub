import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { HeroBackdrop } from '@/components/media/HeroBackdrop';
import { ChevronDownIcon } from '@/components/ui/icons';
import { usePreviewEditor } from '@/features/preview-editor/PreviewEditorContext';
import type { EditableField, HeroSlide } from '../hero/slides';
import { useHeroSlides } from '@/features/site/SiteConfigContext';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { selectWeeklyPhoto } from '@/features/photos/weeklyPick';
import { focalPosition, type HeroSlideView } from '@/features/site/heroSlides';
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
  const { slides: editorSlides, enabled, selection } = usePreviewEditor();
  /*
    KAYNAK SEÇİMİ: önizleme editörü AÇIKKEN onun listesi kazanıyor.
    Editör bir tasarım aracı — tasarımcı slaytı ekranda düzenlerken
    veritabanının onu ezmesi aracı kullanılamaz hâle getirirdi. Üretimde
    editör hiç yüklenmiyor, dolayısıyla kaynak her zaman tablo.
  */
  const yayindaki = useHeroSlides();
  const photoCatalog = usePhotoCatalog();
  const photoWeekRounds = usePhotoWeekRounds();
  /*
    Editörün slaytlarında odak noktası ve metin hizası YOK — o alanlar
    panelin konusu, tasarım aracının değil. Varsayılanlarla tamamlanıyor
    ki bileşen tek bir tip görsün; iki ayrı şekli render'da ayırmak, her
    alan okumasına bir koşul eklemek demekti.
  */
  const baseSlides = useMemo<HeroSlideView[]>(
    () =>
      enabled
        ? editorSlides.map((s) => ({
            ...s,
            focalX: 50,
            focalY: 50,
            textAlign: 'left' as const,
          }))
        : yayindaki,
    [enabled, editorSlides, yayindaki]
  );
  const weeklyPick = useMemo(
    () => selectWeeklyPhoto(photoCatalog.items, photoWeekRounds.rounds),
    [photoCatalog.items, photoWeekRounds.rounds]
  );
  const slides = useMemo<HeroSlideView[]>(() => {
    if (enabled || !weeklyPick) return baseSlides;
    const { photo, weekLabel } = weeklyPick;
    return [
      ...baseSlides,
      {
        id: `haftanin-fotografi-${photo.slug}`,
        badge: 'Haftanın Fotoğrafı',
        mediaBadge: weekLabel,
        title: `Haftanın Fotoğrafı: ${photo.title}`,
        subtitle: `${photo.target.name} · @${photo.user.username}`,
        ctaLabel: 'Fotoğrafı aç',
        ctaTo: `/fotograf/${photo.slug}`,
        scene: 'nebula',
        tint: '96,165,250',
        image: photo.image,
        focalX: 50,
        focalY: 50,
        textAlign: 'left',
      },
    ];
  }, [baseSlides, enabled, weeklyPick]);
  const [index, setIndex] = useState(0);
  /** Fare/odak kaynaklı geçici duraklama. */
  const [hovered, setHovered] = useState(false);
  /**
   * Kullanıcının AÇIKÇA durdurması (§6.3).
   *
   * `hovered`dan ayrı tutuluyor çünkü ikisi farklı şeyler: fare çekilince
   * hover duraklaması kalkar, kullanıcının kararı kalkmaz. Tek değişkende
   * tutulsaydı, durdur düğmesine basan biri fareyi hero'dan çekince
   * gösteri yeniden başlardı — yani düğme çalışmıyormuş gibi görünürdü.
   */
  const [stopped, setStopped] = useState(false);
  const regionRef = useRef<HTMLElement>(null);
  /** Dokunma kaydırmasının başlangıç noktası. */
  const touchX = useRef<number | null>(null);

  const count = slides.length;
  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count]
  );

  // Otomatik geçiş — hareket azaltma tercihinde hiç kurulmaz.
  useEffect(() => {
    if (hovered || stopped) return;
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduced) return;

    const timer = setInterval(() => go(index + 1), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [index, hovered, stopped, go]);

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

  /*
    HİÇ SLAYT YOKSA HERO ÇİZİLMİYOR.

    Yönetici bütün slaytları kapatabilir (ya da hepsine ileri tarih
    verebilir) — `toHeroSlides` bunu bir KARAR sayıp boş liste döndürüyor,
    yedeğe düşmüyor. O durumda `slides[index]` `undefined` olur ve
    aşağıdaki `slide.id` sayfayı komple düşürürdü: yöneticinin bir içerik
    kararı, ziyaretçi için beyaz ekran demek olurdu.
  */
  const slide = slides[index];
  if (!slide) return null;

  /*
    LCP GÖRSELİ ÖNDEN YÜKLENİR. İlk slaytın fotoğrafı sayfanın en büyük
    boyalı öğesi; keşfi JS'in çalışmasını beklerse LCP saniyeler kayar.
    React 19 bu <link>i <head>e taşır. Yalnızca ilk slayt: diğerleri
    kullanıcı geçtikçe yüklenir, beşini birden önden indirmek kod
    bölmeyi görsellerde tersine çevirmek olurdu.
  */
  const first = slides[0];
  const firstPreload =
    first?.image && (commonsWidthUrl(first.image.url, 960) ?? first.image.url);

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label="Astrohub modülleri"
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) {
          setHovered(false);
        }
      }}
      /*
        DOKUNMA KAYDIRMASI (§6.3) — mobilde okların yerini alıyor.

        `touchmove` DİNLENMİYOR ve `preventDefault` çağrılmıyor: hero
        sayfanın en üstünde ve dikey kaydırmayı kesmek, kullanıcıyı
        sayfanın başında kilitler. Yalnızca başlangıç ve bitiş noktası
        karşılaştırılıyor.

        Eşik 48px: parmağın dikey kaydırma sırasındaki doğal yatay
        salınımı ~20–30px. Daha düşük bir eşik, sayfayı kaydırmaya
        çalışan kullanıcıyı yanlışlıkla slayt değiştirmeye sürüklerdi.
      */
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const bas = touchX.current;
        touchX.current = null;
        if (bas === null) return;
        const fark = (e.changedTouches[0]?.clientX ?? bas) - bas;
        if (Math.abs(fark) < 48) return;
        go(fark < 0 ? index + 1 : index - 1);
      }}
      className="bg-background"
    >
      {firstPreload && (
        <link
          rel="preload"
          as="image"
          href={firstPreload}
          imageSrcSet={
            commonsSrcSet(first.image!.url, HERO_WIDTHS) ?? undefined
          }
          imageSizes={HERO_SIZES}
          fetchPriority="high"
        />
      )}
      <Container className="pt-5 sm:pt-5">
        {/* ALT DOLGU YOK ve bu bilinçli: "Bu Gece" bölümü kendi ÜST
            dolgusunu taşıyor. İkisi birden olduğunda aradaki boşluk iki
            katına çıkıyordu (24 + 24 = 48px) ve o fazlalık hero'yu
            büyütürken fold'un altına ittiği içerikten çalıyordu.
            Kaldırılan şey banner değil, iki bölüm arasındaki
            tekrarlanmış boşluk. */}
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
                focal={focalPosition(slide)}
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
            /*
              HERO ALÇALDI: min-h 300/360/400 → 240/272/300, dikey dolgu
              py-8 → py-6/7 (Faz 2.3).

              ÖLÇÜM (`npm run check:viewports`, 1280×720): kabuk 88px,
              başlık altı 353px, ana içerik 779px'de başlıyordu — yani
              "Bu Gece", sitenin amiral modülü, fold'un 59px altındaydı.
              Belge §5.3 bu iki çözünürlüğü adıyla anıyor.

              ÖLÇÜMÜN ÖĞRETTİĞİ: `min-h` BAĞLAYICI KISIT DEĞİLDİ. lg'de
              400px'e indirmek hiçbir şey kazandırmadı, çünkü hero zaten
              içeriğiyle o boyu geçiyor — üç satırlık 48px başlık, açıklama
              ve düğme. Gerçek kazanç yalnızca dolgudan geldi: içerik
              779 → 769px. Yani 10px.

              Kalan mesafeyi kapatmak hero'nun İÇERİĞİNİ yeniden
              düzenlemeyi gerektiriyor (başlık ölçeği, carousel yapısı) ve
              bu Faz 3'ün konusu — belgede "Ana sayfa, navbar, hero" ayrı
              bir faz. Burada yapılan, ölçüm aracını kurmak ve orantısız
              dolguyu almak.

              SONRADAN %15 BÜYÜTÜLDÜ (kullanıcı kararı: "çok küçük
              kaldı"). min-h 240/272/300 → 276/313/345 ve dikey dolgu da
              aynı oranda arttı. İKİSİ BİRDEN gerekliydi: yukarıdaki
              ölçümün öğrettiği gibi `min-h` masaüstünde bağlayıcı değil,
              yüksekliği içerik + dolgu belirliyor. Yalnızca min-h'ı
              artırmak lg'de hiçbir şey değiştirmezdi.

              Fold etkisi `npm run check:viewports` ile ölçüldü ve kapı
              geçiyor — ayrıntı aşağıdaki ölçüm çıktısında.

              Punto ve dokunma hedefleri KÜÇÜLMEDİ; yalnızca boşluk
              alındı. Metni küçülterek yer kazanmak §5.3'te ayrıca
              yasaklanmış.
            */
            /*
              METİN İÇİN GÜVENLİ ALAN (Faz 3.3 / §6.3).

              Ölçüm: sol ok HER genişlikte `<h1>`in üstüne biniyordu —
              320px'te 36×19px, 1920px'te 8×44px. Belgenin ilk maddesi
              bunu yasaklıyor: "sağ/sol kontroller içerik ve yazıların
              üzerine gelmemelidir".

              Ok `left-3`te ve 44px geniş, yani sağ kenarı 56px'te bitiyor.
              Metin `sm`den itibaren 64px'ten başlıyor: 56 + 8px nefes.
              Mobilde oklar zaten kalktığı (aşağıya bak) için orada dar
              yatay dolgu korunuyor — yer kazanmak için değil, alacak
              kimse olmadığı için.

              ALT DOLGU MOBİLDE 64px. Gösterge şeridi + durdurma düğmesi
              `absolute bottom-4` ve 44px yüksek, yani alttan 60px'lik bir
              bandı kaplıyor. Dolgu verilmeyince CTA düğmesi tam o bandın
              üstüne oturdu ve durdurma düğmesi CTA'nın altında kaldı —
              yani BİR KONTROL İÇERİĞİN ÜSTÜNE BİNDİ, §6.3'ün yasakladığı
              şeyi bu sefer ben yaptım. Ekran görüntüsü yakaladı, sonra
              kapı da yakalayacak hâle getirildi.

              `sm`den itibaren gerekmiyor: orada metin sütunu dar ve
              kontroller ortada, CTA'nın sağında kalıyor.
            */
            className="relative flex min-h-[276px] flex-col justify-center px-5 pb-[4.6rem] pt-7 sm:min-h-[313px] sm:py-8 sm:pl-16 sm:pr-9 lg:min-h-[345px] lg:pl-20 lg:pr-12"
            aria-live="polite"
          >
            {/*
              METİN SÜTUNU GENİŞLEDİ: 46ch → 62ch (Faz 3.3).

              Ölçüm: 1280px'te metin 97–475px arasındaydı, yani hero'nun
              %30'u. Kalan %70 boş yıldız alanıydı ve başlık o dar sütunda
              ÜÇ satıra bölünüyordu. Sütunu genişletmek başlığı iki satıra
              indiriyor — punto küçülmeden hero alçalıyor.

              Belgedeki iki madde aynı yere bakıyor: "tek satırlık içerik
              dev panellere yerleştirilmemelidir" ve "hero, düşük
              çözünürlükte ana içeriği tamamen aşağı itmemelidir".

              62ch üst sınır; okuma metni değil başlık olduğu için satır
              uzunluğu kuralı (65–75ch) bağlamıyor, ama sınırsız bırakmak
              geniş ekranda başlığı tek uzun satıra çekip carousel oklarının
              altına sokardı.
            */}
            {/*
              METİN HİZASI (§6.3) — panelden geliyor.

              `center` seçildiğinde sütun ortalanıyor (`mx-auto`) ve metin
              de ortalanıyor. Yalnızca `text-center` verseydik sütun solda
              kalır, içindeki satırlar kendi dar kutusunda ortalanırdı —
              yani hiçbir şey ortalanmış GÖRÜNMEZDİ.
            */}
            <div
              className={cn(
                'max-w-[62ch]',
                slide.textAlign === 'center' && 'mx-auto text-center'
              )}
            >
              <Editable slide={slide} field="badge" className="w-fit">
                <span className="inline-block rounded-card bg-primary px-2.5 py-1 text-meta font-medium tracking-[0.04em] text-primary-foreground">
                  {slide.badge}
                </span>
              </Editable>

              <Editable slide={slide} field="title" className="mt-4 block">
                {/*
                  Büyük harf CSS ile değil, `tr-TR` yerel ayarıyla JS'te
                  yapılıyor: `text-transform` sayfanın `lang` bilgisine
                  bakar ve uygulamayı kendi iskeletine saran ortamlarda o
                  bilgi bizim değil — "i" harfi "I" olup başlık "KARENIN"
                  diye çıkıyor. Ayrıntı: lib/text.ts
                */}
                <h1 className="caps type-hero text-foreground">
                  {upperTr(slide.title)}
                </h1>
              </Editable>

              <Editable slide={slide} field="subtitle" className="mt-4 block">
                <p className="text-body-sm leading-relaxed text-muted-foreground sm:text-body-sm">
                  {slide.subtitle}
                </p>
              </Editable>

              <Editable
                slide={slide}
                field="ctaLabel"
                className="mt-5 block w-fit"
              >
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

          {slide.mediaBadge && (
            <span className="absolute left-4 top-4 z-20 rounded-card border border-success/50 bg-background/85 px-2 py-1 text-meta font-medium tracking-[0.03em] text-success backdrop-blur-sm">
              {slide.mediaBadge}
            </span>
          )}

          {/* Oklar */}
          <NavArrow side="left" onClick={() => go(index - 1)} />
          <NavArrow side="right" onClick={() => go(index + 1)} />

          {/*
            GÖSTERGELER VE OTOMATİK GEÇİŞİ DURDURMA (§6.3).

            `prefers-reduced-motion` otomatik geçişi zaten hiç kurmuyor
            ama o bir SİSTEM tercihi; ayarlarından açmamış ama şu an
            okumak isteyen kullanıcının elinde hiçbir kontrol yoktu.
            Hover duraklaması da yetmiyor: dokunmatik cihazda hover diye
            bir şey yok.

            Düğme tablist'in DIŞINDA duruyor — içine konsaydı ekran
            okuyucu onu bir slayt sekmesi sanardı.
          */}
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => setStopped((v) => !v)}
              aria-pressed={stopped}
              aria-label={
                stopped
                  ? 'Otomatik slayt geçişini başlat'
                  : 'Otomatik slayt geçişini durdur'
              }
              className="flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
            >
              {/* Duraklat/oynat işareti mevcut çizgi diliyle çiziliyor;
                  ikon setine yeni dosya eklemeye değmez. */}
              <span aria-hidden className="flex items-center gap-[3px]">
                {stopped ? (
                  <span className="ml-px block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-current" />
                ) : (
                  <>
                    <span className="block h-2.5 w-[3px] bg-current" />
                    <span className="block h-2.5 w-[3px] bg-current" />
                  </>
                )}
              </span>
            </button>

            <div
              role="tablist"
              aria-label="Slayt seçimi"
              className="flex items-center gap-1.5"
            >
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`${i + 1}. slayt: ${s.badge}`}
                  onClick={() => go(i)}
                  /*
                  DOKUNMA HEDEFİ 44×44 (WCAG 2.5.8 / QA GUI-10).
                  Gösterge ÇİZGİSİ ince kalıyor — tasarım kararı o — ama
                  parmakla basılan alan değil. Önceki hâli ~24×19px'ti ve
                  mobilde yanlış slayda geçmek kolaydı. Alan yükseklikle
                  değil `flex` + sabit ölçüyle veriliyor; çizgi ortada
                  duruyor, kutu görünmez.
                */
                  className="group flex h-11 w-11 items-center justify-center"
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
  focal,
}: {
  src: string;
  alt: string;
  credit: string;
  /** İlk slayt = LCP adayı; yüksek öncelikle iner. */
  priority?: boolean;
  /**
   * GÖRSEL ODAK NOKTASI (§6.3) — `object-position` değeri.
   *
   * `object-cover` görseli kırpıyor ve kırpma varsayılan olarak merkezden
   * yapılıyor. Geniş bir hero'da ilgi çekici kısım çoğu zaman merkezde
   * DEĞİL; odak noktası olmadan bunu düzeltmenin tek yolu başka bir
   * görsel seçmekti.
   *
   * Sınıf değil `style`: yüzde değeri sürekli bir sayı, Tailwind'in
   * derleme zamanı sınıf üretimiyle ifade edilemez.
   */
  focal?: string;
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
        style={focal ? { objectPosition: focal } : undefined}
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
        // 44×44: WCAG 2.5.8 asgari dokunma hedefi (önceki 40×40 sınırın altındaydı).
        'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center',
        'rounded-card border border-border bg-background/70 text-muted-foreground backdrop-blur-sm',
        'transition-colors hover:border-primary hover:text-primary',
        /*
          MOBİLDE OK YOK — belge açıkça izin veriyor: "mobilde swipe ve
          küçük pagination; gerekirse okları kaldırma".

          320px'lik bir ekranda 44px'lik iki ok, metin sütununun %28'ini
          yiyordu. Yerini kaydırma (swipe) ve gösterge çizgileri alıyor;
          ikisi de dokunmatikte oktan daha doğal.
        */
        'hidden sm:flex',
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
    return className ? (
      <div className={className}>{children}</div>
    ) : (
      <>{children}</>
    );
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
