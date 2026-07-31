import { describe, expect, it } from 'vitest';
import { nightScore, type NightScoreInputs } from './nightScore';

/** Açık, sakin, aysız bir gece — üst referans. */
const IDEAL: NightScoreInputs = {
  cloudCover: 0,
  seeingIndex: 1,
  humidity: 40,
  windSpeed: 3,
  temperature: 18,
  dewPoint: 6,
  darkMinutes: 366,
  moonlessMinutes: 366,
  moonIllumination: 0.02,
};

const at = (patch: Partial<NightScoreInputs>): NightScoreInputs => ({
  ...IDEAL,
  ...patch,
});

describe('nightScore — bulut çarpan gibi davranır', () => {
  it('ideal gecede en yüksek nota yakın', () => {
    const score = nightScore(IDEAL);
    expect(score.total).toBeGreaterThanOrEqual(90);
    expect(score.verdict).toBe('cok-iyi');
  });

  /*
   * ASIL KURAL. Dört bileşeni ortalayan bir model kapalı gecede 60
   * civarı verirdi: seeing mükemmel, rüzgâr yok, ay yok. Oysa teleskop
   * hiçbir şey görmüyor. Şeffaflık çarpan olduğu için skor da çöküyor.
   */
  it('tam kapalı gecede diğerleri mükemmel olsa bile skor çöker', () => {
    const kapali = nightScore(at({ cloudCover: 100 }));
    expect(kapali.total).toBe(0);
    expect(kapali.verdict).toBe('zayif');
  });

  it('bulut arttıkça skor tek yönlü düşer', () => {
    const seri = [0, 25, 50, 75, 100].map(
      (cloudCover) => nightScore(at({ cloudCover })).total
    );
    for (let i = 1; i < seri.length; i++) {
      expect(seri[i]).toBeLessThan(seri[i - 1]);
    }
  });
});

describe('nightScore — seeing verisi yoksa en yüksek not verilmez', () => {
  /*
   * QA ASTRO-05 hard-stop: elde olmayan bir ölçümle "çok iyi gece" ilan
   * etmek, veri eksikliğini iyimserliğe çevirmek demek.
   */
  it('koşullar mükemmel olsa da "çok iyi" demiyor', () => {
    const score = nightScore(at({ seeingIndex: null }));
    expect(score.limitedBySeeing).toBe(true);
    expect(score.verdict).not.toBe('cok-iyi');
    expect(score.total).toBeGreaterThan(70);
  });

  it('seeing satırı "ölçülemedi" olarak işaretleniyor', () => {
    const row = nightScore(at({ seeingIndex: null })).rows.find(
      (r) => r.key === 'seeing'
    );
    expect(row?.value).toBeNull();
  });

  it('eksik bileşen skoru sıfıra çekmiyor — ağırlık yeniden dağıtılıyor', () => {
    // Sıfır saymak "seeing berbat" demekti; bu gece hâlâ iyi bir gece.
    expect(nightScore(at({ seeingIndex: null })).total).toBeGreaterThan(
      nightScore(at({ seeingIndex: 5 })).total
    );
  });
});

describe('nightScore — karanlık', () => {
  it('tam karanlık hiç oluşmuyorsa karanlık skoru sıfır', () => {
    const row = nightScore(
      at({ darkMinutes: 0, moonlessMinutes: 0 })
    ).rows.find((r) => r.key === 'darkness');
    expect(row?.value).toBe(0);
    expect(row?.tone).toBe('warn');
  });

  it('dolunay gecesinde karanlık düşük ama gece tümden yazılmıyor', () => {
    const dolunay = nightScore(
      at({ moonlessMinutes: 0, moonIllumination: 0.98 })
    );
    expect(dolunay.total).toBeGreaterThan(40);
    expect(dolunay.verdict).not.toBe('cok-iyi');
  });

  /*
   * Tasarım paketindeki örnek gece: açık, sakin, ama %98 ay tüm gece
   * yukarıda. Referans buna 92 ve "Çok iyi gece" diyor; kendi eksi
   * maddesi ise "aysız pencere yok". İkisi bir arada tutarsız.
   *
   * Bu model 67 veriyor — "Orta gece". Dolunay altında derin gök için
   * doğru cevap bu; küme ve gezegen için hâlâ iyi ve öneri satırı
   * kullanıcıyı oraya gönderiyor.
   */
  it('referans gecesi "çok iyi" değil "orta" çıkıyor', () => {
    const referans = nightScore({
      cloudCover: 0,
      seeingIndex: 1.5,
      humidity: 38,
      windSpeed: 8,
      temperature: 22,
      dewPoint: 8,
      darkMinutes: 366,
      moonlessMinutes: 0,
      moonIllumination: 0.98,
    });
    expect(referans.total).toBe(67);
    expect(referans.verdict).toBe('orta');
    expect(referans.recommendation).toContain('dar bant');
    expect(referans.cons.join(' ')).toContain('ay');
  });
});

describe('nightScore — çiylenme', () => {
  it('çiy noktası yaklaşınca uyarı listeye giriyor', () => {
    const nemli = nightScore(at({ temperature: 9, dewPoint: 8 }));
    expect(nemli.cons.join(' ')).toContain('Çiy noktası');
    expect(nemli.recommendation).toContain('ısıtıcı');
  });
});

describe('nightScore — kırılım ile toplam tutarlı', () => {
  /*
   * Toplamı ve çubukları ayrı yerlerde hesaplamak, arayüzde "92" yazarken
   * altındaki dört çubuğun başka bir şey söylemesi demekti.
   */
  it('her satır 0–100 aralığında ve dört satır var', () => {
    const score = nightScore(IDEAL);
    expect(score.rows).toHaveLength(4);
    for (const row of score.rows) {
      if (row.value !== null) {
        expect(row.value).toBeGreaterThanOrEqual(0);
        expect(row.value).toBeLessThanOrEqual(100);
      }
    }
  });

  it('toplam hiçbir koşulda 0–100 dışına çıkmıyor', () => {
    const uclar = [
      at({ cloudCover: 100, seeingIndex: 5, windSpeed: 90, dewPoint: 30 }),
      at({ cloudCover: -10, seeingIndex: 0.5, windSpeed: -5 }),
      at({ darkMinutes: -60, moonlessMinutes: 999 }),
    ];
    for (const input of uclar) {
      const total = nightScore(input).total;
      expect(total).toBeGreaterThanOrEqual(0);
      expect(total).toBeLessThanOrEqual(100);
    }
  });

  it('zayıf bileşen turuncuya dönüyor', () => {
    const row = nightScore(at({ windSpeed: 34, dewPoint: 17 })).rows.find(
      (r) => r.key === 'comfort'
    );
    expect(row?.tone).toBe('warn');
  });
});

describe('nightScore — öneri', () => {
  it('bulutlu gecede kurulum yapmadan kontrol öneriyor', () => {
    expect(nightScore(at({ cloudCover: 85 })).recommendation).toContain(
      'saatlik tahmini'
    );
  });

  it('ay parlakken dar bant öneriyor', () => {
    expect(
      nightScore(at({ moonlessMinutes: 0, moonIllumination: 0.9 }))
        .recommendation
    ).toContain('dar bant');
  });

  it('açık gecede zayıf hedeflere yönlendiriyor', () => {
    expect(nightScore(IDEAL).recommendation).toContain('zayıf hedeflere');
  });
});
