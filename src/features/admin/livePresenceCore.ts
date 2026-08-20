export const LIVE_PRESENCE_TOPIC = 'admin:live-presence';

export interface ProfileLocationRow {
  username: string | null;
  display_name: string | null;
  city: string | null;
  district: string | null;
}

export interface LivePresencePayload {
  userId: string;
  username: string | null;
  displayName: string | null;
  city: string | null;
  district: string | null;
  onlineAt: string;
}

export interface LiveLocationGroup {
  label: string;
  count: number;
  users: LivePresencePayload[];
}

export interface LivePresenceSummary {
  users: LivePresencePayload[];
  locations: LiveLocationGroup[];
}

export type PresenceState = Record<string, LivePresencePayload[]>;

export function summarizePresence(state: PresenceState): LivePresenceSummary {
  const byUser = new Map<string, LivePresencePayload>();

  for (const presences of Object.values(state)) {
    for (const presence of presences) {
      if (!isPresencePayload(presence)) continue;
      const current = byUser.get(presence.userId);
      if (
        !current ||
        new Date(presence.onlineAt).getTime() >
          new Date(current.onlineAt).getTime()
      ) {
        byUser.set(presence.userId, presence);
      }
    }
  }

  const users = [...byUser.values()].sort((a, b) =>
    displayPresenceUser(a).localeCompare(displayPresenceUser(b), 'tr')
  );
  const groups = new Map<string, LivePresencePayload[]>();
  for (const user of users) {
    const label = locationLabel(user);
    groups.set(label, [...(groups.get(label) ?? []), user]);
  }

  return {
    users,
    locations: [...groups.entries()]
      .map(([label, groupUsers]) => ({
        label,
        count: groupUsers.length,
        users: groupUsers,
      }))
      .sort(
        (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'tr')
      ),
  };
}

export function displayPresenceUser(user: LivePresencePayload): string {
  return user.username ? `@${user.username}` : user.displayName || 'İsimsiz';
}

function isPresencePayload(value: unknown): value is LivePresencePayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.userId === 'string' &&
    typeof row.onlineAt === 'string' &&
    (row.username === null || typeof row.username === 'string') &&
    (row.displayName === null || typeof row.displayName === 'string') &&
    (row.city === null || typeof row.city === 'string') &&
    (row.district === null || typeof row.district === 'string')
  );
}

function locationLabel(user: LivePresencePayload): string {
  return [user.district, user.city].filter(Boolean).join(', ') || 'Konum yok';
}
