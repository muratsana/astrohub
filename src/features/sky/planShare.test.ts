import { describe, it, expect } from 'vitest';
import {
  buildPlanIcs,
  decodeSelection,
  encodeSelection,
  planIcsFileName,
} from './planShare';
import type { ScheduledSlot } from '@/domain/astronomy/sessionPlan';

/**
 * PLANI PAYLAŞ VE TAKVİME EKLE (§14.1).
 *
 * Ölçülenler:
 *
 *  1. GİDİŞ–DÖNÜŞ. Kodlanan seçim, çözüldüğünde aynı listeyi vermeli;
 *     yoksa paylaşılan bağlantı başka bir plan açardı.
 *  2. BOZUK GİRDİ SESSİZCE ELENİR. Veri adres çubuğundan geliyor;
 *     tek bozuk parça yüzünden planın tamamını reddetmek, çalışabilecek
 *     bir şeyi çöpe atmak olurdu.
 *  3. TAKVİM HEDEF BAŞINA BİR KAYIT üretir — tek blok, saat 22:10'da
 *     hangi hedefe geçileceğini söylemezdi.
 *  4. RFC katmanı ORTAK: `lib/ics` kullanılıyor, ikinci bir yazıcı yok.
 */

describe('encode/decodeSelection', () => {
  const secim = [
    { slug: 'm31-andromeda', minutes: 90 },
    { slug: 'm42-orion', minutes: 120 },
  ];

  it('gidiş–dönüş aynı listeyi veriyor', () => {
    expect(decodeSelection(encodeSelection(secim))).toEqual(secim);
  });

  it('kodlama okunabilir ve kısa', () => {
    expect(encodeSelection(secim)).toBe('m31-andromeda:90,m42-orion:120');
  });

  it('boş girdi boş liste', () => {
    expect(decodeSelection(null)).toEqual([]);
    expect(decodeSelection('')).toEqual([]);
  });

  it('bozuk parçalar eleniyor, geri kalan duruyor', () => {
    /* Kullanıcı adresi kurcalayabilir ya da bağlantı kırpılmış olabilir. */
    const list = decodeSelection(
      'm31-andromeda:90,BOZUK SLUG:30,m42-orion:abc,m13-herkul:60,:20'
    );
    expect(list).toEqual([
      { slug: 'm31-andromeda', minutes: 90 },
      { slug: 'm13-herkul', minutes: 60 },
    ]);
  });

  it('sıfır ve negatif süre eleniyor', () => {
    expect(decodeSelection('m31-andromeda:0,m42-orion:-5')).toEqual([]);
  });

  it('aynı hedef iki kez yazılmışsa ilki geçerli', () => {
    /* Planlayıcıda aynı satırdan iki tane, kullanıcının
       anlamlandıramayacağı bir durum. */
    expect(decodeSelection('m31-andromeda:90,m31-andromeda:30')).toEqual([
      { slug: 'm31-andromeda', minutes: 90 },
    ]);
  });

  it('katalogda olmayan slug eleniyor', () => {
    const bilinen = new Set(['m31-andromeda']);
    expect(
      decodeSelection('m31-andromeda:90,olmayan-hedef:60', bilinen)
    ).toEqual([{ slug: 'm31-andromeda', minutes: 90 }]);
  });

  it('süre üst sınırla kırpılıyor', () => {
    /* Bir gecede 24 saatten fazla gözlem yok; uçuk bir sayı adres
       çubuğundan gelip planlayıcıyı saçmalatmasın. */
    expect(decodeSelection('m31-andromeda:99999')[0]!.minutes).toBe(24 * 60);
  });
});

describe('buildPlanIcs', () => {
  const slot = (id: string, saat: number, dakika: number): ScheduledSlot => ({
    id,
    start: new Date(Date.UTC(2026, 7, 15, saat, 0)),
    end: new Date(Date.UTC(2026, 7, 15, saat, 0) + dakika * 60_000),
    minutes: dakika,
    peakAltitude: 62.4,
    peakAt: new Date(Date.UTC(2026, 7, 15, saat, 30)),
    fulfillment: 1,
  });

  const ics = () =>
    buildPlanIcs({
      slots: [slot('m31-andromeda', 21, 90), slot('m42-orion', 23, 120)],
      labelOf: (s) => (s === 'm31-andromeda' ? 'Andromeda Galaksisi' : 'Orion'),
      locationLabel: 'Kayseri',
      now: new Date(Date.UTC(2026, 7, 1, 12, 0)),
    });

  it('hedef başına bir VEVENT üretiyor', () => {
    const metin = ics();
    expect([...metin.matchAll(/BEGIN:VEVENT/g)]).toHaveLength(2);
    expect(metin).toContain('SUMMARY:Andromeda Galaksisi — gözlem');
  });

  it('RFC biçimi: CRLF, kapanış ve UTC damgaları', () => {
    const metin = ics();
    expect(metin.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(metin.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(metin).toContain('DTSTART:20260815T210000Z');
    expect(metin).toContain('DTEND:20260815T223000Z');
  });

  it('`UID` slug + güne bağlı — aynı plan iki kez inince çoğalmıyor', () => {
    expect(ics()).toContain('UID:plan-m31-andromeda-2026-08-15@astrohub');
    /* Aynı girdi aynı çıktıyı vermeli. */
    expect(ics()).toBe(ics());
  });

  it('açıklamada süre ve tepe yükseklik var', () => {
    expect(ics()).toContain('Planlanan süre: 90 dk. En yüksek konum: 62°.');
  });

  it('konum verilmezse LOCATION satırı hiç yazılmıyor', () => {
    const metin = buildPlanIcs({
      slots: [slot('m31-andromeda', 21, 90)],
      labelOf: () => 'Andromeda',
      now: new Date(Date.UTC(2026, 7, 1, 12, 0)),
    });
    expect(metin).not.toContain('LOCATION:');
  });

  it('boş plan geçerli ama boş takvim veriyor', () => {
    const metin = buildPlanIcs({
      slots: [],
      labelOf: (s) => s,
      now: new Date(Date.UTC(2026, 7, 1, 12, 0)),
    });
    expect(metin).toContain('BEGIN:VCALENDAR');
    expect(metin).not.toContain('BEGIN:VEVENT');
  });
});

describe('planIcsFileName', () => {
  it('tarihe bağlı — aynı klasöre birden çok gece inebilsin', () => {
    const slots: ScheduledSlot[] = [
      {
        id: 'm31',
        start: new Date(Date.UTC(2026, 7, 15, 21, 0)),
        end: new Date(Date.UTC(2026, 7, 15, 22, 30)),
        minutes: 90,
        peakAltitude: 60,
        peakAt: new Date(Date.UTC(2026, 7, 15, 21, 45)),
        fulfillment: 1,
      },
    ];
    expect(planIcsFileName(slots)).toBe('astrohub-plan-2026-08-15.ics');
  });

  it('boş planda da geçerli bir ad üretiyor', () => {
    expect(planIcsFileName([])).toBe('astrohub-plan-gece.ics');
  });
});
