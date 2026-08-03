import { describe, expect, it } from 'vitest';
import { applyQuery, EMPTY_QUERY } from '@/features/explorer/query';
import { listings } from './data';
import { listingsSpec } from './listingsSpec';

describe('listingsSpec', () => {
  it('şehir facet ilanları konuma göre süzer', () => {
    const city = listings[0].city;
    const result = applyQuery(
      listings,
      {
        ...EMPTY_QUERY,
        facets: { sehir: [city] },
        sort: listingsSpec.defaultSort,
      },
      listingsSpec
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((listing) => listing.city === city)).toBe(true);
  });
});
