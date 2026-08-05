import { commonsImage } from '@/lib/commons';
import type { AstroEvent } from './types';

export const ETHEM_EVENT_SLUG = 'ethem-hoca-gokyuzu-gozlem-senligi-2026';

type EventEnrichment = Pick<AstroEvent, 'image'>;

const eventEnrichmentBySlug: Record<string, EventEnrichment> = {
  'ankara-astrofoto-atolyesi': {
    image: {
      url: commonsImage('Orion Nebula - Hubble 2006 mosaic 18000.jpg'),
      credit: 'NASA, ESA, M. Robberto (STScI/ESA)',
      licence: 'Kamu malı',
    },
  },
  'astronomi-101-webinar': {
    image: {
      url: commonsImage('Different Slant on Orion (495636660).jpg'),
      credit: 'Steve Black / Wikimedia Commons',
      licence: 'Kamu malı',
    },
  },
  'bursa-uludag-gozlem-senligi': {
    image: {
      url: commonsImage('Uludag.JPG'),
      credit: 'Julian Nyča / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'canakkale-tutulma-gozlemi': {
    image: {
      url: commonsImage('Eceabat Kilitbahir Fortress.JPG'),
      credit: 'Julian Nyča / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  [ETHEM_EVENT_SLUG]: {
    image: {
      url: commonsImage('Forest TopukluPlain CicekbabaPeak Beyagac Turkey.jpg'),
      credit: 'Arif Solak / Wikimedia Commons',
      licence: 'CC BY 3.0',
    },
  },
  'geminid-2026-erciyes': {
    image: {
      url: commonsImage('Kayseri Bürüngüz Camii ve Erciyes Dağı.jpg'),
      credit: 'Abdurrahman Çam / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'gunes-gozlemi-izmir': {
    image: {
      url: commonsImage(
        'Skylab Hydrogen-Alpha (H-Alpha) No.2 Telescope graphic (0101910).jpg'
      ),
      credit: 'NASA/MSFC / Wikimedia Commons',
      licence: 'Kamu malı',
    },
  },
  'halk-gozlemi': {
    image: {
      url: commonsImage('Maltepe Sahil Parkı Maltepe İstanbul.jpg'),
      credit: 'Makalesta2 / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'izmir-cocuk-gokyuzu-atolyesi': {
    image: {
      url: commonsImage('Izmir turkey.jpg'),
      credit: 'Wikimedia Commons',
      licence: 'Kamu malı',
    },
  },
  'karanlik-gokyuzu': {
    image: {
      url: commonsImage('Palandoken Erzurum 2009.JPG'),
      credit: 'Bjørn Christian Tørrissen / Wikimedia Commons',
      licence: 'CC BY-SA 3.0',
    },
  },
  'konya-mera-gozlem-gecesi': {
    image: {
      url: commonsImage('Lake Meke - Meke Gölü 05.JPG'),
      credit: 'Zeynel Cebeci / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'orionid-kapadokya': {
    image: {
      url: commonsImage('Castle Uçhisar in Cappadocia.jpg'),
      credit: 'Wolfgang Moroder / Wikimedia Commons',
      licence: 'CC BY-SA 3.0',
    },
  },
  'perseid-2026': {
    image: {
      url: commonsImage('TUG full site.jpg'),
      credit: 'Azizkayihan / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'trabzon-planetaryum-gecesi': {
    image: {
      url: commonsImage('Trabzon cityscape.jpg'),
      credit: 'Osman Kalkavan / Wikimedia Commons',
      licence: 'CC BY-SA 2.0',
    },
  },
  'tubitak-ulusal-gozlemevi-ziyaret': {
    image: {
      url: commonsImage('TUG full site.jpg'),
      credit: 'Azizkayihan / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
  'van-karanlik-gokyuzu-kampi': {
    image: {
      url: commonsImage('Gevaşta van gölü manzarası.jpg'),
      credit: 'Rdvncanli65 / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
};

export function enrichEvent(event: AstroEvent): AstroEvent {
  const enrichment = eventEnrichmentBySlug[event.slug];
  if (!enrichment) return event;
  return {
    ...event,
    image: event.image ?? enrichment.image,
  };
}
