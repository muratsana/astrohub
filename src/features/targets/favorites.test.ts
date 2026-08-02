import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { targets } from './data';

/**
 * FAVORİ HEDEFLER (§14.1).
 *
 * Ölçülenler:
 *
 *  1. GÖÇÜN SLUG BİÇİMİ, KATALOĞUN SLUG'LARIYLA UYUMLU. `0066`daki
 *     CHECK katalogdaki bir hedefi reddederse favori düğmesi veritabanı
 *     hatası verirdi — ve bunu ancak kullanıcı basınca öğrenirdik.
 *  2. KOLEKSİYON TABLOSU DEĞİŞTİRİLMEDİ. Fazın "birleştir" kuralı
 *     incelendi ve `collections` UYMADIĞI için ayrı tablo açıldı;
 *     göçün mevcut tabloya dokunmadığını ölçüyoruz, çünkü dokunsaydı
 *     fotoğraf koleksiyonlarını da riske atardık.
 *  3. FAVORİ LİSTESİ HERKESE AÇIK DEĞİL: `anon`a SELECT verilmiyor.
 */

const sql = readFileSync(
  join(
    resolve(__dirname, '../../..'),
    'supabase/migrations/0066_favori_hedefler.sql'
  ),
  'utf8'
);

describe('0066 — favori hedefler göçü', () => {
  it('slug kısıtı katalogdaki her hedefi kabul ediyor', () => {
    /* Göçteki desen: '^[a-z0-9-]{2,120}$'. Katalogdaki bir slug bunun
       dışında kalırsa favori eklemek veritabanı hatası verirdi. */
    const desen = /^[a-z0-9-]{2,120}$/;
    const kotu = targets.map((t) => t.slug).filter((s) => !desen.test(s));
    expect(kotu, `kısıta uymayan slug: ${kotu.join(', ')}`).toEqual([]);
  });

  it('göç `collections`/`collection_items`a DOKUNMUYOR', () => {
    /* Ayrı tablo açma kararının kanıtı: mevcut koleksiyon şeması
       değişmedi, yani fotoğraf koleksiyonları bu turdan etkilenmiyor.
       YORUMLAR AYIKLANIYOR — göç `collection_items`ı BAŞLIĞINDA anıyor
       (neden uymadığını anlatmak için). Ham metinde arayan ilk sürüm bu
       yüzden düştü: açıklamayı değişiklik sanıyordu. */
    const kod = sql
      .replace(/--[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(kod).not.toMatch(/collection/i);
  });

  it('liste kişisel — `anon`a okuma izni verilmiyor', () => {
    const grants = sql.match(/^grant .*$/gm) ?? [];
    expect(grants.length).toBeGreaterThan(0);
    for (const g of grants) {
      expect(g, `anon izni sızmış: ${g}`).not.toMatch(/\banon\b/);
    }
  });

  it('yazma politikası `with check` taşıyor', () => {
    /* `using` olmadan `with check` yeterli değil ve tersi de öyle:
       ikincisi olmadan kullanıcı `user_id`yi başkasına çevirip onun
       adına favori yazabilirdi. Göçün ölçüm bloğu bunu canlıda da
       deniyor. */
    const politika = sql.slice(sql.indexOf('create policy target_favorites_own'));
    expect(politika).toContain('using (user_id = (select auth.uid()))');
    expect(politika).toContain('with check (user_id = (select auth.uid()))');
  });

  it('birincil anahtar kullanıcı+hedef — aynı hedef iki kez eklenemez', () => {
    expect(sql).toContain('primary key (user_id, target_slug)');
  });
});
