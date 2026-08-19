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

  it('teslim facet kargo ve elden teslim ilanlarını ayırır', () => {
    const kargo = applyQuery(
      listings,
      {
        ...EMPTY_QUERY,
        facets: { teslim: ['kargo'] },
        sort: listingsSpec.defaultSort,
      },
      listingsSpec
    );
    const elden = applyQuery(
      listings,
      {
        ...EMPTY_QUERY,
        facets: { teslim: ['elden'] },
        sort: listingsSpec.defaultSort,
      },
      listingsSpec
    );

    expect(kargo.items.every((listing) => listing.shippingOk)).toBe(true);
    expect(elden.items.every((listing) => !listing.shippingOk)).toBe(true);
  });
});
