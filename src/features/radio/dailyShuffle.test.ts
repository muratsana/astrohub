import { describe, expect, it } from 'vitest';
import { dailyShuffle } from './dailyShuffle';

const tracks = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));

describe('dailyShuffle', () => {
  it('aynı gün bütün istemcilerde aynı sırayı üretir', () => {
    expect(dailyShuffle(tracks, '2026-08-03')).toEqual(
      dailyShuffle(tracks, '2026-08-03')
    );
  });

  it('girdiyi değiştirmez ve hiçbir parçayı kaybetmez', () => {
    const result = dailyShuffle(tracks, '2026-08-03');
    expect(tracks.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.map((item) => item.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
