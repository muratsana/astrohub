import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { useSiteCatalog } from '@/services/content/sites';

/**
 * KARANLIK GÖKYÜZÜ — en iyi üç gözlem noktası.
 *
 * Sıralama Bortle sınıfına göre (küçük = karanlık); eşitlikte SQM ölçümü
 * ayırt eder. Kart yerine geniş yatay levha: nokta bir "saha" olarak okunur.
 */
export function DarkSkyStrip() {
  const catalog = useSiteCatalog();
  const darkest = [...catalog.items]
    .sort((a, b) => a.bortle - b.bortle || (b.sqm ?? 0) - (a.sqm ?? 0))
    .slice(0, 4);

  return (
    <Container className="py-9 sm:py-11">
      <SectionHeader
        title="Karanlık Gökyüzü"
        meta={`${catalog.items.length} nokta`}
        description="Bortle sınıfı, SQM ölçümü, rakım ve kamp olanaklarıyla değerlendirilmiş gözlem noktaları."
        linkTo="/saha"
        linkLabel="Tüm noktalar"
      />

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {darkest.map((site) => (
          <li key={site.slug}>
            <Link
              to={`/saha/${site.slug}`}
              className="group block rounded-card border border-border bg-surface-1 transition-colors hover:border-border-strong"
            >
              <PlateFrame
                ratio="aspect-[16/7]"
                className="border-0 border-b border-border"
                badge={`Bortle ${site.bortle}`}
              >
                <StarField
                  seed={site.slug}
                  tint="150,185,235"
                  density={site.bortle <= 2 ? 1.6 : site.bortle <= 3 ? 1.2 : 0.8}
                />
              </PlateFrame>

              <div className="px-3 py-2.5">
                <h3 className="truncate text-[13px] text-foreground transition-colors group-hover:text-primary">
                  {site.name}
                </h3>
                <p className="mt-0.5 text-meta text-muted-foreground">
                  {site.region} · {site.roadAccess.toLocaleLowerCase('tr-TR')}
                </p>

                <dl className="mt-2.5 grid grid-cols-3 gap-px border border-border bg-border">
                  {[
                    ['SQM', site.sqm ? site.sqm.toFixed(1) : '—'],
                    ['Rakım', `${site.altitude} m`],
                    ['Güney', site.southHorizon],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface-1 px-1.5 py-1">
                      <dt className="label text-meta">{label}</dt>
                      <dd className="tabular mt-0.5 truncate text-meta text-cold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
