import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (request.method !== 'POST') {
    return json(405, { hata: 'yalnızca POST' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !service) {
    return json(500, { hata: 'Sunucu yapılandırması eksik.' });
  }

  const authorization = request.headers.get('Authorization') ?? '';
  const asUser = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
  });
  const { data, error: authError } = await asUser.auth.getUser();
  if (authError || !data.user) {
    return json(401, { hata: 'Oturum gerekli.' });
  }

  const admin = createClient(url, service);

  await admin.from('audit_logs').insert({
    actor_id: data.user.id,
    action: 'user.self_delete',
    target_type: 'profile',
    target_id: data.user.id,
    detail: { kaynak: 'account_page' },
  });

  const { error } = await admin.auth.admin.deleteUser(data.user.id, false);
  if (error) return json(500, { hata: error.message });

  return json(200, { ok: true });
});
