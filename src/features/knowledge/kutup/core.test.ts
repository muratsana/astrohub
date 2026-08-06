import { describe, expect, it } from 'vitest';
import * as ts from './core';
// @ts-expect-error — paketin kendi JS sürümü; tip bildirimi yok ve olmamalı.
import * as js from '../../../../docs/kutup/pa-core.js';

/**
 * PORT NÖBETÇİSİ.
 *
 * `core.ts`, içerik paketinin `lib/pa-core.js` dosyasının elle yapılmış
 * TypeScript portu. Elle port, sessizce ayrışabilen iki kopya demek —
 * drizzle rehberinde bir fonksiyon "temizlenirken" yanlış yazılmış ve
 * ancak kaynağa dönülünce fark edilmişti.
 *
 * Bu test iki dosyayı da içe aktarıp aynı girdilerle karşılaştırıyor.
 * Paket güncellenip `docs/kutup/pa-core.js` değişirse ve port
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

const SAAT_ACILARI = [-6, -3, -1, 0, 1, 3, 6];
const DEKLINASYONLAR = [-30, -5.4, 0, 25, 45, 69.1, 85.2];
const ENLEMLER = [0, 20, 36, 41, 55, 70];

describe('kutup hizalaması çekirdeği paketin JS sürümüyle aynı', () => {
  it('sabitler birebir aynı', () => {
    expect(ts.D2R).toBe(js.D2R);
    expect(ts.ARCMIN).toBe(js.ARCMIN);
    expect(ts.OMEGA_ARCSEC_MIN).toBe(js.OMEGA_ARCSEC_MIN);
    expect(ts.DRIFT_PER_ARCMIN).toBe(js.DRIFT_PER_ARCMIN);
    expect(ts.K_PHD2).toBe(js.K_PHD2);
    expect(ts.K_SIDEREAL).toBe(js.K_SIDEREAL);
    expect(ts.BARRETT_K).toBe(js.BARRETT_K);
    expect(ts.SENSORS).toEqual(js.SENSORS);
    expect(ts.TARGETS).toEqual(js.TARGETS);
  });

  it('errorVector() bütün enlemlerde aynı', () => {
    for (const lat of ENLEMLER) {
      for (const alt of [-8, -2, 0, 1.5, 5, 20]) {
        for (const az of [-8, -1, 0, 3, 12]) {
          const a = ts.errorVector(alt, az, lat);
          const b = js.errorVector(alt, az, lat);
          esit(a.a, b.a, `a lat=${lat} alt=${alt} az=${az}`);
          esit(a.b, b.b, `b lat=${lat} alt=${alt} az=${az}`);
          esit(a.epsArcmin, b.epsArcmin, `eps lat=${lat}`);
        }
      }
    }
  });

  it('sürüklenme ve alan dönmesi bütün saat açılarında aynı', () => {
    for (const H of SAAT_ACILARI) {
      for (const dec of DEKLINASYONLAR) {
        const { a, b } = ts.errorVector(3, -2, 39);
        esit(ts.decDrift(a, b, H), js.decDrift(a, b, H), `dec H=${H}`);
        esit(
          ts.raDrift(a, b, H, dec),
          js.raDrift(a, b, H, dec),
          `ra H=${H} δ=${dec}`
        );
        esit(
          ts.fieldRotation(a, b, H, dec),
          js.fieldRotation(a, b, H, dec),
          `rot H=${H} δ=${dec}`
        );
      }
    }
  });

  it('sürüklenmeden hata çevirimi aynı', () => {
    for (const drift of [-2, -0.3, 0, 0.12, 1.7, 5]) {
      for (const dec of DEKLINASYONLAR) {
        esit(
          ts.errorFromDrift(drift, dec),
          js.errorFromDrift(drift, dec),
          `phd2 drift=${drift} δ=${dec}`
        );
      }
      esit(
        ts.errorFromDriftTrue(drift),
        js.errorFromDriftTrue(drift),
        `gerçek drift=${drift}`
      );
    }
  });

  it('Barrett iz ve tolerans bağıntıları aynı', () => {
    for (const fl of [200, 530, 1000, 2350]) {
      for (const t of [0.5, 1, 5, 20]) {
        for (const dec of DEKLINASYONLAR) {
          esit(
            ts.trailMicrons(2, t, fl, 1.5, dec),
            js.trailMicrons(2, t, fl, 1.5, dec),
            `iz fl=${fl} t=${t} δ=${dec}`
          );
          esit(
            ts.maxError(3.76, t, fl, 1.5, dec),
            js.maxError(3.76, t, fl, 1.5, dec),
            `maxErr fl=${fl} t=${t} δ=${dec}`
          );
        }
      }
    }
  });

  it('optik yardımcıları aynı', () => {
    for (const sensor of ts.SENSORS) {
      for (const fl of [135, 530, 1600]) {
        esit(
          ts.pixelScale(sensor.px, fl),
          js.pixelScale(sensor.px, fl),
          `ölçek ${sensor.id} fl=${fl}`
        );
        esit(
          ts.halfDiagDeg(sensor.w, sensor.h, fl),
          js.halfDiagDeg(sensor.w, sensor.h, fl),
          `köşegen ${sensor.id} fl=${fl}`
        );
      }
    }
    for (const rot of [0.1, 1, 12]) {
      esit(
        ts.trailArcsec(rot, 5, 1.2),
        js.trailArcsec(rot, 5, 1.2),
        `izArcsec rot=${rot}`
      );
    }
  });

  it('ön ayar arayıcıları aynı — bilinmeyen kimlikte de', () => {
    for (const id of ['apsc', 'ff', 'imx585', 'yok']) {
      expect(ts.sensorById(id)).toEqual(js.sensorById(id));
    }
    for (const id of ['m42', 'ngc188', 'yok']) {
      expect(ts.targetById(id)).toEqual(js.targetById(id));
    }
  });

  it('fmtErr() üç eşiğin her iki yanında aynı', () => {
    for (const v of [0.01, 0.5, 0.999, 1, 4.44, 9.99, 10, 42.6, Infinity]) {
      expect(ts.fmtErr(v), `fmtErr(${v})`).toBe(js.fmtErr(v));
    }
  });

  /*
    BENZETİM DE KARŞILAŞTIRILIYOR.

    `makeTrace` deterministik (mulberry32 + sabit tohum), dolayısıyla iki
    sürüm satır satır aynı diziyi üretmek ZORUNDA. Karşılaştırmayı
    yalnızca istatistiklere indirgemek, gürültü üretecinin ayrışmasını
    gizlerdi — ortalaması aynı, dizisi farklı iki üreteç mümkün.
  */
  it('makeTrace() aynı diziyi üretiyor', () => {
    const senaryolar = [
      { seed: 1, decRate: 0.8, n: 40 },
      { seed: 7, decRate: -0.35, pe: 1.4, n: 60 },
      { seed: 11, decRate: 0.2, guided: false, n: 30 },
      { seed: 3, decRate: 0.5, backlash: 1.2, stiction: 0.4, n: 50 },
      { seed: 5, decOsc: 0.9, decOscP: 80, n: 45 },
    ];
    for (const o of senaryolar) {
      const a = ts.makeTrace(o);
      const b = js.makeTrace(o);
      expect(a.dec.length, `uzunluk seed=${o.seed}`).toBe(b.dec.length);
      for (let i = 0; i < a.dec.length; i++) {
        esit(a.dec[i], b.dec[i], `dec[${i}] seed=${o.seed}`);
        esit(a.ra[i], b.ra[i], `ra[${i}] seed=${o.seed}`);
        esit(a.corr[i], b.corr[i], `corr[${i}] seed=${o.seed}`);
      }
    }
  });

  it('linFit() ve rms() aynı', () => {
    const diziler = [
      [0, 1, 2, 3, 4],
      [3, -1, 4, -1, 5, 9, -2, 6],
      ts.makeTrace({ seed: 9, decRate: 0.6, n: 50 }).dec,
    ];
    for (const [index, dizi] of diziler.entries()) {
      esit(ts.linFit(dizi).slope, js.linFit(dizi).slope, `eğim #${index}`);
      esit(
        ts.linFit(dizi).intercept,
        js.linFit(dizi).intercept,
        `kesişim #${index}`
      );
      esit(ts.rms(dizi), js.rms(dizi), `rms #${index}`);
    }
  });
});
