/**
 * SEO yardımcıları (§16.2) — bileşen içermez, böylece hem sayfalar hem de
 * testler React'e bağlanmadan kullanabilir.
 *
 * Mutlak URL üretimi `VITE_SITE_URL` ortam değişkenine bağlıdır; değişken
 * tanımlı değilse mutlak adres üretilmez — yanlış bir alan adı basmak,
 * etiketi hiç basmamaktan daha zararlıdır.
 */

export const SITE_NAME = 'Astrohub';

export const SITE_URL = import.meta.env.VITE_SITE_URL?.trim().replace(
  /\/$/,
  ''
);

/** Mutlak URL üretir; site adresi tanımlı değilse göreli yolu döner. */
export function absoluteUrl(path: string): string {
  return SITE_URL ? `${SITE_URL}${path}` : path;
}

/** BreadcrumbList yapılandırılmış verisi (§16.2). */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Organization yapılandırılmış verisi — ana sayfada kullanılır (§16.2). */
export const organizationJsonLd: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  description:
    "Türkiye'nin astronomi, astrofotoğrafçılık, gözlem etkinlikleri, karanlık gökyüzü ve astrocamping platformu.",
  ...(SITE_URL ? { url: SITE_URL } : {}),
};

/** Etkinlik yapılandırılmış verisi (§16.2 Event). */
export function eventJsonLd(event: {
  title: string;
  path: string;
  description: string;
  startsAt: string;
  endsAt?: string;
  venue: string;
  city: string;
  free: boolean;
  organizer: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    ...(event.endsAt ? { endDate: event.endsAt } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    url: absoluteUrl(event.path),
    location: {
      '@type': 'Place',
      name: event.venue,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.city,
        addressCountry: 'TR',
      },
    },
    organizer: { '@type': 'Organization', name: event.organizer },
    ...(event.free
      ? {
          offers: {
            '@type': 'Offer',
            price: 0,
            priceCurrency: 'TRY',
            availability: 'https://schema.org/InStock',
            url: absoluteUrl(event.path),
          },
        }
      : {}),
  };
}

/** Gözlem noktası yapılandırılmış verisi (§16.2 Place). */
export function placeJsonLd(place: {
  name: string;
  path: string;
  description: string;
  region: string;
  altitude: number;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: place.name,
    description: place.description,
    url: absoluteUrl(place.path),
    address: {
      '@type': 'PostalAddress',
      addressLocality: place.region,
      addressCountry: 'TR',
    },
    elevation: `${place.altitude} m`,
  };
}

/**
 * Fotoğraf yapılandırılmış verisi (§16.2 ImageObject).
 * `contentUrl` bilerek verilmez: orijinal dosya herkese açık değildir (§10.4);
 * görsel pipeline'ı bağlandığında türev varyantın CDN adresi eklenecektir.
 */
export function photoJsonLd(photo: {
  title: string;
  path: string;
  description: string;
  author: string;
  capturedAt: string;
  license: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    name: photo.title,
    description: photo.description,
    url: absoluteUrl(photo.path),
    creator: { '@type': 'Person', name: photo.author },
    dateCreated: photo.capturedAt,
    license: photo.license,
  };
}

// §16.2 ayrıca Article/VideoObject istiyor; eğitim içeriği detay sayfası
// (Faz 1.8) yayına alındığında buraya `articleJsonLd` eklenecek. Tüketicisi
// olmayan yardımcı şimdiden yazılmadı.
