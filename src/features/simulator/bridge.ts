export const DEFAULT_BRIDGE_URL = 'http://127.0.0.1:4765';

export interface CaptureSummary {
  app?: string;
  target?: string;
  sequenceName?: string;
  totalFrames?: number;
  completedFrames?: number;
  remainingFrames?: number;
  exposureSeconds?: number;
  filter?: string;
  state?: string;
}

export interface MountBridgeStatus {
  ok: boolean;
  connected: boolean;
  driverId?: string;
  name?: string;
  description?: string;
  driverInfo?: string;
  driverVersion?: string;
  rightAscensionHours?: number;
  declinationDeg?: number;
  altitudeDeg?: number;
  azimuthDeg?: number;
  siteLatitudeDeg?: number;
  siteLongitudeDeg?: number;
  siteElevationM?: number;
  tracking?: boolean;
  slewing?: boolean;
  atPark?: boolean;
  sideOfPier?: string;
  utc?: string;
  capture?: CaptureSummary | null;
  error?: string;
}

export interface ArchivePlan {
  id: string;
  targetSlug: string;
  targetName: string;
  targetCatalog: string;
  plannedHours: number;
  completedHours: number;
  equipment: string;
  createdAt: string;
  updatedAt: string;
}

const ARCHIVE_KEY = 'astrohub:simulator:archive-plans';

export async function fetchMountBridgeStatus(
  baseUrl = DEFAULT_BRIDGE_URL,
  timeoutMs = 1600
): Promise<MountBridgeStatus> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/status`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      return {
        ok: false,
        connected: false,
        error: `Bridge yanıtı başarısız: ${response.status}`,
      };
    }
    return normalizeBridgeStatus(await response.json());
  } catch (error) {
    return {
      ok: false,
      connected: false,
      error:
        error instanceof Error
          ? error.message
          : 'Bridge bağlantısı kurulamadı',
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export function normalizeBridgeStatus(value: unknown): MountBridgeStatus {
  if (!value || typeof value !== 'object') {
    return { ok: false, connected: false, error: 'Geçersiz bridge yanıtı' };
  }
  const row = value as Record<string, unknown>;
  return {
    ok: row.ok === true,
    connected: row.connected === true,
    driverId: text(row.driverId),
    name: text(row.name),
    description: text(row.description),
    driverInfo: text(row.driverInfo),
    driverVersion: text(row.driverVersion),
    rightAscensionHours: number(row.rightAscensionHours),
    declinationDeg: number(row.declinationDeg),
    altitudeDeg: number(row.altitudeDeg),
    azimuthDeg: number(row.azimuthDeg),
    siteLatitudeDeg: number(row.siteLatitudeDeg),
    siteLongitudeDeg: number(row.siteLongitudeDeg),
    siteElevationM: number(row.siteElevationM),
    tracking: bool(row.tracking),
    slewing: bool(row.slewing),
    atPark: bool(row.atPark),
    sideOfPier: text(row.sideOfPier),
    utc: text(row.utc),
    capture: normalizeCapture(row.capture),
    error: text(row.error),
  };
}

export function loadArchivePlans(): ArchivePlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARCHIVE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isArchivePlan) : [];
  } catch {
    return [];
  }
}

export function saveArchivePlans(plans: ArchivePlan[]): void {
  window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(plans));
}

function normalizeCapture(value: unknown): CaptureSummary | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  return {
    app: text(row.app),
    target: text(row.target),
    sequenceName: text(row.sequenceName),
    totalFrames: number(row.totalFrames),
    completedFrames: number(row.completedFrames),
    remainingFrames: number(row.remainingFrames),
    exposureSeconds: number(row.exposureSeconds),
    filter: text(row.filter),
    state: text(row.state),
  };
}

function isArchivePlan(value: unknown): value is ArchivePlan {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.targetSlug === 'string' &&
    typeof row.targetName === 'string' &&
    typeof row.targetCatalog === 'string' &&
    typeof row.plannedHours === 'number' &&
    typeof row.completedHours === 'number' &&
    typeof row.equipment === 'string' &&
    typeof row.createdAt === 'string' &&
    typeof row.updatedAt === 'string'
  );
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}
