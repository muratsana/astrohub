import { describe, expect, it } from 'vitest';
import {
  ayrilikArcmin,
  birlestir,
  openNgcAdi,
  openNgcAyristir,
  slugCakismalariniCoz,
  slugUret,
  vizierAyristir,
  type Nesne,
} from './ayristir.ts';
import { sinirlariAyristir, takimyildizBul } from './takimyildiz.ts';
import { VIZIER_KAYNAKLAR } from './kaynaklar.ts';

/*
 * Örnekler gerçek kaynaklardan kesildi — uydurulmuş bir CSV, biçim
 * değiştiğinde testi geçmeye devam ederdi ve testin tek işi biçimi
 * yakalamak.
 */

const OPENNGC_BASLIK =
  'Name;Type;RA;Dec;Const;MajAx;MinAx;PosAng;B-Mag;V-Mag;J-Mag;H-Mag;K-Mag;' +
  'SurfBr;Hubble;Pax;Pm-RA;Pm-Dec;RadVel;Redshift;Cstar U-Mag;Cstar B-Mag;' +
  'Cstar V-Mag;M;NGC;IC;Cstar Names;Identifiers;Common names;NED notes;' +
  'OpenNGC notes;Sources';

/** M 31, bir kopya kayıt, bir NonEx ve bir yıldız. */
const OPENNGC = [
  OPENNGC_BASLIK,
  'NGC0224;G;00:42:44.33;+41:16:07.5;And;199.53;70.79;35;4.36;3.44;;;;;;;;;' +
    '-301;-0.001001;;;;031;;;;PGC 002557,UGC 00454,MCG +07-02-016;' +
    'Andromeda Galaxy;;;',
  'NGC0225;OCl;00:43:39.00;+61:46:30.0;Cas;12;;;;7.00;;;;;;;;;;;;;;;;;;' +
    'MWSC 0079,Cr 007;Sailboat Cluster;;;',
  'NGC5866B;Dup;15:07:29.80;+55:45:46.0;Dra;;;;;;;;;;;;;;;;;;;;5866;;;;;;;',
  'NGC1140;NonEx;02:54:33.60;-10:01:40.0;Eri;;;;;;;;;;;;;;;;;;;;;;;;;;;',
  'IC0059;RfN;00:56:42.00;+61:04:36.0;Cas;10;5;;;;;;;;;;;;;;;;;;;;;LBN 620;;;;',
].join('\n');

const SINIR = [
  '#Column\tRA_low',
  ' 0.0000\t24.0000\t 88.0000\tUMi',
  ' 0.0000\t 2.4167\t 35.0000\tAnd',
  ' 0.0000\t24.0000\t 60.0000\tCas',
  ' 0.0000\t24.0000\t-90.0000\tOct',
].join('\n');

const SH2_TSV = [
  '#Column\tSh2',
  '_RAJ2000\t_DEJ2000\tSh2\tDiam\tBright\tForm\tStruct',
  'deg\tdeg\t \tarcmin\t \t \t ',
  '------\t------\t----\t----\t-\t-\t--',
  '239.713380\t-26.120461\t   1\t 150\t3\t3\t2',
  '350.200000\t+61.200000\t 155\t  50\t2\t3\t2',
].join('\n');

const sinirlar = sinirlariAyristir(SINIR);
const sh2Kaynak = VIZIER_KAYNAKLAR.find((k) => k.onek === 'Sh2')!;

describe('slugUret', () => {
  it('boşlukları atar, kodu küçültür', () => {
    expect(slugUret('NGC 7000')).toBe('ngc7000');
    expect(slugUret('Sh2-155')).toBe('sh2-155');
    expect(slugUret('M 31')).toBe('m31');
  });

  it('veritabanı kısıtına uyan karakter kümesinde kalır', () => {
    for (const kod of ['ESO 056-115', 'PN G001.2+02.1', 'Cl 399', 'vdB 141']) {
      expect(slugUret(kod)).toMatch(/^[a-z0-9-]{2,80}$/);
    }
  });
});

describe('openNgcAdi', () => {
  it('sıfır dolgusunu kaldırır, soneki korur', () => {
    expect(openNgcAdi('NGC0224')).toBe('NGC 224');
    expect(openNgcAdi('IC0059')).toBe('IC 59');
    expect(openNgcAdi('NGC5866B')).toBe('NGC 5866B');
  });

  it('NGC/IC olmayanı tanımaz', () => {
    expect(openNgcAdi('Mel022')).toBeNull();
  });
});

describe('openNgcAyristir', () => {
  const { nesneler, kopyalar } = openNgcAyristir(OPENNGC, '', sinirlar);

  it('NonEx ve Dup kayıtları nesne saymaz', () => {
    expect(nesneler.map((n) => n.katalog).sort()).toEqual([
      'IC 59',
      'M 31',
      'NGC 225',
    ]);
  });

  it('Messier numarası varsa birincil kod odur', () => {
    const m31 = nesneler.find((n) => n.katalog === 'M 31')!;
    expect(m31.kodlar).toContain('NGC 224');
    expect(m31.ad).toBe('Andromeda Galaxy');
    expect(m31.tur).toBe('galaksi');
  });

  it('koordinatı dereceye çevirir', () => {
    const m31 = nesneler.find((n) => n.katalog === 'M 31')!;
    expect(m31.raDeg).toBeCloseTo(10.6847, 3);
    expect(m31.decDeg).toBeCloseTo(41.2688, 3);
    expect(m31.buyukEksen).toBe(199.53);
    expect(m31.kadir).toBe(3.44);
  });

  it('yalnızca aranan çapraz kimlikleri saklar', () => {
    const m31 = nesneler.find((n) => n.katalog === 'M 31')!;
    expect(m31.kodlar).toContain('PGC 2557');
    expect(m31.kodlar).toContain('UGC 454');
    /* MCG kabul listesinde; SDSS/IRAS gibi olsaydı düşerdi. */
    expect(m31.kodlar.some((k) => k.startsWith('SDSS'))).toBe(false);
  });

  it('kopya kaydı asıl kaydın takma adı olarak işaretler', () => {
    expect(kopyalar.get('NGC 5866B')).toBe('NGC 5866');
  });
});

describe('vizierAyristir', () => {
  const sh2 = vizierAyristir(sh2Kaynak, SH2_TSV, sinirlar);

  it('numarayı katalog koduna çevirir', () => {
    expect(sh2.map((n) => n.katalog)).toEqual(['Sh2-1', 'Sh2-155']);
    expect(sh2[0].buyukEksen).toBe(150);
  });

  it('takımyıldızı koordinattan bulur', () => {
    expect(sh2[1].takimyildiz).toBe('Kraliçe');
  });

  it('sütunu adıyla bulur, sırasıyla değil', () => {
    const karisik = SH2_TSV.replace(
      '_RAJ2000\t_DEJ2000\tSh2\tDiam',
      '_RAJ2000\t_DEJ2000\tDiam\tSh2'
    );
    const sonuc = vizierAyristir(sh2Kaynak, karisik, sinirlar);
    /* Sütun adları yer değişti; değerler değişmedi. Ada bakan okuyucu
       artık "Diam" sütunundan numarayı okumalı. */
    expect(sonuc[0].katalog).toBe('Sh2-150');
  });
});

describe('ayrilikArcmin', () => {
  it('sağ açıklık sarmasında doğru mesafe verir', () => {
    expect(ayrilikArcmin(359.99, 0, 0.01, 0)).toBeCloseTo(1.2, 1);
  });

  it('bir derece = 60 yay dakikası', () => {
    expect(ayrilikArcmin(0, 0, 0, 1)).toBeCloseTo(60, 6);
  });
});

describe('birlestir', () => {
  const yap = (katalog: string, ra: number, dec: number): Nesne => ({
    slug: slugUret(katalog),
    ad: katalog,
    katalog,
    tur: 'bulutsu',
    takimyildiz: '—',
    raDeg: ra,
    decDeg: dec,
    kadir: null,
    buyukEksen: null,
    kucukEksen: null,
    kodlar: [katalog],
  });

  it('çok yakın kayıtları tek nesnede toplar', () => {
    const sonuc = birlestir(
      [[yap('NGC 7023', 315.394, 68.163)], [yap('vdB 139', 315.395, 68.164)]],
      new Map()
    );
    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].kodlar).toEqual(['NGC 7023', 'vdB 139']);
  });

  it('eşik dışındaki komşuyu ayrı bırakır', () => {
    const sonuc = birlestir(
      [[yap('NGC 1973', 83.85, -4.73)], [yap('NGC 1975', 83.86, -4.68)]],
      new Map()
    );
    expect(sonuc).toHaveLength(2);
  });

  it('kod eşleşmesini konumdan önce kullanır', () => {
    const a = yap('M 31', 10.68, 41.27);
    a.kodlar.push('NGC 224');
    /* Konumu 10 derece uzakta: sadece konuma baksaydı eşleşmezdi. */
    const b = yap('NGC 224', 20, 41.27);
    const sonuc = birlestir([[a], [b]], new Map());
    expect(sonuc).toHaveLength(1);
  });

  it('kopya numaralarını asıl kayda bağlar', () => {
    const sonuc = birlestir(
      [[yap('NGC 5866', 226.62, 55.76)]],
      new Map([['NGC 5866B', 'NGC 5866']])
    );
    expect(sonuc[0].kodlar).toContain('NGC 5866B');
  });
});

describe('slugCakismalariniCoz', () => {
  it('aynı slug ikinci kez kullanılmaz', () => {
    const nesneler = [
      { slug: 'ngc1', katalog: 'NGC 1' },
      { slug: 'ngc1', katalog: 'NGC 1A' },
      { slug: 'ngc1', katalog: 'NGC 1B' },
    ] as Nesne[];
    slugCakismalariniCoz(nesneler);
    expect(nesneler.map((n) => n.slug)).toEqual(['ngc1', 'ngc1-2', 'ngc1-3']);
  });
});

describe('takimyildizBul', () => {
  it('sınır tablosu dışında kalan konumda null döner', () => {
    expect(takimyildizBul([], 0, 0)).toBeNull();
  });
});
