import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardGrid } from '@/components/ui/CardGrid';
import { Badge } from '@/components/ui/Badge';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { PhotoCard } from './PhotoCard';

export function PhotoOfWeekPage() {
  const catalog = usePhotoCatalog();
  const rounds = usePhotoWeekRounds();
  const completed = rounds.rounds.filter(
    (round) => round.winnerPhotoId && ['sonuclandi', 'yayinda'].includes(round.status)
  );
  const winners = completed.flatMap((round) => {
    const photo = catalog.items.find((item) => item.id === round.winnerPhotoId);
    return photo ? [{ round, photo }] : [];
  });
  const current = winners[0];

  return (
    <>
      <PageMeta
        title="Haftanın Fotoğrafı"
        description="AstroHub jürisinin haftalık olarak seçtiği astrofotoğraflar ve kazanan arşivi."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Galeri', path: '/galeri' },
          { name: 'Haftanın Fotoğrafı', path: '/haftanin-fotografi' },
        ])}
      />
      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[{ label: 'Galeri', to: '/galeri' }, { label: 'Haftanın Fotoğrafı' }]}
          title="Haftanın Fotoğrafı"
          description="Dönemli jüri üyeleri adayları birbirinden bağımsız puanlar; oylar tur kapanana kadar gizli kalır."
          meta={winners.length > 0 ? `${winners.length} kazanan` : undefined}
        />

        {rounds.loading || catalog.status === 'loading' ? (
          <EmptyState message="Kazananlar yükleniyor" hint="Haftalık seçki arşivi hazırlanıyor." />
        ) : rounds.error || catalog.status === 'error' ? (
          <EmptyState message="Arşiv okunamadı" hint="Veri bağlantısı şu anda yanıt vermiyor." />
        ) : !current ? (
          <EmptyState message="Henüz tamamlanmış tur yok" hint="İlk jüri turu sonuçlandığında kazanan burada yayımlanacak." />
        ) : (
          <>
            <section className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
              <PhotoCard photo={current.photo} />
              <div className="rounded-card border border-border bg-surface-1 p-4">
                <Badge tone="success">{current.round.isoYear}-{String(current.round.isoWeek).padStart(2, '0')}</Badge>
                <h2 className="type-section mt-3 text-foreground">{current.photo.title}</h2>
                <p className="mt-2 text-body-sm text-muted-foreground">{current.photo.target.name} · @{current.photo.user.username}</p>
                <p className="mt-5 text-meta leading-relaxed text-faint">Kazanan; toplam jüri puanı, eşitlikte oy veren jüri sayısı ve ardından daha erken yayın tarihi sırasıyla belirlenir.</p>
              </div>
            </section>

            {winners.length > 1 && (
              <section>
                <h2 className="type-section mb-3 text-foreground">Kazanan arşivi</h2>
                <CardGrid view="grid">
                  {winners.slice(1).map(({ round, photo }) => (
                    <li key={round.id}><PhotoCard photo={photo} /></li>
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
