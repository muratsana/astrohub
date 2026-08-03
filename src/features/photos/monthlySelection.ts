import type { AstroPhoto } from './types';

export interface MonthlySelectionItem {
  photo: AstroPhoto;
  score: number;
  parts: {
    rating: number;
    engagement: number;
    editor: number;
  };
}

export interface MonthlySelection {
  month: string;
  items: MonthlySelectionItem[];
}

export function monthKey(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  return date.slice(0, 7);
}

export function latestMonthWithPhotos(photos: AstroPhoto[]): string | null {
  const months = photos
    .map((photo) => monthKey(photo.capturedAt))
    .filter((month): month is string => month !== null)
    .sort()
    .reverse();
  return months[0] ?? null;
}

export function monthlySelectionScore(photo: AstroPhoto): MonthlySelectionItem {
  const avg = photo.rating.sayi > 0 ? photo.rating.toplam / photo.rating.sayi : 0;
  const confidence = Math.min(photo.rating.sayi, 10) / 10;
  const rating = photo.rating.sayi > 0 ? (avg / 10) * 42 + confidence * 8 : 0;
  const engagement =
    (Math.min(photo.likes, 400) / 400) * 28 +
    (Math.min(photo.comments, 70) / 70) * 12;
  const editor = photo.editorsPick ? 10 : 0;

  return {
    photo,
    score: Math.round((rating + engagement + editor) * 10) / 10,
    parts: {
      rating: Math.round(rating * 10) / 10,
      engagement: Math.round(engagement * 10) / 10,
      editor,
    },
  };
}

export function buildMonthlySelection(
  photos: AstroPhoto[],
  {
    limit = 12,
    month = latestMonthWithPhotos(photos),
  }: { limit?: number; month?: string | null } = {}
): MonthlySelection | null {
  if (!month) return null;

  const items = photos
    .filter((photo) => monthKey(photo.capturedAt) === month)
    .map(monthlySelectionScore)
    .sort((a, b) => b.score - a.score || a.photo.title.localeCompare(b.photo.title, 'tr'))
    .slice(0, limit);

  return { month, items };
}
