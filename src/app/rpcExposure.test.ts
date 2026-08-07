import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * HER `supabase.rpc(...)` ÇAĞRISININ `public` ŞEMASINDA KARŞILIĞI VAR MI.
 *
 * ── Bu testin doğduğu hata (yenileme planı H1) ────────────────────────
 *
 * `admin_dashboard` fonksiyonu `app` şemasında tanımlanmıştı; frontend
 * `supabase.rpc('admin_dashboard')` çağırıyordu. PostgREST yalnızca
 * yayımlanan şemaları görür ve `supabase/config.toml` yalnızca `public`
 * ile `graphql_public`'i yayımlıyor. Yani çağrı PGRST202 ile düşüyor,
 * "Genel Bakış" ekranındaki dokuz kartın hepsi "—" kalıyordu.
 *
 * ── Neden test, neden tek seferlik düzeltme değil ─────────────────────
 *
 * Bu hatanın hiçbir görünür belirtisi yok: tip kontrolü geçiyor, lint
 * geçiyor, derleme geçiyor. RPC adı bir metin dizisi; yanlış yazıldığında
 * ya da fonksiyon `app` şemasına konduğunda derleyici hiçbir şey
 * söylemiyor. Hata yalnızca CANLI ekranda, veri gelmediğinde görülüyor —
 * ve orada da "yükleniyor" ile "yetkin yok" ile karışıyor.
 *
 * `app` şemasında fonksiyon tanımlamak yanlış DEĞİL: yardımcılar ve
 * tetikleyici gövdeleri oraya ait ve dışarı açılmamalı. Kural şu:
 * frontend bir adı çağırıyorsa o adın `public`'te bir karşılığı
 * bulunmalı — ya asıl tanım orada olmalı ya da ince bir sarmalayıcı.
 */

const ROOT = resolve(__dirname, '../..');
const SRC = join(ROOT, 'src');
const MIGRATIONS = join(ROOT, 'supabase/migrations');

/** `supabase.rpc('ad'` — tek tırnaklı, sabit adlar. */
const RPC_CALL = /\.rpc\(\s*'([a-z_0-9]+)'/g;

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkFiles(path, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) {
      /* Testler dışarıda: sahte istemciler ve bu dosyanın kendi açıklama
         örneği gerçek bir çağrı değil, ama metinde aynı görünüyorlar. */
      out.push(path);
    }
  }
  return out;
}

/** Frontend'in çağırdığı RPC adları → onları çağıran dosyalar. */
function calledRpcNames(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of walkFiles(SRC)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(RPC_CALL)) {
      const name = match[1];
      const list = found.get(name) ?? [];
      list.push(file.slice(ROOT.length + 1));
      found.set(name, list);
    }
  }
  return found;
}

/**
 * Göçlerde `public` şemasında tanımlanan fonksiyon adları.
 *
 * Şemasız `create function ad(` de public sayılıyor: göçler
 * `search_path` public ile çalışıyor ve şemasız tanım oraya düşüyor.
 *
 * `create function app.ad(` bilerek EŞLEŞMİYOR — bu testin ayırt etmesi
 * gereken şey tam olarak o. Kalıp `ad`ın hemen ardından `(` bekliyor;
 * nitelikli tanımda orada bir nokta var ve eşleşme düşüyor.
 */
function publicFunctionNames(): Set<string> {
  const names = new Set<string>();
  const decl =
    /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_0-9]+)\s*\(/gi;

  for (const file of readdirSync(MIGRATIONS)) {
    if (!file.endsWith('.sql')) continue;
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    for (const m of sql.matchAll(decl)) names.add(m[1]);
  }
  return names;
}

describe('supabase.rpc çağrıları', () => {
  const called = calledRpcNames();
  const exposed = publicFunctionNames();

  it('frontend en az bir RPC çağırıyor (tarayıcı bozulmadıysa)', () => {
    expect(called.size).toBeGreaterThan(10);
  });

  it('çağrılan her adın public şemasında karşılığı var', () => {
    const eksik = [...called.entries()]
      .filter(([name]) => !exposed.has(name))
      .map(([name, files]) => `${name} — ${files.join(', ')}`);

    expect(
      eksik,
      eksik.length
        ? `Bu adlar public şemasında tanımlı değil. Fonksiyon "app" şemasındaysa ` +
            `public'e ince bir sarmalayıcı ekleyin — "app"i PostgREST'e AÇMAYIN, ` +
            `o şemadaki altmışı aşkın yardımcıyı da dışa açar.\n  ` +
            eksik.join('\n  ')
        : undefined
    ).toEqual([]);
  });

  it('admin_dashboard sarmalayıcısı duruyor (H1 regresyonu)', () => {
    expect(called.has('admin_dashboard')).toBe(true);
    expect(exposed.has('admin_dashboard')).toBe(true);
  });
});
