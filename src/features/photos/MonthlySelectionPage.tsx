import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';
import { CardGrid } from '@/components/ui/CardGrid';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { usePhotoCatalog } from '@/services/content/photos';
import { PhotoCard } from './PhotoCard';
import { buildMonthlySelection, type MonthlySelectionItem } from './monthlySelection';

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat('tr-TR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthNumber - 1, 1));
}

function scoreLabel(score: number): string {
  return score.toLocaleString('tr-TR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: score % 1 === 0 ? 0 : 1,
  });
}

function ScoreBreakdown({ item }: { item: MonthlySelectionItem }) {
  const rows = [
    ['Puan', item.parts.rating],
    ['Etkileşim', item.parts.engagement],
    ['Editör', item.parts.editor],
  ] as const;

  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-border bg-border">
      {rows.map(([label, value]) => (
        <div key={label} className="bg-background px-3 py-2">
          <dt className="label caps text-faint">{label}</dt>
          <dd className="tabular mt-1 text-body-sm font-semibold text-foreground">
            {scoreLabel(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function MonthlySelectionPage() {
  const catalog = usePhotoCatalog();
  const selection = useMemo(
    () => buildMonthlySelection(catalog.items, { limit: 12 }),
    [catalog.items]
  );
  const featured = selection?.items[0] ?? null;
  const rest = selection?.items.slice(1) ?? [];
  const title = selection ? `${formatMonth(selection.month)} seçkisi` : 'Aylık Seçki';

  return (
    <>
      <PageMeta
        title="Aylık Seçki"
        description="Astrohub galerisindeki yayınlanmış astrofotoğraflardan aylık seçki adayları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Galeri', path: '/galeri' },
          { name: 'Aylık Seçki', path: '/secki' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title={title}
          description="Yayınlanmış fotoğraflar; oy ortalaması, oy güveni, beğeni, yorum ve editör işaretine göre sıralanır."
          meta={selection ? `${selection.items.length} aday` : undefined}
          breadcrumb={[
            { label: 'Galeri', to: '/galeri' },
            { label: 'Aylık Seçki' },
          ]}
          actions={
            <ButtonLink to="/galeri" size="sm" variant="secondary">
              Galeriye dön
            </ButtonLink>
          }
        />

        <CatalogSourceNote selection={catalog} />

        {catalog.status === 'loading' ? (
          <EmptyState
            message="Seçki hazırlanıyor"
            hint="Yayınlanmış fotoğraflar okunduktan sonra aylık aday listesi çizilecek."
          />
        ) : catalog.status === 'error' ? (
          <EmptyState
            message="Seçki okunamadı"
            hint="Galeri bağlantısı şu anda yanıt vermiyor."
          />
        ) : !featured ? (
          <EmptyState
            message="Seçki için yayınlanmış fotoğraf yok"
            hint="Aylık liste yalnızca yayındaki galeri kayıtlarından oluşturulur."
            action={<ButtonLink to="/galeri/yukle" size="sm">Fotoğraf yükle</ButtonLink>}
          />
        ) : (
          <>
            <section className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
              <PhotoCard photo={featured.photo} />

              <div className="flex min-w-0 flex-col justify-between rounded-card border border-border bg-surface-1 p-4">
                <div>
                  <p className="label caps text-primary">Ayın öne çıkan adayı</p>
                  <h2 className="type-section mt-2 text-foreground">
                    {featured.photo.title}
                  </h2>
                  <p className="mt-2 text-meta leading-relaxed text-muted-foreground">
                    {featured.photo.target.catalog} · @{featured.photo.user.username}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="tabular text-3xl font-semibold text-primary">
                    {scoreLabel(featured.score)}
                  </p>
                  <p className="mt-1 text-meta text-muted-foreground">
                    Seçki puanı
                  </p>
                  <div className="mt-4">
                    <ScoreBreakdown item={featured} />
                  </div>
                </div>
              </div>
            </section>

            {rest.length > 0 && (
              <section>
                <SectionHeader
                  title="Diğer Adaylar"
                  meta={`${rest.length} fotoğraf`}
                  linkTo="/galeri"
                  linkLabel="Galeri"
                />
                <CardGrid view="grid">
                  {rest.map((item) => (
                    <li key={item.photo.slug}>
                      <PhotoCard photo={item.photo} />
                    </li>
                  ))}
                </CardGrid>
              </section>
            )}
          </>
        )}
      </Container>
    </>
  );
}
