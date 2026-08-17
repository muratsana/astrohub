import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * PANELDE YUTULAN SUPABASE HATASI VAR MI.
 *
 * ── Bu testin doğduğu hata ────────────────────────────────────────────
 *
 * "Radyo yayın kontrolü gitmiş" diye bildirildi. Gitmemişti: paneller
 * yerindeydi, `radio_stations` tablosunda kayıt yoktu. Ama asıl sorun
 * şuydu — o iki durum EKRANDA AYNI görünüyor:
 *
 *     const { data } = await supabase.from('radio_stations')...
 *     if (!data) { setStation(null); return; }   // → "kurulmamış"
 *
 * `error` hiç okunmadığı için başarısız bir sorgu da `data`yı boş
 * bırakıyor ve ekran "Henüz istasyon tanımlı değil, AzuraCast kurun"
 * diyor. Yönetici için "hiç kurulmamış" ile "okunamadı" ayırt edilemez.
 *
 * Aynı dosyada yazma tarafında ikinci bir sessizlik vardı:
 *
 *     await supabase.from('radio_stations').update({...}).eq('id', id);
 *
 * Dönüş değeri hiç okunmuyor. PostgREST 0 satır etkilendiğinde HATA
 * DÖNDÜRMEZ, dolayısıyla RLS reddettiğinde düğme "değişti" gibi davranıp
 * hiçbir şey yazmıyor. `catch` de kurtarmıyor: PostgREST hatayı yanıtın
 * içinde veriyor, exception olarak fırlatmıyor.
 *
 * ── Kural ─────────────────────────────────────────────────────────────
 *
 * Panel kodundaki her `supabase` çağrısı ya `error`ü okumalı ya da
 * yazmalarda `.select()` ile dönen satırı saymalı. Sessizce boş dönen
 * bir ekran, hata gösteren bir ekrandan çok daha pahalıya mal oluyor.
 */

const ADMIN = resolve(__dirname);

function adminSources(): string[] {
  return readdirSync(ADMIN)
    .filter((n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n))
    .map((n) => join(ADMIN, n));
}

/**
 * `const { data } = await supabase...` — `error` hiç destructure edilmemiş.
 *
 * `supabase.auth.*` dışarıda: oturum çağrıları PostgREST değil ve
 * `data.user` zaten null kontrolünden geçiyor.
 */
const OKUMA_HATASIZ =
  /const\s*\{\s*data(?:\s*:\s*\w+)?\s*\}\s*=\s*await\s+supabase(?!\.auth)/g;

/**
 * `await supabase.from(...).update|insert|upsert|delete(...)` — dönüş
 * değeri hiç alınmamış. Bir ifadeye atanan çağrılar (`= await`,
 * `? await`, `: await`) kapsam dışı: onların sonucu okunuyor.
 */
const YAZMA_SONUCSUZ =
  /(?<![=?:]\s)(?<![=?:]\s{2})(?<![=?:]\s{3})(?<![=?:]\s{4})await\s+supabase\s*\n?\s*\.from\([\s\S]{0,400}?\.(update|insert|upsert|delete)\(/g;

describe('panelde yutulan supabase hatası', () => {
  it('okuma çağrılarında error okunuyor', () => {
    const bulgular: string[] = [];
    for (const path of adminSources()) {
      const kaynak = readFileSync(path, 'utf8');
      const sayi = [...kaynak.matchAll(OKUMA_HATASIZ)].length;
      if (sayi > 0) {
        bulgular.push(`${path.split('/').pop()} (${sayi} çağrı)`);
      }
    }
    expect(bulgular).toEqual([]);
  });

  it('yazma çağrılarının sonucu okunuyor', () => {
    const bulgular: string[] = [];
    for (const path of adminSources()) {
      const kaynak = readFileSync(path, 'utf8');
      const sayi = [...kaynak.matchAll(YAZMA_SONUCSUZ)].length;
      if (sayi > 0) {
        bulgular.push(`${path.split('/').pop()} (${sayi} çağrı)`);
      }
    }
    expect(bulgular).toEqual([]);
  });
});
