import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoTile } from '@/components/media/PhotoTile';
import { tintFor } from '@/components/media/tints';
import { formatIntegration } from '@/domain/photography/integration';
import { targets } from '@/features/targets/data';
import { photos } from './data';
import {
  filterPhotos,
  defaultFilters,
  availableCities,
  photoIntegrationSeconds,
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

/** Fotoğrafın hedef türünü katalogdan bulup yıldız alanı tonunu seçer. */
function tintForPhoto(catalog: string): string {
  const target = targets.find(
    (t) => t.catalog === catalog || t.aliases.includes(catalog)
  );
  return tintFor(target?.kind);
}

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
        <header className="mb-5 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[26px] text-foreground sm:text-[30px]">
              Fotoğraf Galerisi
            </h1>
            <p className="mt-2 max-w-[70ch] text-[12px] leading-relaxed text-muted-foreground">
              Topluluğun astrofotoğraf arşivi. Her kayıt hedefi, setup'ı,
              filtresi ve gökyüzü koşullarıyla birlikte saklanır.
            </p>
          </div>
          <ButtonLink to="/galeri/yukle" size="sm" className="shrink-0">
            Fotoğraf Yükle
          </ButtonLink>
        </header>

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
              'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors',
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
                  'rounded-card border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] transition-colors',
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
        <div className="mb-4 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <FilterCell label="Ara" htmlFor="gallery-search" className="lg:col-span-2">
            <Input
              id="gallery-search"
              type="search"
              placeholder="Hedef, katalog (M31, NGC 7000) veya kullanıcı"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className="h-8 border-0 bg-transparent px-0 text-[12px] focus:bg-transparent"
            />
          </FilterCell>

          <FilterCell label="Palet" htmlFor="f-palette">
            <Select
              id="f-palette"
              value={filters.palette}
              onChange={(e) =>
                set('palette', e.target.value as GalleryFilters['palette'])
              }
              className="h-8 border-0 bg-transparent px-0 text-[12px] focus:bg-transparent"
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
              className="h-8 border-0 bg-transparent px-0 text-[12px] focus:bg-transparent"
            >
              <option value="hepsi">Tüm şehirler</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterCell>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="tabular label" role="status" aria-live="polite">
            {result.length} / {photos.length} fotoğraf
          </p>

          <div className="flex items-center gap-2">
            <label htmlFor="f-sort" className="label hidden sm:block">
              Sırala
            </label>
            <Select
              id="f-sort"
              value={filters.sort}
              onChange={(e) =>
                set('sort', e.target.value as GalleryFilters['sort'])
              }
              className="h-8 w-auto text-[11px]"
            >
              <option value="yeni">En yeni</option>
              <option value="populer">Popüler</option>
              <option value="editor">Editör seçimi</option>
              <option value="yorum">En çok yorumlanan</option>
            </Select>
            <ViewToggle mode={view} onChange={setView} />
          </div>
        </div>

        {result.length === 0 ? (
          <p className="border border-border bg-surface-1 px-4 py-14 text-center text-[12px] text-muted-foreground">
            Bu filtrelerle eşleşen kayıt yok. Filtreleri gevşetmeyi ya da
            katalog kodunu boşluksuz yazmayı deneyin (M31).
          </p>
        ) : (
          <ul
            className={cn(
              view === 'grid'
                ? 'grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'grid gap-2'
            )}
          >
            {result.map((photo) => {
              const info = photoFamilies[familyOf(photo.type)];
              return (
                <li key={photo.slug}>
                  <PhotoTile
                    variant={view}
                    to={`/fotograf/${photo.slug}`}
                    seed={photo.slug}
                    tint={tintForPhoto(photo.target.catalog)}
                    target={photo.target.catalog}
                    title={photo.title}
                    palette={photo.palette}
                    integration={formatIntegration(
                      photoIntegrationSeconds(photo)
                    )}
                    bortle={photo.location.bortle}
                    username={photo.user.username}
                    family={{ label: info.label, className: info.className }}
                    flag={
                      photo.editorsPick ? (
                        <Badge tone="primary" className="bg-background/85">
                          Editör
                        </Badge>
                      ) : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </>
  );
}

/** Filtre paneli hücresi: üstte büyük harf etiket, altta kontrol. */
function FilterCell({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('bg-surface-1 px-3 pb-1 pt-1.5', className)}>
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>
      {children}
    </div>
  );
}
