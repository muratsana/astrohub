import { createClient } from 'jsr:@supabase/supabase-js@2';

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const GCVS_URL =
  'https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=B%2Fgcvs%2Fgcvs_cat&-out.max=unlimited&-out.add=_RAJ2000,_DEJ2000&-oc.form=dec&-out=GCVS&-out=VarType&-out=magMax';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-katalog-sirri',
};

const TAKIMYILDIZ_TR: Record<string, string> = {
  And: 'Andromeda',
  Ant: 'Pompa',
  Aps: 'Cennet Kuşu',
  Aql: 'Kartal',
  Aqr: 'Kova',
  Ara: 'Sunak',
  Ari: 'Koç',
  Aur: 'Arabacı',
  Boo: 'Çoban',
  Cae: 'Kalem',
  Cam: 'Zürafa',
  Cap: 'Oğlak',
  Car: 'Karina',
  Cas: 'Kraliçe',
  Cen: 'Erboğa',
  Cep: 'Kral',
  Cet: 'Balina',
  Cha: 'Bukalemun',
  Cir: 'Pergel',
  CMa: 'Büyük Köpek',
  CMi: 'Küçük Köpek',
  Cnc: 'Yengeç',
  Col: 'Güvercin',
  Com: 'Berenis Saçı',
  CrA: 'Güney Tacı',
  CrB: 'Kuzey Tacı',
  Crt: 'Kadeh',
  Cru: 'Güney Haçı',
  Crv: 'Kuzgun',
  CVn: 'Av Köpekleri',
  Cyg: 'Kuğu',
  Del: 'Yunus',
  Dor: 'Yaldızlı Balık',
  Dra: 'Ejder',
  Equ: 'Tay',
  Eri: 'Irmak',
  For: 'Ocak',
  Gem: 'İkizler',
  Gru: 'Turna',
  Her: 'Herkül',
  Hor: 'Saat',
  Hya: 'Hidra',
  Hyi: 'Küçük Su Yılanı',
  Ind: 'Yerli',
  Lac: 'Kertenkele',
  Leo: 'Aslan',
  Lep: 'Tavşan',
  Lib: 'Terazi',
  LMi: 'Küçük Aslan',
  Lup: 'Kurt',
  Lyn: 'Vaşak',
  Lyr: 'Çalgı',
  Men: 'Masa Dağı',
  Mic: 'Mikroskop',
  Mon: 'Tek Boynuzlu At',
  Mus: 'Sinek',
  Nor: 'Gönye',
  Oct: 'Sekizlik',
  Oph: 'Yılancı',
  Ori: 'Avcı',
  Pav: 'Tavus Kuşu',
  Peg: 'Pegasus',
  Per: 'Perseus',
  Phe: 'Anka',
  Pic: 'Ressam Sehpası',
  PsA: 'Güney Balığı',
  Psc: 'Balıklar',
  Pup: 'Pupa',
  Pyx: 'Pusula',
  Ret: 'Ağ',
  Scl: 'Heykeltıraş',
  Sco: 'Akrep',
  Sct: 'Kalkan',
  Ser: 'Yılan',
  Sex: 'Sekstant',
  Sge: 'Ok',
  Sgr: 'Yay',
  Tau: 'Boğa',
  Tel: 'Teleskop',
  TrA: 'Güney Üçgeni',
  Tri: 'Üçgen',
  Tuc: 'Tukan',
  UMa: 'Büyük Ayı',
  UMi: 'Küçük Ayı',
  Vel: 'Yelken',
  Vir: 'Başak',
  Vol: 'Uçan Balık',
  Vul: 'Küçük Tilki',
};

type Db = ReturnType<typeof createClient>;

interface GcvsRow {
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  constellation: string;
  ra_deg: number;
  dec_deg: number;
  magnitude: number | null;
  description: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function yetkiliMi(
  req: Request,
  url: string,
  db: Db
): Promise<boolean> {
  const secret = req.headers.get('x-katalog-sirri');
  if (secret) {
    const { data } = await db.rpc('katalog_sirri_dogru_mu', {
      sunulan: secret,
    });
    if (data === true) return true;
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return false;

  const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: auth } },
  });
  const { data } = await caller.rpc('katalog_yetkisi');
  return data === true;
}

function slugify(code: string): string {
  return code
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function numeric(value: string | undefined): number | null {
  const n = Number((value ?? '').trim());
  return Number.isFinite(n) ? n : null;
}

function codeConstellation(code: string): string {
  const match = /\b([A-Z][A-Za-z]{2})$/.exec(code);
  if (!match) return '—';
  const abbr = `${match[1][0]}${match[1].slice(1).toLowerCase()}`;
  return TAKIMYILDIZ_TR[abbr] ?? '—';
}

async function downloadGcvs(): Promise<string> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(GCVS_URL, {
        headers: { 'User-Agent': 'astrohub-gcvs/1.0' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text.length < 1000000) {
        throw new Error(`GCVS yanıtı kısa: ${text.length} bayt`);
      }
      return text;
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError ?? new Error('GCVS indirilemedi');
}

function parseGcvs(tsv: string): GcvsRow[] {
  const lines = tsv.split('\n');
  const headerIndex = lines.findIndex(
    (line) => !line.startsWith('#') && line.includes('_RAJ2000')
  );
  if (headerIndex < 0) throw new Error('GCVS başlığı bulunamadı');

  const headers = lines[headerIndex].split('\t').map((item) => item.trim());
  const column = (name: string): number => headers.indexOf(name);
  const iRa = column('_RAJ2000');
  const iDec = column('_DEJ2000');
  const iCode = column('GCVS');
  const iMag = column('magMax');
  if (iRa < 0 || iDec < 0 || iCode < 0) {
    throw new Error('GCVS zorunlu sütunları eksik');
  }

  const rows: GcvsRow[] = [];
  const seen = new Set<string>();

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith('#') || line.startsWith('---')) continue;
    const fields = line.split('\t');
    const catalog = (fields[iCode] ?? '').replace(/\s+/g, ' ').trim();
    const ra = numeric(fields[iRa]);
    const dec = numeric(fields[iDec]);
    if (!catalog || catalog.length > 32 || ra === null || dec === null) {
      continue;
    }
    if (seen.has(catalog)) continue;
    seen.add(catalog);

    rows.push({
      slug: slugify(catalog),
      name: `${catalog} Yıldızı`,
      catalog,
      kind: 'yildiz',
      constellation: codeConstellation(catalog),
      ra_deg: ra,
      dec_deg: dec,
      magnitude: iMag >= 0 ? numeric(fields[iMag]) : null,
      description: '',
    });
  }

  return rows;
}

async function importGcvs(db: Db): Promise<void> {
  const rows = parseGcvs(await downloadGcvs());
  if (rows.length < 40000) {
    throw new Error(`GCVS beklenenin altında kayıt verdi: ${rows.length}`);
  }

  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    const { data, error } = await db
      .from('celestial_objects')
      .upsert(chunk, { onConflict: 'slug' })
      .select('id,catalog');
    if (error) throw new Error(`GCVS nesne yazımı: ${error.message}`);

    const ids = (data ?? []).map((row) => ({
      object_id: row.id,
      code: row.catalog,
      is_primary: true,
    }));
    const { error: idError } = await db
      .from('catalog_identifiers')
      .upsert(ids, { onConflict: 'object_id,code' });
    if (idError) throw new Error(`GCVS kod yazımı: ${idError.message}`);
  }
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = Deno.env.get('SUPABASE_URL');
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return json({ hata: 'Sunucu yapılandırması eksik.' }, 500);

  const db = createClient(url, service);
  if (!(await yetkiliMi(req, url, db))) {
    return json({ hata: 'Bu işlem yönetici yetkisi gerektiriyor.' }, 403);
  }

  const task = importGcvs(db);
  EdgeRuntime.waitUntil(task);

  return json({ tamam: true, durum: 'GCVS importu arka planda başladı.' }, 202);
});
