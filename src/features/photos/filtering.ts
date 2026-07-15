import { totalIntegrationSeconds } from '@/domain/photography/integration';
import type { AstroPhoto, PhotoType, ProcessingPalette } from './types';

/** Galeri filtre durumu (§7.2). MVP alt kümesi; kalanı Faz 1'de eklenir. */
export interface GalleryFilters {
  search: string;
  type: PhotoType | 'hepsi';
  palette: ProcessingPalette | 'hepsi';
  city: string | 'hepsi';
  sort: 'yeni' | 'populer' | 'editor' | 'yorum';
}

export const defaultFilters: GalleryFilters = {
  search: '',
  type: 'hepsi',
  palette: 'hepsi',
  city: 'hepsi',
  sort: 'yeni',
};

/** Türkçe uyumlu küçük harfe çevirme (İ→i, I→ı). */
function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

export function filterPhotos(
  items: AstroPhoto[],
  filters: GalleryFilters
): AstroPhoto[] {
  let result = items;

  const q = trLower(filters.search.trim());
  if (q) {
    result = result.filter((p) =>
      [p.title, p.target.name, p.target.catalog, p.user.username, p.user.displayName]
        .map(trLower)
        .some((field) => field.includes(q))
    );
  }

  if (filters.type !== 'hepsi') {
    result = result.filter((p) => p.type === filters.type);
  }

  if (filters.palette !== 'hepsi') {
    result = result.filter((p) => p.palette === filters.palette);
  }

  if (filters.city !== 'hepsi') {
    result = result.filter((p) => p.city === filters.city);
  }

  const sorted = [...result];
  switch (filters.sort) {
    case 'yeni':
      sorted.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
      break;
    case 'populer':
      sorted.sort((a, b) => b.likes - a.likes);
      break;
    case 'yorum':
      sorted.sort((a, b) => b.comments - a.comments);
      break;
    case 'editor':
      sorted.sort(
        (a, b) =>
          Number(b.editorsPick ?? false) - Number(a.editorsPick ?? false) ||
          b.likes - a.likes
      );
      break;
  }
  return sorted;
}

/** Filtre seçeneklerini veri kümesinden türetir (şehir listesi). */
export function availableCities(items: AstroPhoto[]): string[] {
  return [...new Set(items.map((p) => p.city))].sort((a, b) =>
    a.localeCompare(b, 'tr-TR')
  );
}

/** Kart etiketinde gösterilecek entegrasyon (saniye). */
export function photoIntegrationSeconds(photo: AstroPhoto): number {
  return totalIntegrationSeconds(photo.exposures);
}
