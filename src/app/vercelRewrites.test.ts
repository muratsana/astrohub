import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { appRoutes } from './router';

/**
 * `vercel.json` REWRITE LİSTESİ ROTA AĞACIYLA AYNI OLMALI.
 *
 * Bu test bilerek İKİNCİ bir yoldan gidiyor: üretici betik `router.tsx`
 * metnini ayrıştırıyor, buradaki kontrol ise AYNI ağacı modül olarak içe
 * aktarıp geziyor. İkisi aynı kaynağı okusaydı, ayrıştırıcıdaki bir hata
 * hem dosyayı hem testi aynı yönde yanıltırdı — test kendi hatasını
 * doğrulardı.
 *
 * NE KORUYOR
 *
 * Yakala-hepsini rewrite (`/(.*)` → `app.html`) kaldırıldı; artık listede
 * olmayan her adres `404.html`e ve HTTP 404'e düşüyor. Bu doğru davranış
 * ama kırılgan: yeni bir rota eklenip listeye yazılmazsa, o sayfa canlıda
 * 404 verir. Daha önce tam olarak bu oldu — elle yazılmış bir önek listesi
 * `/harita` ve `/ikinci-el` yönlendirmelerini 404'e düşürdüğü için
 * yaklaşım geri alınmıştı.
 *
 * Buradaki eşitlik o hatayı dağıtımdan CI'a taşıyor.
 */

const config = JSON.parse(
  readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')
) as { rewrites: { source: string; destination: string }[] };

interface RouteNode {
  path?: string;
  children?: RouteNode[];
}

/** Rota ağacındaki tüm yol desenleri — kök ve NotFound hariç. */
function routePatterns(nodes: RouteNode[], prefix = ''): string[] {
  const out: string[] = [];
  for (const node of nodes) {
    if (node.path === undefined) {
      // index rotası: kendi yolu yok, ebeveyninin yolunu paylaşır
      if (node.children) out.push(...routePatterns(node.children, prefix));
      continue;
    }
    const joined =
      node.path === '/'
        ? ''
        : `${prefix}/${node.path.replace(/^\//, '')}`.replace(/\/+/g, '/');

    if (node.path !== '*' && joined !== '') out.push(joined);
    if (node.children) out.push(...routePatterns(node.children, joined));
  }
  return out;
}

const patterns = [...new Set(routePatterns(appRoutes as RouteNode[]))].sort();
const sources = config.rewrites.map((r) => r.source).sort();

describe('vercel.json rewrite listesi', () => {
  it('rota ağacındaki her yolu karşılıyor', () => {
    const missing = patterns.filter((p) => !sources.includes(p));
    expect(
      missing,
      `vercel.json'da eksik rota: ${missing.join(', ')} — düzeltmek için: node scripts/vercel-rewrites.mjs`
    ).toEqual([]);
  });

  it('rota ağacında olmayan yol taşımıyor', () => {
    const extra = sources.filter((s) => !patterns.includes(s));
    expect(
      extra,
      `vercel.json'da fazla rota: ${extra.join(', ')} — düzeltmek için: node scripts/vercel-rewrites.mjs`
    ).toEqual([]);
  });

  /*
   * Yakala-hepsini kural GERİ GELMEMELİ. Geri gelirse 404.html bir daha
   * hiç kullanılmaz ve bilinmeyen her adres sessizce 200 döner — testin
   * geri kalanı yeşil kaldığı için de fark edilmez.
   */
  it('yakala-hepsini kural içermiyor', () => {
    for (const rewrite of config.rewrites) {
      expect(rewrite.source).not.toMatch(/^\/\(\.\*\)$/);
      expect(rewrite.source.startsWith('/')).toBe(true);
    }
  });

  it('hepsi SPA kabuğuna gidiyor', () => {
    for (const rewrite of config.rewrites) {
      expect(rewrite.destination).toBe('/app.html');
    }
  });

  /*
   * NotFound rotası (`*`) listede OLMAMALI: onun işi 404 aldırmak.
   * Listeye girerse `/olmayan-sayfa` yine 200 döner.
   */
  it('NotFound yakalayıcısı listeye girmiyor', () => {
    expect(sources).not.toContain('/*');
    expect(sources).not.toContain('*');
  });

  it('şehir SEO adresleri tek tek yazılmış — kalıp değil', () => {
    const city = sources.filter((s) => s.endsWith('-astronomi-etkinlikleri'));
    expect(city.length).toBeGreaterThanOrEqual(10);
    // Kalıp bir kural tanımsız şehri de kabuğa düşürürdü.
    expect(sources.some((s) => s.includes('(.*)'))).toBe(false);
  });
});
