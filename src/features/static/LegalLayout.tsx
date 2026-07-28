import type { ReactNode } from 'react';
import { Container } from '@/components/ui/Container';

/**
 * Hukuki/kurumsal metin sayfaları için ortak yerleşim.
 *
 * Sitenin geri kalanı büyük harf ve dar satır aralığıyla çalışır; burada
 * gövde metni bilerek daha rahat nefes alır (14px, 1.75 satır aralığı).
 * Hukuki metin taranmaz, okunur — yoğunluk burada erdem değil.
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
      <div className="mx-auto max-w-[68ch]">
        <header className="mb-9 border-b border-border pb-6">
          <h1 className="text-[24px] text-foreground sm:text-[28px]">{title}</h1>
          {intro && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              {intro}
            </p>
          )}
          {updatedAt && (
            <p className="tabular mt-4 text-[10px] tracking-[0.03em] text-faint">
              Son güncelleme:{' '}
              {new Date(updatedAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </header>

        <div className="space-y-9">{children}</div>
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
      <div className="mb-3 flex items-center gap-3">
        <h2 className="whitespace-nowrap text-[15px] text-foreground">
          {heading}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-3 text-[13px] leading-[1.75] text-muted-foreground [&_a]:text-link [&_a:hover]:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

/** Madde listesi — hukuki metinlerde sık kullanılan işaretli liste. */
export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="ml-4 list-disc space-y-1.5 marker:text-primary/50">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
