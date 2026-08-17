import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * SİLİNMİŞ KAYIT PUBLIC LİSTEDE DURUYOR MU.
 *
 * ── Bu testin doğduğu hata ────────────────────────────────────────────
 *
 * Panelde "İlanlar" sekmesi boş görünüyordu ama sitede üç ilan duruyordu.
 * Sebep, ilk bakışta göründüğünün tersiydi: ilanlar SİLİNMİŞTİ, panel
 * onları doğru şekilde "Silinmişler" görünümünde tutuyordu — ama public
 * `/ilanlar` sayfası da gösteriyordu.
 *
 * Çünkü istemci sorgusu yalnızca `status` süzüyor, `deleted_at`
 * süzmüyordu; görünürlük tamamen RLS'e bırakılmıştı. Okuma politikası
 * ise `app.icerik_gorunur(status, deleted_at)` YANINDA sahiplik ve rol
 * dallarını da taşıyor:
 *
 *     or seller_id = (select auth.uid())
 *     or app.is_admin()
 *     or app.has_role('moderator')
 *
 * Bu dallar bilinçli ve doğru — sahibi kendi taslağını, yönetici her
 * kaydı görebilmeli. Ama sonuç olarak soft-delete edilmiş bir kayıt
 * SAHİBİNE, YÖNETİCİYE ve MODERATÖRE public sayfada görünmeye devam
 * ediyordu. Ziyaretçi için sızıntı yoktu; içerideki kişi için ise
 * "silinmiş" ile "canlı" ayırt edilemez hâle gelmişti. Panel aynı kayıt
 * için "public'te görünmüyor" diyordu.
 *
 * ── Neden test, neden tek seferlik düzeltme değil ─────────────────────
 *
 * Bu hatanın hiçbir derleme belirtisi yok: tip kontrolü, lint ve build
 * geçiyor. Eksik olan tek şey bir zincir çağrısı. Üstelik hata yalnızca
 * GİRİŞ YAPMIŞ sahibi/yönetici için görünüyor — anonim sekmede test eden
 * kimse fark etmiyor. Altı okuma yolunun altısında birden vardı.
 *
 * Kural: soft-delete edilebilen bir tabloyu public katalog için okuyan
 * her LİSTE sorgusu `deleted_at` süzgecini AÇIKÇA taşımalı. RLS ikinci
 * savunma hattı, birinci değil.
 *
 * ── Kuralın dışında kalan: tekil kayıt okuması ────────────────────────
 *
 * `.maybeSingle()` / `.single()` ile biten sorgular kapsam dışı. Bunlar
 * bir listeyi doldurmuyor; zaten açık olan bir kaydın kimliğiyle ek alan
 * çekiyorlar (örn. `engagement.ts` puanlama toplamını tazeliyor).
 * Buradaki asıl soru "bu kayıt listede görünmeli mi" değil, "detay
 * sayfası hiç açılmalı mı" — ve o karar sayfanın kendisinde. Üstelik
 * sahibinin silinmiş kaydını açıp geri alabilmesi İSTENEN davranış;
 * körlemesine süzgeç eklemek onu kırardı.
 */

const ROOT = resolve(__dirname, '../../..');
const MIGRATIONS = join(ROOT, 'supabase/migrations');

/** `20260807230000_soft_delete_temeli.sql` içindeki tablo dizisi. */
function softDeletableTables(): string[] {
  const sql = readFileSync(
    join(MIGRATIONS, '20260807230000_soft_delete_temeli.sql'),
    'utf8'
  );
  const blok = sql.match(/foreach t in array array\[([\s\S]*?)\]/);
  if (!blok) throw new Error('Soft-delete tablo dizisi migration içinde bulunamadı.');
  return [...blok[1]!.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/**
 * Public katalog okumaları. Panel (`features/admin`) kasıtlı olarak
 * dışarıda: silinmiş kaydı GÖSTERMESİ gerekiyor, "Silinmişler" görünümü
 * bunun için var.
 */
function publicReadFiles(): string[] {
  return [
    ...walk(join(ROOT, 'src/services/content')),
    ...walk(join(ROOT, 'src/features/clubs')),
  ].filter((path) => !path.includes('/admin/'));
}

describe('soft-delete süzgeci', () => {
  const tablolar = softDeletableTables();

  it('migration altı tabloyu soft-delete edilebilir yapıyor', () => {
    expect(tablolar).toEqual([
      'astro_photos',
      'events',
      'listings',
      'observing_sites',
      'clubs',
      'content_entries',
    ]);
  });

  it.each(tablolar)(
    '%s tablosunu public için okuyan her dosya deleted_at süzüyor',
    (tablo) => {
      const eksik: string[] = [];

      for (const path of publicReadFiles()) {
        const kaynak = readFileSync(path, 'utf8');
        /* Yalnızca OKUMA: `.from('x').select(` deseni. Yazma çağrıları
           (`insert`/`update`/`delete`) bu testin konusu değil. */
        /* Sorgu zincirini `.from('x')` ile başlayıp ilk `;` işaretine
           kadar alıyoruz; tekil okumalar bu parçadaki `maybeSingle`/
           `single` ile ayırt ediliyor. */
        const zincirler = [
          ...kaynak.matchAll(
            new RegExp(`\\.from\\('${tablo}'\\)[\\s\\S]{0,600}?;`, 'g')
          ),
        ].map((m) => m[0]);

        const listeOkumasi = zincirler.some(
          (z) =>
            z.includes('.select(') &&
            !/\.(maybeSingle|single)\(/.test(z) &&
            !/\.(insert|update|upsert|delete)\(/.test(z)
        );
        if (!listeOkumasi) continue;
        if (!kaynak.includes('deleted_at')) {
          eksik.push(path.slice(ROOT.length + 1));
        }
      }

      expect(eksik).toEqual([]);
    }
  );
});
