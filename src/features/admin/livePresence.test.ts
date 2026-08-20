import { describe, expect, it } from 'vitest';
import {
  summarizePresence,
  type LivePresencePayload,
} from './livePresenceCore';

function presence(
  userId: string,
  city: string | null,
  district: string | null,
  onlineAt: string
): LivePresencePayload {
  return {
    userId,
    username: userId,
    displayName: null,
    city,
    district,
    onlineAt,
  };
}

describe('summarizePresence', () => {
  it('aynı kullanıcıyı tek sayar ve konuma göre gruplar', () => {
    const summary = summarizePresence({
      u1: [
        presence('u1', 'İstanbul', 'Kadıköy', '2026-08-20T10:00:00Z'),
        presence('u1', 'İstanbul', 'Kadıköy', '2026-08-20T10:05:00Z'),
      ],
      u2: [presence('u2', 'İstanbul', 'Kadıköy', '2026-08-20T10:01:00Z')],
      u3: [presence('u3', null, null, '2026-08-20T10:02:00Z')],
    });

    expect(summary.users).toHaveLength(3);
    expect(summary.locations).toEqual([
      {
        label: 'Kadıköy, İstanbul',
        count: 2,
        users: [
          presence('u1', 'İstanbul', 'Kadıköy', '2026-08-20T10:05:00Z'),
          presence('u2', 'İstanbul', 'Kadıköy', '2026-08-20T10:01:00Z'),
        ],
      },
      {
        label: 'Konum yok',
        count: 1,
        users: [presence('u3', null, null, '2026-08-20T10:02:00Z')],
      },
    ]);
  });
});
