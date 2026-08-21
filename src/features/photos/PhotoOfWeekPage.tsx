import { useMemo } from 'react';
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
import {
  isoWeekFromDateString,
  photoWeekArchive,
} from './weeklyPick';
import type { AstroPhoto } from './types';
import { ProfileInlineLink } from '@/components/user/ProfileInlineLink';

export function PhotoOfWeekPage() {
  const catalog = usePhotoCatalog();
  const rounds = usePhotoWeekRounds();
  const winners = photoWeekArchive(catalog.items, rounds.rounds);
  const current = winners[0];
  const activeRound = rounds.rounds.find((round) => round.status === 'oylama') ?? null;
  const activeRoundLabel = activeRound
    ? `${activeRound.isoYear}-${String(activeRound.isoWeek).padStart(2, '0')}`
    : isoWeekFromDateString(new Date().toISOString())?.label ?? null;
  const activeNominees = useMemo(() => {
    if (!activeRoundLabel) return [];
    const candidates = catalog.items.filter((photo) => {
      if (photo.photoOfWeekCandidates?.includes(activeRoundLabel)) return true;
      return (
        isoWeekFromDateString(photo.publishedAt ?? photo.capturedAt)?.label ===
        activeRoundLabel
      );
    });
    return candidates.sort(
      (a, b) =>
        averageRating(b) - averageRating(a) ||
        b.rating.sayi - a.rating.sayi ||
        new Date(a.publishedAt ?? a.capturedAt).getTime() -
          new Date(b.publishedAt ?? b.capturedAt).getTime()
    );
  }, [activeRoundLabel, catalog.items]);
  const hasActiveVote = activeNominees.length > 0;

  return (
    <>
      <PageMeta
        title="Haftanın Fotoğrafı"
        description="Topluluk oylamasıyla seçilen haftalık astrofotoğraflar ve kazanan arşivi."
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
          description="Haftanın seçimi, o hafta yüklenen fotoğraflara verilen topluluk puanlarıyla otomatik belirlenir."
          meta={winners.length > 0 ? `${winners.length} kazanan` : undefined}
        />

        {rounds.loading || catalog.status === 'loading' ? (
          <EmptyState message="Kazananlar yükleniyor" hint="Haftalık seçki arşivi hazırlanıyor." />
        ) : rounds.error || catalog.status === 'error' ? (
          <EmptyState message="Arşiv okunamadı" hint="Veri bağlantısı şu anda yanıt vermiyor." />
        ) : (
          <>
            {hasActiveVote && activeRound && (
              <section className="mb-10 rounded-card border border-border bg-surface-1 p-4">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <Badge tone="primary">Adaylar otomatik</Badge>
                    <h2 className="type-section mt-2 text-foreground">Haftanın Fotoğrafı adayları</h2>
                    <p className="mt-1 text-body-sm text-muted-foreground">
                      Bu hafta yayına alınan fotoğraflar adaydır. Dönem {new Date(activeRound.closesAt).toLocaleString('tr-TR')} tarihinde kapanır.
                    </p>
                  </div>
                  <p className="max-w-xl text-meta leading-relaxed text-muted-foreground">
                    Sıralama önce ortalama puana bakar. Ortalama eşitse daha çok değerlendirme alan fotoğraf öne geçer; bu da iki yüksek puanlı fotoğraf arasında daha geniş topluluk desteğini gösterir.
                  </p>
                </div>
                <CardGrid view="grid">
                  {activeNominees.map((photo) => (
                    <li key={photo.id ?? photo.slug}>
                      <PhotoCard photo={photo} />
                    </li>
                  ))}
                </CardGrid>
              </section>
            )}

            {!current && !hasActiveVote ? (
              <EmptyState message="Henüz tamamlanmış tur yok" hint="İlk topluluk oylaması kapanınca kazanan burada yayımlanacak." />
            ) : current ? (
              <>
                <section className="mb-10 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(280px,0.28fr)]">
                  <div>
                    <PhotoCard photo={current.photo} />
                  </div>
                  <div className="rounded-card border border-border bg-surface-1 p-4">
                    <Badge tone="success">Haftanın Fotoğrafı</Badge>
                    {current.yearLabel && (
                      <p className="mt-2 text-meta tabular text-faint">
                        {current.yearLabel}
                      </p>
                    )}
                    <h2 className="type-section mt-3 text-foreground">{current.photo.title}</h2>
                    <p className="mt-2 text-body-sm text-muted-foreground">
                      {current.photo.target.name} ·{' '}
                      <ProfileInlineLink username={current.photo.user.username} />
                    </p>
                    <p className="mt-5 text-meta leading-relaxed text-faint">
                      Kazanan, yükleme haftasındaki topluluk puanlarıyla otomatik belirlenir. Önce ortalama puan, eşitlikte değerlendirme sayısı, son eşitlikte yayın tarihi kullanılır.
                    </p>
                  </div>
                </section>

                {winners.length > 1 && (
                  <section>
                    <h2 className="type-section mb-3 text-foreground">
                      Geçmiş haftaların arşivi
                    </h2>
                    <CardGrid view="grid">
                      {winners.slice(1).map(({ id, photo }) => (
                        <li key={id}>
                          <div>
                            <PhotoCard photo={photo} />
                          </div>
                        </li>
                      ))}
                    </CardGrid>
                  </section>
                )}
              </>
            ) : (
              <EmptyState message="Kazanan bekleniyor" hint="Oylama kapanınca sistem haftanın fotoğrafını otomatik yayımlayacak." />
            )}
          </>
        )}
      </Container>
    </>
  );
}

function averageRating(photo: AstroPhoto) {
  return photo.rating.sayi > 0 ? photo.rating.toplam / photo.rating.sayi : 0;
}
