import { describe, it, expect } from 'vitest';
import {
  primaryNav,
  mobileNav,
  mobileDrawerGroups,
  mobileDrawerPrimary,
  footerGroups,
  type NavItem,
} from './navigation';
import { router } from './router';

/**
 * Navigasyon regresyon testi: menü, footer ve çekmecedeki her bağlantının
 * router'da karşılığı olmalı. Bu test, "footer'da var ama route yok" tipi
 * ölü bağlantıların geri gelmesini engeller.
 */

/** Router'ın tanıdığı yolları toplar (parametreli segmentler dahil). */
function routePatterns(): string[] {
  const root = router.routes[0];
  return (root.children ?? [])
    .map((child) => child.path)
    .filter((path): path is string => typeof path === 'string')
    .map((path) => `/${path}`);
}

/** `/hedef/:slug` gibi bir desenin verilen yolu karşılayıp karşılamadığı. */
function matches(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean);
  const t = path.split('/').filter(Boolean);
  if (p.length !== t.length) return false;
  return p.every((segment, i) => segment.startsWith(':') || segment === t[i]);
}

const patterns = routePatterns();

function isRouted(path: string): boolean {
  if (path === '/') return true;
  return patterns.some((pattern) => matches(pattern, path));
}

function allItems(): NavItem[] {
  return [
    ...primaryNav.flatMap((entry) => [entry, ...(entry.children ?? [])]),
    ...mobileNav,
    mobileDrawerPrimary,
    ...mobileDrawerGroups.flatMap((group) => group.items),
    ...footerGroups.flatMap((group) => group.items),
  ];
}

describe('navigasyon bağlantıları', () => {
  it('tüm menü/footer bağlantıları bir route ile karşılanır', () => {
    const broken = allItems()
      .map((item) => item.to)
      .filter((to) => !isRouted(to));

    expect([...new Set(broken)]).toEqual([]);
  });

  it('footer hukuki bağlantıları route edilmiştir', () => {
    for (const path of ['/kvkk', '/kullanim-kosullari', '/hakkinda']) {
      expect(isRouted(path)).toBe(true);
    }
  });

  it('üst menü şartnamedeki yedi ana girişi taşır (§5.1)', () => {
    expect(primaryNav.map((entry) => entry.label)).toEqual([
      'Keşfet',
      'Fotoğraflar',
      'Etkinlikler',
      'Harita',
      'Eğitim',
      'Araçlar',
      'İkinci El',
    ]);
  });

  it('Keşfet, Harita ve Araçlar açılır menü grubudur (§5.2)', () => {
    for (const label of ['Keşfet', 'Harita', 'Araçlar']) {
      const entry = primaryNav.find((e) => e.label === label);
      expect(entry?.children?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('mobil çubuk dar ekranda taşmayacak sayıda giriş içerir (§5.3)', () => {
    // Çubuk: girişler + "+" + "Daha Fazla" → en fazla altı hücre.
    expect(mobileNav.length + 2).toBeLessThanOrEqual(6);
  });
});
