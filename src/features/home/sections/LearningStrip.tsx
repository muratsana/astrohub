import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { learningItems } from '@/features/learning/data';

/**
 * EĞİTİM — ana sayfanın son bölümü.
 *
 * Görselsiz, tipografi odaklı üç giriş: eğitim içeriği bir "prosedür"
 * gibi okunur, dekoratif kapak görseline ihtiyaç duymaz.
 */
export function LearningStrip() {
  const featured = learningItems.slice(0, 3);

  return (
    <Container className="py-12 sm:py-14">
      <SectionHeader
        title="Eğitim"
        meta={`${learningItems.length} içerik`}
        description="Kalibrasyondan narrowband işlemeye, sahadan işleme masasına."
        linkTo="/egitim"
        linkLabel="Tüm içerikler"
      />

      <ul className="grid gap-px border border-border bg-border md:grid-cols-3">
        {featured.map((item, i) => (
          <li key={item.slug}>
            <Link
              to={`/egitim/${item.slug}`}
              className="group flex h-full flex-col bg-surface-1 p-4 transition-colors hover:bg-surface-2"
            >
              <span className="tabular label mb-3 text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[15px] leading-snug text-foreground transition-colors group-hover:text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
                {item.summary}
              </p>
              <span className="mt-auto flex items-center gap-2 pt-4">
                <Badge
                  tone={
                    item.level === 'Başlangıç'
                      ? 'success'
                      : item.level === 'Orta'
                        ? 'primary'
                        : 'danger'
                  }
                >
                  {item.level}
                </Badge>
                <span className="tabular text-[10px] text-faint">
                  {item.duration}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
