import {
  searchDistricts,
  type DistrictWithProvince,
} from '@/services/content/districts';

export interface AllskyLocationSuggestion {
  key: string;
  value: string;
  districtName: string;
  provinceName: string;
}

export function formatAllskyLocation(district: DistrictWithProvince): string {
  return `${district.provinceName}, ${district.name}`;
}

export function allskyLocationSuggestions(
  items: DistrictWithProvince[],
  query: string,
  limit = 8
): AllskyLocationSuggestion[] {
  if (!query.trim()) return [];

  return searchDistricts(items, query, limit).map((district) => ({
    key: `${district.provinceCode}-${district.slug}`,
    value: formatAllskyLocation(district),
    districtName: district.name,
    provinceName: district.provinceName,
  }));
}
