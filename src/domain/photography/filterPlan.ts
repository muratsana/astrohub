import type { TargetKind } from '@/domain/targets/derive';

/**
 * FİLTRE–HEDEF UYUMU VE AY/IŞIK KİRLİLİĞİNE GÖRE ÇEKİM PLANI (§14.2).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE HESAPLANIYOR, NE HESAPLANMIYOR
 *
 * §14.2 iki kural koyuyor: *"hesapların formüllerini testlerle doğrula"*
 * ve *"bilimsel sonucu belirsiz alanlarda kesinlik iddiası kullanma"*.
 * Bu modül ikisinin de içinde kalıyor.
 *
 * HESAPLANIYOR (tek doğrusu var):
 *   · Dar bandın süreklilik ışığını ne oranda kestiği — geçirgenlik
 *     bandının referans banda oranı (`continuumRejection`).
 *
 * HESAPLANMIYOR (bilerek):
 *   · "Bu filtreyle SNR 3,2 kat artar" gibi bir sayı. Kazanç; gökyüzü
 *     parlaklığına, filtrenin gerçek geçirgenlik eğrisine, kameranın
 *     kuantum verimine ve hedefin çizgi/süreklilik oranına bağlı.
 *     Tek sayı vermek, ölçmediğimiz bir şeyi ölçmüş gibi göstermek olurdu.
 *   · Ayın gökyüzü parlaklığına katkısının SAYISAL değeri. Bunun kabul
 *     görmüş bir modeli var (Krisciunas & Schaefer 1991) ve ayın
 *     yüksekliğini, hava kütlesini ve aerosol saçılmasını ister; elimizde
 *     o girdiler yok. Bu yüzden aşağıda BANT dönüyoruz ("belirgin"),
 *     magnitüd değil.
 *
 * ══════════════════════════════════════════════════════════════════════
 * IŞIK KİRLİLİĞİ FİLTRELERİ — BELİRSİZLİĞİN AÇIKÇA YAZILDIĞI YER
 *
 * "LP filtresi" ayrı bir sınıf olarak duruyor ve hiçbir hedefte
 * `uygun` demiyor, en iyi ihtimalle `sinirli`. Sebep dürüstlük: bu
 * filtreler sodyum ve cıva buharlı lambaların AYRIK çizgilerini kesmek
 * üzere tasarlandı. Türkiye dâhil her yerde aydınlatma LED'e geçiyor ve
 * LED'in tayfı SÜREKLİ — kesilecek ayrık çizgi yok. Aynı filtre aynı
 * şehirde on yıl önce işe yarıyordu, bugün büyük ölçüde yaramıyor ve
 * bu, ürünün kutusunda yazmıyor.
 */

/** Filtre sınıfı — marka değil, fiziksel davranış. */
export type FilterClass = 'genis-bant' | 'lp' | 'dual-band' | 'dar-bant';

export const filterClassLabels: Record<FilterClass, string> = {
  'genis-bant': 'Geniş bant (L-RGB / UV-IR cut)',
  lp: 'Işık kirliliği (LP) filtresi',
  'dual-band': 'Dual-band (Ha + OIII)',
  'dar-bant': 'Dar bant (Ha / OIII / SII)',
};

/** Uygunluk — üç kademe. Sayı değil, çünkü ölçtüğümüz bir şey değil. */
export type Fit = 'uygun' | 'sinirli' | 'uygun-degil';

const SIRA: Record<Fit, number> = { uygun: 0, sinirli: 1, 'uygun-degil': 2 };

/** İki yargıdan KÖTÜ olanı kazanır: bir engel, bir avantajla kapanmaz. */
export function worseFit(a: Fit, b: Fit): Fit {
  return SIRA[a] >= SIRA[b] ? a : b;
}

export interface SkyConditions {
  /** Ay aydınlanma oranı, 0–1. */
  moonIllumination: number;
  /**
   * Ayın hedefe açısal uzaklığı (derece); ay ufkun altındaysa `null`.
   * Aynı dolunay, hedeften 20° ötede başka, 140° ötede başka bir gecedir.
   */
  moonSeparationDeg: number | null;
  /** Gökyüzü kalitesi, Bortle 1–9. */
  bortle: number;
}

/** Ay etkisi — BANT, sayı değil (başlıktaki gerekçe). */
export type MoonImpact = 'yok' | 'hafif' | 'belirgin' | 'agir';

/**
 * Ayın geniş bant çekime etkisi.
 *
 * PARMAK HESABI OLDUĞU YAZILI. Eşikler amatör pratiğinden geliyor:
 * ay ufkun altındaysa etki yok; hilalde (< %25) çoğu hedefte sorun
 * çıkmaz; dolunaya yaklaştıkça ve hedefe yaklaştıkça gradyan büyür.
 * Fiziksel model bu değil — o, ayın yüksekliğini ve hava kütlesini
 * ister (bkz. başlık). Burada verilen şey bir KARAR YARDIMI.
 */
export function moonImpact(sky: SkyConditions): MoonImpact {
  const { moonIllumination: ay, moonSeparationDeg: uzaklik } = sky;
  /* Ay ufkun altında: hedefe uzaklığının bir anlamı yok. */
  if (uzaklik === null) return 'yok';
  if (ay <= 0.05) return 'yok';

  /* Uzaklık etkiyi yumuşatıyor ama sıfırlamıyor: gökyüzü aydınlığı
     bütün göğe yayılır, yalnızca ayın çevresinde değil. */
  const yakin = uzaklik < 30;
  const orta = uzaklik < 70;

  if (ay >= 0.75) return yakin ? 'agir' : orta ? 'agir' : 'belirgin';
  if (ay >= 0.4) return yakin ? 'agir' : orta ? 'belirgin' : 'hafif';
  if (ay >= 0.15) return yakin ? 'belirgin' : 'hafif';
  return yakin ? 'hafif' : 'yok';
}

export interface FilterVerdict {
  filterClass: FilterClass;
  fit: Fit;
  /** Neden — her yargı gerekçesiyle geliyor. */
  reasons: string[];
}

/**
 * HEDEF TÜRÜNE göre filtre uygunluğu.
 *
 * Ayrım tek bir fiziksel soruya dayanıyor: hedefin ışığı ÇİZGİ mi,
 * SÜREKLİLİK mi? Emisyon bulutsusu belirli dalga boylarında parlar
 * (Ha 656,3 nm; OIII 500,7 nm; SII 671,6 nm) — dar bant tam o
 * pencereleri açıp gerisini kapatır. Galaksi, küme ve yansıma
 * bulutsusu süreklilik yayar; dar bant onların ışığının neredeyse
 * tamamını da keser, yani hedefi de söndürür.
 */
export function targetFit(kind: TargetKind): Record<FilterClass, FilterVerdict> {
  const v = (
    filterClass: FilterClass,
    fit: Fit,
    reason: string
  ): FilterVerdict => ({ filterClass, fit, reasons: [reason] });

  const cizgi = (ek?: string): Record<FilterClass, FilterVerdict> => ({
    'genis-bant': v(
      'genis-bant',
      'sinirli',
      'Çalışır ama gökyüzü parlaklığından en çok etkilenen seçenek.'
    ),
    lp: v('lp', 'sinirli', LP_UYARISI),
    'dual-band': v(
      'dual-band',
      'uygun',
      ek ?? 'Ha ve OIII pencereleri hedefin kendi çizgilerine denk geliyor.'
    ),
    'dar-bant': v(
      'dar-bant',
      'uygun',
      'Hedef belirli dalga boylarında parlıyor; süreklilik kesilince kontrast artıyor.'
    ),
  });

  const sureklilik = (neden: string): Record<FilterClass, FilterVerdict> => ({
    'genis-bant': v('genis-bant', 'uygun', neden),
    lp: v('lp', 'sinirli', LP_UYARISI),
    'dual-band': v(
      'dual-band',
      'uygun-degil',
      'Hedefin ışığı süreklilik; dar pencereler hedefi de söndürür.'
    ),
    'dar-bant': v(
      'dar-bant',
      'uygun-degil',
      'Hedefin ışığı süreklilik; dar pencereler hedefi de söndürür.'
    ),
  });

  switch (kind) {
    case 'emisyon-bulutsusu':
      return cizgi();
    case 'gezegenimsi-bulutsu':
      return cizgi('OIII genelde baskın kanal; Ha ile birlikte kullanılıyor.');
    case 'sungerimsi-kalinti':
      return cizgi('Kalıntılarda OIII kanalı çoğu zaman belirleyici olan.');

    case 'karanlik-bulutsu': {
      /* Karanlık bulutsu KENDİ ışığını yaymıyor: arkasındaki perdeye
         karşı siluet. O yüzden yargı perdenin ne olduğuna bağlı ve
         burada bilmiyoruz — söylenen şey de bu. */
      const temel = sureklilik(
        'Siluet, arkasındaki alanın ışığıyla görünür hâle geliyor.'
      );
      return {
        ...temel,
        'dual-band': v(
          'dual-band',
          'sinirli',
          'Yalnızca arka perde emisyon bölgesiyse işe yarar; yıldız bulutuysa yaramaz.'
        ),
        'dar-bant': v(
          'dar-bant',
          'sinirli',
          'Yalnızca arka perde emisyon bölgesiyse işe yarar; yıldız bulutuysa yaramaz.'
        ),
      };
    }

    case 'yansima-bulutsusu':
      return sureklilik(
        'Yansıyan yıldız ışığı; tayfı kaynağın tayfı, yani süreklilik.'
      );

    case 'galaksi':
    case 'galaksi-grubu': {
      const temel = sureklilik('Yıldız ışığının toplamı — süreklilik.');
      return {
        ...temel,
        'dar-bant': v(
          'dar-bant',
          'sinirli',
          'Yalnızca EK kanal olarak: galaksinin HII bölgelerini Ha ile vurgulamak için.'
        ),
      };
    }

    case 'kuresel-kume':
    case 'acik-kume':
    case 'yildiz-bulutu':
    case 'cift-yildiz':
    case 'asterizm':
      return sureklilik('Yıldız ışığı süreklilik; renk bilgisi RGB’den geliyor.');

    case 'gezegen':
    case 'ay': {
      const temel = sureklilik(
        'Yansıyan güneş ışığı — parlak ve süreklilik; sorun ışık toplamak değil, görüş.'
      );
      return {
        ...temel,
        lp: v(
          'lp',
          'uygun-degil',
          'Hedef zaten parlak; ışık kirliliği burada belirleyici değil.'
        ),
      };
    }

    case 'gunes':
      /* Güvenlik uyarısı; filtre tercihi değil. */
      return {
        'genis-bant': v('genis-bant', 'uygun-degil', GUNES_UYARISI),
        lp: v('lp', 'uygun-degil', GUNES_UYARISI),
        'dual-band': v('dual-band', 'uygun-degil', GUNES_UYARISI),
        'dar-bant': v('dar-bant', 'uygun-degil', GUNES_UYARISI),
      };

    case 'kuyruklu-yildiz': {
      const temel = sureklilik(
        'Toz kuyruğu yansıyan güneş ışığı — süreklilik.'
      );
      return {
        ...temel,
        'dual-band': v(
          'dual-band',
          'sinirli',
          'İyon kuyruğunda emisyon var; toz kuyruğu ise dar bantta kaybolur.'
        ),
      };
    }

    case 'meteor-yagmuru':
    case 'genis-alan':
    case 'gokyuzu-olayi':
      return sureklilik(
        'Geniş alan çekimi: gökyüzünün tamamı kadraja giriyor, filtre kadraja da müdahale eder.'
      );
  }
}

const LP_UYARISI =
  'Sodyum/cıva lambalarının ayrık çizgilerine karşı tasarlandı; aydınlatma LED’e geçtikçe kesilecek çizgi kalmıyor. Kazanç şehre ve lamba türüne göre değişiyor — tek bir rakam verilemez.';

const GUNES_UYARISI =
  'GÜNEŞ İÇİN BU ARAÇ KULLANILMAZ. Güneş ancak amacına uygun bir güneş filtresi (tam açıklık ND 5) ya da özel bir Ha teleskobuyla gözlenir; buradaki hiçbir filtre sınıfı bu iş için değildir ve yanlış filtre GÖZE KALICI ZARAR verir.';

/**
 * GÖKYÜZÜ KOŞULLARININ filtre sınıfına etkisi.
 *
 * Dar bant ve dual-band ayın ve ışık kirliliğinin sürekli tayfını büyük
 * ölçüde dışarıda bırakıyor; bu yüzden dolunayda bile çalışılabiliyor.
 * Geniş bant aynı ışığı doğrudan topluyor.
 */
export function skyFit(filterClass: FilterClass, sky: SkyConditions): FilterVerdict {
  const ay = moonImpact(sky);
  const bortle = Math.round(sky.bortle);
  const reasons: string[] = [];
  let fit: Fit = 'uygun';

  if (filterClass === 'dar-bant' || filterClass === 'dual-band') {
    if (ay === 'agir') {
      reasons.push(
        'Ay parlak ama dar pencereler sürekliliğin çoğunu dışarıda bırakıyor; bu sınıfın gecesi.'
      );
    }
    if (bortle >= 7) {
      reasons.push('Şehir içinde de çalışılabilen tek sınıf.');
    }
    return { filterClass, fit, reasons };
  }

  if (filterClass === 'genis-bant') {
    if (ay === 'agir') {
      fit = 'uygun-degil';
      reasons.push('Ay etkisi ağır: gradyan ve gürültü, kazandığın süreyi yiyor.');
    } else if (ay === 'belirgin') {
      fit = 'sinirli';
      reasons.push('Ay belirgin: kısa alt pozla ve gradyan düzeltmesi bekleyerek.');
    } else if (ay === 'hafif') {
      reasons.push('Ay hafif; parlak hedeflerde sorun çıkarmaz.');
    }

    if (bortle >= 8) {
      fit = worseFit(fit, 'uygun-degil');
      reasons.push('Bortle 8–9: gökyüzü fonu hedefin çoğunu bastırıyor.');
    } else if (bortle >= 6) {
      fit = worseFit(fit, 'sinirli');
      reasons.push('Bortle 6–7: çalışılır ama toplam süre belirgin şekilde uzar.');
    }
    return { filterClass, fit, reasons };
  }

  /* LP: hiçbir koşulda `uygun` demiyoruz (başlıktaki gerekçe). */
  reasons.push(LP_UYARISI);
  if (bortle <= 4) {
    return {
      filterClass,
      fit: 'uygun-degil',
      reasons: [
        ...reasons,
        'Karanlık gökyüzünde kesecek bir şey yok; filtre yalnızca ışık kaybettirir.',
      ],
    };
  }
  return { filterClass, fit: 'sinirli', reasons };
}

/**
 * Hedef ve gökyüzü yargılarını birleştirip sıralı öneri üretir.
 *
 * İki yargıdan KÖTÜ olanı kazanıyor: emisyon bulutsusu dar bant için
 * uygun olabilir ama güneş için hiçbir şey uygun değildir; geniş bant
 * galaksi için uygundur ama dolunayda değildir.
 */
export function planFilters(
  kind: TargetKind,
  sky: SkyConditions
): FilterVerdict[] {
  const hedef = targetFit(kind);

  return (Object.keys(filterClassLabels) as FilterClass[])
    .map((filterClass) => {
      const h = hedef[filterClass];
      const g = skyFit(filterClass, sky);
      return {
        filterClass,
        fit: worseFit(h.fit, g.fit),
        reasons: [...h.reasons, ...g.reasons],
      };
    })
    .sort((a, b) => SIRA[a.fit] - SIRA[b.fit]);
}

/**
 * Dar bandın süreklilik ışığını hangi oranda kestiği.
 *
 * DÜZ SÜREKLİLİK VARSAYIMI AÇIKÇA YAZILI. Gökyüzü fonu tayfta düz kabul
 * edilirse, geçen fon ışığı geçirgenlik bandının genişliğiyle doğru
 * orantılıdır: 7 nm'lik bir filtre, 300 nm'lik görünür pencerenin
 * %2,3'ünü geçirir. Bu BİRİNCİ MERTEBE bir yaklaşım —
 *
 *   · gerçek fon tayfı düz değil (ayrık lamba çizgileri, hava parıltısı
 *     çizgileri: OI 557,7 nm tam OIII'ün yanında),
 *   · filtrenin geçirgenliği tepe noktasında bile %100 değil,
 *   · kameranın kuantum verimi dalga boyuna göre değişiyor.
 *
 * Yani dönen sayı "ne kadar fon ışığı elenir"in kaba ölçüsü; "SNR şu
 * kadar artar" demek DEĞİL. Sayfa da bunu böyle yazıyor.
 */
export function continuumRejection(
  bandwidthNm: number,
  referenceNm = 300
): number {
  if (!Number.isFinite(bandwidthNm) || bandwidthNm <= 0) {
    throw new Error('Bant genişliği pozitif olmalı');
  }
  if (!Number.isFinite(referenceNm) || referenceNm <= 0) {
    throw new Error('Referans bant pozitif olmalı');
  }
  return Math.min(1, bandwidthNm / referenceNm);
}
