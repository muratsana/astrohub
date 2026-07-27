import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { learningItems as items, type LearningLevel as Level } from './data';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

const levels: (Level | 'hepsi')[] = ['hepsi', 'Başlangıç', 'Orta', 'İleri'];

/** Eğitim merkezi (§7.14): seviye filtresi + içerik kartları. */
export function LearningPage() {
  const [level, setLevel] = useState<Level | 'hepsi'>('hepsi');

  const result = useMemo(
    () => (level === 'hepsi' ? items : items.filter((i) => i.level === level)),
    [level]
  );

  return (
    <>
      <PageMeta
        title="Eğitim Merkezi"
        description="Başlangıçtan ileri seviyeye astronomi ve astrofotoğrafçılık rehberleri: setup kurulumu, kalibrasyon, narrowband işleme, guiding ve gökyüzü kalitesi."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Eğitim', path: '/egitim' },
        ])}
      />
      <Container className="py-10 sm:py-14">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Eğitim Merkezi
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Başlangıçtan ileri seviyeye astronomi ve astrofotoğrafçılık
            rehberleri.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Seviye filtresi"
          className="mb-8 flex gap-1.5"
        >
          {levels.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={level === l}
              onClick={() => setLevel(l)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                level === l
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {l === 'hepsi' ? 'Tümü' : l}
            </button>
          ))}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.map((item) => (
            <li
              key={item.slug}
              className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-surface-1 transition-colors hover:border-white/20"
            >
              <PhotoPlaceholder
                gradient={item.gradient}
                alt={item.title}
                rounded="rounded-none"
                className="aspect-[16/8] w-full"
              />
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs text-muted-foreground">
                  {item.category} · {item.duration}
                </p>
                <h2 className="mt-1 text-base font-semibold leading-snug text-foreground">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.summary}
                </p>
                <div className="mt-auto pt-3">
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
                </div>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-xs text-muted-foreground/70">
          İçerik detay sayfaları ve işleme laboratuvarı (ham veri setleri) Faz
          1.8'de yayına alınacak.
        </p>
      </Container>
    </>
  );
}
