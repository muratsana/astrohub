#!/usr/bin/env node
/**
 * Fotoğraf storage lifecycle bakımı (§10.8).
 *
 * Bu komut yalnızca sunucu/CI ortamında çalışır. `SUPABASE_SECRET_KEY` ya da
 * legacy `SUPABASE_SERVICE_ROLE_KEY` gerekir; browser'a koyulmaz.
 *
 * Varsayılan dry-run'dır:
 *   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node scripts/photo-lifecycle-cleanup.mjs
 *
 * Uygulamak için:
 *   ... node scripts/photo-lifecycle-cleanup.mjs --apply
 */
import { createClient } from '@supabase/supabase-js';
import {
  PHOTO_BUCKETS,
  chunked,
  planPhotoLifecycleCleanup,
} from './lib/photo-lifecycle.mjs';

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'SUPABASE_URL ve SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY gerekli.'
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function readAll(table, select) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function listBucket(bucket, prefix = '') {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } });
  if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);

  const objects = [];
  for (const item of data ?? []) {
    const path = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.id === null) {
      objects.push(...(await listBucket(bucket, path)));
    } else {
      objects.push({
        path,
        created_at: item.created_at,
        updated_at: item.updated_at,
      });
    }
  }
  return objects;
}

async function main() {
  const [photos, versions, objects] = await Promise.all([
    readAll(
      'astro_photos',
      'id,status,created_at,display_path,thumb_path,original_path'
    ),
    readAll('photo_versions', 'storage_path'),
    Promise.all(PHOTO_BUCKETS.map((bucket) => listBucket(bucket))),
  ]);

  const objectsByBucket = Object.fromEntries(
    PHOTO_BUCKETS.map((bucket, index) => [bucket, objects[index]])
  );
  const plan = planPhotoLifecycleCleanup({ photos, versions, objectsByBucket });

  const orphanCount = Object.values(plan.orphanObjects).reduce(
    (sum, paths) => sum + paths.length,
    0
  );

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        incompleteDrafts: plan.incompleteDraftIds.length,
        orphanObjects: orphanCount,
        orphanObjectsByBucket: Object.fromEntries(
          Object.entries(plan.orphanObjects).map(([bucket, paths]) => [
            bucket,
            paths.length,
          ])
        ),
      },
      null,
      2
    )
  );

  if (!apply) return;

  for (const [bucket, paths] of Object.entries(plan.orphanObjects)) {
    for (const batch of chunked(paths)) {
      const { error } = await supabase.storage.from(bucket).remove(batch);
      if (error) throw new Error(`${bucket} temizlenemedi: ${error.message}`);
    }
  }

  for (const batch of chunked(plan.incompleteDraftIds)) {
    const { error } = await supabase.from('astro_photos').delete().in('id', batch);
    if (error) throw new Error(`taslaklar silinemedi: ${error.message}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
