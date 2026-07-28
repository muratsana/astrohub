import { describe, expect, it } from 'vitest';
import {
  bestMonthsFromRa,
  difficultyFor,
  formatAngularSize,
  formatDec,
  formatRa,
  gradientFor,
  isMovingKind,
  longestAxisArcmin,
  midnightCulminationDay,
  recommendedFocalFor,
  targetKindLabels,
  type TargetKind,
} from './derive';
import { parseDec, parseRa } from '@/domain/astronomy/ephemeris';

describe('midnightCulminationDay', () => {
  /*
   * Bu üç kayıt kontrol noktası: gökyüzünü bilen herkes M 31'in sonbahar,
   * M 42'nin kış, M 13'ün yaz hedefi olduğunu bilir. Formül bunları
   * tutturmuyorsa geri kalan 200 kaydın "en uygun ay"ı da yanlıştır.
   */
  it('M 31 sonbaharda zirve yapar', () => {
    const day = midnightCulminationDay(0.712);
    expect(day).toBeGreaterThan(250); // ~8 Eylül sonrası
    expect(day).toBeLessThan(300); // ~27 Ekim öncesi
  });

  it('M 42 kışın zirve yapar', () => {
    const day = midnightCulminationDay(5.588);
    expect(day).toBeGreaterThan(320);
    expect(day).toBeLessThan(365);
  });

  it('M 13 yaz başında zirve yapar', () => {
    const day = midnightCulminationDay(16.695);
    expect(day).toBeGreaterThan(130); // ~11 Mayıs sonrası
    expect(day).toBeLessThan(190);
  });
});

describe('bestMonthsFromRa', () => {
  it('M 31 için sonbahar penceresi verir', () => {
    expect(bestMonthsFromRa(0.712)).toBe('Ağustos – Kasım');
  });

  it('her RA değeri için geçerli bir ay adı üretir', () => {
    for (let ra = 0; ra < 24; ra += 0.25) {
      const label = bestMonthsFromRa(ra);
      expect(label).not.toContain('undefined');
      expect(label.length).toBeGreaterThan(3);
    }
  });
});

describe('formatRa / formatDec', () => {
  it('RA biçimi efemeris ayrıştırıcısıyla gidiş-dönüş yapar', () => {
    // Biçimlendirilen metnin geri okunabilmesi şart: planlayıcı ve
    // "bu gece" sayfası hedefin yerini bu metinden hesaplıyor.
    const raHours = 5.588;
    const parsedDegrees = parseRa(formatRa(raHours));
    expect(parsedDegrees / 15).toBeCloseTo(raHours, 3);
  });

  it('DEC biçimi işaretiyle birlikte yay dakikası hassasiyetinde geri okunur', () => {
    // Dik açıklık yay dakikası çözünürlüğünde yazılıyor; hedef boyutları
    // da yay dakikası mertebesinde olduğu için daha fazlası bilgi taşımaz.
    const arcminute = 1 / 60;
    expect(Math.abs(parseDec(formatDec(-5.391)) + 5.391)).toBeLessThan(arcminute);
    expect(Math.abs(parseDec(formatDec(41.269)) - 41.269)).toBeLessThan(arcminute);
  });

  it('59.7 yay dakikası dereceye taşınır, 60′ yazılmaz', () => {
    // Yuvarlama taşmasını dereceye aktarmazsak "+41° 60′" gibi geçersiz
    // bir koordinat yazılır ve ayrıştırıcı onu 42° sanır.
    expect(formatDec(41.995)).toBe('+42° 00′');
  });

  it('sıfıra yakın negatif dik açıklık işareti korur', () => {
    expect(formatDec(-0.013)).toContain('-');
  });
});

describe('açısal boyut', () => {
  it('tek eksenli boyutu biçimlendirir', () => {
    expect(formatAngularSize('20')).toBe('20′');
  });

  it('iki eksenli boyutu çarpı ile ayırır', () => {
    expect(formatAngularSize('178x63')).toBe('178′ × 63′');
  });

  it('eşit eksenleri tek değere indirir', () => {
    // "5′ × 5′" aynı bilgiyi iki kez yazar; dairesel cisimde tek değer yeter.
    expect(formatAngularSize('5x5')).toBe('5′');
  });

  it('uzun kenarı bulur', () => {
    expect(longestAxisArcmin('178x63')).toBe(178);
    expect(longestAxisArcmin('20')).toBe(20);
  });

  it('ayrıştırılamayan boyutta sıfır döner, NaN değil', () => {
    // NaN, karşılaştırmaların hepsini sessizce false yapar ve hedef
    // "en zor" kovasına düşer; sıfır ise açıkça bilinmiyor demektir.
    expect(longestAxisArcmin('bilinmiyor')).toBe(0);
  });
});

describe('difficultyFor', () => {
  it('parlak ve büyük hedefler kolaydır', () => {
    expect(difficultyFor(3.4, 178)).toBe('Kolay');
    expect(difficultyFor(4.0, 85)).toBe('Kolay');
  });

  it('küçük hedefe parlaklığına rağmen ceza uygular', () => {
    // 7.1 kadir tek başına "kolay" görünür; 3 yay dakikası bunu değiştirir —
    // NGC 6302 tam olarak bu durumda ve uzun odak ister.
    expect(difficultyFor(7.1, 3)).toBe('Zor');
    // Aynı kadirdeki 30 yay dakikalık bir küme ise başlangıç hedefidir.
    expect(difficultyFor(7.1, 30)).toBe('Kolay');
  });

  it('kadiri bilinmeyen hedefi kolay saymaz', () => {
    expect(difficultyFor(undefined, 60)).toBe('Zor');
  });
});

describe('recommendedFocalFor', () => {
  it('boyut küçüldükçe önerilen odak büyür', () => {
    const sizes = [178, 85, 40, 18, 10, 4, 1];
    const focals = sizes.map(recommendedFocalFor);
    expect(new Set(focals).size).toBe(focals.length);
    expect(focals[0]).toContain('35');
    expect(focals[focals.length - 1]).toContain('1500');
  });
});

describe('tür tabloları', () => {
  const kinds = Object.keys(targetKindLabels) as TargetKind[];

  it('her tür için etiket, gradyan ve filtre önerisi vardır', () => {
    for (const kind of kinds) {
      expect(targetKindLabels[kind]).toBeTruthy();
      expect(gradientFor(kind)).toContain('gradient');
    }
  });

  it('güneş sistemi hedefleri hareketli, derin uzay hedefleri değil', () => {
    expect(isMovingKind('gezegen')).toBe(true);
    expect(isMovingKind('ay')).toBe(true);
    expect(isMovingKind('galaksi')).toBe(false);
    expect(isMovingKind('emisyon-bulutsusu')).toBe(false);
  });
});
