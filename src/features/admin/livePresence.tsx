import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/AuthContext';
import { getSupabase } from '@/services/supabase/client';

const VISITOR_KEY_STORAGE = 'astrohub:visitor-key';
const HEARTBEAT_MS = 45_000;
const ACTIVE_REFRESH_MS = 20_000;

interface LocationMetric {
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  label: string;
  count?: number;
  visitors?: number;
  events?: number;
}

interface TimelineMetric {
  bucket: string;
  visitors: number;
  events: number;
}

interface LivePresenceReport {
  generatedAt: string;
  activeWindowSeconds: number;
  activeTotal: number;
  activeLocations: LocationMetric[];
  period: { from: string; to: string; bucket: string };
  periodTotalEvents: number;
  periodUniqueVisitors: number;
  topLocations: LocationMetric[];
  timeline: TimelineMetric[];
}

function storageVisitorKey(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing && /^[a-zA-Z0-9_-]{20,96}$/.test(existing)) return existing;
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const next = `v_${btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '')}`;
    window.localStorage.setItem(VISITOR_KEY_STORAGE, next);
    return next;
  } catch {
    return `v_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

function normalizeReport(value: unknown): LivePresenceReport {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    generatedAt: String(data.generated_at ?? new Date().toISOString()),
    activeWindowSeconds: Number(data.active_window_seconds ?? 120),
    activeTotal: Number(data.active_total ?? 0),
    activeLocations: asArray<LocationMetric>(data.active_locations),
    period: (data.period as LivePresenceReport['period'] | undefined) ?? {
      from: '',
      to: '',
      bucket: 'day',
    },
    periodTotalEvents: Number(data.period_total_events ?? 0),
    periodUniqueVisitors: Number(data.period_unique_visitors ?? 0),
    topLocations: asArray<LocationMetric>(data.top_locations),
    timeline: asArray<TimelineMetric>(data.timeline),
  };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function reportCsv(report: LivePresenceReport): string {
  const rows = [
    ['Tür', 'Konum', 'Ülke', 'Şehir', 'Tekil ziyaretçi', 'Olay'],
    ...report.topLocations.map((item) => [
      'Konum',
      item.label,
      item.countryName ?? '',
      item.city ?? '',
      String(item.visitors ?? 0),
      String(item.events ?? 0),
    ]),
    ...report.timeline.map((item) => [
      'Zaman',
      item.bucket,
      '',
      '',
      String(item.visitors),
      String(item.events),
    ]),
  ];
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
}

function downloadCsv(report: LivePresenceReport) {
  const blob = new Blob([reportCsv(report)], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `astrohub-canli-kullanici-raporu-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Anlık varlığı Edge Function üzerinden kaydeder.
 *
 * Ham IP istemciye veya tabloya düz metin yazılmaz. Edge Function IP'yi
 * coğrafi kırılıma, hash'e ve maskeli ağ bilgisine çevirir.
 */
export function LivePresenceTracker() {
  const { user } = useAuth();

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    async function beat() {
      const promise = getSupabase();
      if (!promise) return;
      const supabase = await promise;
      if (!alive) return;
      const { error } = await supabase.functions.invoke('ziyaret-izle', {
        body: {
          visitorKey: storageVisitorKey(),
          path: `${window.location.pathname}${window.location.search}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      if (error)
        console.warn('canlı ziyaretçi heartbeat yazılamadı', error.message);
    }

    void beat();
    timer = window.setInterval(() => void beat(), HEARTBEAT_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void beat();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user?.id]);

  return null;
}

async function fetchLivePresenceReport(
  days: number
): Promise<LivePresenceReport> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase.rpc('admin_live_presence_report', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_bucket: days <= 2 ? 'hour' : 'day',
  });
  if (error) throw new Error(error.message);
  return normalizeReport(data);
}

function useAdminLivePresence(days: number): {
  report: LivePresenceReport | null;
  status: 'idle' | 'connecting' | 'ready' | 'error';
  error: string | null;
} {
  const [report, setReport] = useState<LivePresenceReport | null>(null);
  const [status, setStatus] = useState<
    'idle' | 'connecting' | 'ready' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: number | null = null;

    async function load() {
      setStatus((current) => (current === 'ready' ? current : 'connecting'));
      try {
        const next = await fetchLivePresenceReport(days);
        if (!alive) return;
        setReport(next);
        setError(null);
        setStatus('ready');
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Rapor alınamadı');
        setStatus('error');
      }
    }

    void load();
    timer = window.setInterval(() => void load(), ACTIVE_REFRESH_MS);

    return () => {
      alive = false;
      if (timer) window.clearInterval(timer);
    };
  }, [days]);

  return { report, status, error };
}

export function LivePresencePanel() {
  const [days, setDays] = useState(7);
  const { report, status, error } = useAdminLivePresence(days);
  const activeLocations = report?.activeLocations ?? [];
  const topLocations = report?.topLocations ?? [];
  const max = Math.max(
    1,
    ...activeLocations.map((location) => location.count ?? 0)
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
            IP coğrafi tahminiyle ülke ve şehir kırılımı
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
              {report?.activeTotal ?? 0}
            </p>
          </div>
          <div className="rounded-card border border-border bg-background px-3 py-3">
            <p className="text-meta text-faint">Aktif konum</p>
            <p className="tabular mt-1 font-display text-3xl font-bold text-cold">
              {activeLocations.length}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="block">
            <span className="text-meta text-faint">Rapor dönemi</span>
            <select
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="mt-1 h-9 w-full rounded-card border border-border bg-background px-2 text-body-sm text-foreground"
            >
              <option value={1}>Son 24 saat</option>
              <option value={7}>Son 7 gün</option>
              <option value={30}>Son 30 gün</option>
              <option value={90}>Son 90 gün</option>
            </select>
          </label>
          <button
            type="button"
            disabled={!report}
            onClick={() => report && downloadCsv(report)}
            className="self-end rounded-card border border-border px-3 py-2 text-meta font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-50"
          >
            CSV indir
          </button>
        </div>

        {error ? (
          <p className="mt-3 rounded-card border border-warning/30 bg-warning/10 px-3 py-2 text-meta text-warning">
            {error}
          </p>
        ) : null}

        <ol className="mt-4 space-y-2">
          {activeLocations.length ? (
            activeLocations.map((location) => (
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
                      aktif pencere: {report?.activeWindowSeconds ?? 120} sn
                    </p>
                  </div>
                  <span className="tabular text-body-sm font-semibold text-primary">
                    {location.count ?? 0}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <span
                    className="block h-full rounded-full bg-success"
                    style={{ width: `${((location.count ?? 0) / max) * 100}%` }}
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

        <div className="mt-4 rounded-card border border-border bg-background">
          <div className="grid gap-px bg-border sm:grid-cols-2">
            <div className="bg-background px-3 py-3">
              <p className="text-meta text-faint">Dönem tekil ziyaretçi</p>
              <p className="tabular mt-1 text-body-lg font-bold text-foreground">
                {report?.periodUniqueVisitors ?? 0}
              </p>
            </div>
            <div className="bg-background px-3 py-3">
              <p className="text-meta text-faint">Heartbeat kaydı</p>
              <p className="tabular mt-1 text-body-lg font-bold text-foreground">
                {report?.periodTotalEvents ?? 0}
              </p>
            </div>
          </div>
          <ol className="divide-y divide-border">
            {topLocations.slice(0, 5).map((location) => (
              <li
                key={`${location.label}-${location.visitors}`}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="truncate text-meta text-muted-foreground">
                  {location.label}
                </span>
                <span className="tabular text-meta text-foreground">
                  {location.visitors ?? 0}
                </span>
              </li>
            ))}
            {topLocations.length === 0 ? (
              <li className="px-3 py-2 text-meta text-muted-foreground">
                Seçili dönemde rapor verisi yok.
              </li>
            ) : null}
          </ol>
        </div>
      </div>
    </section>
  );
}
