import { useMemo, useState } from 'react';
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
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { photos } from './data';
import {
  filterPhotos,
  defaultFilters,
  availableCities,
  type GalleryFilters,
} from './filtering';
import { type ProcessingPalette } from './types';
import { familyOf, photoFamilies, familyOrder, type PhotoFamily } from './families';
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
  const [filters, setFilters] = useState<GalleryFilters>(defaultFilters);
  const [family, setFamily] = useState<PhotoFamily | 'hepsi'>('hepsi');
  const [view, setView] = useViewMode('galeri');

  const cities = useMemo(() => availableCities(photos), []);

  const result = useMemo(() => {
    const base = filterPhotos(photos, filters);
    return family === 'hepsi'
      ? base
      : base.filter((p) => familyOf(p.type) === family);
  }, [filters, family]);

  function set<K extends keyof GalleryFilters>(
    key: K,
    value: GalleryFilters[K]
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

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
            onClick={() => setFamily('hepsi')}
            className={cn(
              'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
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
                onClick={() => setFamily(key)}
                className={cn(
                  'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
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
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell label="Palet" htmlFor="f-palette">
            <Select
              id="f-palette"
              value={filters.palette}
              onChange={(e) =>
                set('palette', e.target.value as GalleryFilters['palette'])
              }
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
              value={filters.city}
              onChange={(e) => set('city', e.target.value)}
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

        <ToolBar
          left={
            <ResultCount
              current={result.length}
              total={photos.length}
              noun="fotoğraf"
            />
          }
          sort={{
            id: 'f-sort',
            value: filters.sort,
            onChange: (v) => set('sort', v as GalleryFilters['sort']),
            options: [
              { value: 'yeni', label: 'En yeni' },
              { value: 'populer', label: 'Popüler' },
              { value: 'editor', label: 'Editör seçimi' },
              { value: 'yorum', label: 'En çok yorumlanan' },
            ],
          }}
          view={{ mode: view, onChange: setView }}
        />

        {result.length === 0 ? (
          <EmptyState
            message="Eşleşen kayıt yok"
            hint="Filtreleri gevşetmeyi ya da katalog kodunu boşluksuz yazmayı deneyin (M31)."
          />
        ) : (
          <CardGrid view={view} density="tight">
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
