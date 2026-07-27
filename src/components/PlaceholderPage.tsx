import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

/**
 * Geçici sayfa şablonu. İlgili feature sprintinde gerçek içerikle
 * değiştirilecek route'lar için kullanılır.
 *
 * Süslü bir "yakında" ekranı değil, dürüst bir durum bildirimi: rozet
 * bölümün henüz yayında olmadığını söyler, metin ne geleceğini anlatır.
 */
export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="border-b border-border pb-6">
          <Badge tone="warning">Yapım aşamasında</Badge>
          <h1 className="mt-3 text-[22px] text-foreground sm:text-[26px]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>

        <p className="mt-4 rounded-card border border-border bg-surface-1 px-3 py-2.5 text-[12px] leading-relaxed text-muted-foreground">
          Bu bölüm geliştirme yol haritasında. Yayına alındığında burada gerçek
          içerik görünecek.
        </p>

        <div className="mt-6">
          <ButtonLink to="/" variant="secondary" size="sm">
            Ana Sayfa
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
