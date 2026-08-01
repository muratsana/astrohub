import { Container } from '@/components/ui/Container';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  ContentCard,
  ContentCardBody,
  ContentCardMedia,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
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
        /* Kısaltıldı (§5.4): Bortle, SQM ve rakım zaten her kartın
           künyesinde yazılı — cümle onları okumadan önce sayıyordu. */
        description="Ölçülmüş en karanlık gözlem noktaları."
        linkTo="/saha"
        linkLabel="Tüm noktalar"
      />

      <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {darkest.map((site) => (
          <li key={site.slug}>
            <ContentCard to={`/saha/${site.slug}`}>
              {/* Standart oran; şerit 16:7 kullanıyordu ve altındaki
                  gözlem noktası kartlarıyla farklı yükseklikte çıkıyordu. */}
              <ContentCardMedia badge={`Bortle ${site.bortle}`}>
                <StarField
                  seed={site.slug}
                  tint="150,185,235"
                  density={site.bortle <= 2 ? 1.6 : site.bortle <= 3 ? 1.2 : 0.8}
                />
              </ContentCardMedia>

              <ContentCardBody className="px-3 py-2.5">
                <ContentCardTitle className="font-normal">
                  {site.name}
                </ContentCardTitle>
                <ContentCardMeta className="mt-0.5">
                  {site.region} · {site.roadAccess.toLocaleLowerCase('tr-TR')}
                </ContentCardMeta>

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
              </ContentCardBody>
            </ContentCard>
          </li>
        ))}
      </ul>
    </Container>
  );
}
