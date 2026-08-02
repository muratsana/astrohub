/**
 * KALİBRASYON KARESİ REHBERİ (§14.2 "Calibration frame rehberi").
 *
 * ══════════════════════════════════════════════════════════════════════
 * REHBER, AMA METİN DEĞİL — VERİ
 *
 * Bunu bir yazı olarak `content_entries`e koymak mümkündü ve
 * YAPILMADI: rehberin cevabı kullanıcının kamerasına göre DEĞİŞİYOR.
 * CMOS'ta dark-flat kullanan biri için bias gereksiz; CCD'de klasik
 * üçlü hâlâ geçerli. Sabit bir yazı ikisini de anlatmak zorunda kalır
 * ve okuyan "benim için hangisi" sorusunu kendi çözerdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SAYILAR ARALIK, ÇÜNKÜ TEK DOĞRU YOK (§14.2)
 *
 * "Kaç dark çekmeli" sorusunun tek cevabı yok: yığınlanan kare sayısı
 * arttıkça kalibrasyon karesinin kendi gürültüsü √N ile azalır, yani
 * kazanç hızla küçülür. 16 kare gürültüyü 4 kat, 64 kare 8 kat
 * azaltır — dört katı emek, iki katı fayda. Bu yüzden `countRange`
 * bir ARALIK ve `noiseFactor` gerçek formülü veriyor; "şu kadar çek"
 * diye tek sayı uydurulmuyor.
 */

export type CalibrationKind = 'bias' | 'dark' | 'flat' | 'dark-flat';

export type SensorKind = 'cmos' | 'ccd';

export interface CalibrationStep {
  kind: CalibrationKind;
  title: string;
  /** Bu kare NEYİ giderir. */
  removes: string;
  /** Önerilen kare aralığı (alt, üst). */
  countRange: [number, number];
  /** Işıklı kareyle EŞLEŞMESİ gereken ayarlar. */
  mustMatch: string[];
  /** Kaçınılması gereken tipik hata. */
  pitfall: string;
}

export interface CalibrationInput {
  sensor: SensorKind;
  /**
   * Flat'ların kendi karanlık karesi (dark-flat) çekiliyor mu?
   *
   * CMOS'ta yaygın yol bu ve seçildiğinde ayrı bias GEREKMİYOR:
   * dark-flat zaten offset'i içeriyor.
   */
  useDarkFlats: boolean;
}

/**
 * Kullanıcının kurulumuna göre gereken kalibrasyon kareleri.
 *
 * SIRA ÖNEMLİ ve uygulama sırası: flat'lar ışıklı kareyle aynı optik
 * dizilimde çekilmek zorunda, yani gece bitmeden. Liste bu yüzden
 * "gece yapılacaklar" önce gelecek şekilde sıralı değil — sıralama
 * kavramsal: önce sensörün kendi imzası (bias/dark), sonra optik
 * yolun imzası (flat).
 */
export function calibrationPlan(input: CalibrationInput): CalibrationStep[] {
  const steps: CalibrationStep[] = [];

  /* BIAS: CMOS + dark-flat kullanıyorsa GEREKSİZ ve listeye hiç
     girmiyor. Yarım çalışan bir adım göstermektense hiç göstermemek. */
  const biasGerekli = !(input.sensor === 'cmos' && input.useDarkFlats);
  if (biasGerekli) {
    steps.push({
      kind: 'bias',
      title: 'Bias (offset)',
      removes:
        'Sensörün okuma anındaki sabit ofseti ve okuma deseni — poz süresinden bağımsız.',
      countRange: [50, 200],
      mustMatch: ['Kazanç (gain) ve offset', 'Okuma modu', 'Bit derinliği'],
      pitfall:
        'Mümkün olan en kısa pozla ve tam karanlıkta çekilmeli; kapak kapalı değilse bias’a ışık karışır.',
    });
  }

  steps.push({
    kind: 'dark',
    title: 'Dark',
    removes:
      'Isıl sinyal, sıcak pikseller ve (varsa) amp glow. Süreyle ve sıcaklıkla büyür.',
    countRange: [20, 50],
    mustMatch: [
      'Poz süresi',
      'Sensör sıcaklığı',
      'Kazanç (gain) ve offset',
      'Okuma modu',
    ],
    pitfall:
      'Soğutmasız kamerada dark kütüphanesi işe yaramaz: sıcaklık her gece farklı olur, dark aynı gece çekilmeli.',
  });

  steps.push({
    kind: 'flat',
    title: 'Flat',
    removes:
      'Vinyetleme ve optik yoldaki toz gölgeleri — sensörün değil, ışık yolunun imzası.',
    countRange: [20, 50],
    mustMatch: [
      'Odak',
      'Kamera dönüş açısı',
      'Filtre (her filtre için ayrı)',
      'Optik dizilim (reducer, uzatma, kapak dâhil)',
    ],
    pitfall:
      'Işıklı kareden SONRA odak ya da kamera açısı değiştiyse flat işe yaramaz; toz gölgeleri kayar ve düzeltme yeni bir hata üretir.',
  });

  if (input.useDarkFlats) {
    steps.push({
      kind: 'dark-flat',
      title: 'Dark-flat',
      removes:
        'Flat karelerinin kendi ofseti ve ısıl sinyali — flat’ın kalibrasyonu.',
      countRange: [20, 50],
      mustMatch: ['Flat’ın poz süresi', 'Sıcaklık', 'Kazanç (gain) ve offset'],
      pitfall:
        'Flat’la AYNI poz süresinde olmalı; farklı süredeki bir dark-flat, düzeltmeyi olduğundan büyük ya da küçük yapar.',
    });
  }

  return steps;
}

/**
 * Yığınlanan N kareyle rastgele gürültünün kaç kat azaldığı: √N.
 *
 * VARSAYIM AÇIK: yalnızca İLİŞKİSİZ (uncorrelated) gürültü için
 * geçerli. Sabit desen gürültüsü, amp glow ya da ışık sızıntısı
 * yığınlamayla azalmaz — onlar her karede aynı yerdedir ve ortalamada
 * hayatta kalır. Bu yüzden formül "kaç kare yeter"in tamamını
 * söylemiyor, yalnızca azalan getiriyi gösteriyor.
 */
export function stackNoiseFactor(frames: number): number {
  if (!Number.isInteger(frames) || frames < 1) {
    throw new Error('Kare sayısı en az 1 olmalı');
  }
  return Math.sqrt(frames);
}

/**
 * Bir aralığın üst ucuna çıkmanın alt uca göre ne kadar kazandırdığı.
 *
 * "50 yerine 200 bias çeksem ne olur" sorusunun dürüst cevabı: dört
 * katı emek, iki katı iyileşme. Sayfada bu oran yazıyor ki kullanıcı
 * kararı kendi versin.
 */
export function rangeGain([alt, ust]: [number, number]): number {
  return stackNoiseFactor(ust) / stackNoiseFactor(alt);
}
