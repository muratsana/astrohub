import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { heroPhotos } from '../data';

/**
 * Editoryal giriş alanı (§7.1). Full-width hero banner YOK (§22).
 * Sol: kısa başlık + iki satır açıklama + birincil/ikincil CTA.
 * Sağ: dört dikey astrofotoğraf kartı, kullanıcı kontrollü yatay kaydırma.
 */
export function HeroSection() {
  return (
    <section className="pt-10 sm:pt-14 lg:pt-16">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-14">
          {/* Sol sütun */}
          <div>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Gökyüzünü <span className="text-primary">keşfet</span>,<br />
              paylaş, öğren.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Astrofotoğrafçılık tutkunları için ilham verici bir topluluk.
              Bilgini paylaş, yeni yerler keşfet, birlikte büyüyelim.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/fotograflar" size="lg">
                Fotoğrafları Keşfet
              </ButtonLink>
              <ButtonLink to="/harita" size="lg" variant="secondary">
                Haritayı Aç
              </ButtonLink>
            </div>
          </div>

          {/* Sağ sütun: dikey fotoğraf seçkisi */}
          <div
            className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="list"
            aria-label="Öne çıkan astrofotoğraflar seçkisi"
          >
            {heroPhotos.map((photo) => (
              <Link
                key={photo.id}
                to={`/fotograf/${photo.id}`}
                role="listitem"
                className="group relative aspect-[3/4] w-44 shrink-0 sm:w-52 lg:w-56"
              >
                <PhotoPlaceholder
                  gradient={photo.gradient}
                  alt={`${photo.title} — @${photo.user}`}
                  className="h-full w-full border border-border transition-transform duration-300 group-hover:-translate-y-1"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-card bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {photo.title}
                  </p>
                  <p className="text-xs text-muted-foreground">@{photo.user}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
