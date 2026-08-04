import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input, Select } from '@/components/ui/Input';
import { CardGrid } from '@/components/ui/CardGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { Link } from 'react-router';
import { clubKindLabels } from './data';
import { citiesOf, useClubs } from './clubsSource';
import { ClubCard } from './ClubCard';
import { useExplorer } from '@/features/explorer/useExplorer';
import { clubsSpec } from './clubsSpec';
import { cityPathForName } from '@/features/city/routes';
import { cities as turkeyCities } from '@/features/location/cities';

/**
 * KULÜPLER VE TOPLULUKLAR (§8.11, §14.7).
 *
 * Listede iki filtre öne çıkıyor: **halka açık etkinlik** ve **ortak
 * ekipman**. Bu ikisi, "bu topluluğa katılabilir miyim, teleskobum yoksa
 * ne olacak" sorusunun cevabı — yeni başlayan biri için tür ya da kuruluş
 * yılından çok daha belirleyici.
 *
 * Kayıtlar EDİTORYAL ve artık veritabanından geliyor (`0067`): bir
 * telefonu düzeltmek ya da kapanmış bir kulübü dizinden çıkarmak dağıtım
 * gerektirmiyor. "Doğrulanmış" rozeti kulübün kendisinin teyit edildiğini
 * söylüyor; bilginin tazeliği ayrı bir alan ve profilde yazılı.
 */
export function ClubsPage() {
  const [view, setView] = useViewMode('topluluklar');
  const { clubs } = useClubs();

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfa kendi `useState` filtresini
   * bıraktı: durum artık URL'de, yani filtrelenmiş liste paylaşılabiliyor,
   * geri düğmesi filtreyi geri alıyor ve arama ASCII katlıyor —
   * "nevsehir" yazan kullanıcı "Nevşehir"i bulabiliyor.
   */
  const ex = useExplorer(clubs, clubsSpec);
  const result = ex.items;
  const countedCities = useMemo(() => citiesOf(clubs), [clubs]);
  const cityCounts = useMemo(
    () => new Map(countedCities.map(({ city, count }) => [city, count])),
    [countedCities]
  );

  /** Evet/hayır filtresi tek değerli bir facet. */
  const acik = (param: string) => (ex.query.facets[param]?.length ?? 0) > 0;
  const cevir = (param: string) => ex.toggleFacet(param, 'evet');

  return (
    <>
      <PageMeta
        title="Astronomi Kulüpleri ve Dernekleri"
        description="Türkiye'deki astronomi dernekleri, üniversite kulüpleri ve gözlem grupları: halka açık etkinlik yapanlar, ortak ekipman sunanlar ve düzenli programları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Topluluklar', path: '/topluluklar' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Kulüpler ve Topluluklar"
          description="Dernekler, üniversite kulüpleri ve gözlem grupları. Teleskobunuz yoksa da katılabileceğiniz topluluklar için “ortak ekipman” filtresini açın."
        />

        <ModuleToolbar
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{ current: ex.total, total: clubs.length, noun: 'topluluk' }}
          sort={{
            id: 'club-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: clubsSpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
        >
          <FilterCell label="Ara" htmlFor="club-search" className="lg:col-span-2">
            <Input
              id="club-search"
              type="search"
              placeholder="Topluluk adı, şehir veya faaliyet"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell label="Tür" htmlFor="club-kind">
            <Select
              id="club-kind"
              value={ex.query.facets.tur?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.tur?.[0];
                if (mevcut) ex.toggleFacet('tur', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('tur', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {Object.entries(clubKindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </FilterCell>
          <FilterCell label="Şehir" htmlFor="club-city">
            <Select
              id="club-city"
              value={ex.query.facets.sehir?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.sehir?.[0];
                if (mevcut) ex.toggleFacet('sehir', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('sehir', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm şehirler</option>
              {turkeyCities.map((city) => (
                <option key={city.id} value={city.name}>
                  {city.name} ({cityCounts.get(city.name) ?? 0})
                </option>
              ))}
            </Select>
          </FilterCell>
          <FilterToggle
            id="club-public"
            label="Halka açık etkinlik"
            checked={acik('halka-acik')}
            onChange={() => cevir('halka-acik')}
          />
          <FilterToggle
            id="club-equipment"
            label="Ortak ekipman"
            checked={acik('ortak-ekipman')}
            onChange={() => cevir('ortak-ekipman')}
          />
          <FilterToggle
            id="club-verified"
            label="Yalnızca doğrulanmış"
            checked={acik('dogrulanmis')}
            onChange={() => cevir('dogrulanmis')}
          />
        </ModuleToolbar>

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen topluluk yok"
            hint="Filtreleri gevşetmeyi deneyin. Listede olmayan bir topluluk biliyorsanız etkinlik bildirimi üzerinden iletebilirsiniz."
          />
        ) : (
          <CardGrid view={view}>
            {result.map((club) => (
              <li key={club.slug}>
                <ClubCard club={club} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}

        {/*
          ŞEHİR BAZLI KEŞİF (§14.7).

          AYRI BİR `/topluluklar/{sehir}` AİLESİ AÇILMADI. Sitede zaten
          `/{sehir}-astronomi-etkinlikleri` sayfaları var (§20) ve aranan
          sorgu ("ankara astronomi") ikisini de hedefliyor. İkinci bir
          şehir sayfası ailesi, aynı niyet için birbiriyle yarışan iki
          adres üretirdi; fazın açılış kuralı çakışan modülleri
          BİRLEŞTİRMEK. Kulüpler o sayfalara bir bölüm olarak eklendi.

          Sayfası olmayan şehir (ör. Nevşehir) süzgece gidiyor — olmayan
          bir adrese bağlantı vermektense filtrelenmiş dizin doğru cevap.
        */}
        {countedCities.length > 1 && (
          <nav aria-label="Şehre göre topluluklar" className="mt-8">
            <h2 className="type-section">Şehre göre</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {countedCities.map(({ city, count }) => (
                <li key={city}>
                  <Link
                    to={
                      cityPathForName(city) ??
                      `/topluluklar?sehir=${encodeURIComponent(city)}`
                    }
                    className="inline-flex items-baseline gap-1.5 rounded-md border border-border px-2.5 py-1 text-meta text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {city}
                    <span className="tabular text-faint">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="mt-6 text-center text-meta leading-relaxed text-faint">
          Kayıtlar kurumların kendi duyurularından derlenmiştir; kaynağı ve son
          güncellik kontrolü her profilde yazılıdır. “Doğrulanmış” rozeti, kulüp
          yöneticisiyle iletişim kurulup kaydın teyit edildiği anlamına gelir —
          bilginin bugün de güncel olduğu anlamına gelmez.
        </p>
      </Container>
    </>
  );
}
