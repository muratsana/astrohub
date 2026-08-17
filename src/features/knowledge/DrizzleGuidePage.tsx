import { Fragment, useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { ButtonLink } from '@/components/ui/Button';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { useGuideContent } from '@/services/content/guides';
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

/**
 * GİRİŞ KUTUSU — makalenin ÖNÜNE, makalenin İÇİNE değil.
 *
 * Makale teknik olarak doğru ama ilk paragrafından itibaren "yetersiz
 * örnekleme", "pixfrac", "dither deseni" diyor. Bu terimleri bilmeyen
 * biri için giriş bir duvar; oysa asıl cevabı (drizzle sana lazım mı?)
 * üç cümlede vermek mümkün.
 *
 * Kutu üretilen gövdeye DOKUNMUYOR: içerik `content.generated.ts` ve her
 * derlemede kaynaktan yeniden üretiliyor, oraya elle yazılan bir şey ilk
 * üretimde silinirdi. Bu yüzden karşılama React tarafında duruyor.
 *
 * Kısa tutuldu — üç terim ve bir "kısa cevap". Uzun bir önsöz, yazıyı
 * okumaya gelen kişiyi yazıdan uzaklaştırır.
 */
const TERIMLER: { terim: string; karsilik: string; aciklama: string }[] = [
  {
    terim: 'Örnekleme',
    karsilik: 'yıldız kaç piksele düşüyor',
    aciklama:
      'Teleskobun gösterdiği en küçük ayrıntı tek bir piksele sığıyorsa "yetersiz örnekleme" var demektir: yıldızlar yuvarlak değil kare çıkar, detay kaydedilmeden kaybolur.',
  },
  {
    terim: 'Dither',
    karsilik: 'kareler arası minik kaydırma',
    aciklama:
      'Her pozdan sonra teleskobu birkaç piksel kaydırmak. Aynı yıldız her karede farklı bir piksele düştüğü için, tek tek karelerin kaçırdığı ayrıntı toplamda geri gelir.',
  },
  {
    terim: 'Pixfrac',
    karsilik: 'damlanın büyüklüğü',
    aciklama:
      'Drizzle her pikseli küçültüp çıktı ızgarasına "damlatır". Damla ne kadar küçükse detay o kadar keskin, gürültü o kadar fazla olur. Dengeyi bulmak bu yazının ana konusu.',
  },
];

export function DrizzleGuidePage() {
  /* Koddaki üretilmiş dosya TOHUM; panelden düzenlenmiş gövde varsa
     o kazanıyor. Ayrıntı `services/content/guides.ts` başlığında. */
  const guide = useGuideContent('drizzle-rehberi', drizzleToc, drizzleSegments);
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
            { name: 'Astrofotoğrafçılıkta Drizzle', path: '/yazilar/drizzle-rehberi' },
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
            { label: 'Astrofotoğrafçılıkta Drizzle' },
          ]}
          title="Astrofotoğrafçılıkta Drizzle"
          description="Hubble için icat edilmiş bir algoritma, bahçenizdeki teleskopta ne işe yarıyor? Yağmur damlası benzetmesinden PHD2'nin dither ayarlarına kadar, sıfırdan anlatım."
          actions={
            <ButtonLink to="/araclar/kadraj" size="sm" variant="secondary">
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
              {guide.toc.map((entry) => (
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

          <div className="min-w-0">
            <section
              aria-labelledby="dz-giris"
              className="metin-yasli mb-8 rounded-card border border-border-strong bg-surface-1 p-4 sm:p-5"
            >
              <h2 id="dz-giris" className="type-section mb-2 text-foreground">
                Hiç duymadıysanız: en kısa cevap
              </h2>
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                Drizzle, <strong className="text-foreground">yıldızların
                kare kare çıktığı</strong> kurulumlarda işe yarar. Teleskop
                ve kameranız zaten yeterince ince ayrıntı yakalıyorsa
                drizzle size detay <em>kazandırmaz</em> — sadece gürültüyü
                büyütür ve dosyaları dörde katlar. Yani ilk soru “nasıl
                yaparım” değil, <strong className="text-foreground">“bana
                lazım mı”</strong>. Aşağıdaki ilk hesaplayıcı bunu tek
                bakışta söylüyor.
              </p>

              <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
                Cevap “evet” çıkarsa şart şu:{' '}
                <strong className="text-foreground">
                  poz aralarında dither yapmış olmalısınız
                </strong>
                . Dithersiz karelerde drizzle çalışmaz — elinde yeni bilgi
                yoktur, olmayan ayrıntıyı üretemez.
              </p>

              <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                {TERIMLER.map((t) => (
                  <div key={t.terim}>
                    <dt className="text-body-sm font-medium text-foreground">
                      {t.terim}
                      {/* Karşılık ayrı satırda: yan yana yazıldığında üç
                          sütunun ikisinde sarıyor ve başlıklar farklı
                          yüksekliklerde başlıyordu. */}
                      <span className="mt-0.5 block text-meta font-normal text-primary">
                        {t.karsilik}
                      </span>
                    </dt>
                    <dd className="mt-1 text-meta leading-relaxed text-muted-foreground">
                      {t.aciklama}
                    </dd>
                  </div>
                ))}
              </dl>

              <p className="mt-4 text-meta leading-relaxed text-faint">
                Yazı buradan sonra teknikleşiyor ama her bölüm kendi
                başına okunabilir; sıkıldığınız yerde hesaplayıcılara
                atlayıp kendi rakamlarınızı deneyebilirsiniz.
              </p>
            </section>

            <article ref={bodyRef} className="dz-root">
            {guide.segments.map((segment, index) => {
              if (segment.kind === 'widget') {
                /* Kimlik veritabanından da gelebiliyor; tanınmayan bir
                   hesaplayıcı sayfayı düşürmek yerine atlanıyor. */
                const Widget = WIDGETS[segment.id as keyof typeof WIDGETS];
                return Widget ? <Widget key={`w-${segment.id}`} /> : null;
              }
              return (
                <Fragment key={`h-${index}`}>
                  {/* İçerik ya depoya işlenmiş tohumdan ya da panelden
                      geliyor; ikisi de aynı desen listesinden geçiyor
                      (`domain/content/guide.ts`). */}
                  <div dangerouslySetInnerHTML={{ __html: segment.html }} />
                </Fragment>
              );
            })}
            </article>
          </div>
        </div>
      </Container>
    </>
  );
}
