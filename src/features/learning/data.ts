/** Eğitim içerikleri tohum verisi (§7.14). CMS/DB Faz 1.8'de. */

export type LearningLevel = 'Başlangıç' | 'Orta' | 'İleri';

export interface LearningItem {
  slug: string;
  title: string;
  category: string;
  level: LearningLevel;
  duration: string;
  summary: string;
  gradient: string;
}

export const learningItems: LearningItem[] = [
  {
    slug: 'ilk-setup',
    title: "İlk Astrofotoğraf Setup'ını Kurmak",
    category: 'Başlangıç Rehberi',
    level: 'Başlangıç',
    duration: '15 dk okuma',
    summary:
      'Montür-öncelikli yaklaşım: bütçenin en büyük payı neden montüre gider; ilk teleskop ve kamera seçiminde yapılan tipik hatalar.',
    gradient: 'linear-gradient(135deg, #7c2d12, #b45309, #f59e0b)',
  },
  {
    slug: 'kalibrasyon',
    title: 'Dark, Flat ve Bias: Kalibrasyon Temelleri',
    category: 'İşleme',
    level: 'Orta',
    duration: '20 dk okuma',
    summary:
      'Kalibrasyon karelerinin her biri hangi kusuru düzeltir, kaç kare gerekir ve master kütüphanesi nasıl yönetilir.',
    gradient: 'linear-gradient(135deg, #0f172a, #334155)',
  },
  {
    slug: 'sho-palet',
    title: 'SHO Paleti ile Narrowband İşleme',
    category: 'İşleme Laboratuvarı',
    level: 'İleri',
    duration: '35 dk uygulama',
    summary:
      'Hubble paletinin mantığı; kanal atama, yıldız rengi düzeltme ve selektif doygunlukla dramatik ama doğal sonuçlar.',
    gradient: 'linear-gradient(135deg, #581c87, #be185d)',
  },
  {
    slug: 'polar-align',
    title: 'Polar Alignment Nasıl Yapılır?',
    category: 'Teknik',
    level: 'Başlangıç',
    duration: '10 dk okuma',
    summary:
      'Kutup yıldızıyla hızlı hizalama, platesolve destekli yöntemler ve güneyde kutupsuz hizalama alternatifleri.',
    gradient: 'linear-gradient(135deg, #1e3a5f, #475569)',
  },
  {
    slug: 'guiding-sorunlari',
    title: 'Guiding Sorunları ve Çözümleri',
    category: 'Teknik',
    level: 'Orta',
    duration: '25 dk okuma',
    summary:
      'RMS değeri nasıl okunur; backlash, kablo sürüklenmesi, rüzgâr ve dengesiz yük kaynaklı hataların teşhisi.',
    gradient: 'linear-gradient(135deg, #14532d, #166534)',
  },
  {
    slug: 'bortle-olcegi',
    title: 'Bortle Ölçeği ve SQM: Gökyüzü Kalitesini Ölçmek',
    category: 'Gözlem',
    level: 'Başlangıç',
    duration: '12 dk okuma',
    summary:
      'Bortle sınıfları pratikte ne anlama gelir; SQM ölçümü nasıl yapılır ve çekim planına nasıl yansır.',
    gradient: 'linear-gradient(135deg, #172554, #0e7490)',
  },
];
