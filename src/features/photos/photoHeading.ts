import type { AstroPhoto } from './types';

export function photoTargetHeading(photo: AstroPhoto): string {
  const catalog = photo.target.catalog.trim();
  const primaryName = photo.target.name.split(',')[0]?.trim() ?? '';

  if (!catalog) return primaryName || photo.title;
  if (!primaryName || primaryName === catalog) return catalog;
  return `${catalog} - ${primaryName}`;
}
