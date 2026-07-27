import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import {
  GalleryMock,
  EventsMock,
  FieldMock,
  ToolsMock,
  ContentMock,
} from './hero/mockups';

/**
 * HERO — navigasyonun hemen altında, sitenin ne yaptığını tek ekranda anlatan
 * görsel set.
 *
 * Beş mockup, beş ana modülü temsil eder ve her biri o modülün **gerçek
 * arayüz diliyle** çizilmiş minyatürüdür (ekran görüntüsü değil). Tasarım
 * değiştiğinde hero da kendiliğinden güncellenir; hiçbir yerde eskimiş bir
 * görsel kalmaz.
 *
 * Mockup'lar merdiven biçiminde kaydırılır: ortadaki en yüksekte durur,
 * kenarlara doğru alçalır. Bu, beş eşit kutunun yarattığı tekdüzeliği kırar
 * ve gözü ortadaki "Saha" karosuna çeker.
 */

interface HeroModule {
  label: string;
  caption: string;
  to: string;
  mock: () => React.ReactElement;
  /** Merdiven ofseti — dikey kayma sınıfı. */
  offset: string;
}

const modules: HeroModule[] = [
  {
    label: 'Galeri',
    caption: 'Künyeli astrofotoğraf arşivi',
    to: '/galeri',
    mock: GalleryMock,
    offset: 'lg:mt-10',
  },
  {
    label: 'Etkinlikler',
    caption: 'Türkiye astronomi takvimi',
    to: '/etkinlikler',
    mock: EventsMock,
    offset: 'lg:mt-5',
  },
  {
    label: 'Saha',
    caption: 'Karanlık gökyüzü noktaları',
    to: '/saha',
    mock: FieldMock,
    offset: 'lg:mt-0',
  },
  {
    label: 'Araçlar',
    caption: 'FOV, pixel scale, ışık kirliliği',
    to: '/araclar',
    mock: ToolsMock,
    offset: 'lg:mt-5',
  },
  {
    label: 'Yazılar & Haberler',
    caption: 'Rehberler ve güncel gündem',
    to: '/yazilar',
    mock: ContentMock,
    offset: 'lg:mt-10',
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Zemin: çok sönük bir ızgara dokusu — enstrüman paneli hissi */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(120% 90% at 50% 0%, #000 25%, transparent 75%)',
        }}
      />

      <Container className="relative py-12 sm:py-16">
        {/* Slogan ve açıklama */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="label mb-5 text-cold">
            Türkiye Gözlem Ağı · Gözlem · Kayıt · Paylaşım
          </p>

          <h1 className="text-[38px] leading-[0.98] text-foreground sm:text-[54px] lg:text-[64px]">
            Gökyüzünü <span className="text-primary">kaydet</span>,
            <br />
            paylaş, planla.
          </h1>

          <p className="mx-auto mt-6 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">
            Astrofotoğraflarını teknik künyesiyle arşivle. Türkiye'deki gözlem
            etkinliklerini tek takvimden takip et. Karanlık gökyüzü noktalarını
            bul, gökyüzü araçlarıyla geceni planla, rehberleri oku ve ekipmanını
            topluluk içinde al-sat.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <ButtonLink to="/galeri" size="lg">
              Galeriyi aç
            </ButtonLink>
            <ButtonLink to="/galeri/yukle" size="lg" variant="secondary">
              Fotoğrafını yükle
            </ButtonLink>
          </div>
        </div>

        {/* Beş modül mockup'ı */}
        <div className="mt-12 sm:mt-14">
          <ul
            className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:items-start lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
            aria-label="Astrohub modülleri"
          >
            {modules.map((module) => {
              const Mock = module.mock;
              return (
                <li
                  key={module.label}
                  className={`w-[210px] shrink-0 snap-start sm:w-[240px] lg:w-auto ${module.offset}`}
                >
                  <Link
                    to={module.to}
                    className="group block rounded-card border border-border bg-surface-1 transition-colors hover:border-primary"
                  >
                    {/* Mockup penceresi: üstte cihaz şeridi, altta minyatür UI */}
                    <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-1.5">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-primary/70 transition-colors group-hover:bg-primary"
                      />
                      <span className="truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
                        {module.label}
                      </span>
                    </div>

                    <div className="h-[196px] overflow-hidden bg-background">
                      <Mock />
                    </div>

                    <p className="border-t border-border px-2.5 py-2 text-[10.5px] leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
                      {module.caption}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-center text-[10px] uppercase tracking-[0.16em] text-faint lg:hidden">
            ← kaydır →
          </p>
        </div>
      </Container>
    </section>
  );
}
