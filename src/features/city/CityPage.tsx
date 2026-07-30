import { useMemo } from 'react';
import { Link, useLocation } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Readout } from '@/components/ui/Readout';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, SITE_URL } from '@/lib/seo';
import { findCity, TURKEY_TIME_ZONE } from '@/features/location/cities';
import { useEventCatalog } from '@/services/content/events';
import { eventTypeLabels } from '@/features/events/types';
import { useSiteCatalog } from '@/services/content/sites';
import { haversineKm, formatDistance } from '@/domain/geography/distance';
import { nightEntry } from '@/domain/astronomy/nightCalendar';
import { formatClock, formatDuration } from '@/domain/astronomy/ephemeris';
import { cityRouteSlug, cityIdFromPath } from './routes';

/**
 * ŞEHİR SAYFASI — "ankara astronomi etkinlikleri" (§20).
 *
 * Bu sayfa arama motoru için var: Türkiye'de astronomi araması çoğunlukla
 * şehir adıyla yapılıyor ("izmir teleskop gözlem etkinliği"). Genel etkinlik
 * listesi bu sorguya cevap veremez çünkü şehir bir filtre parametresidir,
 * indekslenebilir bir adres değil.
 *
 * SEO SAYFASI OLMASI, İÇERİĞİN ZAYIF OLMASINI GEREKTİRMEZ. Sayfada dört
 * gerçek veri kümesi birleşiyor: şehirdeki etkinlikler, yakındaki karanlık
 * gökyüzü noktaları (mesafesiyle), o şehir için bu gecenin karanlık
 * penceresi ve tipik gökyüzü kalitesi. Hiçbiri diğer sayfalardan kopyala
 * yapıştır değil; hepsi şehre göre hesaplanıyor.
 */

/** Yakın sayılacak azami mesafe — bir gecelik gidiş-dönüş sınırı. */
const NEARBY_KM = 200;

export function CityPage() {
  const { pathname } = useLocation();
  const cityId = cityIdFromPath(pathname);
  const city = cityId ? findCity(cityId) : undefined;
  const siteCatalog = useSiteCatalog();
  const eventCatalog = useEventCatalog();

  const cityEvents = useMemo(() => {
    if (!city) return [];
    return eventCatalog.items
      .filter((event) => {
        if (event.city === city.name) return true;
        if (!event.coords) return false;
        return haversineKm(city, event.coords) <= NEARBY_KM;
      })
      .map((event) => ({
        event,
        distanceKm: event.coords ? haversineKm(city, event.coords) : 0,
      }))
      .sort((a, b) => a.event.startsAt.localeCompare(b.event.startsAt));
  }, [city, eventCatalog.items]);

  const nearbySites = useMemo(() => {
    if (!city) return [];
    return siteCatalog.items
      .map((site) => ({ site, distanceKm: haversineKm(city, site.coords) }))
      .filter((entry) => entry.distanceKm <= NEARBY_KM * 1.5)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [city, siteCatalog.items]);

  const tonight = useMemo(
    () =>
      city
        ? // Şehir sayfaları yalnızca Türkiye şehirleri — gün her zaman
          // Türkiye takvimine göre seçilir, ziyaretçi nerede olursa olsun.
          nightEntry(new Date(), city.latitude, city.longitude, TURKEY_TIME_ZONE)
        : null,
    [city]
  );

  if (!city) return <NotFoundPage />;

  const path = `/${cityRouteSlug(city.id)}`;
  const title = `${city.name} Astronomi Etkinlikleri`;

  /*
   * Toplu liste yapılandırılmış verisi: arama motoruna sayfanın bir
   * etkinlik listesi olduğunu söyler. Tek tek Event nesneleri etkinlik
   * detay sayfalarında zaten var; burada onları tekrar yayımlamak
   * çoğaltma sayılabilir, bu yüzden yalnızca liste ilişkisi veriliyor.
   */
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: cityEvents.length,
    itemListElement: cityEvents.slice(0, 10).map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.event.title,
      url: SITE_URL ? `${SITE_URL}/etkinlik/${entry.event.slug}` : undefined,
    })),
  };

  return (
    <>
      <PageMeta
        title={title}
        description={`${city.name} ve çevresindeki astronomi etkinlikleri, gözlem şenlikleri ve atölyeler; yakındaki karanlık gökyüzü noktaları ve bu gecenin karanlık penceresi.`}
        canonicalPath={path}
        jsonLd={[
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Etkinlikler', path: '/etkinlikler' },
            { name: city.name, path },
          ]),
          itemListJsonLd,
        ]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Etkinlikler', to: '/etkinlikler' },
            { label: city.name },
          ]}
          title={title}
          description={`${city.name} merkezine ${NEARBY_KM} km'ye kadar olan etkinlikler ve gözlem noktaları. Karanlık penceresi ${city.name} koordinatına göre hesaplanır.`}
          actions={
            <ButtonLink to="/etkinlikler" size="sm" variant="secondary">
              Tüm Etkinlikler
            </ButtonLink>
          }
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Readout
            label="Etkinlik"
            value={cityEvents.length}
            hint={`${NEARBY_KM} km yarıçapta`}
          />
          <Readout
            label="Gözlem noktası"
            value={nearbySites.length}
            hint="yakın karanlık alan"
            tone="cold"
          />
          <Readout
            label="Bu gece karanlık"
            value={
              tonight && !tonight.night.neverDark
                ? formatDuration(tonight.night.durationMinutes)
                : '—'
            }
            hint={
              tonight && tonight.night.start
                ? `${formatClock(tonight.night.start)} başlıyor`
                : 'oluşmuyor'
            }
          />
          <Readout
            label="Şehir Bortle"
            value={city.bortle}
            unit="/9"
            hint="il merkezi tipik değeri"
            tone="muted"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Panel title="Yaklaşan etkinlikler" status={`${cityEvents.length} kayıt`}>
            {cityEvents.length === 0 ? (
              <EmptyState
                message={`${city.name} çevresinde kayıtlı etkinlik yok`}
                hint="Takvim sürekli güncelleniyor; tüm Türkiye listesine göz atabilir ya da kendi etkinliğinizi bildirebilirsiniz."
                className="border-0 py-8"
              />
            ) : (
              <ul>
                {cityEvents.map(({ event, distanceKm }) => (
                  <li key={event.slug} className="border-b border-border last:border-0">
                    <Link
                      to={`/etkinlik/${event.slug}`}
                      className="group flex items-baseline justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-foreground group-hover:text-primary">
                          {event.title}
                        </span>
                        <span className="tabular mt-0.5 block text-[10.5px] text-muted-foreground">
                          {new Date(event.startsAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}{' '}
                          · {event.venue}, {event.city}
                          {distanceKm > 0 && event.city !== city.name && (
                            <> · {formatDistance(distanceKm)}</>
                          )}
                        </span>
                      </span>
                      <span className="shrink-0">
                        <Badge>{eventTypeLabels[event.type]}</Badge>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <div className="space-y-4">
            <Panel
              title="Yakındaki gözlem noktaları"
              status={`${nearbySites.length} nokta`}
            >
              {nearbySites.length === 0 ? (
                <p className="py-4 text-[12px] text-muted-foreground">
                  Bu şehrin yakınında kayıtlı gözlem noktası yok. Bildiğiniz bir
                  nokta varsa saha modülünden ekleyebilirsiniz.
                </p>
              ) : (
                <ul>
                  {nearbySites.map(({ site, distanceKm }) => (
                    <li key={site.slug} className="border-b border-border last:border-0">
                      <Link
                        to={`/saha/${site.slug}`}
                        className="group flex items-baseline justify-between gap-3 py-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[12.5px] text-foreground group-hover:text-primary">
                            {site.name}
                          </span>
                          <span className="tabular mt-0.5 block text-[10.5px] text-muted-foreground">
                            Bortle {site.bortle} · {site.altitude} m ·{' '}
                            {site.roadAccess}
                          </span>
                        </span>
                        <span className="tabular shrink-0 text-[11.5px] text-cold">
                          {formatDistance(distanceKm)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {tonight && (
              <Panel title={`${city.name} — bu gece`}>
                <dl className="space-y-1.5 text-[11.5px]">
                  <Row
                    label="Astronomik karanlık"
                    value={
                      tonight.night.neverDark
                        ? 'bu gece oluşmuyor'
                        : `${formatClock(tonight.night.start)} – ${formatClock(tonight.night.end)}`
                    }
                  />
                  <Row
                    label="Aysız karanlık"
                    value={formatDuration(tonight.moonlessMinutes)}
                  />
                  <Row
                    label="Ay"
                    value={`%${Math.round(tonight.moon.illumination * 100)} · ${tonight.moon.name.toLocaleLowerCase('tr-TR')}`}
                  />
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ButtonLink to="/bu-gece" size="sm" variant="secondary">
                    Bu Gece
                  </ButtonLink>
                  <ButtonLink to="/araclar/takvim" size="sm" variant="ghost">
                    Karanlık Takvimi
                  </ButtonLink>
                </div>
                <p className="mt-2 text-[10px] leading-snug text-faint">
                  Hesap {city.name} il merkezi koordinatına göredir; şehir
                  dışına çıktığınızda saatler birkaç dakika kayar.
                </p>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-1.5 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className="tabular text-right text-muted-foreground">{value}</dd>
    </div>
  );
}
