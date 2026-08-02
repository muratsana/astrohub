import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FLAGS,
  DEFAULT_MAINTENANCE,
  announcementVisible,
  maintenanceBypass,
  toAnnouncement,
  toFlags,
  toMaintenance,
} from './siteConfig';
import { siteMap, withoutPrefixes } from '@/app/navigation';

/**
 * SİTE AYARLARI — ziyaretçi tarafı (§13.2).
 *
 * Ölçülenler, hepsi "panelde anahtar var" ile "ziyaretçi bunu görüyor"
 * arasındaki farkı kapatmak için:
 *
 *  1. YEDEK YÖNÜ "SİTE NORMAL ÇALIŞIYOR". Ağ düşerse bakım ekranı
 *     açılmamalı, radyo kaybolmamalı. Yanlış yön, tek bir başarısız
 *     istekle bütün ürünü kapatırdı.
 *  2. KODDA KARŞILIĞI OLMAYAN ANAHTAR OKUNMAZ (0058'in kendi kuralı).
 *  3. DUYURU PENCERESİ — bozuk tarih duyuruyu YOK ETMEZ.
 *  4. BAKIM MODUNDA GİRİŞ AÇIK KALIR; kapalı olsaydı yönetici siteyi
 *     kendi kilitlerdi.
 *  5. KAPALI BÖLÜM MENÜDEN DÜŞER, boşalan grup başlığıyla birlikte.
 */

describe('toFlags', () => {
  it('veri yokken bugünkü site çiziliyor', () => {
    /* Ters yön: `bakim_modu` yedeği `true` olsaydı bir ağ hatası bütün
       siteyi "bakımdayız" ekranına düşürürdü. */
    expect(toFlags(null)).toEqual(DEFAULT_FLAGS);
    expect(toFlags([])).toEqual(DEFAULT_FLAGS);
    expect(DEFAULT_FLAGS.bakim_modu).toBe(false);
    expect(DEFAULT_FLAGS.radyo_acik).toBe(true);
  });

  it('yalnızca açıkça `false` kapatır', () => {
    const flags = toFlags([
      { key: 'radyo_acik', enabled: false },
      { key: 'tv_acik', enabled: null },
      { key: 'yorumlar_acik' },
    ]);
    expect(flags.radyo_acik).toBe(false);
    /* Bozuk/eksik alan varsayılanda bırakıyor — okuma eksiğini ürün
       kararına çevirmiyoruz. */
    expect(flags.tv_acik).toBe(true);
    expect(flags.yorumlar_acik).toBe(true);
  });

  it('kodda karşılığı olmayan anahtar okunmaz', () => {
    /* 0058: "karşılığı olmayan bayrak yanıltır." Tabloya elle girilen
       bir satır haritayı büyütmemeli. */
    const flags = toFlags([{ key: 'uydurma_bayrak', enabled: true }]);
    expect(flags).toEqual(DEFAULT_FLAGS);
    expect('uydurma_bayrak' in flags).toBe(false);
  });

  it('bakım modu açıkça açılabiliyor', () => {
    expect(toFlags([{ key: 'bakim_modu', enabled: true }]).bakim_modu).toBe(
      true
    );
  });
});

describe('announcementVisible', () => {
  const duyuru = toAnnouncement({ metin: 'Sunucu bakımı cumartesi.' });
  const acik = { ...DEFAULT_FLAGS, duyuru_acik: true };

  it('bayrak kapalıyken metin dolu olsa da görünmez', () => {
    expect(announcementVisible(duyuru, DEFAULT_FLAGS)).toBe(false);
  });

  it('bayrak açık + metin dolu + pencere yok → görünür', () => {
    expect(announcementVisible(duyuru, acik)).toBe(true);
  });

  it('boş metin bant çizdirmez', () => {
    /* Bayrak açık ama metin yazılmamışsa boş bir renkli şerit kalırdı. */
    expect(announcementVisible(toAnnouncement({ metin: '  ' }), acik)).toBe(
      false
    );
  });

  it('pencere uygulanıyor', () => {
    const pencereli = toAnnouncement({
      metin: 'Kısa duyuru',
      baslangic: '2026-08-10T00:00:00Z',
      bitis: '2026-08-12T00:00:00Z',
    });
    expect(
      announcementVisible(pencereli, acik, new Date('2026-08-09T23:00:00Z'))
    ).toBe(false);
    expect(
      announcementVisible(pencereli, acik, new Date('2026-08-11T00:00:00Z'))
    ).toBe(true);
    /* Bitiş dahil değil: bittiği an görünmüyor. */
    expect(
      announcementVisible(pencereli, acik, new Date('2026-08-12T00:00:00Z'))
    ).toBe(false);
  });

  it('bozuk tarih duyuruyu yok etmez, penceresiz sayar', () => {
    /* `new Date('saçma')` NaN verir; ham karşılaştırma yapsaydık her
       koşul `false` döner ve duyuru sessizce hiç görünmezdi. */
    const bozuk = toAnnouncement({ metin: 'Duyuru', baslangic: 'saçma' });
    expect(announcementVisible(bozuk, acik)).toBe(true);
  });

  it('bilinmeyen ton `info`ya düşer', () => {
    expect(toAnnouncement({ metin: 'x', ton: 'mor' }).ton).toBe('info');
    expect(toAnnouncement({ metin: 'x', ton: 'warning' }).ton).toBe('warning');
  });

  it('kapatılabilirlik yalnızca açıkça `false` ile kalkar', () => {
    expect(toAnnouncement({ metin: 'x' }).kapatilabilir).toBe(true);
    expect(
      toAnnouncement({ metin: 'x', kapatilabilir: false }).kapatilabilir
    ).toBe(false);
  });
});

describe('toMaintenance', () => {
  it('boş metin varsayılana düşer', () => {
    /* Bakım açıkken boş bir ekran, sitenin çökmesinden ayırt edilemez —
       oysa anlatılmak istenen "kasıtlı ve geçici". */
    expect(toMaintenance({ baslik: '', metin: '   ' })).toEqual(
      DEFAULT_MAINTENANCE
    );
    expect(toMaintenance(null)).toEqual(DEFAULT_MAINTENANCE);
  });

  it('yöneticinin yazdığı metin geçerli', () => {
    const m = toMaintenance({ baslik: 'Taşınıyoruz', metin: 'Yarın 09:00.' });
    expect(m.baslik).toBe('Taşınıyoruz');
    expect(m.metin).toBe('Yarın 09:00.');
  });
});

describe('maintenanceBypass', () => {
  it('giriş sayfası bakımda da açık', () => {
    /* KİLİTLENME TUZAĞI: bakımı yalnızca yönetici kapatabilir, bunun
       için oturum, oturum için giriş sayfası gerekir. */
    expect(maintenanceBypass('/giris')).toBe(true);
  });

  it('kayıt ve diğer sayfalar kapalı', () => {
    expect(maintenanceBypass('/kayit')).toBe(false);
    expect(maintenanceBypass('/galeri')).toBe(false);
    expect(maintenanceBypass('/')).toBe(false);
  });

  it('önek eşleşmesi tam sınırda: `/girisimci` bypass değil', () => {
    expect(maintenanceBypass('/girisimci')).toBe(false);
  });
});

describe('withoutPrefixes', () => {
  it('kapalı bölümün bağlantıları menüden düşer', () => {
    const suzulmus = withoutPrefixes(siteMap, ['/radyo']);
    const yollar = suzulmus.flatMap((g) => g.items.map((i) => i.to));
    expect(yollar.some((y) => y.startsWith('/radyo'))).toBe(false);
    /* Diğer bölümler yerinde: süzgeç fazla şey silmiyor. */
    expect(yollar).toContain('/galeri');
  });

  it('boşalan grup başlığıyla birlikte kalkar', () => {
    /* "Yayın" grubunda yalnızca TV ve radyo var; ikisi de kapalıyken
       footer'da boş bir sütun başlığı kalmamalı. */
    const suzulmus = withoutPrefixes(siteMap, ['/radyo', '/tv']);
    expect(suzulmus.some((g) => g.title === 'Yayın')).toBe(false);
    expect(suzulmus.every((g) => g.items.length > 0)).toBe(true);
  });

  it('önek sınırı yolun tamamına bakar', () => {
    /* `/tv` öneki `/tvarsiv` gibi bir yolu yakalamamalı. */
    const sahte = [
      { title: 'T', items: [{ label: 'a', to: '/tv' }, { label: 'b', to: '/tvarsiv' }] },
    ];
    const yollar = withoutPrefixes(sahte, ['/tv']).flatMap((g) =>
      g.items.map((i) => i.to)
    );
    expect(yollar).toEqual(['/tvarsiv']);
  });

  it('kapalı bölüm yokken harita olduğu gibi kalır', () => {
    expect(withoutPrefixes(siteMap, [])).toBe(siteMap);
  });
});
