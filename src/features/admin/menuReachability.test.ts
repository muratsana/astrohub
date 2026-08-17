import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * PANEL MENÜSÜ — ULAŞILABİLİRLİK KAPISI.
 *
 * Denetimde iki ayrı sorun çıktı ve ikisi de aynı kökten geliyordu: menü
 * listesi ile gövdedeki dallar birbirinden bağımsız yazılmış, hiçbir şey
 * ikisinin örtüştüğünü ölçmemişti.
 *
 *   K-1  Forum yönetimi ekranı (`ForumCategories` + forum konuları +
 *        forum iletileri) gövdenin KOŞULSUZ son dönüşündeydi. Menüdeki her
 *        kimlik kendinden önceki bir dalda yakalandığı için o dönüşe hiçbir
 *        yoldan düşülmüyordu. `/admin/forum` takma adı bile 'moderasyon'a
 *        gidiyordu; ekran yazılmıştı ama erişilemezdi.
 *
 *   13→9 On üç menü girdisi dokuz ayrı ekrana gidiyordu: dört çift aynı
 *        bileşeni çiziyor, üç etiket ("Hata Günlükleri", "Link Sağlığı",
 *        "E-posta Sağlığı") var olmayan bir ekran vaat ediyordu.
 *
 * Bu test kaynağı okuyor. Çalışma anında ölçmek her bölümü ayrı ayrı
 * render etmeyi ve Supabase'i taklit etmeyi gerektirirdi; ölçülmek istenen
 * şey ise davranış değil, menü ile dalların YAPISAL örtüşmesi.
 */

const source = readFileSync(
  path.join(process.cwd(), 'src/features/admin/AdminPage.tsx'),
  'utf8'
);

/** `navGroups` içindeki `id: 'x'` girdileri — menüde görünen bölümler. */
function menuIds(): string[] {
  const start = source.indexOf('const navGroups');
  const end = source.indexOf('const sections =');
  expect(start, 'navGroups bulunamadı').toBeGreaterThan(-1);
  expect(end, 'sections bulunamadı').toBeGreaterThan(start);

  const block = source.slice(start, end);
  return [...block.matchAll(/\bid: '([a-z]+)'/g)].map((m) => m[1]);
}

/** Gövdedeki `active === 'x'` karşılaştırmaları. */
function branchIds(): string[] {
  return [...source.matchAll(/active === '([a-z]+)'/g)].map((m) => m[1]);
}

describe('yönetim menüsü ulaşılabilirliği', () => {
  it('menüdeki her girdinin kendi dalı var', () => {
    const dallar = new Set(branchIds());
    const ulasilmayan = menuIds().filter((id) => !dallar.has(id));

    expect(
      ulasilmayan,
      `menüde olup hiçbir dalda karşılanmayan bölüm: ${ulasilmayan.join(', ')}`
    ).toEqual([]);
  });

  it('menüde forum girdisi var', () => {
    expect(menuIds()).toContain('forum');
  });

  it('forum ekranı kendi dalında, koşulsuz son dönüşte değil', () => {
    /* K-1'in tam biçimi: `ForumCategories` bir `active === 'forum'`
       dalının içinde durmalı. Koşulsuz son dönüşe geri taşınırsa —
       ki hata tam olarak buydu — bu ölçüm düşer. */
    const forumDali = source.indexOf("active === 'forum'");
    const forumEkrani = source.indexOf('<ForumCategories');

    expect(forumDali, "active === 'forum' dalı yok").toBeGreaterThan(-1);
    expect(forumEkrani, 'ForumCategories çizilmiyor').toBeGreaterThan(forumDali);
  });

  it('/admin/forum takma adı forum bölümüne gidiyor', () => {
    /* Eskiden 'moderasyon'a gidiyordu: adres doğru, varış yeri yanlıştı. */
    const alias = source.match(/'\/admin\/forum': '([a-z]+)'/);
    if (alias) {
      expect(alias[1]).toBe('forum');
    } else {
      /* Takma ad listesinden çıkarıldıysa gerçek yol menüde olmalı. */
      expect(source).toContain("path: '/admin/forum'");
    }
  });

  it('menüde aynı ekrana giden mükerrer girdi kalmadı', () => {
    /* Aynı dalda birleştirilmiş kimlikler (`a === 'x' || a === 'y'`) aynı
       bileşeni çiziyor demektir. İkisi birden MENÜDE ise yönetici iki ayrı
       ekran sanıp aynı yere varır — denetimdeki dört çift buydu. */
    const menude = new Set(menuIds());
    const birlesik = [
      ...source.matchAll(/active === '([a-z]+)' \|\| active === '([a-z]+)'/g),
    ];

    const cakisan = birlesik
      .filter(([, a, b]) => menude.has(a) && menude.has(b))
      .map(([, a, b]) => `${a}+${b}`);

    expect(
      cakisan,
      `menüde aynı ekrana giden çift: ${cakisan.join(', ')}`
    ).toEqual([]);
  });
});
