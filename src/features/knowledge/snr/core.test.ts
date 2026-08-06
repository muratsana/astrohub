import { describe, expect, it } from 'vitest';
import * as ts from './core';
// @ts-expect-error — paketin kendi JS sürümü; tip bildirimi yok ve olmamalı.
import * as js from '../../../../docs/snr/snr-core.js';

/**
 * PORT NÖBETÇİSİ.
 *
 * `core.ts`, içerik paketinin `lib/snr-core.js` dosyasının elle yapılmış
 * TypeScript portu. Elle port, sessizce ayrışabilen iki kopya demek —
 * drizzle rehberinde bir fonksiyon "temizlenirken" yanlış yazılmış ve
 * ancak kaynağa dönülünce fark edilmişti.
 *
 * Bu test iki dosyayı da içe aktarıp aynı girdilerle karşılaştırıyor.
 * Paket güncellenip `docs/snr/snr-core.js` değişirse ve port
 * güncellenmezse, CI burada düşer.
 *
 * Karşılaştırma NOKTA NOKTA değil, ARALIK ÜZERİNDE: tek bir değer
 * eşleşiyor diye fonksiyonun tamamı eşleşmiş sayılmaz. Rastgele değil,
 * sabit örnekleme — test her koşuda aynı şeyi ölçmeli.
 */

/** Kayan nokta karşılaştırması: bit birebir aynılık beklenmiyor. */
function esit(a: number, b: number, etiket: string) {
  if (Number.isNaN(a) && Number.isNaN(b)) return;
  expect(a, etiket).toBeCloseTo(b, 10);
}

describe('snr çekirdeği paketin JS sürümüyle aynı', () => {
  it('sabitler birebir aynı', () => {
    expect(ts.NPHOT_V0).toBe(js.NPHOT_V0);
    expect(ts.DARKRATE).toBe(js.DARKRATE);
    expect(ts.SIM_SIZE).toBe(js.SIM_SIZE);
    expect(ts.BORTLE).toEqual(js.BORTLE);
    expect(ts.BORTLE_NAME).toEqual(js.BORTLE_NAME);
    expect(ts.FILTERS).toEqual(js.FILTERS);
    expect(ts.OBJECTS).toEqual(js.OBJECTS);
  });

  it('rate() bütün Bortle sınıflarında ve obje parlaklıklarında aynı', () => {
    for (let b = 1; b <= 9; b++) {
      esit(ts.rate(ts.BORTLE[b]), js.rate(js.BORTLE[b]), `bortle ${b}`);
    }
    for (const o of ts.OBJECTS) {
      esit(ts.rate(o.sb), js.rate(o.sb), o.id);
      /* Varsayılan dışı optik de sınanıyor: imzadaki parametre SIRASI
         yanlış porte edilirse yalnızca burada yakalanır. */
      esit(
        ts.rate(o.sb, 130, 910, 2.4, 0.8, 0.9, 0.05),
        js.rate(o.sb, 130, 910, 2.4, 0.8, 0.9, 0.05),
        `${o.id} özel optik`
      );
    }
  });

  it('snrOf() süre ve kare sayısı ızgarasında aynı', () => {
    const S = ts.rate(21.5);
    const B = ts.rate(ts.BORTLE[6]);
    for (const saat of [0.25, 1, 5, 20, 40]) {
      for (const alt of [30, 120, 300, 600]) {
        const T = saat * 3600;
        const n = Math.max(1, T / alt);
        for (const RN of [0.9, 1.5, 3.2]) {
          esit(
            ts.snrOf(S, B, T, n, RN),
            js.snrOf(S, B, T, n, RN),
            `${saat}sa/${alt}s/RN${RN}`
          );
        }
      }
    }
  });

  it('timeForSNR() ve minSubExposure() aynı', () => {
    const S = ts.rate(23.1);
    const B = ts.rate(ts.BORTLE[4]);
    for (const hedef of [5, 10, 25, 50]) {
      for (const t of [60, 300, 900]) {
        esit(
          ts.timeForSNR(hedef, S, B, 1.5, t),
          js.timeForSNR(hedef, S, B, 1.5, t),
          `hedef ${hedef}, alt ${t}`
        );
      }
    }
    for (const RN of [0.9, 1.5, 3.2, 8]) {
      for (const k of [9.76, 4.76, 2.27]) {
        esit(
          ts.minSubExposure(RN, B, k),
          js.minSubExposure(RN, B, k),
          `RN ${RN}, k ${k}`
        );
      }
    }
  });

  it('fmtDur() eşiklerin iki yanında da aynı metni veriyor', () => {
    for (const s of [0, -1, 59, 60, 3599, 3600, 3601, 35999, 36000, 3.6e6]) {
      expect(ts.fmtDur(s), `fmtDur(${s})`).toBe(js.fmtDur(s));
    }
  });

  it('şekil haritaları ve gürültü bütçesi aynı', () => {
    for (const kind of ['gal', 'neb', 'ring', 'wisp'] as const) {
      const a = ts.shapeMap(kind);
      const b = js.shapeMap(kind);
      esit(a.peak, b.peak, `${kind} tepe`);
      /* Tüm harita 13.456 değer; her 500'de bir örnekleniyor — hepsini
         karşılaştırmak testi yavaşlatır, tek nokta ise yetersiz. */
      for (let i = 0; i < a.map.length; i += 500) {
        esit(a.map[i], b.map[i], `${kind}[${i}]`);
      }
    }

    const S = ts.rate(21.5);
    const B = ts.rate(ts.BORTLE[6]);
    const a = ts.noiseBudget(S, B, ts.DARKRATE, 7200, 24, 1.5);
    const b = js.noiseBudget(S, B, js.DARKRATE, 7200, 24, 1.5);
    for (const anahtar of ['obj', 'sky', 'dark', 'read', 'total'] as const) {
      esit(a[anahtar], b[anahtar], anahtar);
    }
  });

  it('deterministik rastgelelik aynı diziyi üretiyor', () => {
    const ra = ts.mulberry32(4242);
    const rb = js.mulberry32(4242);
    for (let i = 0; i < 50; i++) esit(ra(), rb(), `mulberry[${i}]`);

    const ga = ts.gaussFrom(ts.mulberry32(7));
    const gb = js.gaussFrom(js.mulberry32(7));
    for (let i = 0; i < 50; i++) esit(ga(), gb(), `gauss[${i}]`);

    /* Yıldızlar modül yüklenirken bir kez üretiliyor; sıraları da
       eşleşmeli, yoksa simülatör paneli kaynaktan farklı çıkar. */
    expect(ts.STARS).toEqual(js.STARS);
  });
});
