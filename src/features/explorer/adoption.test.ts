import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATA EXPLORER'A GEÇİŞ TAKİBİ (Faz 4)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Belge §7: "Her modül aynı arama/filtre motorunu kullanmalı; ayrı ve
 * tutarsız filtre bileşenleri üretilmemelidir."
 *
 * Bu dosya bir KAPI değil, bir SAYAÇ. Geçiş tek oturumda bitmiyor ve
 * bitmemiş bir işi kırmızı kapıyla göstermek, kapının tamamen
 * kapatılmasına yol açar. Onun yerine liste burada duruyor:
 *
 *   · Geçen bir sayfa listeden çıkarılmazsa test DÜŞER — yani "geçtim"
 *     demeden geçmek mümkün değil.
 *   · Listede olmayan yeni bir sayfa kendi filtre durumunu yazarsa test
 *     DÜŞER — yani borç büyüyemez.
 *
 * Liste boşaldığında bu dosya sıradan bir kapıya dönüşür.
 */

const src = resolve(__dirname, '../..');

/**
 * Henüz ortak motora geçmemiş liste sayfaları.
 *
 * Her biri kendi `useState` filtre durumunu taşıyor; sonucu: filtrelenmiş
 * liste paylaşılamıyor, geri düğmesi filtreyi geri almıyor, sayfa
 * yenilenince seçim uçuyor ve aramada ASCII katlama yok ("nevsehir"
 * yazan kullanıcı "Nevşehir"i bulamıyor).
 */
const BEKLEYEN = [
  'features/marketplace/MarketplacePage.tsx',
  'features/equipment/EquipmentPage.tsx',
  'features/targets/TargetsPage.tsx',
  'features/clubs/ClubsPage.tsx',
  'features/observing-sites/SitesPage.tsx',
  'features/events/EventsPage.tsx',
  'features/forum/ForumPage.tsx',
  'features/news/NewsPage.tsx',
  'features/articles/ArticlesPage.tsx',
];

/** Ortak motora geçmiş sayfalar — burada kalmaları test edilir. */
const GECEN = ['features/photos/GalleryPage.tsx'];

const oku = (p: string) => readFileSync(join(src, p), 'utf8');

describe('geçiş takibi', () => {
  it('geçen sayfalar ortak motoru kullanmayı sürdürüyor', () => {
    for (const p of GECEN) {
      expect(oku(p), p).toContain('useExplorer');
    }
  });

  /*
   * Bir sayfa geçtiğinde BEKLEYEN listesinden çıkarılmalı. Çıkarılmazsa
   * borç listesi gerçeği yansıtmamaya başlar ve sayaç anlamını yitirir.
   */
  it('bekleyen listesi güncel — geçmiş bir sayfa listede kalmıyor', () => {
    const yanlis = BEKLEYEN.filter((p) => oku(p).includes('useExplorer'));
    expect(yanlis, 'Bu sayfalar geçmiş; BEKLEYEN listesinden çıkarılmalı').toEqual(
      []
    );
  });

  /*
   * BORÇ BÜYÜYEMEZ. Listede olmayan bir liste sayfası kendi filtre
   * durumunu yazarsa burada yakalanır.
   */
  it('yeni bir sayfa kendi filtre durumunu kurmuyor', () => {
    const bilinen = new Set([...BEKLEYEN, ...GECEN]);
    const desen = /useState<[^>]*Filters|useState\([^)]*defaultFilters/;

    const kacaklar: string[] = [];
    for (const p of tsxAra(src)) {
      if (bilinen.has(p)) continue;
      if (desen.test(oku(p))) kacaklar.push(p);
    }

    expect(
      kacaklar,
      'Yeni liste sayfası `useExplorer` kullanmalı, kendi filtre durumunu kurmamalı'
    ).toEqual([]);
  });

  it('borç azalıyor — sayaç raporlanıyor', () => {
    const toplam = BEKLEYEN.length + GECEN.length;
    /* Sayı testin kendisi değil; başarısızlık mesajında görünsün diye
       burada. Geçiş bittiğinde BEKLEYEN boşalır. */
    expect(GECEN.length, `${GECEN.length}/${toplam} sayfa geçti`).toBeGreaterThan(0);
  });
});

function tsxAra(dir: string, out: string[] = [], kok = dir): string[] {
  for (const ad of readdirSync(dir)) {
    const tam = join(dir, ad);
    if (statSync(tam).isDirectory()) tsxAra(tam, out, kok);
    else if (ad.endsWith('.tsx') && !ad.endsWith('.test.tsx')) {
      out.push(tam.slice(kok.length + 1));
    }
  }
  return out;
}
