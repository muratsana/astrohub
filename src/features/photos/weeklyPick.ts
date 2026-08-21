import type { PhotoWeekRound } from '@/services/content/photoOfWeek';
import type { AstroPhoto } from './types';

export interface WeeklyPick {
  photo: AstroPhoto;
  label: string;
  weekLabel: string;
  yearLabel: string | null;
}

export interface WeeklyArchiveItem extends WeeklyPick {
  id: string;
}

export function formatPhotoWeekLabel(label: string): {
  weekLabel: string;
  yearLabel: string | null;
} {
  const match = /^(\d{4})-(\d{1,2})$/.exec(label.trim());
  if (!match) return { weekLabel: label, yearLabel: null };
  return { weekLabel: `${Number(match[2])}. Hafta`, yearLabel: match[1] };
}

export interface IsoWeekKey {
  isoYear: number;
  isoWeek: number;
  label: string;
}

export function isoWeekFromDate(date: Date): IsoWeekKey {
  const dayMs = 24 * 60 * 60 * 1000;
  const value = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const weekday = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((value.getTime() - yearStart.getTime()) / dayMs + 1) / 7
  );
  const isoYear = value.getUTCFullYear();
  return {
    isoYear,
    isoWeek: week,
    label: `${isoYear}-${String(week).padStart(2, '0')}`,
  };
}

export function isoWeekLabelFromDate(date: Date): string {
  return isoWeekFromDate(date).label;
}

export function isoWeekFromDateString(
  value: string | null | undefined
): IsoWeekKey | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return isoWeekFromDate(date);
}

export function photoWeekLabelFromDateString(
  value: string | null | undefined
): {
  label: string;
  weekLabel: string;
  yearLabel: string | null;
} | null {
  const week = isoWeekFromDateString(value);
  if (!week) return null;
  const label = week.label;
  return { label, ...formatPhotoWeekLabel(label) };
}

function withWeekWin(photo: AstroPhoto, label: string): AstroPhoto {
  return (photo.photoOfWeekWins ?? []).includes(label)
    ? photo
    : { ...photo, photoOfWeekWins: [...(photo.photoOfWeekWins ?? []), label] };
}

export function selectWeeklyPhoto(
  photos: AstroPhoto[],
  rounds: PhotoWeekRound[],
  now = new Date()
): WeeklyPick | null {
  const completed = rounds.filter(
    (round) =>
      round.winnerPhotoId && ['sonuclandi', 'yayinda'].includes(round.status)
  );

  for (const round of completed) {
    const photo = photos.find((item) => item.id === round.winnerPhotoId);
    if (photo) {
      const label = `${round.isoYear}-${String(round.isoWeek).padStart(2, '0')}`;
      return {
        photo: withWeekWin(photo, label),
        label,
        ...formatPhotoWeekLabel(label),
      };
    }
  }

  const previous = photos.find(
    (photo) => (photo.photoOfWeekWins?.length ?? 0) > 0
  );
  if (previous) {
    const label = previous.photoOfWeekWins!.at(-1)!;
    return {
      photo: withWeekWin(previous, label),
      label,
      ...formatPhotoWeekLabel(label),
    };
  }

  const editor = photos.find((photo) => photo.editorsPick) ?? photos[0];
  const fallbackLabel = isoWeekLabelFromDate(now);
  return editor
    ? {
        photo: withWeekWin(editor, fallbackLabel),
        label: fallbackLabel,
        ...formatPhotoWeekLabel(fallbackLabel),
      }
    : null;
}

export function photoWeekArchive(
  photos: AstroPhoto[],
  rounds: PhotoWeekRound[]
): WeeklyArchiveItem[] {
  const archive = rounds.flatMap((round) => {
    if (
      !round.winnerPhotoId ||
      !['sonuclandi', 'yayinda'].includes(round.status)
    ) {
      return [];
    }
    const photo = photos.find((item) => item.id === round.winnerPhotoId);
    if (!photo) return [];
    const label = `${round.isoYear}-${String(round.isoWeek).padStart(2, '0')}`;
    return [
      {
        id: round.id,
        photo: withWeekWin(photo, label),
        label,
        ...formatPhotoWeekLabel(label),
      },
    ];
  });

  if (archive.length > 0) return archive;

  return photos
    .flatMap((photo) =>
      (photo.photoOfWeekWins ?? []).map((label) => ({
        id: `${photo.slug}-${label}`,
        photo,
        label,
        ...formatPhotoWeekLabel(label),
      }))
    )
    .sort((a, b) => b.label.localeCompare(a.label));
}
