import { Fragment, useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { ButtonLink } from '@/components/ui/Button';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import {
  drizzleSegments,
  drizzleToc,
  type DrizzleWidgetId,
} from './drizzle/content.generated';
import { SamplingCalculator } from './drizzle/widgets/SamplingCalculator';
import { PixfracCalculator } from './drizzle/widgets/PixfracCalculator';
import { DitherCalculator } from './drizzle/widgets/DitherCalculator';
import { DrizzleSimulator } from './drizzle/widgets/DrizzleSimulator';
import './drizzle/drizzle.css';

/**
 * ASTROFOTOĞRAFÇILIKTA DRIZZLE — uzun form teknik rehber.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN NORMAL BİR "YAZI" DEĞİL
 *
 * `/yazilar` modülünün içerik modeli (`domain/content/blocks.ts`) beş
 * blok tanıyor: paragraf, başlık, alıntı, liste, çağrı kutusu. Bu makale
 * 16 tablo, 11 infografik, 7 akordiyon ve 4 çalışan hesaplayıcı taşıyor —
 * blok modeline sığmıyor ve modeli bu tek yazı için genişletmek, kullanıcı
 * tarafından girilen her yazıya tablo/HTML kapısı açmak olurdu.
 *
 * Bu yüzden kendi rotası var ve `/yazilar` listesinde öne çıkan bir kartla
 * duruyor: okuyucu için aynı yerden ulaşılıyor, veri modeli kirlenmiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * GÖVDE HAM HTML, HESAPLAYICILAR REACT
 *
 * Metin `content.generated.ts` içinde; derleme öncesi üretiliyor
 * (`scripts/drizzle-icerik.mjs`) ve çalışma zamanında markdown
 * ayrıştırıcısı YOK — ilk rota JS bütçesi (200 kB gzip, bugün 198'in
 * üstünde) yeni bir ayrıştırıcıya yer bırakmıyordu. Rota lazy olduğu için
 * bu sayfanın kendi paketi de ilk yüklemeye girmiyor.
 *
 * Hesaplayıcılar gövdeden AYRI React bileşenleri: paketin vanilla JS
 * sürümü `innerHTML` ile basılan bir gövdede zaten çalışmazdı (React
 * `<script>` etiketini çalıştırmaz) ve durum yönetimi sitenin geri
 * kalanıyla aynı dilde olmalı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * İÇERİK DEĞİŞTİRİLMEDİ
 *
 * Paketin belgesi iki ifadeyi "düzeltilmemeli" diye işaretliyor ve ikisi
 * de yerinde duruyor: R'nin `r` ile ARTMASI ve PixInsight tablosundaki
 * "kaynaklar çelişiyor" satırları.
 */

const WIDGETS: Record<DrizzleWidgetId, () => React.ReactElement> = {
  sampling: SamplingCalculator,
  simulator: DrizzleSimulator,
  pixfrac: PixfracCalculator,
  dither: DitherCalculator,
};

const PUBLISHED = '2026-08-05';

export function DrizzleGuidePage() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(drizzleToc[0]?.id ?? '');

  /*
   * YAZILIM SEKMELERİ — ilerleyici zenginleştirme.
   *
   * Sekmeler gövdenin içinde ham HTML olarak geliyor (beş yazılımın
   * karşılaştırması). JS çalışmadan önce CSS bütün panelleri AÇIK
   * gösteriyor; burada kapsayıcıya `data-dz-tabs` yazıldığı anda gizleme
   * kuralı devreye giriyor. Sıra bilinçli: tersi olsaydı JS gecikirse
   * beş bölümden dördü kaybolurdu ve arama motoru da göremezdi.
   */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;

    const cleanups: (() => void)[] = [];

    root.querySelectorAll<HTMLElement>('.dz-tabs').forEach((tabs) => {
      const buttons = [...tabs.querySelectorAll<HTMLButtonElement>('button')];
      const panels = buttons
        .map((b) => root.querySelector<HTMLElement>(`#${b.dataset.p}`))
        .filter((p): p is HTMLElement => p !== null);
      if (buttons.length === 0 || buttons.length !== panels.length) return;

      tabs.setAttribute('role', 'tablist');
      tabs.dataset.dzTabs = 'ready';

      const select = (index: number) => {
        buttons.forEach((b, i) => {
          b.classList.toggle('dz-on', i === index);
          b.setAttribute('aria-selected', String(i === index));
          b.tabIndex = i === index ? 0 : -1;
        });
        panels.forEach((p, i) => p.classList.toggle('dz-on', i === index));
      };

      buttons.forEach((button, index) => {
        const panel = panels[index];
        const id = `dz-tab-${panel.id}`;
        button.id = id;
        button.type = 'button';
        button.setAttribute('role', 'tab');
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', id);

        const onClick = () => select(index);
        /* Ok tuşları + Home/End — WAI-ARIA tabs deseni. */
        const onKeyDown = (event: KeyboardEvent) => {
          const step =
            event.key === 'ArrowRight'
              ? 1
              : event.key === 'ArrowLeft'
                ? -1
                : event.key === 'Home'
                  ? -index
                  : event.key === 'End'
                    ? buttons.length - 1 - index
                    : 0;
          if (step === 0) return;
          event.preventDefault();
          const next =
            (index + step + buttons.length) % buttons.length;
          select(next);
          buttons[next].focus();
        };

        button.addEventListener('click', onClick);
        button.addEventListener('keydown', onKeyDown);
        cleanups.push(() => {
          button.removeEventListener('click', onClick);
          button.removeEventListener('keydown', onKeyDown);
        });
      });

      select(0);
    });

    return () => cleanups.forEach((fn) => fn());
  }, []);

  /*
   * İçindekilerde bulunduğun yeri işaretle. `IntersectionObserver`
   * kullanılıyor çünkü scroll dinleyicisi her karede düzen okuması
   * yaptırıyor ve uzun bir belgede bu ölçülebilir bir maliyet.
   */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const targets = drizzleToc
      .map((entry) => root.querySelector(`#${CSS.escape(entry.id)}`))
      .filter((el): el is Element => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: '-88px 0px -70% 0px' }
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <PageMeta
        title="Astrofotoğrafçılıkta Drizzle"
        description="Hubble için icat edilmiş bir algoritma bahçenizdeki teleskopta ne işe yarıyor? Örnekleme, pixfrac, PHD2 dithering ve karar ağacı — 4 hesaplayıcı ve canlı simülatörle."
        ogType="article"
        publishedTime={PUBLISHED}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yazılar', path: '/yazilar' },
            { name: 'Drizzle Rehberi', path: '/yazilar/drizzle-rehberi' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: 'Astrofotoğrafçılıkta Drizzle',
            inLanguage: 'tr',
            datePublished: PUBLISHED,
            url: absoluteUrl('/yazilar/drizzle-rehberi'),
            about: 'Drizzle, dithering, örnekleme ve PHD2',
            citation:
              'Fruchter, A. S. & Hook, R. N., "Drizzle: A Method for the Linear Reconstruction of Undersampled Images", PASP 114:144–152 (2002)',
          },
        ]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Yazılar', to: '/yazilar' },
            { label: 'Drizzle Rehberi' },
          ]}
          title="Astrofotoğrafçılıkta Drizzle"
          description="Hubble için icat edilmiş bir algoritma, bahçenizdeki teleskopta ne işe yarıyor? Yağmur damlası benzetmesinden PHD2'nin dither ayarlarına kadar, sıfırdan anlatım."
          actions={
            <ButtonLink to="/simulator" size="sm" variant="secondary">
              Kendi setup&apos;ında dene
            </ButtonLink>
          }
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/*
            İÇİNDEKİLER — `lg` altında gizli. Dar ekranda 17 satırlık bir
            liste, okumaya başlamadan önce bir ekran dolusu gezinme
            demekti; makale zaten kendi içinde numaralı bölümlerle
            ilerliyor ve tarayıcının kendi araması çalışıyor.
          */}
          <nav
            aria-label="Makale içindekiler"
            className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto lg:block"
          >
            <p className="label mb-3 text-faint">İçindekiler</p>
            <ul className="space-y-px">
              {drizzleToc.map((entry) => (
                <li key={entry.id}>
                  <a
                    href={`#${entry.id}`}
                    aria-current={activeId === entry.id ? 'true' : undefined}
                    className={`block border-l-2 py-1.5 pl-3 text-meta leading-snug transition-colors ${
                      activeId === entry.id
                        ? 'border-primary text-primary'
                        : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                    }`}
                  >
                    {entry.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <article ref={bodyRef} className="dz-root min-w-0 max-w-[75ch]">
            {drizzleSegments.map((segment, index) => {
              if (segment.kind === 'widget') {
                const Widget = WIDGETS[segment.id];
                return <Widget key={`w-${segment.id}`} />;
              }
              return (
                <Fragment key={`h-${index}`}>
                  {/* İçerik depoya işlenmiş sabit belge; üretici script
                      her koşuda script etiketi ve olay niteliği olmadığını
                      doğruluyor. */}
                  <div dangerouslySetInnerHTML={{ __html: segment.html }} />
                </Fragment>
              );
            })}
          </article>
        </div>
      </Container>
    </>
  );
}
