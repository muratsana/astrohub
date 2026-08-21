import { targetKindLabels, type CelestialTarget } from '@/features/targets/data';
import { mapTargetRow } from './targets';
import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { slugify } from '@/lib/slug';
import type { TargetKind } from '@/domain/targets/derive';

interface TargetContributionInput {
  catalog: string;
  name: string;
  kind: TargetKind;
  constellation: string;
  userId: string;
}

interface TargetRowForInsert {
  id: string;
  slug: string;
  name: string;
  catalog: string;
  kind: string;
  constellation: string;
  ra_deg: number | string | null;
  dec_deg: number | string | null;
  magnitude: number | string | null;
  size_major_arcmin: number | string | null;
  size_minor_arcmin: number | string | null;
  best_months: string | null;
  difficulty: string | null;
  recommended_focal: string | null;
  recommended_filters: string | null;
  description: string | null;
  catalog_identifiers?: { code: string; is_primary: boolean }[] | null;
}

const TARGET_SELECT =
  'id, slug, name, catalog, kind, constellation, ra_deg, dec_deg, magnitude, ' +
  'size_major_arcmin, size_minor_arcmin, best_months, difficulty, ' +
  'recommended_focal, recommended_filters, description, ' +
  'catalog_identifiers(code, is_primary)';

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

export function canonicalCatalogCode(value: string): string {
  const clean = sanitizeText(value, { maxLength: 40 })
    .replace(/\s+/g, ' ')
    .trim();

  const sh = /^sh\s*2\s*-?\s*(\d+[a-z]?)$/i.exec(clean);
  if (sh) return `Sh2-${sh[1].toUpperCase()}`;

  const vdb = /^v\s*d\s*b\s*-?\s*(\d+[a-z]?)$/i.exec(clean);
  if (vdb) return `vdB ${vdb[1].toUpperCase()}`;

  const variable = /^v\s*-?\s*(\d{1,5})\s+([a-z]{3})$/i.exec(clean);
  if (variable) {
    const constellation =
      variable[2].slice(0, 1).toUpperCase() +
      variable[2].slice(1).toLocaleLowerCase('en-US');
    return `V${variable[1]} ${constellation}`;
  }

  const common = /^(m|ngc|ic|abell|ldn|lbn|rcw|ced|arp|hcg|barnard|gum|pk|pgc|ugc|eso|mcg|led[a]?|cr|mel|stock|tr|nsv)\s*-?\s*(\d+[a-z]?)$/i.exec(clean);
  if (common) {
    const rawPrefix = common[1].toLocaleLowerCase('en-US');
    const prefix =
      rawPrefix === 'm'
        ? 'M'
        : rawPrefix === 'abell'
          ? 'Abell'
          : rawPrefix === 'barnard'
            ? 'Barnard'
            : rawPrefix === 'led' || rawPrefix === 'leda'
              ? 'LEDA'
              : rawPrefix.toUpperCase();
    return `${prefix} ${common[2].toUpperCase()}`;
  }

  return clean;
}

const SUPPORTED_CATALOG_CODE =
  /^(M|NGC|IC|Sh2|Abell|Barnard|LDN|LBN|vdB|RCW|Ced|Arp|HCG|Gum|PK|PN G|PGC|UGC|ESO|MCG|LEDA|Cr|Mel|Stock|Tr|NSV)\s?-?\s?[A-Za-z0-9.+-]+$|^V\d{1,5}\s+[A-Z][a-z]{2}$/i;

export function validateTargetContribution(
  input: Pick<TargetContributionInput, 'catalog' | 'name' | 'kind' | 'constellation'>
): string | null {
  const catalog = canonicalCatalogCode(input.catalog);
  const name = sanitizeText(input.name, { maxLength: 120 });
  const constellation = sanitizeText(input.constellation, { maxLength: 80 });

  if (catalog.length < 2) return 'Katalog kodu en az 2 karakter olmalı.';
  if (!SUPPORTED_CATALOG_CODE.test(catalog)) {
    return 'Desteklenen katalog kodlarından birini girin: Messier, NGC, IC, Sharpless/Sh2, Abell, vdB, LDN, LBN, Barnard veya GCVS değişen yıldız adı.';
  }
  if (name.length < 2) return 'Orijinal ad en az 2 karakter olmalı.';
  if (!(input.kind in targetKindLabels)) return 'Obje tipi geçerli değil.';
  if (constellation.length < 2) return 'Takımyıldız en az 2 karakter olmalı.';
  return null;
}

export async function contributeTarget(
  input: TargetContributionInput
): Promise<CelestialTarget> {
  const problem = validateTargetContribution(input);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const catalog = canonicalCatalogCode(input.catalog);
  const name = sanitizeText(input.name, { maxLength: 120 });
  const constellation = sanitizeText(input.constellation, { maxLength: 80 });
  const slugBase = slugify(`${catalog} ${name}`, 72) || 'hedef';
  const slug = `${slugBase}-${Math.floor(Math.random() * 46656).toString(36)}`;

  const { data, error } = await supabase
    .from('celestial_objects')
    .insert({
      slug,
      catalog,
      name,
      kind: input.kind,
      constellation,
      description: '',
      submitted_by: input.userId,
      approved: false,
    })
    .select(TARGET_SELECT)
    .single();

  if (error) throw new Error(error.message);
  const row = data as unknown as TargetRowForInsert;

  const { error: identifierError } = await supabase
    .from('catalog_identifiers')
    .insert({
      object_id: row.id,
      code: catalog,
      is_primary: true,
    });

  if (identifierError) throw new Error(identifierError.message);

  return mapTargetRow({
    ...row,
    catalog_identifiers: [{ code: catalog, is_primary: true }],
  });
}
