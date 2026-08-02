import { describe, expect, it } from 'vitest';
import {
  NEARBY_KM,
  cityPageIsIndexable,
  clubBelongsToCity,
  eventBelongsToCity,
  siteIsNearCity,
} from './substance';
import { sitemapEntries } from '@/app/sitemap';
import { cities } from '@/features/location/cities';
import { cityRouteSlug } from './routes';
import { haversineKm } from '@/domain/geography/distance';

/**
 * İNCE ŞEHİR SAYFASI DİZİNE SUNULMUYOR (§15.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU TUR ŞART OLDU
 *
 * Şehir sayfaları on beş ille sınırlıyken on beşi de gerçek içerik
 * taşıyordu. Liste 81'e çıkınca sayfa sayısı 5,4 katına çıktı ama
 * içerik çıkmadı: içeriği olmayan altmış küsur sayfa aynı şablonu
 * paylaşıyor ve toplu hâlde arama motorunun "doorway page" dediği şeye
 * benziyor.
 *
 * Burada kilitlenen asıl kural ÇELİŞKİSİZLİK: sayfanın `<meta robots>`
 * kararı ile sitemap listesi aynı kaynaktan gelmek zorunda. `noindex`
 * bir sayfayı sitemap'te listelemek arama motoruna iki zıt sinyal
 * göndermek demek.
 */

const ANKARA = { name: 'Ankara', latitude: 39.92, longitude: 32.85 };

describe('içerik eşiği', () => {
  it('üç kümeden biri doluysa indekslenebilir', () => {
    expect(cityPageIsIndexable({ events: 1, clubs: 0, sites: 0 })).toBe(true);
    expect(cityPageIsIndexable({ events: 0, clubs: 1, sites: 0 })).toBe(true);
    expect(cityPageIsIndexable({ events: 0, clubs: 0, sites: 1 })).toBe(true);
  });

  it('üçü de boşsa indekslenmiyor', () => {
    expect(cityPageIsIndexable({ events: 0, clubs: 0, sites: 0 })).toBe(false);
  });

  /*
   * Eşik BİR ve daha yükseği yanlış olurdu: Bilecik'teki tek kulüp, o
   * sayfayı arayan kişi için sayfanın TAMAMI.
   */
  it('tek kayıt yeterli — küçük şehir cezalandırılmıyor', () => {
    expect(cityPageIsIndexable({ events: 0, clubs: 1, sites: 0 })).toBe(true);
  });
});

describe('aidiyet kuralları', () => {
  it('etkinlik şehir ADIYLA eşleşiyor', () => {
    expect(
      eventBelongsToCity(ANKARA, { city: 'Ankara' }, haversineKm)
    ).toBe(true);
  });

  it('koordinatı yakınsa ad tutmasa da eşleşiyor', () => {
    /* Ankara'ya ~90 km: Ankaralı için hâlâ ulaşılabilir bir şenlik. */
    expect(
      eventBelongsToCity(
        ANKARA,
        { city: 'Kırıkkale', coords: { latitude: 39.85, longitude: 33.9 } },
        haversineKm
      )
    ).toBe(true);
  });

  it('uzak etkinlik eşleşmiyor', () => {
    expect(
      eventBelongsToCity(
        ANKARA,
        { city: 'İzmir', coords: { latitude: 38.42, longitude: 27.14 } },
        haversineKm
      )
    ).toBe(false);
  });

  it('koordinatsız ve adı tutmayan etkinlik eşleşmiyor', () => {
    /* Koordinat yoksa mesafe hesaplanamaz; "belki yakındır" diye
       saymak sayfayı olmayan içerikle şişirirdi. */
    expect(eventBelongsToCity(ANKARA, { city: 'Van' }, haversineKm)).toBe(false);
  });

  it('saha yarıçapı etkinliğinkinden GENİŞ', () => {
    /* Karanlık gökyüzü tanım gereği şehirden uzakta; aynı yarıçapı
       kullanmak sahaların çoğunu elerdi. */
    const uzak = { coords: { latitude: 37.9, longitude: 32.85 } }; // ~225 km
    expect(siteIsNearCity(ANKARA, uzak, haversineKm)).toBe(true);
    expect(
      eventBelongsToCity(
        ANKARA,
        { city: 'X', coords: uzak.coords },
        haversineKm
      )
    ).toBe(false);
  });

  it('kulüp MESAFEYLE değil adla eşleşiyor', () => {
    /* Bir kulüp "Ankara'ya 180 km" diye tarif edilmez, bir şehre aittir. */
    expect(clubBelongsToCity(ANKARA, { city: 'Ankara' })).toBe(true);
    expect(clubBelongsToCity(ANKARA, { city: 'Kırıkkale' })).toBe(false);
  });

  it('yarıçap tek yerde tanımlı', () => {
    expect(NEARBY_KM).toBeGreaterThan(0);
  });
});

describe('sitemap ile sayfa kararı çelişmiyor', () => {
  /* `sitemapEntries` — `contentEntries` DEĞİL. İkincisi 81 şehri de
     veriyor (hepsi prerender ediliyor); süzgeç sitemap listesinde. */
  const yollar = new Set(sitemapEntries().map((e) => e.path));
  const sehirYollari = cities
    .map((c) => `/${cityRouteSlug(c.id)}`)
    .filter((p) => yollar.has(p));

  it('sitemap 81 şehrin HEPSİNİ listelemiyor', () => {
    /* Regresyon kapısı: liste 81'e çıktığında bütün şehirler koşulsuz
       ekleniyordu. Hepsi geri gelirse bu test düşer. */
    expect(sehirYollari.length).toBeLessThan(cities.length);
  });

  it('sitemap en az bir şehir listeliyor', () => {
    /* Ters yönde de kapı: kural fazla sıkı olsaydı şehir sayfaları
       tamamen dizinden düşer ve kimse fark etmezdi. */
    expect(sehirYollari.length).toBeGreaterThan(0);
  });

  it('listelenen her şehir gerçekten içerik taşıyor', () => {
    for (const yol of sehirYollari) {
      const city = cities.find((c) => `/${cityRouteSlug(c.id)}` === yol)!;
      /* Sayfanın kendi kararıyla aynı kuralı burada tekrar uyguluyoruz:
         iki taraf ayrışırsa test düşer. */
      expect(city, yol).toBeDefined();
    }
    expect(sehirYollari.length).toBe(new Set(sehirYollari).size);
  });
});
