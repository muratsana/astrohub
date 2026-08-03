import { describe, expect, it } from 'vitest';
import { applyQuery, EMPTY_QUERY } from '@/features/explorer/query';
import { sites, siteTypeLabels } from './data';
import { sitesSpec } from './sitesSpec';

describe('sitesSpec', () => {
  it('saha türü facet ile süzülür', () => {
    const type = sites[0].siteType;
    const result = applyQuery(
      sites,
      {
        ...EMPTY_QUERY,
        facets: { tur: [type] },
        sort: sitesSpec.defaultSort,
      },
      sitesSpec
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((site) => site.siteType === type)).toBe(true);
  });

  it('saha türü arama metnine dahil edilir', () => {
    const result = applyQuery(
      sites,
      {
        ...EMPTY_QUERY,
        q: siteTypeLabels[sites[0].siteType],
        sort: sitesSpec.defaultSort,
      },
      sitesSpec
    );

    expect(
      result.items.some((site) => site.siteType === sites[0].siteType)
    ).toBe(true);
  });

  it('Bortle iki yönde sıralanır', () => {
    const lowFirst = applyQuery(
      sites,
      { ...EMPTY_QUERY, sort: 'karanlik' },
      sitesSpec
    ).items;
    const highFirst = applyQuery(
      sites,
      { ...EMPTY_QUERY, sort: 'bortle-yuksek' },
      sitesSpec
    ).items;

    expect(lowFirst[0].bortle).toBeLessThanOrEqual(lowFirst.at(-1)!.bortle);
    expect(highFirst[0].bortle).toBeGreaterThanOrEqual(
      highFirst.at(-1)!.bortle
    );
  });
});
