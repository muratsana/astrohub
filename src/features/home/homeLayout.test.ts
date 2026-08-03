import { describe, it, expect } from 'vitest';
import {
  toHomeLayout,
  visibilityClass,
  DEFAULT_HOME_LAYOUT,
} from './homeLayout';

/**
 * ANA SAYFA DÜZENİ — ziyaretçi tarafı (§13.2).
 *
 * Ölçülenler, hepsi "panelde ayar var" ile "ziyaretçi onu görüyor"
 * arasındaki farkı kapatmak için:
 *
 *  1. YEDEK BOŞ SAYFA ÜRETMEZ. Ağ düşerse ya da tablo boşsa ana sayfa
 *     bugünkü hâlini çizmeli — boş liste dönseydi ziyaretçi için bu
 *     sitenin çökmesinden ayırt edilemezdi.
 *  2. SIRA `position`DAN GELİR, dizinin geliş sırasından değil.
 *  3. KAPALI MODÜL ÇİZİLMEZ. Panelin en belirgin kontrolü bu; `enabled`
 *     okunmasaydı "modülü kapat" ziyaretçi tarafında hiçbir şey
 *     yapmazdı. `home_layout` sütunu döndürüyor ama süzmüyor.
 *  4. BOZUK SATIR SAYFAYI DÜŞÜRMEZ; alan bazında varsayılana döner.
 *  5. GÖRÜNÜRLÜK CSS'e çevrilir — dört kombinasyonun dördü de.
 */

describe('toHomeLayout', () => {
  it('boş ya da geçersiz girdide bugünkü düzene döner', () => {
    /* Yedek BOŞ liste olsaydı ana sayfa bir ağ hatasında bomboş kalırdı. */
    expect(toHomeLayout([])).toEqual(DEFAULT_HOME_LAYOUT);
    expect(toHomeLayout(null)).toEqual(DEFAULT_HOME_LAYOUT);
    expect(toHomeLayout(undefined)).toEqual(DEFAULT_HOME_LAYOUT);
  });

  it('yedek sayılar bölüm bileşenlerindeki sabitlerle aynı', () => {
    /* 0061 tohumu koda hizaladı; yedeğin de aynı sayfayı çizmesi gerek,
       yoksa çevrimdışı ziyaretçi başka bir ana sayfa görürdü. */
    const sayilar = Object.fromEntries(
      DEFAULT_HOME_LAYOUT.map((m) => [m.key, m.item_limit])
    );
    expect(sayilar).toEqual({
      hero: 1,
      tonight: 1,
      records: 10,
      news: 4,
      events: 5,
      listings: 5,
      weekly_photo: 1,
    });
  });

  it('sırayı `position` belirler, dizinin geliş sırası değil', () => {
    const sirali = toHomeLayout([
      { key: 'listings', position: 6, item_limit: 5 },
      { key: 'hero', position: 1, item_limit: 1 },
      { key: 'news', position: 4, item_limit: 4 },
    ]);
    expect(sirali.map((m) => m.key)).toEqual(['hero', 'news', 'listings']);
  });

  it('kapalı modül çizilmez', () => {
    /* `home_layout` kapalı modülü de döndürüyor (panel onu görmek
       zorunda); süzme ziyaretçi tarafında. */
    const cizilen = toHomeLayout([
      { key: 'hero', position: 1, item_limit: 1, enabled: true },
      { key: 'records', position: 3, item_limit: 10, enabled: false },
      { key: 'news', position: 4, item_limit: 4, enabled: true },
    ]);
    expect(cizilen.map((m) => m.key)).toEqual(['hero', 'news']);
  });

  it('hepsi kapalıysa boş kalır, yedeğe DÜŞMEZ', () => {
    /* Bu bir arıza değil karar: yönetici ana sayfayı boşaltabilmeli.
       Yedeğe düşseydi kapattığı modüller inatla geri gelirdi. */
    const cizilen = toHomeLayout([
      { key: 'hero', position: 1, item_limit: 1, enabled: false },
      { key: 'news', position: 4, item_limit: 4, enabled: false },
    ]);
    expect(cizilen).toEqual([]);
  });

  it('bozuk alanlar sayfayı düşürmez, varsayılana döner', () => {
    /* `item_limit` 0 gelseydi bölüm boş çizerdi — CHECK'ler bunu zaten
       engelliyor ama tablo başka bir yoldan bozulabilir. */
    const [modul] = toHomeLayout([
      { key: 'records', position: 3, item_limit: 0, layout: 'saçma' },
    ]);
    expect(modul!.item_limit).toBe(10); // `records` varsayılanı
    expect(modul!.layout).toBe('grid'); // bilinmeyen değer ızgaraya düşer
  });

  it('eksik görünürlük alanları AÇIK sayılır', () => {
    /* Alan yoksa modülü gizlemek, bir okuma hatasını içerik kararına
       çevirirdi. Yalnızca açıkça `false` gizler. */
    const [modul] = toHomeLayout([{ key: 'news', position: 4, item_limit: 4 }]);
    expect(modul!.show_mobile).toBe(true);
    expect(modul!.show_desktop).toBe(true);
    expect(modul!.hide_when_empty).toBe(true);
    /* `enabled` eksikken modül SÜZÜLMEMELİ: alanın gelmemesi bir okuma
       eksiği, "yönetici kapattı" değil. */
    expect(modul!.enabled).toBe(true);
  });
});

describe('visibilityClass', () => {
  const modul = DEFAULT_HOME_LAYOUT[0]!;

  it('ikisi de açıkken sınıf üretmez', () => {
    /* Sınıf üretseydi HomePage her modülü gereksiz bir <div>'e sarardı. */
    expect(visibilityClass(modul)).toBeUndefined();
  });

  it('yalnız masaüstü → mobilde gizli', () => {
    expect(visibilityClass({ ...modul, show_mobile: false })).toBe(
      'hidden sm:block'
    );
  });

  it('yalnız mobil → masaüstünde gizli', () => {
    expect(visibilityClass({ ...modul, show_desktop: false })).toBe('sm:hidden');
  });

  it('ikisi de kapalı → tamamen gizli', () => {
    expect(
      visibilityClass({ ...modul, show_mobile: false, show_desktop: false })
    ).toBe('hidden');
  });
});
