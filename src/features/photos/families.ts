import type { PhotoType } from './types';
import type { BadgeTone } from '@/components/ui/Badge';

/**
 * FOTOĞRAF AİLELERİ — galeri rozetleri.
 *
 * Şartnamedeki yedi çekim türü (§8.1) gözle taranırken fazla ince bir ayrım:
 * "Gezegen", "Ay" ve "Güneş" aynı gökcismi ailesindendir ve galeri
 * karolarında ayrı ayrı görünmelerine gerek yok. Türler dört aileye
 * indirgenir; her aile kendi rengini alır, böylece ızgarada bir kayıt hangi
 * ölçekte çekilmiş, uzaktan bakışta anlaşılır.
 *
 * Renk tek başına anlam taşımaz — rozet her zaman metin de gösterir (§6.7).
 */

export type PhotoFamily =
  | 'derin-uzay'
  | 'gunes-sistemi'
  | 'takimyildiz'
  | 'gece-manzarasi';

export interface FamilyInfo {
  label: string;
  tone: BadgeTone;
  /** Rozetin kendi rengi — Badge tonlarından bağımsız, aileye özgü. */
  className: string;
  description: string;
}

export const photoFamilies: Record<PhotoFamily, FamilyInfo> = {
  'derin-uzay': {
    label: 'Derin Uzay',
    tone: 'cold',
    className: 'border-[#a78bfa]/50 bg-[#a78bfa]/12 text-[#c4b1fd]',
    description: 'Galaksi, bulutsu ve yıldız kümeleri',
  },
  'gunes-sistemi': {
    label: 'Güneş Sistemi',
    tone: 'primary',
    className: 'border-primary/50 bg-primary/12 text-primary',
    description: 'Gezegenler, Ay ve Güneş',
  },
  takimyildiz: {
    label: 'Takımyıldız',
    tone: 'cold',
    className: 'border-cold/50 bg-cold/12 text-cold',
    description: 'Geniş alan ve takımyıldız kadrajları',
  },
  'gece-manzarasi': {
    label: 'Gece Manzarası',
    tone: 'success',
    className: 'border-[#34d399]/50 bg-[#34d399]/12 text-[#5fe0b0]',
    description: 'Manzaralı gece çekimleri ve yıldız izleri',
  },
};

/** Çekim türünü aileye eşler. */
export function familyOf(type: PhotoType): PhotoFamily {
  switch (type) {
    case 'deep-sky':
      return 'derin-uzay';
    case 'gezegen':
    case 'ay':
    case 'gunes':
      return 'gunes-sistemi';
    case 'genis-alan':
      return 'takimyildiz';
    case 'star-trail':
    case 'gece-manzarasi':
      return 'gece-manzarasi';
  }
}

/** Filtre kontrollerinde kullanılan sabit sıra. */
export const familyOrder: PhotoFamily[] = [
  'derin-uzay',
  'gunes-sistemi',
  'takimyildiz',
  'gece-manzarasi',
];
