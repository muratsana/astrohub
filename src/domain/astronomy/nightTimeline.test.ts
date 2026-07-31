import { describe, expect, it } from 'vitest';
import { nightTimeline } from './nightTimeline';

const ANKARA = { lat: 39.9334, lng: 32.8597 };

/** 21 Aralık — yılın en uzun gecesi; karanlık kesin oluşur. */
const WINTER = new Date('2026-12-21T12:00:00+03:00');
/** 21 Haziran — en kısa gece. */
const SUMMER = new Date('2026-06-21T12:00:00+03:00');

function build(date: Date, lat = ANKARA.lat, lng = ANKARA.lng) {
  return nightTimeline(date, lat, lng, date);
}

describe('nightTimeline', () => {
  it('eksen batıştan doğuşa uzanır', () => {
    const t = build(WINTER);
    expect(t.from).toBeTruthy();
    expect(t.to).toBeTruthy();
    expect(t.to!.getTime()).toBeGreaterThan(t.from!.getTime());
  });

  it('segmentler kesintisiz ve ekseni tam kaplar', () => {
    // Aralarda boşluk kalırsa çubukta zemin rengi görünür ve bu,
    // "veri yok" gibi okunur.
    const t = build(WINTER);
    expect(t.segments.length).toBeGreaterThan(0);
    expect(t.segments[0].start).toBeCloseTo(0, 6);

    let cursor = 0;
    for (const segment of t.segments) {
      expect(segment.start).toBeCloseTo(cursor, 6);
      expect(segment.span).toBeGreaterThan(0);
      cursor += segment.span;
    }
    expect(cursor).toBeCloseTo(1, 6);
  });

  it('alacakaranlık akşamdan sabaha simetrik sıralanır', () => {
    const kinds = build(WINTER).segments.map((s) => s.kind);
    expect(kinds).toEqual([
      'civil',
      'nautical',
      'astronomical',
      'dark',
      'astronomical',
      'nautical',
      'civil',
    ]);
  });

  it('kış gecesi yaz gecesinden uzun karanlık verir', () => {
    const winter = build(WINTER).dark;
    const summer = build(SUMMER).dark;
    expect(winter).not.toBeNull();
    expect(summer).not.toBeNull();
    const minutes = (i: NonNullable<typeof winter>) =>
      (i.to.getTime() - i.from.getTime()) / 60_000;
    expect(minutes(winter!)).toBeGreaterThan(minutes(summer!));
  });

  it('yüksek enlemde yaz gecesi karanlık üretmez', () => {
    // Tromsø, haziran: güneş −18°'ye hiç inmez. Panelin "yok" demesi
    // gerekiyor; sıfır uzunlukta bir karanlık bandı çizmek yanlış olurdu.
    const t = nightTimeline(SUMMER, 69.65, 18.96, SUMMER);
    expect(t.dark).toBeNull();
    expect(t.moonlessMinutes).toBe(0);
  });

  it('aysız karanlık, karanlıktan ay aralıklarını çıkarır', () => {
    const t = build(WINTER);
    expect(t.dark).not.toBeNull();
    const darkMinutes =
      (t.dark!.to.getTime() - t.dark!.from.getTime()) / 60_000;
    expect(t.moonlessMinutes).toBeLessThanOrEqual(Math.round(darkMinutes));
    expect(t.moonlessMinutes).toBeGreaterThanOrEqual(0);

    // Parçalar karanlığın içinde kalmalı — dışarı taşan bir parça,
    // olmayan bir gözlem penceresi vaat ederdi.
    for (const piece of t.moonlessDark) {
      expect(piece.from.getTime()).toBeGreaterThanOrEqual(
        t.dark!.from.getTime()
      );
      expect(piece.to.getTime()).toBeLessThanOrEqual(t.dark!.to.getTime());
    }
  });

  it('ay aralıkları ekseni taşmaz', () => {
    const t = build(WINTER);
    for (const piece of t.moonUp) {
      expect(piece.start).toBeGreaterThanOrEqual(0);
      expect(piece.start + piece.span).toBeLessThanOrEqual(1.000001);
    }
  });

  it('gece dışındaki bir an için imleç göstermez', () => {
    // Öğle vakti "şimdi" çizgisi çubuğun bir ucuna yapışırdı ve orada
    // olmayan bir anı gösterirdi.
    const noon = new Date('2026-12-21T12:00:00+03:00');
    expect(nightTimeline(WINTER, ANKARA.lat, ANKARA.lng, noon).now).toBeNull();
  });

  it('gece içindeki bir an için imleci oranlar', () => {
    const t = build(WINTER);
    const middle = new Date((t.from!.getTime() + t.to!.getTime()) / 2);
    const withNow = nightTimeline(WINTER, ANKARA.lat, ANKARA.lng, middle);
    expect(withNow.now).toBeCloseTo(0.5, 3);
  });
});

describe('nightTimeline — ay yüksekliği eğrisi', () => {
  it('örnekler ekseni baştan sona kaplar', () => {
    const t = build(WINTER);
    expect(t.moonAltitudes.length).toBeGreaterThan(10);
    expect(t.moonAltitudes[0].at).toBeCloseTo(0, 6);
    expect(t.moonAltitudes.at(-1)!.at).toBeLessThanOrEqual(1.000001);
    for (const sample of t.moonAltitudes) {
      expect(sample.at).toBeGreaterThanOrEqual(0);
      expect(sample.altitude).toBeGreaterThanOrEqual(-91);
      expect(sample.altitude).toBeLessThanOrEqual(91);
    }
  });

  /*
   * ASIL KURAL: eğri ile bant AYNI ÖRNEKLEMEDEN çıkıyor. İki ayrı tarama
   * yapılsaydı çizelgede eğri ufkun üstündeyken bandın bitmiş olması
   * mümkün olurdu — ve bu, gözle bakmadan görülmeyen türden bir hata.
   */
  it('pozitif yükseklikli her örnek bir "ay yukarıda" bandının içinde', () => {
    const t = build(WINTER);
    const inBand = (at: number) =>
      t.moonUp.some(
        (piece) =>
          at >= piece.start - 1e-9 && at <= piece.start + piece.span + 1e-9
      );

    for (const sample of t.moonAltitudes) {
      if (sample.altitude > 0) {
        expect(inBand(sample.at), `${sample.at} bant dışında`).toBe(true);
      }
    }
  });

  it('karanlık oluşmayan gecede eğri de boş', () => {
    const t = nightTimeline(SUMMER, 69.65, 18.96, SUMMER);
    expect(t.moonAltitudes).toEqual([]);
  });
});
