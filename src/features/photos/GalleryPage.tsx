import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterBar,
  FilterCell,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { availableCities } from './filtering';
import { useExplorer } from '@/features/explorer/useExplorer';
import { gallerySpec } from './gallerySpec';
import { type ProcessingPalette } from './types';
import { photoFamilies, familyOrder } from './families';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { cn } from '@/lib/cn';

const paletteOptions: (ProcessingPalette | 'hepsi')[] = [
  'hepsi',
  'RGB',
  'LRGB',
  'SHO',
  'HOO',
  'Mono',
];

/**
 * FOTOĞRAF GALERİSİ — terminal dilinde.
 *
 * Tür filtresi artık aile bazında (Derin Uzay, Güneş Sistemi, Takımyıldız,
 * Gece Manzarası) — yedi ince türü gözle taramak yerine dört renkli rozet.
 * Izgara ve liste görünümü arasında geçiş yapılabilir; seçim saklanır.
 */
export function GalleryPage() {
  const [view, setView] = useViewMode('galeri');

  const catalog = usePhotoCatalog();
  const photos = catalog.items;

  /*
   * ORTAK DATA EXPLORER (Faz 4).
   *
   * Galeri kendi `useState` filtre durumunu taşıyordu: liste
   * paylaşılamıyor, geri düğmesi filtreyi geri almıyor, yenilemede
   * seçim uçuyordu. Artık durum URL'de ve motor bütün liste
   * sayfalarıyla ortak.
   *
   * ARAMADA BİR DAVRANIŞ DEĞİŞTİ: eski galeri araması yalnızca küçük
   * harfe çeviriyordu, yani "cankiri" yazan kullanıcı "Çankırı"yı
   * bulamıyordu. Ortak motor ASCII de katlıyor.
   */
  const ex = useExplorer(photos, gallerySpec);
  const cities = useMemo(() => availableCities(photos), [photos]);
  const family = ex.query.facets.aile?.[0] ?? 'hepsi';
  const result = ex.items;

  return (
    <>
      <PageMeta
        title="Fotoğraf Galerisi"
        description="Türkiye'den astrofotoğraflar — hedef, ekipman, filtre ve lokasyon verisiyle birlikte. Derin uzay, Güneş sistemi, takımyıldız ve gece manzarası kayıtları."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Galeri', path: '/galeri' },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Fotoğraf Galerisi"
          description="Topluluğun astrofotoğraf arşivi. Her kayıt hedefi, setup'ı, filtresi ve gökyüzü koşullarıyla birlikte saklanır."
          actions={
            <ButtonLink to="/galeri/yukle" size="sm">
              Fotoğraf Yükle
            </ButtonLink>
          }
        />

        {/* Tür aileleri — renkli rozetlerle filtre */}
        <div
          role="tablist"
          aria-label="Çekim türü"
          className="mb-4 flex flex-wrap items-center gap-1.5"
        >
          <button
            role="tab"
            aria-selected={family === 'hepsi'}
            onClick={() => {
              /* Tek seçim davranışı korunuyor: aile sekmeleri bir sekme
                 şeridi, çoklu seçim listesi değil. */
              if (family !== 'hepsi') ex.toggleFacet('aile', family);
            }}
            className={cn(
              'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
              family === 'hepsi'
                ? 'border-foreground/40 bg-surface-2 text-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
            )}
          >
            Tümü
          </button>

          {familyOrder.map((key) => {
            const info = photoFamilies[key];
            const active = family === key;
            return (
              <button
                key={key}
                role="tab"
                aria-selected={active}
                title={info.description}
                onClick={() => {
                  if (family !== 'hepsi') ex.toggleFacet('aile', family);
                  if (family !== key) ex.toggleFacet('aile', key);
                }}
                className={cn(
                  'rounded-card border px-2.5 py-1 text-meta tracking-[0.03em] transition-colors',
                  active
                    ? info.className
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        {/* Filtre paneli */}
        <FilterBar>
          <FilterCell label="Ara" htmlFor="gallery-search" className="lg:col-span-2">
            <Input
              id="gallery-search"
              type="search"
              placeholder="Hedef, katalog (M31, NGC 7000) veya kullanıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell label="Palet" htmlFor="f-palette">
            <Select
              id="f-palette"
              value={ex.query.facets.palet?.[0] ?? 'hepsi'}
              onChange={(e) => {
                const mevcut = ex.query.facets.palet?.[0];
                if (mevcut) ex.toggleFacet('palet', mevcut);
                if (e.target.value !== 'hepsi') {
                  ex.toggleFacet('palet', e.target.value);
                }
              }}
              className={filterControlClass}
            >
              {paletteOptions.map((p) => (
                <option key={p} value={p}>
                  {p === 'hepsi' ? 'Tüm paletler' : p}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell label="Şehir" htmlFor="f-city">
            <Select
              id="f-city"
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
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterCell>
        </FilterBar>

        <CatalogSourceNote selection={catalog} />

        <ToolBar
          left={
            <ResultCount current={ex.total} total={photos.length} noun="fotoğraf" />
          }
          sort={{
            id: 'f-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            /* Seçenekler tanımdan geliyor: burada elle sayılsaydı yeni
               bir sıralama eklenince listede görünmezdi. */
            options: gallerySpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen kayıt yok"
            hint="Filtreleri gevşetmeyi ya da katalog kodunu boşluksuz yazmayı deneyin (M31)."
          />
        ) : (
          /*
            Yoğunluk `tight` değil `default`: galeri 5 kolonda 261px'lik
            karolar çiziyordu, haber/etkinlik/yazı ise 4 kolonda 329px.
            Sayfadan sayfaya geçen kullanıcı için bu, aynı sitenin iki
            ayrı ızgarası gibi okunuyordu. `tight` küçük veri karoları
            için duruyor (hedef kataloğu); fotoğraf bir veri karosu değil,
            asıl içerik — geniş olması hem tutarlı hem doğru.
          */
          <CardGrid view={view}>
            {result.map((photo) => (
              <li key={photo.slug}>
                <PhotoCard photo={photo} variant={view} />
              </li>
            ))}
          </CardGrid>
        )}
      </Container>
    </>
  );
}
