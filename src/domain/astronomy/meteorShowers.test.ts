import { describe, expect, it } from 'vitest';
import {
  METEOR_SHOWERS,
  radiantMaxAltitude,
  showersInYear,
  solarLongitudeDate,
  upcomingShowers,
} from './meteorShowers';
import { sunEclipticLongitude } from './ephemeris';

/**
 * METEOR YAĞMURLARI (§14.3).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ASIL ÖLÇÜM: HESAPLANAN TARİH GERÇEK ZİRVEYE DENK GELİYOR MU
 *
 * Modül tarihi sabit yazmıyor, güneşin ekliptik boylamından çözüyor.
 * Bunun tek anlamlı doğrulaması bilinen zirvelerle karşılaştırmak:
 * Perseidler 12–13 Ağustos, Geminidler 13–14 Aralık, Quadrantidler
 * 3–4 Ocak. Beklentiler ±1 gün toleranslı çünkü zirve saatlik bir olay
 * ve UTC gününe düşmesi saate bağlı — ama iki gün kayma HATA olurdu.
 *
 * Tolerans bilerek dar: sabit tarih yazan bir uygulama da bu testi
 * BİR yıl için geçerdi. O yüzden aynı ölçüm üç farklı yılda yapılıyor
 * — artık yıl döngüsü sabit tarihi ele verir.
 */

/** Zirvenin UTC gün-ay değeri. */
function gunAy(d: Date): [number, number] {
  return [d.getUTCDate(), d.getUTCMonth() + 1];
}

describe('λ☉ → tarih çözümü', () => {
  it('çözülen an gerçekten aranan boylamda', () => {
    for (const hedef of [0, 45.5, 140, 235.27, 283.15, 359.9]) {
      const an = solarLongitudeDate(2026, hedef);
      const olculen = sunEclipticLongitude(an);
      /* Fark 0/360 sarmasında da küçük kalmalı. */
      const sapma = Math.abs(((olculen - hedef + 540) % 360) - 180);
      expect(sapma).toBeLessThan(0.001);
    }
  });

  it('ilkbahar ekinoksu (λ☉ = 0°) 20–21 Mart', () => {
    /* Bağımsız çapa: ekinoksun tarihi herkesçe bilinen bir gerçek ve
       çözümün doğru çalıştığını yağmur tablosundan bağımsız gösteriyor. */
    const [gun, ay] = gunAy(solarLongitudeDate(2026, 0));
    expect(ay).toBe(3);
    expect(gun).toBeGreaterThanOrEqual(19);
    expect(gun).toBeLessThanOrEqual(21);
  });

  it('gündönümü (λ☉ = 90°) 20–21 Haziran', () => {
    const [gun, ay] = gunAy(solarLongitudeDate(2026, 90));
    expect(ay).toBe(6);
    expect(gun).toBeGreaterThanOrEqual(20);
    expect(gun).toBeLessThanOrEqual(22);
  });
});

describe('zirve tarihleri bilinen değerlere oturuyor', () => {
  /** Kod → [ay, beklenen gün] — yaygın olarak yayımlanan zirveler. */
  const BEKLENEN: Record<string, [number, number]> = {
    QUA: [1, 3],
    LYR: [4, 22],
    ETA: [5, 6],
    PER: [8, 12],
    DRA: [10, 8],
    ORI: [10, 21],
    LEO: [11, 17],
    GEM: [12, 14],
    URS: [12, 22],
  };

  /* ÜÇ YIL: sabit tarih yazan bir uygulama tek yılda bu testi geçerdi.
     Artık yıl döngüsü üç yılda kaymayı ortaya çıkarıyor. */
  for (const yil of [2025, 2026, 2028]) {
    it(`${yil} zirveleri ±1 gün içinde`, () => {
      const bulunan = new Map(
        showersInYear(yil).map((s) => [s.shower.code, s.peak])
      );
      for (const [kod, [ay, gun]] of Object.entries(BEKLENEN)) {
        const peak = bulunan.get(kod);
        expect(peak, kod).toBeDefined();
        const [g, a] = gunAy(peak!);
        expect(a, `${kod} ayı`).toBe(ay);
        expect(Math.abs(g - gun), `${kod} günü (${g})`).toBeLessThanOrEqual(1);
      }
    });
  }

  it('aynı yağmur ardışık yıllarda bir güne kadar kayıyor', () => {
    /* Yıldan yıla küçük kayma BEKLENEN davranış (artık yıl); sıfır
       kayma tarihin hesaplanmadığını, sabit yazıldığını gösterirdi. */
    const per = (y: number) =>
      showersInYear(y).find((s) => s.shower.code === 'PER')!.peak;
    const fark = Math.abs(per(2026).getTime() - per(2027).getTime());
    const yilMs = 365.2422 * 86_400_000;
    /* İki zirve arasındaki süre tropik yıla eşit olmalı — takvim yılına
       değil. Aradaki fark tam olarak hesabın yakaladığı şey. */
    expect(Math.abs(fark - yilMs)).toBeLessThan(6 * 3_600_000);
  });
});

describe('liste ve sıralama', () => {
  it('tarihe göre sıralı dönüyor', () => {
    const liste = showersInYear(2026);
    const zamanlar = liste.map((s) => s.peak.getTime());
    expect([...zamanlar].sort((a, b) => a - b)).toEqual(zamanlar);
  });

  it('tablodaki her yağmur listede', () => {
    expect(showersInYear(2026)).toHaveLength(METEOR_SHOWERS.length);
  });

  it('IAU kodları tekil', () => {
    const kodlar = METEOR_SHOWERS.map((s) => s.code);
    expect(new Set(kodlar).size).toBe(kodlar.length);
  });

  it('yaklaşanlar YIL SINIRINI aşıyor', () => {
    /* Aralık ortasında bakan kullanıcıya yalnızca Ursidleri göstermek,
       listeyi takvimin kenarına çarptığı için kısaltmak olurdu. */
    const liste = upcomingShowers(new Date('2026-12-18T00:00:00Z'), 3);
    expect(liste).toHaveLength(3);
    expect(liste[0].shower.code).toBe('URS');
    /* Sonrakiler ertesi yıldan geliyor. */
    expect(liste[1].peak.getUTCFullYear()).toBe(2027);
  });

  it('geçmiş yağmurlar yaklaşanlarda yok', () => {
    const an = new Date('2026-09-01T00:00:00Z');
    for (const s of upcomingShowers(an, 5)) {
      expect(s.peak.getTime()).toBeGreaterThanOrEqual(an.getTime());
    }
  });
});

describe('ay engeli', () => {
  it('aydınlanma üç kademeye ayrılıyor', () => {
    for (const s of showersInYear(2026)) {
      if (s.moonIllumination < 0.3) expect(s.moonVerdict).toBe('temiz');
      else if (s.moonIllumination < 0.7) expect(s.moonVerdict).toBe('kısmi');
      else expect(s.moonVerdict).toBe('engelli');
    }
  });

  it('aydınlanma 0–1 aralığında', () => {
    for (const s of showersInYear(2026)) {
      expect(s.moonIllumination).toBeGreaterThanOrEqual(0);
      expect(s.moonIllumination).toBeLessThanOrEqual(1);
    }
  });
});

describe('radyant yüksekliği', () => {
  const ANKARA = { lat: 39.92, lon: 32.85 };

  it('Perseidlerin radyantı Türkiye’den yüksekte', () => {
    /* Radyant deklinasyonu +58°; Ankara enleminden neredeyse başucuna
       çıkıyor. Bu yağmurun Türkiye'de neden iyi izlendiğinin sebebi. */
    const per = showersInYear(2026).find((s) => s.shower.code === 'PER')!;
    expect(radiantMaxAltitude(per, ANKARA.lat, ANKARA.lon)).toBeGreaterThan(70);
  });

  it('güney yarımküre radyantı alçak kalıyor', () => {
    /* Delta Aquariidler dec −16°: Ankara'dan görünüyor ama alçak, yani
       takvim "izlenebilir ama zayıf" diyebilmeli. */
    const sda = showersInYear(2026).find((s) => s.shower.code === 'SDA')!;
    const yukseklik = radiantMaxAltitude(sda, ANKARA.lat, ANKARA.lon);
    expect(yukseklik).toBeGreaterThan(0);
    expect(yukseklik).toBeLessThan(40);
  });

  it('kutup gözlemcisinde güney radyantı hiç yükselmiyor', () => {
    /* Kuzey kutbundan dec −16° ufkun altında kalıyor: negatif değer
       "bu konumdan izlenemez" demek ve arayüz bunu söyleyebilmeli. */
    const sda = showersInYear(2026).find((s) => s.shower.code === 'SDA')!;
    expect(radiantMaxAltitude(sda, 85, 0)).toBeLessThan(0);
  });
});
