import { describe, expect, it } from 'vitest';
import { applyQuery, EMPTY_QUERY } from '@/features/explorer/query';
import { events } from './data';
import { eventsSpec } from './eventsSpec';

describe('eventsSpec', () => {
  it('ücretli facet yalnızca ücretli etkinlikleri döndürür', () => {
    const result = applyQuery(
      events,
      {
        ...EMPTY_QUERY,
        facets: { ucretli: ['evet'] },
        sort: eventsSpec.defaultSort,
      },
      eventsSpec
    );

    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((event) => !event.free)).toBe(true);
  });
});
