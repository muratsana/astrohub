import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_NAV_LINKS,
  guvenliAdres,
  selectMenu,
  toNavLinks,
} from './navLinks';
import { legalNav, primaryNav } from '@/app/navigation';

/**
 * MENÜ VE FOOTER — ziyaretçi tarafı (§13.2).
 *
 * Ölçülenler:
 *
 *  1. TOHUM KODLA AYNI. `0062`nin yazdığı satırlar `navigation.ts` ile
 *     birebir eşleşmeli; menüyü kodda değiştirip tohumu unutan biri bu
 *     testle yakalanır. 0058'in `home_modules` tohumu tam da bu ölçüm
 *     olmadığı için kodla ayrışmıştı (bkz. 0061).
 *  2. YEDEK BOŞ MENÜ ÜRETMEZ — ama "hepsini kapat" da uygulanır.
 *  3. BOZUK ADRES MENÜYE GİRMEZ; hepsi bozuksa yedeğe dönülür.
 *  4. `auth_only` ve kapalı bölüm önekleri süzülür.
 */

describe('0062 tohumu', () => {
  /* Yol `__dirname`den kuruluyor — `designSystem.test.ts` ile aynı
     yöntem; `import.meta.url` bu vitest ortamında `file:` şeması
     taşımıyor. */
  const sql = readFileSync(
    join(
      resolve(__dirname, '../../..'),
      'supabase/migrations/0062_nav_links_tohumu.sql'
    ),
    'utf8'
  );

  /** Göçteki `('header', 'Galeri', '/galeri', 1),` satırlarını okur. */
  function tohum(menu: 'header' | 'footer') {
    return [
      ...sql.matchAll(
        new RegExp(`\\('${menu}',\\s*'([^']+)',\\s*'([^']+)',\\s*(\\d+)\\)`, 'g')
      ),
    ].map((m) => ({ label: m[1]!, to: m[2]!, position: Number(m[3]) }));
  }

  it('üst menü tohumu `primaryNav` ile birebir aynı', () => {
    expect(tohum('header').map((r) => ({ label: r.label, to: r.to }))).toEqual(
      primaryNav.map((i) => ({ label: i.label, to: i.to }))
    );
  });

  it('footer tohumu `legalNav` ile birebir aynı', () => {
    expect(tohum('footer').map((r) => ({ label: r.label, to: r.to }))).toEqual(
      legalNav.map((i) => ({ label: i.label, to: i.to }))
    );
  });

  it('sıra 1..n, boşluksuz', () => {
    for (const menu of ['header', 'footer'] as const) {
      const siralar = tohum(menu).map((r) => r.position);
      expect(siralar).toEqual(siralar.map((_, i) => i + 1));
    }
  });

  it('tohum yalnızca menü boşken yazılıyor', () => {
    /* `where not exists` olmasaydı göç ikinci kez çalıştığında menü
       ikiye katlanırdı — doğal anahtar yok, `on conflict` kullanılamaz. */
    const korumalar = [...sql.matchAll(/where not exists/g)];
    expect(korumalar).toHaveLength(2);
  });
});

describe('toNavLinks', () => {
  it('veri yokken koddaki menü çiziliyor', () => {
    /* Boş liste dönseydi bir ağ hatası üst çubuğu bomboş bırakırdı. */
    expect(toNavLinks(null)).toEqual(DEFAULT_NAV_LINKS);
    expect(toNavLinks([])).toEqual(DEFAULT_NAV_LINKS);
    expect(DEFAULT_NAV_LINKS.filter((l) => l.menu === 'header')).toHaveLength(
      primaryNav.length
    );
  });

  it('sırayı `position` belirler', () => {
    const links = toNavLinks([
      { menu: 'header', label: 'B', path: '/b', position: 2 },
      { menu: 'header', label: 'A', path: '/a', position: 1 },
    ]);
    expect(links.map((l) => l.label)).toEqual(['A', 'B']);
  });

  it('kapalı bağlantı çizilmez', () => {
    const links = toNavLinks([
      { menu: 'header', label: 'A', path: '/a', position: 1, enabled: true },
      { menu: 'header', label: 'B', path: '/b', position: 2, enabled: false },
    ]);
    expect(links.map((l) => l.label)).toEqual(['A']);
  });

  it('hepsi kapalıysa menü boş kalır, yedeğe DÜŞMEZ', () => {
    /* Yönetici menüyü boşaltabilmeli; yedeğe düşseydi kapattığı
       bağlantılar inatla geri gelirdi. */
    expect(
      toNavLinks([
        { menu: 'header', label: 'A', path: '/a', position: 1, enabled: false },
      ])
    ).toEqual([]);
  });

  it('bozuk adres menüye girmez', () => {
    const links = toNavLinks([
      { menu: 'header', label: 'İyi', path: '/iyi', position: 1 },
      { menu: 'header', label: 'Kötü', path: 'javascript:alert(1)', position: 2 },
      { menu: 'header', label: 'Şema', path: '//evil.example', position: 3 },
      { menu: 'header', label: 'Etiketsiz', path: '/x', position: 4 },
    ]);
    expect(links.map((l) => l.label)).toEqual(['İyi', 'Etiketsiz']);
  });

  it('açık satır varken hepsi bozuksa yedeğe dönülür', () => {
    /* Bu "yönetici menüyü boşalttı" değil, "veri bozuk". Ayırmasaydık
       bozuk bir tablo menüyü sessizce yok ederdi. */
    expect(
      toNavLinks([{ menu: 'header', label: 'X', path: 'javascript:x', position: 1 }])
    ).toEqual(DEFAULT_NAV_LINKS);
  });
});

describe('guvenliAdres', () => {
  it('site içi yol ve https kabul, gerisi ret', () => {
    expect(guvenliAdres('/galeri')).toBe(true);
    expect(guvenliAdres('https://ornek.com/x')).toBe(true);
    expect(guvenliAdres('javascript:alert(1)')).toBe(false);
    expect(guvenliAdres('data:text/html,x')).toBe(false);
    expect(guvenliAdres('http://ornek.com')).toBe(false);
    expect(guvenliAdres('')).toBe(false);
  });

  it('`//` ile başlayan adres reddediliyor', () => {
    /* `/` ile başlıyor diye "site içi" sanmak yanlış: tarayıcı bunu
       protokol-göreli DIŞ adres sayar. */
    expect(guvenliAdres('//evil.example/x')).toBe(false);
  });
});

describe('selectMenu', () => {
  const links = toNavLinks([
    { menu: 'header', label: 'Galeri', path: '/galeri', position: 1 },
    { menu: 'header', label: 'Radyo', path: '/radyo', position: 2 },
    { menu: 'header', label: 'Panelim', path: '/panel', position: 3, auth_only: true },
    { menu: 'footer', label: 'KVKK', path: '/kvkk', position: 1 },
  ]);

  it('menüye göre ayırıyor', () => {
    expect(selectMenu(links, 'footer', { signedIn: false }).map((l) => l.label))
      .toEqual(['KVKK']);
  });

  it('`auth_only` yalnızca oturum açmışa görünüyor', () => {
    expect(
      selectMenu(links, 'header', { signedIn: false }).map((l) => l.label)
    ).toEqual(['Galeri', 'Radyo']);
    expect(
      selectMenu(links, 'header', { signedIn: true }).map((l) => l.label)
    ).toEqual(['Galeri', 'Radyo', 'Panelim']);
  });

  it('kapalı bölüme giden bağlantı menüde görünmüyor', () => {
    /* Yönetici üst menüye `/radyo` koyup `radyo_acik`ı kapatırsa panel
       kendi kendisiyle çelişirdi: bir yerde kapalı, başka yerde duruyor. */
    expect(
      selectMenu(links, 'header', {
        signedIn: false,
        hiddenPrefixes: ['/radyo'],
      }).map((l) => l.label)
    ).toEqual(['Galeri']);
  });
});
