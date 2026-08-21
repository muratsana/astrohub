import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { formatPhotoWeekLabel } from '@/features/photos/weeklyPick';

export function WeeklyPhoto({ hideWhenEmpty = true }: { hideWhenEmpty?: boolean }) {
  const catalog = usePhotoCatalog();
  const rounds = usePhotoWeekRounds();
  const round = rounds.rounds.find((item) => item.winnerPhotoId && ['sonuclandi', 'yayinda'].includes(item.status));
  const photo = round ? catalog.items.find((item) => item.id === round.winnerPhotoId) : undefined;
  const label = round
    ? formatPhotoWeekLabel(
        `${round.isoYear}-${String(round.isoWeek).padStart(2, '0')}`
      ).weekLabel
    : undefined;

  if (!photo && hideWhenEmpty && !rounds.loading) return null;

  return (
    <section className="border-y border-border bg-surface-1 py-9 sm:py-11">
      <Container>
        <SectionHeader
          title="Haftanın Fotoğrafı"
          meta={label}
          linkTo="/haftanin-fotografi"
          linkLabel="Arşiv"
        />
        {photo ? (
          <div className="max-w-xl"><PhotoCard photo={photo} /></div>
        ) : (
          <EmptyState message="Henüz haftalık kazanan yok" hint="İlk topluluk oylaması kapanınca burada görünecek." />
        )}
      </Container>
    </section>
  );
}
