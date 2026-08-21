import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
};

const GEO_TIMEOUT_MS = 1800;

interface TrackBody {
  visitorKey?: unknown;
  path?: unknown;
  timezone?: unknown;
}

interface GeoInfo {
  countryCode: string | null;
  countryName: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function textHeader(headers: Headers, name: string): string | null {
  const value = headers.get(name)?.trim();
  return value ? value : null;
}

function clientIp(headers: Headers): string | null {
  const forwarded = textHeader(headers, 'x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return (
    textHeader(headers, 'cf-connecting-ip') ??
    textHeader(headers, 'x-real-ip') ??
    textHeader(headers, 'x-client-ip')
  );
}

function cleanText(value: unknown, max = 120): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.trim().replace(/\s+/g, ' ').slice(0, max);
  return cleaned || null;
}

function validVisitorKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]{20,96}$/.test(trimmed) ? trimmed : null;
}

function ipPrefix(ip: string | null): string | null {
  if (!ip) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  }
  if (ip.includes(':')) return `${ip.split(':').slice(0, 4).join(':')}::/64`;
  return null;
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function browserFamily(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent)) return 'Safari';
  return 'Diğer';
}

function headerGeo(headers: Headers, timezone: string | null): GeoInfo {
  const country =
    textHeader(headers, 'x-vercel-ip-country') ??
    textHeader(headers, 'cf-ipcountry');
  const region = textHeader(headers, 'x-vercel-ip-country-region');
  const cityHeader = textHeader(headers, 'x-vercel-ip-city');
  const city = cityHeader ? decodeURIComponent(cityHeader) : null;
  const lat = Number(textHeader(headers, 'x-vercel-ip-latitude') ?? NaN);
  const lon = Number(textHeader(headers, 'x-vercel-ip-longitude') ?? NaN);

  return {
    countryCode: country,
    countryName: country,
    region,
    city,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lon) ? lon : null,
    timezone,
  };
}

async function ipApiGeo(
  ip: string,
  signal: AbortSignal
): Promise<Partial<GeoInfo>> {
  const response = await fetch(
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    {
      headers: { Accept: 'application/json' },
      signal,
    }
  );
  if (!response.ok) return {};
  const data = (await response.json()) as Record<string, unknown>;
  return {
    countryCode: cleanText(data.country_code, 8),
    countryName: cleanText(data.country_name),
    region: cleanText(data.region),
    city: cleanText(data.city),
    latitude:
      typeof data.latitude === 'number' && Number.isFinite(data.latitude)
        ? data.latitude
        : null,
    longitude:
      typeof data.longitude === 'number' && Number.isFinite(data.longitude)
        ? data.longitude
        : null,
    timezone: cleanText(data.timezone),
  };
}

async function geoFromIp(
  ip: string | null,
  headers: Headers,
  timezone: string | null
): Promise<GeoInfo> {
  const base = headerGeo(headers, timezone);
  if (!ip || (base.countryCode && base.city)) return base;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  try {
    const external = await ipApiGeo(ip, controller.signal);
    return {
      countryCode: external.countryCode ?? base.countryCode,
      countryName: external.countryName ?? base.countryName,
      region: external.region ?? base.region,
      city: external.city ?? base.city,
      latitude: external.latitude ?? base.latitude,
      longitude: external.longitude ?? base.longitude,
      timezone: external.timezone ?? base.timezone,
    };
  } catch {
    return base;
  } finally {
    clearTimeout(timer);
  }
}

async function authUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return null;
  const admin = createClient(url, service);
  const token = authHeader.slice('Bearer '.length);
  const { data, error } = await admin.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json({ hata: 'Yalnızca POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service)
    return json({ hata: 'Supabase yapılandırması eksik' }, 500);

  const body = (await request.json().catch(() => ({}))) as TrackBody;
  const visitorKey = validVisitorKey(body.visitorKey);
  if (!visitorKey) return json({ hata: 'Geçersiz ziyaretçi anahtarı' }, 400);

  const path = cleanText(body.path, 300) ?? '/';
  const timezone = cleanText(body.timezone, 80);
  const ip = clientIp(request.headers);
  const salt = Deno.env.get('PRESENCE_SALT') ?? service;
  const ipHash = ip ? await sha256(`${salt}:${ip}`) : null;
  const geo = await geoFromIp(ip, request.headers, timezone);
  const userId = await authUserId(request.headers.get('authorization'));
  const now = new Date().toISOString();

  const admin = createClient(url, service);
  const prefix = ipPrefix(ip);
  const family = browserFamily(request.headers.get('user-agent'));

  const { error: upsertError } = await admin.rpc(
    'record_live_visitor_session',
    {
      p_visitor_key: visitorKey,
      p_user_id: userId,
      p_ip_hash: ipHash,
      p_ip_prefix: prefix,
      p_country_code: geo.countryCode,
      p_country_name: geo.countryName,
      p_region: geo.region,
      p_city: geo.city,
      p_timezone: geo.timezone,
      p_latitude: geo.latitude,
      p_longitude: geo.longitude,
      p_path: path,
      p_user_agent_family: family,
      p_seen_at: now,
    }
  );
  if (upsertError) return json({ hata: upsertError.message }, 500);

  const { error: eventError } = await admin.from('live_visitor_events').insert({
    visitor_key: visitorKey,
    user_id: userId,
    ip_hash: ipHash,
    ip_prefix: prefix,
    country_code: geo.countryCode,
    country_name: geo.countryName,
    region: geo.region,
    city: geo.city,
    timezone: geo.timezone,
    path,
    seen_at: now,
  });
  if (eventError) return json({ hata: eventError.message }, 500);

  return json({
    ok: true,
    countryCode: geo.countryCode,
    countryName: geo.countryName,
    region: geo.region,
    city: geo.city,
  });
});
