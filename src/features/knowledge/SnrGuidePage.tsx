import { Fragment, useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { ButtonLink } from '@/components/ui/Button';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import {
  snrSegments,
  snrToc,
  type SnrWidgetId,
} from './snr/content.generated';
import { SnrSimulator } from './snr/widgets/SnrSimulator';
import { ObjectComparison } from './snr/widgets/ObjectComparison';
import { SubExposureCalculator } from './snr/widgets/SubExposureCalculator';
import { IntegrationPlanner } from './snr/widgets/IntegrationPlanner';
import './drizzle/drizzle.css';

/**
 * ASTROFOTOĞRAFTA SİNYAL–GÜRÜLTÜ ORANI — uzun form teknik rehber.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DRIZZLE REHBERİYLE AYNI DESEN, AYNI GEREKÇELERLE
 *
 * Gövde derleme öncesi üretiliyor (`scripts/snr-icerik.mjs`), çalışma
 * zamanında markdown ayrıştırıcısı yok, hesaplayıcılar ayrı React
 * bileşenleri. Neden böyle olduğu `DrizzleGuidePage` başlığında yazılı;
 * burada tekrarlanmıyor.
 *
 * STİL DOSYASI PAYLAŞILIYOR. `drizzle.css` içe aktarılıyor çünkü paketin
 * kendi belgesi de "ikisi de `.dz-root` altında, aynı tasarım sistemi"
 * diyor ve ölçtük: SNR gövdesinin kullandığı 24 sınıfın hepsi o dosyada
 * zaten tanımlı. İkinci bir kopya çıkarmak, ilk tema düzeltmesinde
 * ayrışacak iki dosya demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DRIZZLE'DAN FARKLAR
 *
 * 1. Yazılım sekmesi YOK — bu makalede sekmeli blok bulunmuyor, o yüzden
 *    ilerleyici zenginleştirme kancası da yok.
 * 2. Gövdedeki DÖRT şekil paketin kendi JS'iyle çiziliyordu; üretici
 *    onları derleme zamanında bir kez çizip HTML'e gömüyor. Drizzle'da
 *    bu unutulmuş ve bir şekil canlıda boş kutu olarak yayınlanmıştı.
 * 3. Fizik çekirdeği paketin JS sürümüyle test ediliyor
 *    (`snr/core.test.ts`) — elle port edilen iki kopyanın sessizce
 *    ayrışmasını engelliyor.
 */

const WIDGETS: Record<SnrWidgetId, () => React.ReactElement> = {
  simulator: SnrSimulator,
  objects: ObjectComparison,
  subexposure: SubExposureCalculator,
  planner: IntegrationPlanner,
};

const PUBLISHED = '2026-08-06';

/**
 * KARŞILAMA KUTUSU — makalenin önüne, içine değil.
 *
 * Drizzle rehberinde eklendi ve aynı gerekçe burada da geçerli: makale
 * ikinci paragrafında "elektron/piksel/saniye" diyor. Terimleri bilmeyen
 * için giriş bir duvar, oysa asıl cevap üç cümlede verilebiliyor.
 *
 * Üretilen gövdeye DOKUNULMUYOR: içerik her derlemede kaynaktan yeniden
 * üretiliyor, oraya elle yazılan bir şey ilk üretimde silinirdi.
 */
const TERIMLER: { terim: string; karsilik: string; aciklama: string }[] = [
  {
    terim: 'Sinyal',
    karsilik: 'objeden gelen ışık',
    aciklama:
      'Teleskobunuzun topladığı, hedefe ait fotonlar. Uzun poz demek daha çok foton demek — ve sinyal süreyle DOĞRU orantılı büyür.',
  },
  {
    terim: 'Gürültü',
    karsilik: 'ölçümün kendi belirsizliği',
    aciklama:
      'Fotonlar düzensiz gelir; aynı yeri iki kez ölçseniz iki farklı sayı bulursunuz. Bu fark gürültüdür ve sürenin KAREKÖKÜYLE büyür — yani sinyalden yavaş.',
  },
  {
    terim: 'SNR',
    karsilik: 'ikisinin oranı',
    aciklama:
      'Sinyal ÷ gürültü. Sinyal hızlı, gürültü yavaş büyüdüğü için süre arttıkça oran iyileşir: 4 kat süre → 2 kat SNR. Bu yazının tamamı bu tek cümlenin sonuçları.',
  },
];

export function SnrGuidePage() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(snrToc[0]?.id ?? '');

  /*
   * İçindekilerde bulunduğun yeri işaretle. `IntersectionObserver`
   * kullanılıyor çünkü scroll dinleyicisi her karede düzen okuması
   * yaptırıyor ve uzun bir belgede bu ölçülebilir bir maliyet.
   */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const targets = snrToc
      .map((entry) => root.querySelector(`#${CSS.escape(entry.id)}`))
      .filter((el): el is Element => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
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
        title="Astrofotoğrafta Sinyal–Gürültü Oranı"
        description="Neden 4 kat süre sadece 2 kat iyileştirir? Gökyüzü parlaklığı, poz süresi, okuma gürültüsü ve filtreler — canlı simülatör ve üç hesaplayıcıyla."
        ogType="article"
        publishedTime={PUBLISHED}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yazılar', path: '/yazilar' },
            { name: 'SNR Rehberi', path: '/yazilar/snr-rehberi' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: 'Astrofotoğrafta Sinyal–Gürültü Oranı',
            datePublished: PUBLISHED,
            inLanguage: 'tr-TR',
            url: absoluteUrl('/yazilar/snr-rehberi'),
            author: { '@type': 'Organization', name: 'Astrohub' },
          },
        ]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Yazılar', to: '/yazilar' },
            { label: 'SNR Rehberi' },
          ]}
          title="Astrofotoğrafta Sinyal–Gürültü Oranı"
          description="Neden 4 kat süre sadece 2 kat iyileştiriyor, neden daha iyi kamera çoğu zaman yanlış cevap? Fotondan başlayarak, sıfırdan anlatım."
          actions={
            <ButtonLink to="/araclar/poz-plani" size="sm" variant="secondary">
              Kendi planını çıkar
            </ButtonLink>
          }
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
          {/* İçindekiler `lg` altında gizli — gerekçe `DrizzleGuidePage`
              başlığında. */}
          <nav
            aria-label="Makale içindekiler"
            className="sticky top-20 hidden max-h-[calc(100dvh-6rem)] self-start overflow-y-auto lg:block"
          >
            <p className="label mb-3 text-faint">İçindekiler</p>
            <ul className="space-y-px">
              {snrToc.map((entry) => (
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
              aria-labelledby="snr-giris"
              className="mb-8 rounded-card border border-border-strong bg-surface-1 p-4 sm:p-5"
            >
              <h2 id="snr-giris" className="type-section mb-2 text-foreground">
                Hiç duymadıysanız: en kısa cevap
              </h2>
              <p className="max-w-[65ch] text-body-sm leading-relaxed text-muted-foreground">
                Fotoğrafınızın “temizliği” pozlama süresiyle değil,{' '}
                <strong className="text-foreground">
                  topladığınız foton sayısıyla
                </strong>{' '}
                belirlenir. Ve kötü haber şu: gürültü, sinyalden daha yavaş
                büyüdüğü için iyileşme gittikçe pahalılaşır —{' '}
                <strong className="text-foreground">
                  4 kat süre yalnızca 2 kat SNR
                </strong>{' '}
                verir. 1 saatlik veriyi iki katına çıkarmak kolay, 20 saatlik
                veriyi iki katına çıkarmak bir sezon demek.
              </p>

              <p className="mt-3 max-w-[65ch] text-body-sm leading-relaxed text-muted-foreground">
                Bunun pratik sonucu, çoğu kişinin sandığının tersi:{' '}
                <strong className="text-foreground">
                  daha iyi kamera almak genelde yanlış cevap
                </strong>
                . Gürültünüzün büyük kısmı gökyüzünden geliyorsa, kamerayı
                değiştirmek hiçbir şeyi değiştirmez — karanlık gökyüzü, doğru
                filtre ya da daha çok süre gerekir. Aşağıdaki simülatör
                gürültünüzün hangi kaynaktan geldiğini gösteriyor.
              </p>

              <dl className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
                {TERIMLER.map((t) => (
                  <div key={t.terim}>
                    <dt className="text-body-sm font-medium text-foreground">
                      {t.terim}
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
                Yazı buradan sonra sayısallaşıyor ama her bölüm kendi başına
                okunabilir; sıkıldığınız yerde hesaplayıcılara atlayıp kendi
                ekipmanınızı deneyebilirsiniz.
              </p>
            </section>

            <article ref={bodyRef} className="dz-root">
              {snrSegments.map((segment, index) => {
                if (segment.kind === 'widget') {
                  const Widget = WIDGETS[segment.id];
                  return <Widget key={`w-${segment.id}`} />;
                }
                return (
                  <Fragment key={`h-${index}`}>
                    {/* İçerik depoya işlenmiş sabit belge; üretici script
                        her koşuda script etiketi ve olay niteliği
                        olmadığını doğruluyor. */}
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
