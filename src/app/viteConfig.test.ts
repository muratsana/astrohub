import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `vite.config.ts` İÇE AKTARMA ZİNCİRİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BÖYLE BİR TEST VAR
 *
 * Yapılandırma dosyasını Node yüklüyor ve Vite onu esbuild ile
 * paketlerken göreli OLMAYAN her belirteci dışarıda bırakıyor. `@/…`
 * takma adı da göreli değil: Node onu paket adı sanıyor ve derleme
 *
 *     Cannot find package '@/domain' imported from vite.config.ts.timestamp-…
 *
 * diyerek, yapılandırma daha okunmadan düşüyor. Mesaj hangi dosyanın
 * suçlu olduğunu söylemiyor — zincir onlarca dosya uzunluğunda olabilir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * BU TESTİN KENDİSİ BİR KEZ KAÇIRDI — İKİ AYRI NEDENLE
 *
 * Testin eski hâli vardı ve yeşildi; `npm run build` ise dört commit
 * boyunca kırıktı. İki kör noktası vardı:
 *
 *  1. DESEN SATIR SONUNU GEÇMİYORDU. `[^'"\n]*` yazıyordu, yani
 *     çok satırlı bir içe aktarma —
 *
 *         import {
 *           contentStatusLabels,
 *         } from '@/domain/content/status';
 *
 *     — hiç eşleşmiyordu. Depodaki gerçek suçlular tam olarak bu
 *     biçimdeydi. Prettier bir satırı ikiye böldüğü an test kör kalıyordu.
 *
 *  2. YANLIŞ YERDEN BAŞLIYORDU. Giriş olarak `src/app/sitemap.ts`
 *     yazılmıştı — yani testin "yapılandırma neyi aktarıyor" bilgisi
 *     ELLE kopyalanmıştı. Yapılandırma değiştiğinde test eski zinciri
 *     ölçmeye devam ederdi.
 *
 * Şimdi giriş `vite.config.ts`in KENDİSİ. Yapılandırmaya yarın başka bir
 * modül eklenirse zincir kendiliğinden onu da kapsıyor.
 */

const ROOT = resolve(__dirname, '../..');

/**
 * `import type` / `export type` bilerek dışarıda.
 *
 * Bunlar derlemede tümüyle siliniyor ve çalışma zamanında hiçbir modül
 * yüklemiyor — takma adlı bir tür aktarımı derlemeyi kırmıyor. Onları da
 * suçlamak, gerçek bir sorunu olmayan dosyaları düzeltmeye zorlardı.
 *
 * `[\s\S]*?` (nokta değil): desen bilerek satır sonlarını da geçiyor,
 * yukarıdaki 1 numaralı kör nokta bu yüzden vardı.
 */
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\b([\s\S]*?)from\s+['"]([^'"]+)['"]/g;

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

interface Walk {
  offenders: { file: string; specifier: string }[];
  files: string[];
}

function walk(entry: string): Walk {
  const seen = new Set<string>();
  const offenders: Walk['offenders'] = [];
  const queue = [entry];

  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);

    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_RE)) {
      const clause = match[1];
      const specifier = match[2];

      /* Yalnızca tür aktarımı: çalışma zamanında modül yüklenmiyor. */
      if (/^\s*type\s/.test(clause)) continue;

      if (specifier.startsWith('@/')) {
        offenders.push({ file: file.replace(`${ROOT}/`, ''), specifier });
        continue;
      }
      if (!specifier.startsWith('.')) continue; // npm paketi

      const next = resolveModule(file, specifier);
      if (next) queue.push(next);
    }
  }

  return { offenders, files: [...seen].map((f) => f.replace(`${ROOT}/`, '')) };
}

describe('vite.config.ts içe aktarma zinciri', () => {
  it('zincirin hiçbir yerinde "@/" takma adı kullanılmıyor', () => {
    const { offenders } = walk(resolve(ROOT, 'vite.config.ts'));
    expect(
      offenders,
      offenders
        .map((o) => `${o.file} → ${o.specifier} (göreli yola çevirin)`)
        .join('\n')
    ).toEqual([]);
  });

  /*
   * ZİNCİR KISA KALMALI.
   *
   * Asıl koruma bu: takma ad yasağı, zincire giren her dosyaya bulaşan
   * bir kural. Zincir uygulama koduna uzandığı an kural onlarca dosyayı
   * bağlıyor ve er geç biri farkında olmadan çiğniyor — nitekim çiğnendi.
   *
   * Sınır cömert ama uygulama verisine açılmayı yakalayacak kadar dar:
   * `sitemap.xml` eklentisi buradayken zincir 26 dosyaydı. Bu sayı
   * artıyorsa sorulacak soru "sınırı büyüteyim mi" değil, "bu iş
   * yapılandırmada mı olmalı" — üretim işlerinin yeri prerender adımı,
   * orası Vite'ın boru hattından geçtiği için takma adlar çözülüyor.
   */
  it('yapılandırma uygulama koduna açılmıyor', () => {
    const { files } = walk(resolve(ROOT, 'vite.config.ts'));
    expect(files.join('\n')).toBeTruthy();
    expect(files.length, files.join('\n')).toBeLessThanOrEqual(6);
  });

  /* Önizleme yapılandırması aynı Node yükleyicisinden geçiyor; kural
     onun için de geçerli. Bugün hiç uygulama kodu aktarmıyor ve bu
     satır onu öyle tutuyor. */
  it('önizleme yapılandırması da temiz', () => {
    const { offenders } = walk(resolve(ROOT, 'vite.preview.config.ts'));
    expect(
      offenders,
      offenders.map((o) => `${o.file} → ${o.specifier}`).join('\n')
    ).toEqual([]);
  });
});

/**
 * DESENİN KENDİSİ ÖLÇÜLÜYOR.
 *
 * Yukarıdaki testler ancak desen doğru eşleşiyorsa bir şey ifade ediyor;
 * eski hâlinde desen sessizce kör kaldığı için testler "geçiyordu". Bir
 * koruma testinin sessizce hiçbir şey ölçmemesi, hiç test olmamasından
 * kötü — çünkü kontrol edilmiş olma hissi veriyor.
 */
describe('içe aktarma deseni', () => {
  function bul(kaynak: string) {
    return [...kaynak.matchAll(IMPORT_RE)].map((m) => ({
      clause: m[1],
      specifier: m[2],
    }));
  }

  it('çok satırlı içe aktarmayı yakalıyor', () => {
    const bulunan = bul(
      "import {\n  contentStatusLabels,\n  type ContentStatus,\n} from '@/domain/content/status';"
    );
    expect(bulunan.map((b) => b.specifier)).toEqual(['@/domain/content/status']);
    expect(/^\s*type\s/.test(bulunan[0].clause)).toBe(false);
  });

  it('tek satırlı değer aktarımını yakalıyor', () => {
    expect(bul("import { sanitizeText } from '@/lib/sanitize';")).toHaveLength(
      1
    );
  });

  it('yalnızca tür aktarımını tür olarak işaretliyor', () => {
    const [tek] = bul("import type { ContentBlock } from '@/domain/content/blocks';");
    expect(/^\s*type\s/.test(tek.clause)).toBe(true);
  });
});
