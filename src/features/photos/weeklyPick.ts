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

const ISTANBUL_UTC_OFFSET_HOURS = 3;

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

export function photoWeekClosesAtFromLabel(label: string): Date | null {
  const match = /^(\d{4})-(\d{1,2})$/.exec(label.trim());
  if (!match) return null;

  const isoYear = Number(match[1]);
  const isoWeek = Number(match[2]);
  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) return null;

  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Weekday = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Weekday + 1 + (isoWeek - 1) * 7);

  return new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + 6,
      23 - ISTANBUL_UTC_OFFSET_HOURS,
      59,
      0
    )
  );
}

export function isPhotoWeekLabelClosed(
  label: string,
  now = new Date()
): boolean {
  const closesAt = photoWeekClosesAtFromLabel(label);
  return Boolean(closesAt && closesAt.getTime() <= now.getTime());
}

export function isPhotoWeekRoundClosed(
  round: Pick<PhotoWeekRound, 'closesAt'>,
  now = new Date()
): boolean {
  const closesAt = new Date(round.closesAt);
  return (
    !Number.isNaN(closesAt.getTime()) && closesAt.getTime() <= now.getTime()
  );
}

function withWeekWin(photo: AstroPhoto, label: string): AstroPhoto {
  return (photo.photoOfWeekWins ?? []).includes(label)
    ? photo
    : { ...photo, photoOfWeekWins: [...(photo.photoOfWeekWins ?? []), label] };
}

function ratingAverage(photo: AstroPhoto) {
  return photo.rating.sayi > 0 ? photo.rating.toplam / photo.rating.sayi : 0;
}

export function compareWeeklyPhotoScore(a: AstroPhoto, b: AstroPhoto) {
  return (
    ratingAverage(b) - ratingAverage(a) ||
    b.rating.sayi - a.rating.sayi ||
    new Date(a.publishedAt ?? a.capturedAt).getTime() -
      new Date(b.publishedAt ?? b.capturedAt).getTime() ||
    a.slug.localeCompare(b.slug)
  );
}

export function bestRatedPhotoForWeek(
  photos: AstroPhoto[],
  label: string
): AstroPhoto | null {
  return (
    photos
      .filter((photo) => {
        if (photo.rating.sayi <= 0) return false;
        return (
          isoWeekFromDateString(photo.publishedAt ?? photo.capturedAt)
            ?.label === label
        );
      })
      .sort(compareWeeklyPhotoScore)[0] ?? null
  );
}

export function selectWeeklyPhoto(
  photos: AstroPhoto[],
  rounds: PhotoWeekRound[],
  now = new Date()
): WeeklyPick | null {
  const completed = rounds.filter(
    (round) =>
      round.winnerPhotoId &&
      ['sonuclandi', 'yayinda'].includes(round.status) &&
      isPhotoWeekRoundClosed(round, now)
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

  const previous = photos.find((photo) =>
    (photo.photoOfWeekWins ?? []).some((label) =>
      isPhotoWeekLabelClosed(label, now)
    )
  );
  if (previous) {
    const label = previous
      .photoOfWeekWins!.filter((item) => isPhotoWeekLabelClosed(item, now))
      .at(-1)!;
    return {
      photo: withWeekWin(previous, label),
      label,
      ...formatPhotoWeekLabel(label),
    };
  }

  const closedLabels = [
    ...new Set(
      photos
        .map(
          (photo) =>
            isoWeekFromDateString(photo.publishedAt ?? photo.capturedAt)?.label
        )
        .filter((label): label is string =>
          Boolean(label && isPhotoWeekLabelClosed(label, now))
        )
    ),
  ].sort((a, b) => b.localeCompare(a));

  for (const label of closedLabels) {
    const automatic = bestRatedPhotoForWeek(photos, label);
    if (automatic) {
      return {
        photo: withWeekWin(automatic, label),
        label,
        ...formatPhotoWeekLabel(label),
      };
    }
  }

  return null;
}

export function photoWeekArchive(
  photos: AstroPhoto[],
  rounds: PhotoWeekRound[],
  now = new Date()
): WeeklyArchiveItem[] {
  const archive = rounds.flatMap((round) => {
    if (
      !round.winnerPhotoId ||
      !['sonuclandi', 'yayinda'].includes(round.status) ||
      !isPhotoWeekRoundClosed(round, now)
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
      (photo.photoOfWeekWins ?? [])
        .filter((label) => isPhotoWeekLabelClosed(label, now))
        .map((label) => ({
          id: `${photo.slug}-${label}`,
          photo,
          label,
          ...formatPhotoWeekLabel(label),
        }))
    )
    .sort((a, b) => b.label.localeCompare(a.label));
}
