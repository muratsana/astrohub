import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { SparkleIcon } from '@/components/ui/icons';

/**
 * Geçici sayfa şablonu. İlgili feature sprintinde gerçek içerikle
 * değiştirilecek route'lar için kullanılır.
 */
export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-4 rounded-full border border-border bg-surface-2 p-4 text-primary">
        <SparkleIcon className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-3 max-w-md text-muted-foreground">{description}</p>
      )}
      <p className="mt-2 text-sm text-muted-foreground/70">
        Bu bölüm geliştirme yol haritasında; yakında yayında olacak.
      </p>
      <ButtonLink to="/" variant="secondary" className="mt-8">
        Ana sayfaya dön
      </ButtonLink>
    </Container>
  );
}
