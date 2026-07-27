import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * Hukuki/kurumsal metin sayfaları için ortak yerleşim.
 * Okuma genişliği ~70 karakterle sınırlanır; başlık hiyerarşisi net tutulur.
 */
export function LegalLayout({
  title,
  intro,
  updatedAt,
  children,
}: {
  title: string;
  intro?: string;
  /** Metnin son güncellenme tarihi (ISO). */
  updatedAt?: string;
  children: ReactNode;
}) {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10 border-b border-border pb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            {title}
          </h1>
          {intro && (
            <p className="mt-3 leading-relaxed text-muted-foreground">{intro}</p>
          )}
          {updatedAt && (
            <p className="tabular mt-4 text-xs text-muted-foreground/70">
              Son güncelleme:{' '}
              {new Date(updatedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </header>

        <div className="space-y-10">{children}</div>
      </div>
    </Container>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-link [&_a:hover]:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

/** Madde listesi — hukuki metinlerde sık kullanılan işaretli liste. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 marker:text-muted-foreground/50">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
