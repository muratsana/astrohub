/** Etkinlik modülü tipleri (§7.5–7.6, §8.4). */

export type EventType =
  | 'gozlem-senligi'
  | 'astrofoto-kampi'
  | 'meteor-yagmuru'
  | 'halk-gozlemi'
  | 'gunes-gozlemi'
  | 'konferans'
  | 'atolye'
  | 'cocuk-aile'
  | 'planetaryum'
  | 'webinar';

export const eventTypeLabels: Record<EventType, string> = {
  'gozlem-senligi': 'Gözlem Şenliği',
  'astrofoto-kampi': 'Astrofotoğraf Kampı',
  'meteor-yagmuru': 'Meteor Yağmuru',
  'halk-gozlemi': 'Halk Gözlemi',
  'gunes-gozlemi': 'Güneş Gözlemi',
  konferans: 'Konferans / Seminer',
  atolye: 'Atölye',
  'cocuk-aile': 'Çocuk / Aile',
  planetaryum: 'Planetaryum',
  webinar: 'Webinar',
};

export interface EventSession {
  time: string;
  title: string;
  speaker?: string;
}

export interface EventCoords {
  latitude: number;
  longitude: number;
}

export interface EventContact {
  label: string;
  url: string;
}

export interface AstroEvent {
  /**
   * Veritabanı kimliği. Tohum kayıtlarda yok: kayıt olma gerçek bir
   * satıra bağlanır ve tohum bir etkinliğe kaydolmak yabancı anahtar
   * hatası verirdi.
   */
  id?: string;
  slug: string;
  title: string;
  type: EventType;
  city: string;
  venue: string;
  /**
   * Etkinlik yerinin koordinatı — harita görünümü ve yakınlık sıralaması için.
   *
   * Çevrimiçi etkinliklerde yoktur; harita bu kayıtları ayrı bir listede
   * gösterir. Koordinat **etkinlik yerine** aittir, katılımcıya değil —
   * §15.3'teki konum mahremiyeti kuralı kişisel konumlar içindir, ilan
   * edilmiş bir etkinlik adresi zaten kamuya açıktır.
   */
  coords?: EventCoords;
  startsAt: string; // ISO
  endsAt?: string;
  free: boolean;
  camping: boolean;
  kidsFriendly: boolean;
  astrophotoFocused: boolean;
  telescopesProvided: boolean;
  capacity?: number;
  registered?: number;
  organizer: { name: string; verified: boolean };
  description: string;
  program: EventSession[];
  observedTargets: string[];
  rules?: string[];
  gradient: string;
  /** Kaynak şeffaflığı (§8.4): kaynak adı + son doğrulama */
  source: { name: string; lastVerifiedAt: string; url?: string };
  /** Etkinliğe ulaşmak/kayıt olmak için doğrulanmış dış adres. */
  contact?: EventContact;
  /**
   * Etkinlik afişi SİTEYE KOPYALANMAZ.
   *
   * Afişin telifi düzenleyendedir; izin almadan yeniden yayımlamak hak
   * ihlalidir ve "duyuruyu paylaşıyoruz" savunması bunu değiştirmez.
   * Kartlarda kendi görselimiz çizilir, afiş için duyuru sayfasına
   * bağlantı verilir. İzin alınan etkinliklerde bu alan doldurulabilir.
   */
  posterUrl?: string;
  /** Afiş kullanım izni kimden alındı — boşsa afiş gösterilmez. */
  posterCredit?: string;
  /**
   * MEKÂN GÖRSELİ — afişin yerine geçen, telifi uygun fotoğraf.
   *
   * Afiş kullanılamıyor (telif düzenleyende) ama etkinliğin nerede
   * yapıldığı görsel bir bilgi ve o yerin serbest lisanslı fotoğrafları
   * var. Kartta gösterilen şey bu: etkinliğin afişi değil, gideceğin yer.
   * Kredi zorunlu — CC BY/BY-SA'nın şartı.
   */
  image?: { url: string; credit: string; licence: string };
}
