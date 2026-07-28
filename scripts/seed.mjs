#!/usr/bin/env node
/**
 * Tohum SQL üretici.
 *
 * `scripts/seed/reference-data.ts` TypeScript ve `@/` yol takma adlarıyla
 * `src/` içindeki tohum dizilerini ve alan katmanını içe aktarıyor; Node
 * bunu doğrudan çalıştıramaz. esbuild ile tek parçaya paketleyip data URL
 * üzerinden içe aktarıyoruz — geçici dosya bırakmadan.
 *
 * Çıktı: supabase/seed/0001_reference_data.sql
 */

import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

const result = await build({
  entryPoints: [path.join(root, 'scripts/seed/reference-data.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  write: false,
  alias: { '@': path.join(root, 'src') },
  logLevel: 'warning',
});

const code = result.outputFiles[0].text;
const moduleUrl =
  'data:text/javascript;base64,' + Buffer.from(code, 'utf8').toString('base64');

const { buildSeedSql } = await import(moduleUrl);
const sql = buildSeedSql();

const outDir = path.join(root, 'supabase/seed');
await mkdir(outDir, { recursive: true });
const outFile = path.join(outDir, '0001_reference_data.sql');
await writeFile(outFile, sql, 'utf8');

const statements = (sql.match(/;\s*$/gm) ?? []).length;
console.log(
  `tohum SQL üretildi · ${path.relative(root, outFile)} · ` +
    `${sql.length.toLocaleString('tr-TR')} karakter · ${statements} ifade`
);
