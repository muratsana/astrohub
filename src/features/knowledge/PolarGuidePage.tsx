import { Fragment, useEffect, useRef, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PageMeta } from '@/components/seo/PageMeta';
import { ButtonLink } from '@/components/ui/Button';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import {
  kutupSegments,
  kutupToc,
  type KutupWidgetId,
} from './kutup/content.generated';
import { PolarSimulator } from './kutup/widgets/PolarSimulator';
import { ToleranceCalculator } from './kutup/widgets/ToleranceCalculator';
import { GraphReader } from './kutup/widgets/GraphReader';
import { DriftCalculator } from './kutup/widgets/DriftCalculator';
import './drizzle/drizzle.css';

/**
 * KUTUP HİZALAMASI — uzun form teknik rehber.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DRIZZLE VE SNR REHBERLERİYLE AYNI DESEN
 *
 * Gövde derleme öncesi üretiliyor (`scripts/kutup-icerik.mjs`), çalışma
 * zamanında markdown ayrıştırıcısı yok, araçlar ayrı React bileşenleri.
 * Neden böyle olduğu `DrizzleGuidePage` başlığında yazılı; burada
 * tekrarlanmıyor.
 *
 * STİL DOSYASI PAYLAŞILIYOR. `drizzle.css` içe aktarılıyor çünkü paketin
 * kendi belgesi de "üçü de `.dz-root` altında, aynı tasarım sistemi"
 * diyor. Bu paketin getirdiği birkaç sınıf (PHD2 kutusu, hap düğmeler) o
 * dosyaya eklendi; ikinci bir kopya çıkarmak ilk tema düzeltmesinde
 * ayrışacak iki dosya demekti.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖNCEKİ İKİ REHBERDEN FARK: ŞEKİLLER JS İLE ÇİZİLMİYOR
 *
 * SNR paketinde dört şekil çalışma zamanında çiziliyordu ve ikisi ayrı
 * turlarda canlıda boş/siyah yayınlandı. Bu pakette 13 SVG doğrudan
 * işaretlemede; yine de üretici gövdeyi tarıyor (boş çizim kabı, değeri
 * `null` olan nitelik, şekil sayısı) ve biri tutmazsa DURUYOR.
 *
 * Fizik çekirdeği paketin JS sürümüyle test ediliyor
 * (`kutup/core.test.ts`): elle port edilen iki kopyanın sessizce
 * ayrışmasını engelliyor — `makeTrace` dahil, dizi dizi.
 */

const WIDGETS: Record<KutupWidgetId, () => React.ReactElement> = {
  simulator: PolarSimulator,
  tolerance: ToleranceCalculator,
  graph: GraphReader,
  drift: DriftCalculator,
};

const PUBLISHED = '2026-08-06';

/**
 * KARŞILAMA KUTUSU — makalenin önüne, içine değil.
 *
 * Diğer iki rehberde de var ve aynı gerekçeyle: makale birkaç paragraf
 * sonra "alan dönmesi", "saat açısı", "deklinasyon sürüklenmesi" diyor.
 * Terimleri bilmeyen için giriş bir duvar, oysa asıl cevap üç cümlede
 * verilebiliyor.
 *
 * Üretilen gövdeye DOKUNULMUYOR: içerik her derlemede kaynaktan yeniden
 * üretiliyor, oraya elle yazılan bir şey ilk üretimde silinirdi.
 */
const TERIMLER: { terim: string; karsilik: string; aciklama: string }[] = [
  {
    terim: 'Sürüklenme',
    karsilik: 'yıldızın yavaşça kayması',
    aciklama:
      'Montürün ekseni gök kutbuna tam bakmıyorsa hedef kadraj içinde yavaşça kayar. Guiding bunu düzeltir — sürüklenme guiding varken sorun olmaktan çıkar.',
  },
  {
    terim: 'Alan dönmesi',
    karsilik: 'kadrajın kendi etrafında dönmesi',
    aciklama:
      'Aynı hatanın ikinci sonucu: kadraj rehber yıldızın etrafında döner. Guiding bunu DÜZELTEMEZ; köşedeki yıldızlar yay çizer. Kutup hizalamasının asıl sınırı budur.',
  },
  {
    terim: 'Tolerans',
    karsilik: 'ne kadar hata kabul edilebilir',
    aciklama:
      'Sabit bir sayı yok: odak uzunluğu, sensör, poz süresi ve hedefin deklinasyonu birlikte belirler. Aşağıdaki hesaplayıcı sizin kurulumunuzun sınırını veriyor.',
  },
];

export function PolarGuidePage() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState(kutupToc[0]?.id ?? '');

  /*
   * İçindekilerde bulunduğun yeri işaretle. `IntersectionObserver`
   * kullanılıyor çünkü scroll dinleyicisi her karede düzen okuması
   * yaptırıyor ve uzun bir belgede bu ölçülebilir bir maliyet.
   */
  useEffect(() => {
    const root = bodyRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;

    const targets = kutupToc
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
        title="Kutup Hizalaması: Sıfırdan Tam Rehber"
        description="Ne kadar iyi hizalamak gerekiyor? Sürüklenme, alan dönmesi ve PHD2 grafiğini okuma — canlı simülatör, teşhis aracı ve iki hesaplayıcıyla."
        ogType="article"
        publishedTime={PUBLISHED}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Yazılar', path: '/yazilar' },
            { name: 'Kutup Hizalaması', path: '/yazilar/kutup-hizalamasi' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'TechArticle',
            headline: 'Kutup Hizalaması: Sıfırdan Tam Rehber',
            datePublished: PUBLISHED,
            inLanguage: 'tr-TR',
            url: absoluteUrl('/yazilar/kutup-hizalamasi'),
            author: { '@type': 'Organization', name: 'Astrohub' },
          },
        ]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Yazılar', to: '/yazilar' },
            { label: 'Kutup Hizalaması' },
          ]}
          title="Kutup Hizalaması: Sıfırdan Tam Rehber"
          description="Herkes yapmanız gerektiğini söylüyor; kimse ne kadar iyi yapmanız gerektiğini söylemiyor. Hatanın kareye yansımasını kendi ekipmanınızla görün."
          actions={
            /* Yazıdaki hesaplar odak uzunluğu ve sensöre bağlı; kadraj
               aracı okurun kendi kurulumunun piksel ölçeğini veriyor. */
            <ButtonLink to="/araclar/kadraj" size="sm" variant="secondary">
              Kadraj ve piksel ölçeği
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
              {kutupToc.map((entry) => (
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
              aria-labelledby="kutup-giris"
              className="metin-yasli mb-8 rounded-card border border-border-strong bg-surface-1 p-4 sm:p-5"
            >
              <h2
                id="kutup-giris"
                className="type-section mb-2 text-foreground"
              >
                Hiç duymadıysanız: en kısa cevap
              </h2>
              <p className="text-body-sm leading-relaxed text-muted-foreground">
                Montürünüzün dönme ekseni gök kutbuna tam bakmıyorsa iki şey
                olur. Birincisi hedef kadraj içinde yavaşça{' '}
                <strong className="text-foreground">kayar</strong> — ama
                guiding bunu düzeltir, dolayısıyla asıl sorun bu değildir.
                İkincisi kadrajın kendisi yavaşça{' '}
                <strong className="text-foreground">döner</strong> ve{' '}
                <strong className="text-foreground">
                  guiding bunu düzeltemez
                </strong>
                : köşedeki yıldızlar yay çizer.
              </p>

              <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
                Bu yüzden &quot;ne kadar iyi hizalamalıyım?&quot; sorusunun
                tek bir cevabı yok. 135 mm objektifle 60 saniyelik pozda 20
                yay dakikası hata bile görünmez; 1000 mm&apos;de 10 dakikalık
                pozda 2 yay dakikası kareyi bozar. Aşağıdaki simülatör farkı
                gerçek piksel ölçeğinde gösteriyor — sizin ekipmanınızla.
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
                okunabilir; sıkıldığınız yerde araçlara atlayıp kendi
                ekipmanınızı deneyebilirsiniz.
              </p>
            </section>

            <article ref={bodyRef} className="dz-root">
              {kutupSegments.map((segment, index) => {
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
