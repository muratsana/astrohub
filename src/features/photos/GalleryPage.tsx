import { useMemo, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
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
import {
  photoTypeLabels,
  type PhotoType,
  type ProcessingPalette,
} from './types';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';

const typeOptions: (PhotoType | 'hepsi')[] = [
  'hepsi',
  'deep-sky',
  'gezegen',
  'ay',
  'gunes',
  'genis-alan',
  'star-trail',
  'gece-manzarasi',
];

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
 * KAYIT ARŞİVİ (§7.2) — terminal dilinde galeri.
 *
 * Filtre barı bir enstrüman paneli gibi kurulur: hairline bölmeli tek şerit,
 * her kontrol büyük harf etiketiyle. Karolarda künye her zaman görünür.
 */
export function GalleryPage() {
  const [filters, setFilters] = useState<GalleryFilters>(defaultFilters);
  const cities = useMemo(() => availableCities(photos), []);
  const result = useMemo(() => filterPhotos(photos, filters), [filters]);

  function set<K extends keyof GalleryFilters>(
    key: K,
    value: GalleryFilters[K]
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <>
      <PageMeta
        title="Kayıt Arşivi"
        description="Türkiye'den astrofotoğraflar — hedef, ekipman, filtre ve lokasyon verisiyle birlikte. Tür, palet, şehir ve entegrasyon süresine göre filtreleyin."
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Kayıtlar', path: '/galeri' },
        ])}
      />

      <Container className="py-10 sm:py-12">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-[28px] text-foreground sm:text-[34px]">
              Kayıt Arşivi
            </h1>
            <p className="mt-2.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
              Topluluğun astrofotoğraf arşivi. Her kayıt hedefi, setup'ı,
              filtresi ve gökyüzü koşullarıyla birlikte saklanır.
            </p>
          </div>
          <ButtonLink to="/galeri/yukle" className="shrink-0">
            Fotoğraf Yükle
          </ButtonLink>
        </header>

        {/* Filtre paneli */}
        <div className="mb-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
          <FilterCell label="Ara" htmlFor="gallery-search" className="lg:col-span-2">
            <Input
              id="gallery-search"
              type="search"
              placeholder="Hedef, katalog (M31, NGC 7000) veya kullanıcı"
              value={filters.search}
              onChange={(e) => set('search', e.target.value)}
              className="h-9 border-0 bg-transparent px-0 focus:bg-transparent"
            />
          </FilterCell>

          <FilterCell label="Tür" htmlFor="f-type">
            <Select
              id="f-type"
              value={filters.type}
              onChange={(e) =>
                set('type', e.target.value as GalleryFilters['type'])
              }
              className="h-9 border-0 bg-transparent px-0 focus:bg-transparent"
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t === 'hepsi' ? 'Tüm türler' : photoTypeLabels[t]}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell label="Palet" htmlFor="f-palette">
            <Select
              id="f-palette"
              value={filters.palette}
              onChange={(e) =>
                set('palette', e.target.value as GalleryFilters['palette'])
              }
              className="h-9 border-0 bg-transparent px-0 focus:bg-transparent"
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
              className="h-9 border-0 bg-transparent px-0 focus:bg-transparent"
            >
              <option value="hepsi">Tüm şehirler</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell label="Sırala" htmlFor="f-sort">
            <Select
              id="f-sort"
              value={filters.sort}
              onChange={(e) =>
                set('sort', e.target.value as GalleryFilters['sort'])
              }
              className="h-9 border-0 bg-transparent px-0 focus:bg-transparent"
            >
              <option value="yeni">En yeni</option>
              <option value="populer">Popüler</option>
              <option value="editor">Editör seçimi</option>
              <option value="yorum">En çok yorumlanan</option>
            </Select>
          </FilterCell>
        </div>

        <p
          className="tabular label mb-4"
          role="status"
          aria-live="polite"
        >
          {result.length} / {photos.length} kayıt
        </p>

        {result.length === 0 ? (
          <p className="border border-border bg-surface-1 px-4 py-16 text-center text-[12px] text-muted-foreground">
            Bu filtrelerle eşleşen kayıt yok. Filtreleri gevşetmeyi ya da
            katalog kodunu boşluksuz yazmayı deneyin (M31).
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {result.map((photo) => (
              <li key={photo.slug}>
                <PhotoTile
                  to={`/fotograf/${photo.slug}`}
                  seed={photo.slug}
                  tint={tintForPhoto(photo.target.catalog)}
                  target={photo.target.catalog}
                  title={photo.title}
                  palette={photo.palette}
                  integration={formatIntegration(photoIntegrationSeconds(photo))}
                  bortle={photo.location.bortle}
                  username={photo.user.username}
                  badge={photo.editorsPick ? 'Editör' : undefined}
                />
              </li>
            ))}
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
    <div className={`bg-surface-1 px-3 pb-1 pt-2 ${className ?? ''}`}>
      <label htmlFor={htmlFor} className="label block">
        {label}
      </label>
      {children}
    </div>
  );
}
