import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExternalLink } from '@/components/ExternalLink';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, absoluteUrl } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { sortByProximity, formatDistance } from '@/domain/geography/distance';
import {
  facilities,
  facilityKindLabels,
  visitingLabels,
  type FacilityKind,
} from './data';

/**
 * RASATHANELER VE PLANETARYUMLAR (§7.7).
 *
 * Sıralama **mesafeye göre**: bir planetaryumu aramanın nedeni neredeyse her
 * zaman "gidebileceğim bir yer var mı" sorusudur. Tür ya da ad sıralaması
 * bu soruya cevap vermez.
 *
 * Ziyaret durumu (randevulu / serbest / kapalı) rozet olarak öne çıkar:
 * randevu gerektiren bir rasathaneye habersiz gitmek, iki saatlik yolu boşa
 * harcamak demek.
 */
export function FacilitiesPage() {
  const { location } = useLocationContext();
  const [kind, setKind] = useState<FacilityKind | 'hepsi'>('hepsi');

  const filtered = useMemo(
    () => (kind === 'hepsi' ? facilities : facilities.filter((f) => f.kind === kind)),
    [kind]
  );

  const { located } = useMemo(
    () => sortByProximity(filtered, location, (f) => f.coords),
    [filtered, location]
  );

  const jsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Türkiye rasathane ve planetaryumları',
      numberOfItems: facilities.length,
      itemListElement: facilities.map((facility, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Place',
          name: facility.name,
          address: {
            '@type': 'PostalAddress',
            addressLocality: facility.city,
            addressCountry: 'TR',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: facility.coords.latitude,
            longitude: facility.coords.longitude,
          },
          url: absoluteUrl('/tesisler'),
        },
      })),
    }),
    []
  );

  return (
    <>
      <PageMeta
        title="Rasathaneler ve Planetaryumlar"
        description="Türkiye'deki rasathaneler, planetaryumlar ve bilim merkezleri: ziyaret koşulları, öne çıkan teçhizat ve size olan mesafeleri."
        jsonLd={[jsonLd, breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Tesisler', path: '/tesisler' },
        ])]}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Rasathaneler ve Planetaryumlar"
          description="Ziyarete açık astronomi tesisleri, size olan kuş uçuşu mesafeye göre sıralı. Randevulu tesislere habersiz gidilmez."
          meta={location.label}
        />

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="tabular label" role="status">
            {located.length} tesis
          </p>
          <div className="flex items-center gap-2">
            <label htmlFor="facility-kind" className="sr-only">
              Tür
            </label>
            <Select
              id="facility-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as FacilityKind | 'hepsi')}
              className="h-8 w-auto text-meta"
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(facilityKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {located.length === 0 ? (
          <EmptyState
            message="Bu türde kayıtlı tesis yok"
            hint="Tür filtresini genişletmeyi deneyin."
          />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2 [&>li]:h-full">
            {located.map(({ item: facility, distanceKm }) => (
              <li key={facility.slug}>
                <Panel
                  className="h-full"
                  title={facility.name}
                  status={formatDistance(distanceKm)}
                >
                  <div className="mb-2 flex flex-wrap gap-1">
                    <Badge tone="primary">
                      {facilityKindLabels[facility.kind]}
                    </Badge>
                    <Badge
                      tone={
                        facility.visiting === 'serbest'
                          ? 'success'
                          : facility.visiting === 'randevulu'
                            ? 'warning'
                            : 'muted'
                      }
                    >
                      {visitingLabels[facility.visiting]}
                    </Badge>
                  </div>

                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {facility.summary}
                  </p>

                  <ul className="mt-2.5 space-y-1.5">
                    {facility.highlights.map((highlight) => (
                      <li
                        key={highlight}
                        className="flex gap-2 text-body-sm leading-relaxed text-muted-foreground"
                      >
                        <span aria-hidden className="text-primary">
                          ·
                        </span>
                        {highlight}
                      </li>
                    ))}
                  </ul>

                  <SpecList className="mt-3">
                    <SpecRow label="Şehir" value={facility.city} />
                    {facility.altitude && (
                      <SpecRow
                        label="Rakım"
                        value={`${facility.altitude} m`}
                        tone="cold"
                      />
                    )}
                    <SpecRow
                      label="Doğrulama"
                      value={new Date(
                        facility.source.lastVerifiedAt
                      ).toLocaleDateString('tr-TR')}
                      tone="muted"
                    />
                    {facility.website && (
                      <SpecRow
                        label="Web"
                        value={
                          <ExternalLink href={facility.website} showHost>
                            Site
                          </ExternalLink>
                        }
                      />
                    )}
                  </SpecList>
                </Panel>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-meta leading-relaxed text-faint">
          Ziyaret koşulları kurumların duyurularından derlenmiştir ve
          değişebilir; yola çıkmadan önce kurumun kendi kanalını kontrol edin.
        </p>
      </Container>
    </>
  );
}
