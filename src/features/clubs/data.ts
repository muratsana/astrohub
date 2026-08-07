/**
 * KULÜPLER, DERNEKLER VE TESİSLER (§8.11, §7.7).
 *
 * İki ayrı varlık aynı dosyada duruyor çünkü ikisi de "kuruma ait, ziyaret
 * edilebilir bir astronomi noktası" — ve ikisi de aynı doğrulama sorusunu
 * soruyor: bu bilgi nereden geliyor, en son ne zaman kontrol edildi.
 *
 * KAYIT SORUMLULUĞU: buradaki bilgiler kurumların kendi duyurularından
 * derlenmiştir ve `source.lastVerifiedAt` alanı doğrulama tarihini taşır.
 * Kurumun kendi profilini devralması (§8.11) hesap sistemi geldiğinde
 * açılacak; o zamana kadar kayıtlar editoryaldir ve bu sayfada açıkça
 * belirtilir. Doğrulanmamış bilgiyi doğrulanmış gibi göstermek, bir
 * ziyaretçinin boşuna yola çıkması demek.
 */

import { commonsImage } from '../../lib/commons';

export type ClubKind = 'dernek' | 'universite' | 'gozlem-grubu';

export const clubKindLabels: Record<ClubKind, string> = {
  dernek: 'Dernek',
  universite: 'Üniversite Kulübü',
  'gozlem-grubu': 'Gözlem Grubu',
};

export type ClubTopic =
  | 'amator-astronomi'
  | 'astrofotografcilik'
  | 'gozlem-etkinlikleri'
  | 'egitim-atolye'
  | 'bilimsel-calisma'
  | 'radyo-astronomi'
  | 'astro-kampcilik'
  | 'gencler-cocuklar';

export const clubTopicLabels: Record<ClubTopic, string> = {
  'amator-astronomi': 'Amatör astronomi',
  astrofotografcilik: 'Astrofotoğrafçılık',
  'gozlem-etkinlikleri': 'Gözlem etkinlikleri',
  'egitim-atolye': 'Eğitim / atölye',
  'bilimsel-calisma': 'Bilimsel çalışmalar',
  'radyo-astronomi': 'Radyo astronomi',
  'astro-kampcilik': 'Astro kampçılık',
  'gencler-cocuklar': 'Gençler / çocuklar',
};

export const clubTopicOrder = Object.keys(clubTopicLabels) as ClubTopic[];

export interface ClubPhoto {
  url: string;
  alt: string;
}

const cover = (fileName: string, alt: string): ClubPhoto[] => [
  { url: commonsImage(fileName, 900), alt },
];

export interface AstronomyClub {
  slug: string;
  name: string;
  kind: ClubKind;
  city: string;
  /**
   * İlçe adı — `districts` tablosundaki kanonik yazım.
   *
   * İSTEĞE BAĞLI ve öyle kalıyor: mevcut kayıtların hiçbirinde yok ve
   * zorunlu yapmak onları düzenlenemez hâle getirirdi. Süzgeçte
   * yalnızca dolu olanlar görünüyor — "belirtilmemiş" diye bir seçenek
   * yok, çünkü o bir yer adı değil, verinin yokluğu.
   */
  district?: string;
  foundedOn?: string;
  place?: string;
  foundedYear?: number;
  /** Üye sayısı bildirilmişse; bildirilmemişse gösterilmez. */
  memberCount?: number;
  summary: string;
  topics?: ClubTopic[];
  /** Kulübün düzenli olarak yaptığı işler. */
  activities: string[];
  /** Herkese açık etkinlik yapıyor mu? */
  publicEvents: boolean;
  /** Ekipman ödünç veriyor / ortak teleskobu var mı? */
  sharedEquipment: boolean;
  website?: string;
  socialUrl?: string;
  whatsappUrl?: string;
  photos?: ClubPhoto[];
  /** Etkinlik verisindeki organizatör adı — kayıtlar bununla eşleşir. */
  organizerName?: string;
  source: { name: string; lastVerifiedAt: string };
}

export const clubs: AstronomyClub[] = [
  {
    slug: 'antalya-astronomi-dernegi',
    name: 'Antalya Astronomi Derneği',
    kind: 'dernek',
    city: 'Antalya',
    foundedYear: 2009,
    memberCount: 180,
    summary:
      'Saklıkent ve Bakırlıtepe çevresinde düzenli gözlem etkinlikleri yapan, halka açık gözlem geceleriyle bilinen dernek. Meteor yağmuru kampları yıllık takvimin sabiti.',
    activities: [
      'Aylık halka açık gözlem gecesi',
      'Meteor yağmuru kampları',
      'Okul ziyaretleri ve teleskop tanıtımı',
    ],
    publicEvents: true,
    sharedEquipment: true,
    organizerName: 'Antalya Astronomi Derneği',
    photos: cover(
      'TUG_full_site.jpg',
      'Antalya astronomi topluluğu için gözlemevi ve gece gökyüzü kapak görseli'
    ),
    source: { name: 'Dernek duyuruları', lastVerifiedAt: '2026-07-10' },
  },
  {
    slug: 'ege-universitesi-astronomi-kulubu',
    name: 'Ege Üniversitesi Astronomi Kulübü',
    kind: 'universite',
    city: 'İzmir',
    foundedYear: 1998,
    summary:
      'Kampüs içinde güneş gözlemleri ve dönem boyunca süren temel astronomi seminerleri düzenler. H-alfa güneş teleskobu kulüp envanterindedir.',
    activities: [
      'H-alfa güneş gözlemi',
      'Dönemlik astronomi semineri',
      'Gözlem gezileri',
    ],
    publicEvents: true,
    sharedEquipment: true,
    organizerName: 'Ege Üniversitesi Astronomi Kulübü',
    photos: cover(
      'North America Nebula (NGC7000) in Hubble Palette.jpg',
      'Ege Üniversitesi Astronomi Kulübü astrofotoğraf kapak görseli'
    ),
    source: { name: 'Kulüp duyurusu', lastVerifiedAt: '2026-07-01' },
  },
  {
    slug: 'ankara-astrofotograf-grubu',
    name: 'Ankara Astrofotoğraf Grubu',
    kind: 'gozlem-grubu',
    city: 'Ankara',
    summary:
      'Görüntü işleme atölyeleri ve Çamlıdere çevresinde ortak çekim geceleri düzenleyen, astrofotoğrafa odaklı topluluk.',
    activities: [
      'Görüntü işleme atölyesi',
      'Ortak çekim geceleri',
      'Ekipman ödünç havuzu',
    ],
    publicEvents: true,
    sharedEquipment: false,
    organizerName: 'Ankara Astrofotoğraf Grubu',
    photos: cover(
      'Andromeda galaxy.jpg',
      'Ankara Astrofotoğraf Grubu derin uzay kapak görseli'
    ),
    source: { name: 'Topluluk paylaşımı', lastVerifiedAt: '2026-07-15' },
  },
  {
    slug: 'bursa-astronomi-dernegi',
    name: 'Bursa Astronomi Derneği',
    kind: 'dernek',
    city: 'Bursa',
    foundedYear: 2013,
    memberCount: 95,
    summary:
      'Uludağ Sarıalan mevkiinde büyük katılımlı gözlem şenlikleri düzenler; ekipmanı olmayan katılımcılar için teleskop istasyonları kurar.',
    activities: ['Gözlem şenliği', 'Teleskop istasyonu', 'Çocuk atölyeleri'],
    publicEvents: true,
    sharedEquipment: true,
    organizerName: 'Bursa Astronomi Derneği',
    photos: cover(
      'Rosette Nebula NGC 2237 - C49.png',
      'Bursa Astronomi Derneği gözlem ve astrofotoğraf kapak görseli'
    ),
    source: { name: 'Dernek duyurusu', lastVerifiedAt: '2026-07-19' },
  },
  {
    slug: 'erciyes-astronomi-kulubu',
    name: 'Erciyes Astronomi Kulübü',
    kind: 'universite',
    city: 'Kayseri',
    foundedYear: 2011,
    summary:
      'Erciyes yaylasındaki yüksek rakım ve kuru kış havasını kullanan kış gözlem kamplarıyla tanınır.',
    activities: [
      'Kış gözlem kampı',
      'Meteor sayımı',
      'Gökyüzü tanıtım geceleri',
    ],
    publicEvents: true,
    sharedEquipment: false,
    organizerName: 'Erciyes Astronomi Kulübü',
    photos: cover(
      'NGC 6302 Hubble 2009.full.jpg',
      'Erciyes Astronomi Kulübü derin uzay kapak görseli'
    ),
    source: { name: 'Kulüp duyurusu', lastVerifiedAt: '2026-07-18' },
  },
  {
    slug: 'kapadokya-gokbilim-toplulugu',
    name: 'Kapadokya Gökbilim Topluluğu',
    kind: 'gozlem-grubu',
    city: 'Nevşehir',
    summary:
      'Peribacaları çevresindeki düşük ışık kirliliğini turizmle birleştiren gözlem geceleri ve astrofoto atölyeleri düzenler.',
    activities: [
      'Gözlem gecesi',
      'Astrofoto atölyesi',
      'Rehberli gökyüzü turu',
    ],
    publicEvents: true,
    sharedEquipment: true,
    organizerName: 'Kapadokya Gökbilim Topluluğu',
    photos: cover(
      'NGC 6888.png',
      'Kapadokya Gökbilim Topluluğu astrofotoğraf kapak görseli'
    ),
    source: { name: 'Organizatör bildirimi', lastVerifiedAt: '2026-07-20' },
  },
];

export function getClubBySlug(slug: string): AstronomyClub | undefined {
  return clubs.find((c) => c.slug === slug);
}

/* ══════════════════════ Tesisler ══════════════════════ */

export type FacilityKind = 'rasathane' | 'planetaryum' | 'bilim-merkezi';

export const facilityKindLabels: Record<FacilityKind, string> = {
  rasathane: 'Rasathane',
  planetaryum: 'Planetaryum',
  'bilim-merkezi': 'Bilim Merkezi',
};

export interface Facility {
  slug: string;
  name: string;
  kind: FacilityKind;
  city: string;
  coords: { latitude: number; longitude: number };
  /** Rakım (m) — rasathanelerde gözlem kalitesinin belirleyicilerinden. */
  altitude?: number;
  summary: string;
  /** Ziyarete açık mı, hangi koşulla? */
  visiting: 'randevulu' | 'serbest' | 'kapali';
  /** Öne çıkan teçhizat ya da kubbe bilgisi. */
  highlights: string[];
  website?: string;
  source: { name: string; lastVerifiedAt: string };
}

export const visitingLabels: Record<Facility['visiting'], string> = {
  randevulu: 'Randevulu ziyaret',
  serbest: 'Serbest ziyaret',
  kapali: 'Ziyarete kapalı',
};

export const facilities: Facility[] = [
  {
    slug: 'tug-bakirlitepe',
    name: 'TÜBİTAK Ulusal Gözlemevi (Bakırlıtepe)',
    kind: 'rasathane',
    city: 'Antalya',
    coords: { latitude: 36.8247, longitude: 30.3353 },
    altitude: 2500,
    summary:
      "Türkiye'nin en büyük optik teleskoplarının bulunduğu ulusal araştırma gözlemevi. 2500 m rakım ve düşük nem, ülkedeki en iyi gözlem koşullarını üretir.",
    visiting: 'randevulu',
    highlights: [
      'Araştırma sınıfı optik teleskoplar',
      'Yıl içinde belirli günlerde halka açık ziyaret',
      'Yola çıkış izne ve ring servisine tabidir',
    ],
    source: { name: 'Kurum duyurusu', lastVerifiedAt: '2026-07-22' },
  },
  {
    slug: 'istanbul-planetaryum',
    name: 'İstanbul Planetaryumu',
    kind: 'planetaryum',
    city: 'İstanbul',
    coords: { latitude: 41.0082, longitude: 28.9784 },
    summary:
      'Kubbe gösterimleriyle gökyüzü tanıtımı yapan, okul grupları ve aileler için programlar düzenleyen planetaryum.',
    visiting: 'serbest',
    highlights: [
      'Tam kubbe gösterim',
      'Okul grupları için program',
      'Teras gözlemi',
    ],
    source: { name: 'Kurum duyurusu', lastVerifiedAt: '2026-07-05' },
  },
  {
    slug: 'trabzon-bilim-merkezi',
    name: 'Trabzon Bilim Merkezi Planetaryumu',
    kind: 'bilim-merkezi',
    city: 'Trabzon',
    coords: { latitude: 41.0027, longitude: 39.7168 },
    summary:
      'Karadeniz bölgesinde kapalı hava riski yüksek olduğu için kubbe odaklı programlar yürütür; hava açıksa teras gözlemi eklenir.',
    visiting: 'serbest',
    highlights: [
      'Kubbe gösterimi',
      'Teras teleskop gözlemi',
      'Atölye salonları',
    ],
    source: { name: 'Kurum duyurusu', lastVerifiedAt: '2026-07-16' },
  },
  {
    slug: 'izmir-bilim-merkezi',
    name: 'İzmir Bilim Merkezi',
    kind: 'bilim-merkezi',
    city: 'İzmir',
    coords: { latitude: 38.4622, longitude: 27.2167 },
    summary:
      'Çocuk ve aile odaklı astronomi atölyeleri, güvenli güneş gözlemi ve interaktif sergiler.',
    visiting: 'serbest',
    highlights: [
      'Çocuk atölyeleri',
      'Güvenli güneş gözlemi',
      'İnteraktif sergi',
    ],
    source: { name: 'Kurum duyurusu', lastVerifiedAt: '2026-07-12' },
  },
  {
    slug: 'ankara-universitesi-rasathanesi',
    name: 'Ankara Üniversitesi Kreiken Rasathanesi',
    kind: 'rasathane',
    city: 'Ankara',
    coords: { latitude: 39.8433, longitude: 32.7794 },
    altitude: 1250,
    summary:
      'Üniversite bünyesinde eğitim ve araştırma amaçlı çalışan rasathane; dönemsel olarak halka açık gözlem geceleri düzenler.',
    visiting: 'randevulu',
    highlights: [
      'Eğitim amaçlı teleskoplar',
      'Dönemsel halka açık geceler',
      'Lisans/lisansüstü gözlem dersleri',
    ],
    source: { name: 'Kurum duyurusu', lastVerifiedAt: '2026-07-08' },
  },
];

export function getFacilityBySlug(slug: string): Facility | undefined {
  return facilities.find((f) => f.slug === slug);
}
