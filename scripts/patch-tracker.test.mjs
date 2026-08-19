import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DURUMLAR,
  csvAlanYaz,
  csvSatiriAyristir,
  guncelle,
} from './patch-tracker.mjs';

/**
 * TAKİP TABLOSU ARACI (H05, H06, H07).
 *
 * İki dosya birden "canlı doğruluk kaynağı": IMPLEMENTATION_PROGRESS.md
 * (insan okuyor) ve PROGRESS_TRACKER.csv (tablo aracı okuyor). Tek giriş
 * noktası ikisinin ayrışmasını yapısal olarak engelliyor — ama bu ancak
 * CSV yazımı ve durum akışı doğru çalışırsa geçerli.
 *
 * Bu testler aracın kendisini sabitliyor: bozuk bir CSV kaçışı, tablonun
 * tamamını sessizce kaydırır ve iki dosya birbirini tutmaz hâle gelir.
 */

describe('CSV yuvarlak yolculuk (H06)', () => {
  it('virgüllü alanı tırnaklayıp geri okuyor', () => {
    const alanlar = ['A01', 'P0', 'Kayıt, form ve KVKK', 'TESTED'];
    const satir = alanlar.map(csvAlanYaz).join(',');
    expect(satir).toContain('"Kayıt, form ve KVKK"');
    expect(csvSatiriAyristir(satir)).toEqual(alanlar);
  });

  it('alan içindeki çift tırnağı kaçırıp geri okuyor', () => {
    const alanlar = ['B01', 'İndir "dropdown" açmalı'];
    const satir = alanlar.map(csvAlanYaz).join(',');
    expect(csvSatiriAyristir(satir)).toEqual(alanlar);
  });

  it('boş alanları koruyor — sütun kayması olmuyor', () => {
    const alanlar = ['C01', '', '', 'TODO', ''];
    expect(csvSatiriAyristir(alanlar.map(csvAlanYaz).join(','))).toEqual(alanlar);
  });

  it('satır sonu taşıyan alanı tırnaklıyor', () => {
    expect(csvAlanYaz('iki\nsatır')).toBe('"iki\nsatır"');
  });
});

describe('durum akışı (H07)', () => {
  it('tanımlı durumlar tam ve sıralı', () => {
    expect(DURUMLAR).toEqual([
      'TODO',
      'IN_PROGRESS',
      'CODED',
      'TESTED',
      'READY_FOR_USER',
      'VERIFIED',
      'BLOCKED',
    ]);
  });

  it('VERIFIED listenin bir parçası ama en son onay basamağı', () => {
    // VERIFIED yalnızca --kullanici-onayi ile yazılabiliyor (guncelle
    // içinde zorlanıyor); burada sabitlenen şey basamağın varlığı ve
    // TESTED'ın ondan ÖNCE gelmesi.
    expect(DURUMLAR.indexOf('TESTED')).toBeLessThan(
      DURUMLAR.indexOf('VERIFIED')
    );
  });
});

/**
 * KULLANICI DOĞRULAMA KAPISI (H15).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BU KAPI VAR
 *
 * `VERIFIED` "kullanıcı kendi gözüyle gördü" demek. Bir ajanın kendi
 * işini VERIFIED yazması, panoyu ilerleme tablosu olmaktan çıkarıp
 * kendi kendine verilmiş bir nota çevirirdi — ve tablo o andan sonra
 * hiçbir şeyin kanıtı olmaz.
 *
 * Kapı YAPISAL: betik `--kullanici-onayi` olmadan VERIFIED yazamıyor.
 * Aşağıdaki testler kapının gerçekten kapalı olduğunu ve reddedilen bir
 * çağrının dosyalara HİÇ dokunmadığını sabitliyor — yarısı yazılmış bir
 * güncelleme, iki dosyayı birbirinden ayırırdı.
 */
describe('kullanıcı doğrulama kapısı (H15)', () => {
  const oku = () => ({
    csv: readFileSync('PROGRESS_TRACKER.csv', 'utf8'),
    md: readFileSync('IMPLEMENTATION_PROGRESS.md', 'utf8'),
  });

  it('onaysız VERIFIED reddediliyor', () => {
    expect(() => guncelle('H15', 'VERIFIED', {})).toThrow(/kullanici-onayi/);
  });

  it('reddedilen çağrı iki dosyaya da dokunmuyor', () => {
    const once = oku();
    expect(() => guncelle('H15', 'VERIFIED', {})).toThrow();
    expect(oku()).toEqual(once);
  });

  it('kanıtsız TESTED de reddediliyor (H08) — kapı tek basamak değil', () => {
    const once = oku();
    expect(() => guncelle('H15', 'TESTED', { commit: 'abc1234' })).toThrow(
      /--commit ve --evidence/
    );
    expect(() => guncelle('H15', 'TESTED', { evidence: 'vitest' })).toThrow(
      /--commit ve --evidence/
    );
    expect(oku()).toEqual(once);
  });

  it('tanınmayan durum yazılamıyor', () => {
    expect(() => guncelle('H15', 'BITTI', {})).toThrow(/Geçersiz durum/);
  });
});
