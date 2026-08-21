import { describe, expect, it } from 'vitest';
import { sortPhotoWeekResults } from './photoWeekAdmin';

describe('haftanın fotoğrafı sonuçları', () => {
  it('ortalama puanla, eşitlikte oy sayısıyla sıralar', () => {
    expect(
      sortPhotoWeekResults([
        { photoId: 'c', totalScore: 18, voteCount: 2, averageScore: 9 },
        { photoId: 'a', totalScore: 27, voteCount: 3, averageScore: 9 },
        { photoId: 'b', totalScore: 10, voteCount: 2, averageScore: 5 },
      ]).map((result) => result.photoId)
    ).toEqual(['a', 'c', 'b']);
  });
});
