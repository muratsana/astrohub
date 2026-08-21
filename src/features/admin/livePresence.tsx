import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';
import {
  displayPresenceUser,
  LIVE_PRESENCE_TOPIC,
  summarizePresence,
  type LivePresencePayload,
  type LivePresenceSummary,
  type PresenceState,
  type ProfileLocationRow,
} from './livePresenceCore';

/**
 * Oturum açıkken anlık varlığı private Realtime Presence kanalına yazar.
 *
 * GPS/IP toplamıyoruz. Konum, kullanıcının profilindeki şehir/ilçe bilgisi:
 * platformda zaten görünür olan yaklaşık konumu admin özetine taşır.
 */
export function LivePresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let alive = true;
    let cleanup: (() => void) | null = null;

    void (async () => {
      const promise = getSupabase();
      if (!promise) return;
      const supabase = await promise;
      if (!alive) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('username, display_name, city, district')
        .eq('id', user.id)
        .maybeSingle();

      if (!alive) return;
      if (error) {
        console.warn('canlı varlık profil konumu okunamadı', error.message);
      }
      const profile = (data ?? {}) as ProfileLocationRow;
      const channel = supabase.channel(LIVE_PRESENCE_TOPIC, {
        config: {
          private: true,
          presence: { key: user.id },
        },
      });

      channel.subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        void channel.track({
          userId: user.id,
          username: profile.username ?? null,
          displayName: profile.display_name ?? null,
          city: profile.city ?? null,
          district: profile.district ?? null,
          onlineAt: new Date().toISOString(),
        } satisfies LivePresencePayload);
      });

      cleanup = () => {
        void channel.untrack();
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      alive = false;
      cleanup?.();
    };
  }, [user]);

  return null;
}

function useAdminLivePresence(): {
  summary: LivePresenceSummary;
  status: 'idle' | 'connecting' | 'ready' | 'error';
} {
  const [summary, setSummary] = useState<LivePresenceSummary>({
    users: [],
    locations: [],
  });
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'ready' | 'error'
  >('idle');

  useEffect(() => {
    let alive = true;
    let cleanup: (() => void) | null = null;
    setStatus('connecting');

    void (async () => {
      const promise = getSupabase();
      if (!promise) {
        if (alive) setStatus('error');
        return;
      }
      const supabase = await promise;
      if (!alive) return;

      const channel = supabase
        .channel(LIVE_PRESENCE_TOPIC, {
          config: { private: true },
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState() as PresenceState;
          setSummary(summarizePresence(state));
          setStatus('ready');
        });

      channel.subscribe((nextStatus) => {
        if (!alive) return;
        if (nextStatus === 'SUBSCRIBED') {
          setSummary(
            summarizePresence(channel.presenceState() as PresenceState)
          );
          setStatus('ready');
        } else if (
          nextStatus === 'CHANNEL_ERROR' ||
          nextStatus === 'TIMED_OUT' ||
          nextStatus === 'CLOSED'
        ) {
          setStatus('error');
        }
      });

      cleanup = () => {
        void supabase.removeChannel(channel);
      };
    })();

    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  return { summary, status };
}

export function LivePresencePanel() {
  const { summary, status } = useAdminLivePresence();
  const max = Math.max(
    1,
    ...summary.locations.map((location) => location.count)
  );
  const statusLabel =
    status === 'ready'
      ? 'canlı'
      : status === 'connecting'
        ? 'bağlanıyor'
        : 'erişilemiyor';

  return (
    <section className="rounded-card border border-border bg-surface-1">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="label text-foreground">Canlı Kullanıcılar</h2>
          <p className="mt-1 text-meta text-faint">
            Oturum açık kullanıcıların profil konumu
          </p>
        </div>
        <Badge tone={status === 'ready' ? 'success' : 'warning'}>
          {statusLabel}
        </Badge>
      </header>

      <div className="px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-border bg-background px-3 py-3">
            <p className="text-meta text-faint">Anlık aktif</p>
            <p className="tabular mt-1 font-display text-3xl font-bold text-success">
              {summary.users.length}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-3 py-3">
            <p className="text-meta text-faint">Konum</p>
            <p className="tabular mt-1 font-display text-3xl font-bold text-cold">
              {summary.locations.length}
            </p>
          </div>
        </div>

        <ol className="mt-4 space-y-2">
          {summary.locations.length ? (
            summary.locations.map((location) => (
              <li
                key={location.label}
                className="rounded-card border border-border bg-background px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-semibold text-foreground">
                      {location.label}
                    </p>
                    <p className="mt-1 truncate text-meta text-muted-foreground">
                      {location.users.map(displayPresenceUser).join(', ')}
                    </p>
                  </div>
                  <span className="tabular text-body-sm font-semibold text-primary">
                    {location.count}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-success"
                    style={{ width: `${(location.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))
          ) : (
            <li className="rounded-card border border-border bg-background px-3 py-3 text-meta text-muted-foreground">
              Şu anda canlı konum verisi yok.
            </li>
          )}
        </ol>
      </div>
    </section>
  );
}
