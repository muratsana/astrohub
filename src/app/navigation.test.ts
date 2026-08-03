import { describe, it, expect } from 'vitest';
import {
  primaryNav,
  mobileNav,
  mobileDrawerPrimary,
  allNavItems,
  type NavItem,
} from './navigation';
import { router } from './router';
import { defaultCommands, runCommandSearch } from '@/features/search/commands';

/**
 * Navigasyon regresyon testi: menü, kurumsal footer, çekmece ve komut
 * paletindeki her bağlantının router'da karşılığı olmalı. Bu test "footer'da
 * var ama route yok" tipi ölü bağlantıların geri gelmesini engeller.
 *
 * Rasathane Terminali yönünde üst menüde açılır menü yoktur; keşif çekmeceye
 * ve komut paletine bırakıldığı için `siteMap`'in eksiksizliği kritik.
 */

/** Router'ın tanıdığı yolları toplar (parametreli segmentler dahil). */
const patterns = (router.routes[0].children ?? [])
  .map((child) => child.path)
  .filter((path): path is string => typeof path === 'string')
  .map((path) => `/${path}`);

/** `/hedef/:slug` gibi bir desenin verilen yolu karşılayıp karşılamadığı. */
function matches(pattern: string, path: string): boolean {
  const p = pattern.split('/').filter(Boolean);
  const t = path.split('/').filter(Boolean);
  if (p.at(-1) === '*') {
    const prefix = p.slice(0, -1);
    if (t.length < prefix.length) return false;
    return prefix.every(
      (segment, i) => segment.startsWith(':') || segment === t[i]
    );
  }
  if (p.length !== t.length) return false;
  return p.every((segment, i) => segment.startsWith(':') || segment === t[i]);
}

function isRouted(path: string): boolean {
  if (path === '/') return true;
  return patterns.some((pattern) => matches(pattern, path));
}

function allItems(): NavItem[] {
  return [...primaryNav, ...mobileNav, mobileDrawerPrimary, ...allNavItems()];
}

describe('navigasyon bağlantıları', () => {
  it('tüm menü/footer/çekmece bağlantıları bir route ile karşılanır', () => {
    const broken = allItems()
      .map((item) => item.to)
      .filter((to) => !isRouted(to));

    expect([...new Set(broken)]).toEqual([]);
  });

  it('footer hukuki bağlantıları route edilmiştir', () => {
    for (const path of [
      '/kvkk',
      '/kullanim-kosullari',
      '/hakkinda',
      '/iletisim',
    ]) {
      expect(isRouted(path)).toBe(true);
    }
  });

  it('üst menü sekiz ana giriş taşır; ekipman profil/araç akışındadır', () => {
    expect(primaryNav).toHaveLength(8);
    expect(primaryNav.map((i) => i.to)).toContain('/forum');
    expect(primaryNav.map((i) => i.to)).not.toContain('/ekipman');
  });

  it('üst menü patch planındaki sırayı izler', () => {
    expect(primaryNav.map((i) => i.label)).toEqual([
      'Galeri',
      'Etkinlikler',
      'Haberler',
      'Yazılar',
      'İlanlar',
      'Araçlar',
      'Forum',
      'Saha',
    ]);
  });

  it('mobil kısa çubuk üst menü sırasından sapmaz', () => {
    expect(mobileNav.map((i) => i.to)).toEqual(
      primaryNav.slice(0, mobileNav.length).map((i) => i.to)
    );
  });

  it('yayın modülleri menüde metin girişi değil, üst çubukta ikon', () => {
    // TV ve radyo "gidilecek sayfa" değil, açılıp kapatılan yayın; durumun
    // her sayfada görünmesi gerekiyor ve bir metin bağlantısı bunu yapamaz.
    // Sayfaların kendisi modül haritasında duruyor (aşağıdaki test).
    expect(primaryNav.map((i) => i.to)).not.toContain('/radyo');
    expect(primaryNav.map((i) => i.to)).not.toContain('/tv');
  });

  it('üst menüde açılır menü yoktur — keşif palete ve çekmeceye bırakılır', () => {
    for (const item of primaryNav) {
      expect(Object.keys(item)).not.toContain('children');
    }
  });

  it('üst menüdeki her giriş modül haritasında da yer alır', () => {
    const mapped = new Set(allNavItems().map((i) => i.to));
    for (const item of primaryNav) {
      expect(mapped, `${item.label} footer haritasında eksik`).toContain(
        item.to
      );
    }
  });

  it('modül haritasında yinelenen bağlantı yoktur', () => {
    const seen = new Map<string, string>();
    for (const item of allNavItems()) {
      const previous = seen.get(item.to);
      // Aynı yol iki farklı etiketle görünebilir (ör. /galeri), ama
      // aynı etiketle iki kez görünmemeli.
      if (previous) expect(previous).not.toBe(item.label);
      seen.set(item.to, item.label);
    }
  });

  it('mobil çubuk dar ekranda taşmayacak sayıda giriş içerir (§5.3)', () => {
    // Çubuk: girişler + "+" + "Daha Fazla" → en fazla altı hücre.
    expect(mobileNav.length + 2).toBeLessThanOrEqual(6);
  });
});

describe('komut paleti', () => {
  it('boş sorguda sık kullanılan kısayolları verir', () => {
    const groups = runCommandSearch('');
    expect(groups).toHaveLength(1);
    expect(groups[0].items.length).toBeGreaterThan(0);
  });

  it('varsayılan kısayolların tamamı route edilmiştir ya da eylemdir', () => {
    for (const command of defaultCommands) {
      if (command.action) continue;
      expect(command.to, `${command.title} yolu yok`).toBeTruthy();
      expect(isRouted(command.to!), `${command.to} route edilmemiş`).toBe(true);
    }
  });

  it('sayfa adıyla arayınca gezinme komutu bulur', () => {
    const items = runCommandSearch('fov').flatMap((g) => g.items);
    expect(items.some((c) => c.to === '/araclar/fov')).toBe(true);
  });

  it('katalog koduyla arayınca içerik sonucu bulur', () => {
    const items = runCommandSearch('M31').flatMap((g) => g.items);
    expect(items.some((c) => c.kind === 'icerik')).toBe(true);
  });

  it('saha modu bir eylem komutu olarak bulunur', () => {
    const items = runCommandSearch('saha').flatMap((g) => g.items);
    expect(items.some((c) => c.action === 'tema-saha')).toBe(true);
  });

  it('üç temanın üçü de paletten doğrudan seçilebilir', () => {
    // Tek bir "aç/kapat" komutu üç kademeli temada aradığı moda
    // ulaşmak için iki tıklama demekti; palet hızlandırmak için var.
    const items = runCommandSearch('tema').flatMap((g) => g.items);
    const actions = items.map((c) => c.action);
    for (const action of ['tema-acik', 'tema-koyu', 'tema-saha']) {
      expect(actions).toContain(action);
    }
  });

  it('eşleşme yoksa boş döner', () => {
    expect(runCommandSearch('qwxzptr')).toEqual([]);
  });
});
