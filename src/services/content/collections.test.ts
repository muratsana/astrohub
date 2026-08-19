import { describe, expect, it } from 'vitest';
import { collectionSlug, nextCollectionSlug } from './collections';

describe('koleksiyon yardımcıları', () => {
  it('Türkçe koleksiyon adından stabil slug üretir', () => {
    expect(collectionSlug('Kuyrukluyıldızlar')).toBe('kuyrukluyildizlar');
    expect(collectionSlug('  Dar Bant / Referansları  ')).toBe(
      'dar-bant-referanslari'
    );
  });

  it('aynı ada sıra numarası ekler', () => {
    expect(nextCollectionSlug('Kuyrukluyıldızlar', ['kuyrukluyildizlar'])).toBe(
      'kuyrukluyildizlar-2'
    );
  });
});
