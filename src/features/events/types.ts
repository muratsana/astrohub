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

export interface AstroEvent {
  slug: string;
  title: string;
  type: EventType;
  city: string;
  venue: string;
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
  source: { name: string; lastVerifiedAt: string };
}
