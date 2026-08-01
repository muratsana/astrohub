import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge } from '@/components/ui/Badge';
import {
  ContentCard,
  ContentCardMeta,
  ContentCardTitle,
} from '@/components/ui/ContentCard';
import { Input, Select } from '@/components/ui/Input';
import { CardGrid } from '@/components/ui/CardGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { useViewMode } from '@/components/ui/useViewMode';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { clubs, clubKindLabels, type AstronomyClub } from './data';
import { useExplorer } from '@/features/explorer/useExplorer';
import { clubsSpec } from './clubsSpec';
import { cn } from '@/lib/cn';

/**
 * KULÜPLER VE TOPLULUKLAR (§8.11).
 *
 * Listede iki filtre öne çıkıyor: **halka açık etkinlik** ve **ortak
 * ekipman**. Bu ikisi, "bu topluluğa katılabilir miyim, teleskobum yoksa
 * ne olacak" sorusunun cevabı — yeni başlayan biri için tür ya da kuruluş
 * yılından çok daha belirleyici.
 *
 * Kayıtlar editoryaldir; kurumun kendi profilini devralması hesap sistemiyle
 * gelecek. Sayfa bunu gizlemiyor, altında yazıyor.
 */
export function ClubsPage() {
  const [view, setView] = useViewMode('topluluklar');

  /*
   * ORTAK DATA EXPLORER (Faz 4). Sayfa kendi `useState` filtresini
   * bıraktı: durum artık URL'de, yani filtrelenmiş liste paylaşılabiliyor,
   * geri düğmesi filtreyi geri alıyor ve arama ASCII katlıyor —
   * "nevsehir" yazan kullanıcı "Nevşehir"i bulabiliyor.
   */
  const ex = useExplorer(clubs, clubsSpec);
  const result = ex.items;

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

        <FilterBar>
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
        </FilterBar>

        <ToolBar
          left={
            <ResultCount current={ex.total} total={clubs.length} noun="topluluk" />
          }
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
        />

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

        <p className="mt-6 text-center text-meta leading-relaxed text-faint">
          Kayıtlar kurumların kendi duyurularından derlenmiştir ve doğrulama
          tarihi her profilde yazılıdır. Kurumların kendi profillerini
          devralması hesap sistemiyle birlikte açılacak (§8.11).
        </p>
      </Container>
    </>
  );
}

function ClubCard({
  club,
  variant,
}: {
  club: AstronomyClub;
  variant: 'grid' | 'list';
}) {
  const badges = (
    <div className="flex flex-wrap gap-1">
      <Badge tone="primary">{clubKindLabels[club.kind]}</Badge>
      {club.publicEvents && <Badge tone="success">Halka açık</Badge>}
      {club.sharedEquipment && <Badge tone="cold">Ortak ekipman</Badge>}
    </div>
  );

  return (
    <ContentCard
      to={`/topluluk/${club.slug}`}
      className={cn(
        'p-3',
        variant === 'list' && 'sm:flex-row sm:items-center sm:gap-3'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <ContentCardTitle lines={2} className="font-medium leading-snug">
            {club.name}
          </ContentCardTitle>
          <span className="label">{club.city}</span>
        </div>

        {variant === 'grid' && (
          <p className="mt-1.5 line-clamp-3 text-body-sm leading-relaxed text-muted-foreground">
            {club.summary}
          </p>
        )}

        <ContentCardMeta className="mt-1.5 text-faint">
          {club.foundedYear ? `${club.foundedYear} kuruluş` : 'kuruluş bilinmiyor'}
          {club.memberCount ? ` · ${club.memberCount} üye` : ''}
        </ContentCardMeta>
      </div>

      <div className={cn('mt-2', variant === 'list' && 'sm:mt-0 sm:shrink-0')}>
        {badges}
      </div>
    </ContentCard>
  );
}
