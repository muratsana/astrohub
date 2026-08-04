import type { PhotoWeekRound } from '@/services/content/photoOfWeek';
import type { AstroPhoto } from './types';

export interface WeeklyPick {
  photo: AstroPhoto;
  label: string;
}

export function selectWeeklyPhoto(
  photos: AstroPhoto[],
  rounds: PhotoWeekRound[]
): WeeklyPick | null {
  const completed = rounds.filter(
    (round) =>
      round.winnerPhotoId &&
      ['sonuclandi', 'yayinda'].includes(round.status)
  );

  for (const round of completed) {
    const photo = photos.find((item) => item.id === round.winnerPhotoId);
    if (photo) {
      return {
        photo,
        label: `${round.isoYear}-${String(round.isoWeek).padStart(2, '0')}`,
      };
    }
  }

  const previous = photos.find((photo) => (photo.photoOfWeekWins?.length ?? 0) > 0);
  if (previous) {
    return {
      photo: previous,
      label: previous.photoOfWeekWins!.at(-1)!,
    };
  }

  const editor = photos.find((photo) => photo.editorsPick) ?? photos[0];
  return editor ? { photo: editor, label: 'Editör seçimi' } : null;
}
