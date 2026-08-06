import { describe, expect, it } from 'vitest';
import { mergeActivityItems, type ActivityItem } from './activity';

function item(id: string, happenedAt: string): ActivityItem {
  return {
    id,
    kind: 'photo',
    actor: { username: 'murat', displayName: 'Murat' },
    title: id,
    href: `/${id}`,
    happenedAt,
  };
}

describe('mergeActivityItems', () => {
  it('akış öğelerini en yeni hareket üste gelecek şekilde birleştirir', () => {
    const result = mergeActivityItems([
      [item('eski', '2026-07-01T20:00:00Z')],
      [item('yeni', '2026-07-03T20:00:00Z')],
      [item('orta', '2026-07-02T20:00:00Z')],
    ]);

    expect(result.map((entry) => entry.id)).toEqual(['yeni', 'orta', 'eski']);
  });

  it('limit kadar kayıt döndürür', () => {
    const result = mergeActivityItems(
      [
        [
          item('a', '2026-07-03T20:00:00Z'),
          item('b', '2026-07-02T20:00:00Z'),
        ],
        [item('c', '2026-07-01T20:00:00Z')],
      ],
      2
    );

    expect(result.map((entry) => entry.id)).toEqual(['a', 'b']);
  });
});
