import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel } from '@/components/ui/Panel';
import { Readout } from '@/components/ui/Readout';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import { ButtonLink } from '@/components/ui/Button';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { useLocationContext } from '@/features/location/LocationContext';
import { LightPollutionMap } from './LightPollutionMap';
import { useSiteCatalog } from '@/services/content/sites';
import { haversineKm, formatDistance } from '@/domain/geography/distance';
import {
  bortleScale,
  typicalSqm,
  compareSky,
  clampBortle,
  type BortleClass,
} from '@/domain/astronomy/skyQuality';
import { cn } from '@/lib/cn';

/**
 * IŞIK KİRLİLİĞİ (§14.1) — harita + karşılaştırma.
 *
 * İKİ AYRI KAYNAK, BİLİNÇLİ OLARAK YAN YANA:
 *
 *   1. Üstte **harita** — VIIRS uydu ölçümlerinden türetilmiş açık ışık
 *      kirliliği katmanı (D. J. Lorenz), kendi döşeme haritamızda.
 *      Kestirimdir: bölgesel bir eğilim gösterir, bir yerin o geceki
 *      gökyüzünü ölçmez.
 *   2. Altta **karşılaştırma** — kendi gözlem noktası kayıtlarımızın
 *      SQM/Bortle ölçümleri. Kullanıcının asıl sorusu haritada bir renge
 *      bakmak değil: "şehirden şu sahaya gitmek neyi değiştirir?"
 *
 * İkisi birbirini doğrulamaz ve sayfa bunu saklamıyor: haritadaki renk
 * uydu kestirimi, alttaki sayı yerde yapılmış ölçüm. Karıştırılırsa
 * kullanıcı ölçüme sahip olmadığı bir kesinlik atfeder.
 */
export function LightPollutionPage() {
  const { location } = useLocationContext();
  const catalog = useSiteCatalog();
  const [bortle, setBortle] = useState<BortleClass>(() =>
    clampBortle(location.bortle ?? 8)
  );

  const homeSqm = typicalSqm(bortle);

  const ranked = useMemo(
    () =>
      catalog.items
        .map((site) => {
          const siteSqm = site.sqm ?? typicalSqm(clampBortle(site.bortle));
          return {
            site,
            siteSqm,
            measured: site.sqm !== undefined,
            distanceKm: haversineKm(location, site.coords),
            comparison: compareSky(siteSqm, homeSqm),
          };
        })
        .sort((a, b) => b.comparison.ratio - a.comparison.ratio),
    [catalog.items, homeSqm, location]
  );

  const best = ranked[0];

  return (
    <>
      <PageMeta
        title="Karanlık Gökyüzü Karşılaştırması"
        description="Bulunduğunuz şehirle Türkiye'deki gözlem noktaları arasındaki gökyüzü kalitesi farkı: SQM ölçümleri, Bortle sınıfları ve aynı sonuç için gereken süre kazancı."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Araçlar', path: '/araclar' },
          { name: 'Işık Kirliliği', path: '/araclar/isik-kirliligi' },
        ])}
      />

      <LightPollutionMap />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Araçlar', to: '/araclar' },
            { label: 'Işık Kirliliği' },
          ]}
          title="Karanlık Gökyüzü Karşılaştırması"
          description="Bulunduğunuz yerin gökyüzüyle kayıtlı gözlem noktalarımızı karşılaştırır: fon parlaklığı kaç kat sönük, aynı sonuç için gereken süre ne kadar kısalır."
          meta={location.label}
        />

        <p className="mb-4 rounded-card border border-cold/35 bg-surface-1 px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
          <span className="text-foreground">Aşağıdaki sayılar haritadan
          gelmiyor.</span>{' '}
          Üstteki harita uydu kestirimidir (VIIRS ölçümlerinden
          türetilmiş açık veri). Buradaki değerler ise kendi gözlem noktası
          kayıtlarımızdan ve Bortle ölçeğinin yerleşik SQM
          karşılıklarından gelir; yerde ölçülmüş olanlar ayrıca
          işaretlidir. İki kaynağı karıştırmamak gerekir — kestirim bir
          bölgeyi, ölçüm tek bir noktayı anlatır.
        </p>

        <div className="mb-4 grid gap-px border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface-1 px-3 pb-1 pt-1.5">
            <label htmlFor="home-bortle" className="label block">
              Bulunduğunuz yerin Bortle sınıfı
            </label>
            <Select
              id="home-bortle"
              value={bortle}
              onChange={(e) => setBortle(clampBortle(Number(e.target.value)))}
              className="h-8 border-0 bg-transparent px-0 text-[12px] focus:bg-transparent"
            >
              {Object.values(bortleScale).map((info) => (
                <option key={info.bortle} value={info.bortle}>
                  Bortle {info.bortle} — {info.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="bg-surface-1 px-3 py-2.5">
            <p className="label">Karşılık gelen SQM</p>
            <p className="tabular mt-0.5 text-[13px] text-cold">
              ≈ {homeSqm.toFixed(2)} mag/arcsec²
            </p>
          </div>
        </div>

        {best && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Readout
              label="En karanlık kayıt"
              value={best.siteSqm.toFixed(2)}
              unit="SQM"
              hint={best.site.name}
            />
            <Readout
              label="Fon farkı"
              value={`${best.comparison.ratio.toFixed(1)}×`}
              hint="daha sönük gökyüzü"
              tone="cold"
            />
            <Readout
              label="Süre kazancı"
              value={`${best.comparison.timeAdvantage.toFixed(1)}×`}
              hint="üst sınır"
            />
            <Readout
              label="Mesafe"
              value={formatDistance(best.distanceKm)}
              hint={best.site.region}
              tone="muted"
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <Panel title="Gözlem noktaları" status={`${ranked.length} kayıt`}>
            <ul>
              {ranked.map(({ site, siteSqm, measured, distanceKm, comparison }) => (
                <li key={site.slug} className="border-b border-border py-3 first:pt-0 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link
                      to={`/saha/${site.slug}`}
                      className="text-[13px] font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {site.name}
                    </Link>
                    <span className="tabular text-[11px] text-muted-foreground">
                      {formatDistance(distanceKm)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge tone="cold">Bortle {site.bortle}</Badge>
                    <Badge tone={measured ? 'success' : 'muted'}>
                      {measured
                        ? `SQM ${siteSqm.toFixed(2)} (ölçüm)`
                        : `SQM ≈ ${siteSqm.toFixed(2)} (sınıftan)`}
                    </Badge>
                    <Badge>{site.altitude} m</Badge>
                  </div>

                  <p
                    className={cn(
                      'mt-1.5 text-[11.5px] leading-relaxed',
                      comparison.ratio >= 2 ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {comparison.summary}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-3 text-[10px] leading-snug text-faint">
              Süre kazancı bir <strong>üst sınırdır</strong>: gökyüzü fonunun
              baskın gürültü kaynağı olduğu varsayılır. Okuma gürültüsü,
              karanlık akım ve seeing hesaba katılmaz; dar bant filtreyle
              çalışırken kazanç belirgin biçimde azalır.
            </p>
          </Panel>

          <div className="space-y-4">
            <Panel title="Bortle ölçeği">
              <ul>
                {Object.values(bortleScale).map((info) => (
                  <li
                    key={info.bortle}
                    className={cn(
                      'border-b border-border py-2 last:border-0',
                      info.bortle === bortle && 'border-l-2 border-l-primary pl-2'
                    )}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] font-medium text-foreground">
                        {info.bortle} · {info.label}
                      </span>
                      <span className="tabular shrink-0 text-[10.5px] text-cold">
                        {info.sqmRange[0]}–{info.sqmRange[1]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground">
                      {info.description}
                    </p>
                    <p className="tabular mt-0.5 text-[10px] text-faint">
                      Çıplak göz sınırı: {info.nakedEyeLimit}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="SQM nasıl okunur?">
              <div className="space-y-2 text-[11.5px] leading-relaxed text-muted-foreground">
                <p>
                  SQM, gökyüzü fonunun parlaklığıdır (kadir/arcsaniye²) ve{' '}
                  <span className="text-foreground">büyük değer daha karanlık</span>{' '}
                  demektir. Ölçek logaritmiktir: 2.5 kadir fark tam olarak 10
                  kat, 5 kadir 100 kat parlaklık farkıdır.
                </p>
                <p>
                  Bu yüzden Bortle 8 bir şehirden Bortle 3 bir yaylaya gitmek,
                  "biraz daha karanlık" değil, fon parlaklığında on kat
                  mertebesinde bir sıçramadır.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink to="/saha" size="sm" variant="secondary">
                  Gözlem Noktaları
                </ButtonLink>
                <ButtonLink to="/araclar/takvim" size="sm" variant="ghost">
                  Karanlık Takvimi
                </ButtonLink>
              </div>
            </Panel>
          </div>
        </div>
      </Container>
    </>
  );
}
