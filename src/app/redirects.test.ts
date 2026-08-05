import { describe, it, expect } from 'vitest';
import { router } from './router';
import { allNavItems, primaryNav, mobileNav } from './navigation';
import { staticEntries, contentEntries } from './sitemap';

/**
 * Modül adları değiştiğinde (Fotoğraflar → Galeri, Eğitim → Yazılar,
 * İkinci El → İlanlar, Harita → Saha) eski adresler ölü bağlantıya
 * dönüşmemeli. Bu test hem yönlendirmelerin varlığını hem de yeni
 * adreslerin gerçekten route edildiğini doğrular.
 */

const children = router.routes[0].children ?? [];

const paths = children
  .map((child) => child.path)
  .filter((path): path is string => typeof path === 'string')
  .map((path) => `/${path}`);

function isRouted(path: string): boolean {
  if (path === '/') return true;
  return paths.some((pattern) => {
    const p = pattern.split('/').filter(Boolean);
    const t = path.split('/').filter(Boolean);
    if (p.length !== t.length) return false;
    return p.every((seg, i) => seg.startsWith(':') || seg === t[i]);
  });
}

/** Taşınan modüllerin eski → yeni adres eşlemesi. */
const MOVED: [string, string][] = [
  ['/fotograflar', '/galeri'],
  ['/fotograflar/yukle', '/galeri/yukle'],
  ['/egitim', '/yazilar'],
  ['/egitim/:slug', '/yazi/:slug'],
  ['/ikinci-el', '/ilanlar'],
  ['/harita', '/saha'],
  ['/harita/gozlem-noktalari', '/saha'],
  ['/harita/isik-kirliligi', '/araclar/isik-kirliligi'],
  ['/gozlem-noktasi/:slug', '/saha/:slug'],
  ['/araclar/fov', '/simulator'],
  ['/araclar/pixel-scale', '/simulator'],
  ['/araclar/setup-uyumluluk', '/simulator'],
];

describe('taşınan adresler', () => {
  it('her eski adres hâlâ route edilmiştir (404 vermez)', () => {
    for (const [oldPath] of MOVED) {
      expect(isRouted(oldPath), `${oldPath} route edilmemiş`).toBe(true);
    }
  });

  it('her yeni adres route edilmiştir', () => {
    for (const [, newPath] of MOVED) {
      expect(isRouted(newPath), `${newPath} route edilmemiş`).toBe(true);
    }
  });

  it('navigasyon ve sitemap artık eski adresleri kullanmaz', () => {
    const oldPaths = new Set(MOVED.map(([oldPath]) => oldPath));
    const live = [
      ...primaryNav.map((i) => i.to),
      ...mobileNav.map((i) => i.to),
      ...allNavItems().map((i) => i.to),
      ...staticEntries.map((e) => e.path),
      ...contentEntries().map((e) => e.path),
    ];

    const stale = live.filter((path) => oldPaths.has(path));
    expect([...new Set(stale)]).toEqual([]);
  });

  it('sitemap yinelenen adres içermez', () => {
    const all = [...staticEntries, ...contentEntries()].map((e) => e.path);
    const duplicates = all.filter((p, i) => all.indexOf(p) !== i);
    expect([...new Set(duplicates)]).toEqual([]);
  });
});
