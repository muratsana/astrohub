import type { PhotoWeekRound } from '@/services/content/photoOfWeek';
import type { AstroPhoto } from '@/features/photos/types';
import { isoWeekFromDateString } from '@/features/photos/weeklyPick';

export function roundLabel(round: Pick<PhotoWeekRound, 'isoYear' | 'isoWeek'>) {
  return `${round.isoYear}-${String(round.isoWeek).padStart(2, '0')}`;
}

export function photoNominationWeek(photo: AstroPhoto | null | undefined) {
  return isoWeekFromDateString(photo?.publishedAt ?? photo?.capturedAt);
}

export function findCandidateRoundForPhoto(
  rounds: PhotoWeekRound[],
  photo: AstroPhoto | null | undefined
) {
  const week = photoNominationWeek(photo);
  if (!week) return null;
  return (
    rounds.find(
      (round) =>
        round.status === 'aday_toplama' &&
        round.isoYear === week.isoYear &&
        round.isoWeek === week.isoWeek
    ) ?? null
  );
}
