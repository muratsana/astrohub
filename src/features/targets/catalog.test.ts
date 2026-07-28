import { describe, expect, it } from 'vitest';
import { deepSky, messier, movingTargets } from './catalog';
import { targets, fixedTargets, getTargetBySlug, searchTargets } from './data';
import { parseDec, parseRa } from '@/domain/astronomy/ephemeris';

describe('Messier kataloğu', () => {
  it('110 kaydın tamamı var ve numaralar eksiksiz', () => {
    expect(messier).toHaveLength(110);
    const numbers = messier
      .map((row) => Number(row.code.replace('M ', '')))
      .sort((a, b) => a - b);
    expect(numbers[0]).toBe(1);
    expect(numbers[109]).toBe(110);
    expect(new Set(numbers).size).toBe(110);
  });
});

describe('katalog bütünlüğü', () => {
  it('slug çakışması yok', () => {
    // Aynı slug iki hedefte olursa biri erişilemez hâle gelir ve
    // `getTargetBySlug` sessizce yanlış kaydı döndürür.
    const slugs = targets.map((t) => t.slug);
    const duplicates = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    expect(duplicates).toEqual([]);
  });

  it('koordinatlar geçerli aralıkta', () => {
    for (const row of [...messier, ...deepSky]) {
      expect(row.ra, row.code).toBeGreaterThanOrEqual(0);
      expect(row.ra, row.code).toBeLessThan(24);
      expect(row.dec, row.code).toBeGreaterThanOrEqual(-90);
      expect(row.dec, row.code).toBeLessThanOrEqual(90);
    }
  });

  it('her kaydın ayrıştırılabilir bir açısal boyutu var', () => {
    for (const row of [...messier, ...deepSky]) {
      const nums = row.size.split(/[x×]/).map(Number);
      expect(nums.every((n) => Number.isFinite(n) && n > 0), row.code).toBe(true);
    }
  });

  it('üretilen RA/DEC metinleri efemeris tarafından okunabilir', () => {
    // Bu, kataloğun "bu gece" ve planlayıcı sayfalarıyla sözleşmesi:
    // biçimlendirme değişirse hedefler sessizce listeden düşer.
    for (const target of fixedTargets) {
      expect(Number.isNaN(parseRa(target.ra)), target.slug).toBe(false);
      expect(Number.isNaN(parseDec(target.dec)), target.slug).toBe(false);
    }
  });

  it('hareketli hedefler koordinat taşımaz', () => {
    const moving = targets.filter((t) => t.moving);
    expect(moving).toHaveLength(movingTargets.length);
    for (const target of moving) {
      expect(target.ra).toBe('');
      expect(target.dec).toBe('');
    }
  });
});

describe('eski bağlantılar', () => {
  /*
   * Bu slug'lar galeri fotoğraflarında ve Commons görsel eşlemesinde
   * kayıtlı. Katalog yeniden kurulurken üretilmiş slug'a kaymaları,
   * yayımlanmış her bağlantıyı 404 yapardı.
   */
  const legacy = [
    'm31-andromeda',
    'm42-orion',
    'm13-herkul',
    'ic434-at-basi',
    'ngc7000-kuzey-amerika',
    'ngc2237-rozet',
    'ngc6302-kelebek',
    'ic1396-fil-hortumu',
  ];

  it.each(legacy)('%s hâlâ çözümleniyor', (slug) => {
    expect(getTargetBySlug(slug)).toBeDefined();
  });
});

describe('searchTargets', () => {
  it('katalog kodunu boşluksuz da bulur', () => {
    expect(searchTargets('m31')[0].slug).toBe('m31-andromeda');
    expect(searchTargets('M 31')[0].slug).toBe('m31-andromeda');
  });

  it('alias üzerinden bulur', () => {
    // "NGC 224" arayan kullanıcı M 31'i bulamazsa aynı cismi iki ayrı
    // hedef sanır ve katalog bağı işe yaramaz.
    expect(searchTargets('NGC 224')[0].slug).toBe('m31-andromeda');
  });

  it('Türkçe adla bulur', () => {
    const hit = searchTargets('rozet')[0];
    expect(hit.slug).toBe('ngc2237-rozet');
  });

  it('boş sorguda liste döndürür, hata vermez', () => {
    expect(searchTargets('').length).toBeGreaterThan(0);
  });

  it('eşleşme yoksa boş döner', () => {
    expect(searchTargets('zzzzqqq')).toEqual([]);
  });
});

describe('güneş sistemi hedefleri', () => {
  it('Ay, Güneş ve dış gezegenler katalogda', () => {
    for (const name of ['Ay', 'Güneş', 'Jüpiter', 'Satürn', 'Mars']) {
      expect(searchTargets(name).length, name).toBeGreaterThan(0);
    }
  });

  it('Güneş kaydı filtre uyarısını taşır', () => {
    const sun = targets.find((t) => t.kind === 'gunes');
    expect(sun?.recommendedFilters).toContain('ZORUNLU');
  });
});
