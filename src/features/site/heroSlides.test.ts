import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HERO_SLIDES,
  focalPosition,
  toHeroSlides,
} from './heroSlides';
import { defaultHeroSlides } from '@/features/home/hero/slides';

/**
 * HERO SLAYTLARI — ziyaretçi tarafı (§6.3, §13.2).
 *
 * Ölçülenler:
 *
 *  1. TOHUM KODLA AYNI. `0063`ün yazdığı slaytlar `slides.ts` ile
 *     eşleşmeli — 0058'in `home_modules` tohumu bu ölçüm olmadığı için
 *     koddan ayrışmıştı (bkz. 0061).
 *  2. YEDEK BOŞ HERO ÜRETMEZ; "hepsi kapalı" ise boş liste (karar).
 *  3. KREDİSİZ GÖRSEL ÇİZİLMEZ — CC BY'nin şartı atıf.
 *  4. ODAK NOKTASI ve METİN HİZASI sınırlanıyor.
 *  5. Bozuk CTA adresi slaytı düşürüyor.
 */

describe('0063 tohumu', () => {
  const sql = readFileSync(
    join(
      resolve(__dirname, '../../..'),
      'supabase/migrations/0063_hero_slaytlari.sql'
    ),
    'utf8'
  );

  it('tohumdaki anahtar ve sıra `slides.ts` ile aynı', () => {
    const anahtarlar = [...sql.matchAll(/^ {2}\('([a-z]+)', '/gm)].map(
      (m) => m[1]
    );
    expect(anahtarlar).toEqual(defaultHeroSlides.map((s) => s.id));
  });

  it('her slaytın başlığı ve CTA adresi kodla aynı', () => {
    for (const slide of defaultHeroSlides) {
      expect(sql).toContain(`'${slide.title}'`);
      expect(sql).toContain(`'${slide.ctaTo}'`);
    }
  });

  it('görsel varsa kredi zorunlu — kısıt tabloda', () => {
    /* Panelden görsel ekleyip krediyi boş bırakmak lisans ihlalini tek
       tıkla mümkün kılardı; `slides.ts` bunu yorumda söylüyordu ama
       hiçbir şey zorlamıyordu. */
    expect(sql).toContain('hero_slides_credit_check');
  });

  it('yayın penceresi SELECT politikasında uygulanıyor', () => {
    /* Kural veritabanında: istemci unutsa da ileri tarihli slayt
       dönmüyor. Yönetici pencereyi aşıyor (0059 tuzağı). */
    const politika = sql.slice(sql.indexOf('create policy hero_slides_read'));
    expect(politika).toContain('publish_from is null or publish_from <= now()');
    expect(politika).toContain('app.is_admin()');
  });
});

describe('toHeroSlides', () => {
  const satir = (over: Record<string, unknown> = {}) => ({
    key: 'galeri',
    title: 'Başlık',
    cta_to: '/galeri',
    cta_label: 'Aç',
    badge: 'Galeri',
    subtitle: 'Alt metin',
    scene: 'nebula',
    tint: '232,120,96',
    position: 1,
    ...over,
  });

  it('veri yokken koddaki slaytlar çiziliyor', () => {
    /* Hero sayfanın İLK bloğu; boş dönseydi ana sayfa bir ağ hatasında
       tepesi kesik açılırdı. */
    expect(toHeroSlides(null)).toEqual(DEFAULT_HERO_SLIDES);
    expect(toHeroSlides([])).toEqual(DEFAULT_HERO_SLIDES);
    expect(DEFAULT_HERO_SLIDES).toHaveLength(defaultHeroSlides.length);
  });

  it('sırayı `position` belirler', () => {
    const s = toHeroSlides([
      satir({ key: 'b', title: 'B', position: 2 }),
      satir({ key: 'a', title: 'A', position: 1 }),
    ]);
    expect(s.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('kapalı slayt çizilmez; hepsi kapalıysa hero boş kalır', () => {
    /* Yönetici hero'yu kaldırabilmeli. Yedeğe düşseydi kapattığı
       slaytlar inatla geri gelirdi. */
    expect(toHeroSlides([satir({ enabled: false })])).toEqual([]);
  });

  it('kredisiz görsel çizilmez, slayt sahnesiyle kalır', () => {
    /* Atıfsız gösterim lisans ihlali. Slaytı tamamen atmak ise bir künye
       eksikliğini içerik kaybına çevirirdi. */
    const [s] = toHeroSlides([
      satir({ image_url: 'https://x.example/a.jpg', image_credit: '' }),
    ]);
    expect(s!.image).toBeUndefined();
    expect(s!.scene).toBe('nebula');
  });

  it('kredili görsel çiziliyor', () => {
    const [s] = toHeroSlides([
      satir({
        image_url: 'https://x.example/a.jpg',
        image_credit: 'ESO',
        image_licence: 'CC BY 4.0',
      }),
    ]);
    expect(s!.image).toEqual({
      url: 'https://x.example/a.jpg',
      credit: 'ESO',
      licence: 'CC BY 4.0',
    });
  });

  it('http görsel reddediliyor', () => {
    /* Hero her sayfada ilk boyanan şey; karışık içerik uyarısı orada
       görünürdü. */
    const [s] = toHeroSlides([
      satir({
        image_url: 'http://x.example/a.jpg',
        image_credit: 'ESO',
        image_licence: 'CC BY 4.0',
      }),
    ]);
    expect(s!.image).toBeUndefined();
  });

  it('bozuk CTA adresi slaytı düşürür', () => {
    /* Tıklanacak yeri olmayan CTA, çalışmayan bir düğme demek. */
    expect(toHeroSlides([satir({ cta_to: 'javascript:alert(1)' })])).toEqual(
      DEFAULT_HERO_SLIDES
    );
    expect(toHeroSlides([satir({ cta_to: '//evil.example' })])).toEqual(
      DEFAULT_HERO_SLIDES
    );
  });

  it('bilinmeyen sahne koddaki varsayılana düşer', () => {
    const [s] = toHeroSlides([satir({ scene: 'uydurma' })]);
    expect(s!.scene).toBe('nebula');
  });

  it('odak noktası 0–100 arasına sıkıştırılıyor', () => {
    const [a] = toHeroSlides([satir({ focal_x: 140, focal_y: -20 })]);
    expect([a!.focalX, a!.focalY]).toEqual([100, 0]);

    const [b] = toHeroSlides([satir({ focal_x: null, focal_y: 'abc' })]);
    expect([b!.focalX, b!.focalY]).toEqual([50, 50]);
  });

  it('metin hizası yalnızca `center` ile değişiyor', () => {
    expect(toHeroSlides([satir({ text_align: 'center' })])[0]!.textAlign).toBe(
      'center'
    );
    expect(toHeroSlides([satir({ text_align: 'sağa' })])[0]!.textAlign).toBe(
      'left'
    );
  });
});

describe('focalPosition', () => {
  it('yüzdeleri CSS değerine çeviriyor', () => {
    expect(focalPosition({ ...DEFAULT_HERO_SLIDES[0]!, focalX: 30, focalY: 70 }))
      .toBe('30% 70%');
  });
});
