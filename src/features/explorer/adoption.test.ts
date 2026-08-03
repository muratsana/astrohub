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
 * Bu dosya bir SAYAÇ olarak başladı: geçiş tek oturumda bitmiyordu ve
 * bitmemiş işi kırmızı kapıyla göstermek, kapının tamamen kapatılmasına
 * yol açar. Sayaç iki yönlü çalıştı — geçen bir sayfa listeden
 * çıkarılmazsa düştü, listede olmayan yeni bir sayfa kendi filtre
 * durumunu kurarsa düştü. Yani borç ne saklanabildi ne büyüyebildi.
 *
 * BORÇ KAPANDI: on liste sayfasının onu da geçti. `BEKLEYEN` boş ve
 * dosya artık sıradan bir kapı — kendi filtre durumunu kuran YENİ bir
 * sayfa burada düşer.
 */

const src = resolve(__dirname, '../..');

/**
 * Henüz ortak motora geçmemiş liste sayfaları — ARTIK BOŞ.
 *
 * Başlangıçta ondu. Her biri kendi `useState` filtre durumunu
 * taşıyordu; sonucu: filtrelenmiş liste paylaşılamıyor, geri düğmesi
 * filtreyi geri almıyor, sayfa yenilenince seçim uçuyor ve aramada
 * ASCII katlama yok ("nevsehir" yazan kullanıcı "Nevşehir"i bulamıyor).
 */
const BEKLEYEN: string[] = [];

/** Ortak motora geçmiş sayfalar — burada kalmaları test edilir. */
const GECEN = [
  'features/photos/GalleryPage.tsx',
  'features/clubs/ClubsPage.tsx',
  'features/observing-sites/SitesPage.tsx',
  'features/marketplace/MarketplacePage.tsx',
  'features/news/NewsPage.tsx',
  'features/articles/ArticlesPage.tsx',
  /*
   * Ekipman KISMİ: kategori rota yolunda (`/ekipman/montur`) ve o rotalar
   * prerender ediliyor — sorgu parametresine taşımak verilmiş bağlantıları
   * kırardı. Explorer kategorinin ÜSTÜNDE çalışıyor: arama ve sıralamayı
   * üstleniyor, kategori süzmesi sayfada kalıyor.
   */
  'features/equipment/EquipmentPage.tsx',
  'features/events/EventsPage.tsx',
  /*
   * Hedefler ve Forum EN SON taşındı; ikisi de genel motorun yapmadığı
   * bir şey yapıyordu ve naif taşıma sessizce kaybettirirdi:
   *   · Hedefler — alaka sıralaması (tam eşleşme > baştan > içinde).
   *   · Forum — sabitlenmiş konular her sıralamada üstte; bu bir
   *     sıralama tercihi değil moderasyon kararı.
   * Alaka motora eklendi; sabitleme `forumSpec` içinde her
   * karşılaştırıcıyı saran bir yardımcıyla korundu.
   */
  'features/targets/TargetsPage.tsx',
  'features/forum/ForumPage.tsx',
];

const oku = (p: string) => readFileSync(join(src, p), 'utf8');

describe('geçiş takibi', () => {
  it('geçen sayfalar ortak motoru kullanmayı sürdürüyor', () => {
    for (const p of GECEN) {
      expect(oku(p), p).toContain('useExplorer');
    }
  });

  it('geçen sayfalar ortak komut şeridini kullanmayı sürdürüyor', () => {
    for (const p of GECEN) {
      expect(oku(p), p).toContain('ModuleToolbar');
      expect(oku(p), `${p} kendi ResultCount satırını çizmemeli`).not.toMatch(
        /import[^;]*ResultCount[^;]*from/
      );
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

  it('borç kapandı — bekleyen sayfa yok', () => {
    expect(BEKLEYEN, 'Geçiş tamamlandı; liste boş kalmalı').toEqual([]);
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
