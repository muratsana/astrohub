import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `vite.config.ts`, site haritasını üretmek için `src/app/sitemap.ts`'i
 * doğrudan içe aktarıyor. Yapılandırma dosyası Node tarafından, Vite'ın
 * takma adları (`@/…`) kurulmadan önce yükleniyor; zincirdeki herhangi bir
 * dosyada takma ad kullanılırsa derleme
 *
 *     Cannot find package '@/lib' imported from vite.config.ts.timestamp-…
 *
 * diyerek düşer. Bu bir kez oldu ve hata mesajı sorunun kaynağını hiç
 * göstermiyor: hangi dosyanın suçlu olduğunu söylemiyor.
 *
 * Test, zinciri gezip takma ad kullanan dosyayı **adıyla** bildiriyor.
 * Derleme çıktısındaki anlaşılmaz mesaj yerine saniyeler içinde cevap.
 */

const ROOT = resolve(__dirname, '../..');
/*
 * `import type` / `export type` bilerek dışarıda: bunlar derlemede
 * tümüyle siliniyor ve çalışma zamanında hiçbir modül yüklemiyor. Onları
 * da suçlamak, gerçek bir sorunu olmayan dosyaları düzeltmeye zorlardı.
 */
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^'"\n]*from\s+['"]([^'"]+)['"]/g;

function resolveModule(fromFile: string, specifier: string): string | null {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    base,
  ]) {
    if (existsSync(candidate) && !candidate.endsWith('/')) return candidate;
  }
  return null;
}

function walk(entry: string): { file: string; specifier: string }[] {
  const seen = new Set<string>();
  const offenders: { file: string; specifier: string }[] = [];
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (specifier.startsWith('@/')) {
        offenders.push({ file: file.replace(`${ROOT}/`, ''), specifier });
        continue;
      }
      if (!specifier.startsWith('.')) continue; // npm paketi
      const next = resolveModule(file, specifier);
      if (next) queue.push(next);
    }
  }

  return offenders;
}

describe('vite.config.ts içe aktarma zinciri', () => {
  it('sitemap zincirinde "@/" takma adı kullanılmıyor', () => {
    const offenders = walk(resolve(ROOT, 'src/app/sitemap.ts'));
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} → ${o.specifier} (göreli yola çevirin)`)
        .join('\n')
    ).toEqual([]);
  });

  it('pwa/buildSw zincirinde de kullanılmıyor', () => {
    const offenders = walk(resolve(ROOT, 'src/pwa/buildSw.ts'));
    expect(offenders).toEqual([]);
  });
});
