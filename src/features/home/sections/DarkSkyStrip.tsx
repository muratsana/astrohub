import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PlateFrame } from '@/components/media/PlateFrame';
import { StarField } from '@/components/media/StarField';
import { sites } from '@/features/observing-sites/data';

/**
 * KARANLIK GÖKYÜZÜ — en iyi üç gözlem noktası.
 *
 * Sıralama Bortle sınıfına göre (küçük = karanlık); eşitlikte SQM ölçümü
 * ayırt eder. Kart yerine geniş yatay levha: nokta bir "saha" olarak okunur.
 */
export function DarkSkyStrip() {
  const darkest = [...sites]
    .sort((a, b) => a.bortle - b.bortle || (b.sqm ?? 0) - (a.sqm ?? 0))
    .slice(0, 3);

  return (
    <Container className="py-12 sm:py-14">
      <SectionHeader
        title="Karanlık Gökyüzü"
        meta={`${sites.length} nokta`}
        description="Bortle sınıfı, SQM ölçümü, rakım ve kamp olanaklarıyla değerlendirilmiş gözlem noktaları."
        linkTo="/harita/gozlem-noktalari"
        linkLabel="Tüm noktalar"
      />

      <ul className="grid gap-3 md:grid-cols-3">
        {darkest.map((site) => (
          <li key={site.slug}>
            <Link
              to={`/gozlem-noktasi/${site.slug}`}
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

              <div className="px-3.5 py-3">
                <h3 className="truncate text-[15px] text-foreground transition-colors group-hover:text-primary">
                  {site.name}
                </h3>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {site.region} · {site.roadAccess.toLocaleLowerCase('tr-TR')}
                </p>

                <dl className="mt-3 grid grid-cols-3 gap-px border border-border bg-border">
                  {[
                    ['SQM', site.sqm ? site.sqm.toFixed(1) : '—'],
                    ['Rakım', `${site.altitude} m`],
                    ['Güney', site.southHorizon],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface-1 px-2 py-1.5">
                      <dt className="label text-[9px]">{label}</dt>
                      <dd className="tabular mt-0.5 truncate text-[11.5px] text-cold">
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
