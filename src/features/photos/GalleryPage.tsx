import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { SparkleIcon } from '@/components/ui/icons';
import { formatIntegration } from '@/domain/photography/integration';
import { photos } from './data';
import {
  filterPhotos,
  defaultFilters,
  availableCities,
  photoIntegrationSeconds,
  type GalleryFilters,
} from './filtering';
import { photoTypeLabels, type PhotoType, type ProcessingPalette } from './types';
import type { AstroPhoto } from './types';

const selectClass =
  'h-10 rounded-xl border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60';

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

/**
 * Astrofotoğraf galerisi (§7.2): başlık + arama + yükleme CTA'sı, filtre
 * barı ve geniş görsel kartlar. Kart üzerinde ekipman kalabalığı yok.
 */
export function GalleryPage() {
  const [filters, setFilters] = useState<GalleryFilters>(defaultFilters);
  const cities = useMemo(() => availableCities(photos), []);
  const result = useMemo(() => filterPhotos(photos, filters), [filters]);

  function set<K extends keyof GalleryFilters>(key: K, value: GalleryFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <Container className="py-10 sm:py-14">
      {/* Üst alan (§7.2) */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Fotoğraflar
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Topluluğun astrofotoğraf arşivi — her karede hedef, setup ve çekim
            verisiyle birlikte.
          </p>
        </div>
        <ButtonLink to="/fotograflar/yukle" className="shrink-0">
          Fotoğraf Yükle
        </ButtonLink>
      </header>

      {/* Filtre barı */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface-1 p-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="gallery-search" className="sr-only">
            Fotoğraf ara
          </label>
          <Input
            id="gallery-search"
            type="search"
            placeholder="Hedef, katalog (M 31, NGC…) veya kullanıcı ara"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            className="h-10"
          />
        </div>

        <label className="sr-only" htmlFor="f-type">
          Fotoğraf türü
        </label>
        <select
          id="f-type"
          className={selectClass}
          value={filters.type}
          onChange={(e) => set('type', e.target.value as GalleryFilters['type'])}
        >
          {typeOptions.map((t) => (
            <option key={t} value={t}>
              {t === 'hepsi' ? 'Tüm türler' : photoTypeLabels[t]}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-palette">
          İşleme paleti
        </label>
        <select
          id="f-palette"
          className={selectClass}
          value={filters.palette}
          onChange={(e) =>
            set('palette', e.target.value as GalleryFilters['palette'])
          }
        >
          {paletteOptions.map((p) => (
            <option key={p} value={p}>
              {p === 'hepsi' ? 'Tüm paletler' : p}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-city">
          Şehir
        </label>
        <select
          id="f-city"
          className={selectClass}
          value={filters.city}
          onChange={(e) => set('city', e.target.value)}
        >
          <option value="hepsi">Tüm şehirler</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor="f-sort">
          Sıralama
        </label>
        <select
          id="f-sort"
          className={selectClass}
          value={filters.sort}
          onChange={(e) => set('sort', e.target.value as GalleryFilters['sort'])}
        >
          <option value="yeni">En yeni</option>
          <option value="populer">Popüler</option>
          <option value="editor">Editör seçimi</option>
          <option value="yorum">En çok yorumlanan</option>
        </select>
      </div>

      {/* Sonuç */}
      {result.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          Bu filtrelerle eşleşen fotoğraf bulunamadı.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.map((photo) => (
            <li key={photo.slug}>
              <PhotoCard photo={photo} />
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}

function PhotoCard({ photo }: { photo: AstroPhoto }) {
  const integration = photoIntegrationSeconds(photo);
  return (
    <Link to={`/fotograf/${photo.slug}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-card">
        <PhotoPlaceholder
          gradient={photo.gradient}
          alt={`${photo.title} — @${photo.user.username}`}
          className="h-full w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="tabular absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm">
          {formatIntegration(integration)}
        </span>
        {photo.editorsPick && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
            <SparkleIcon className="h-3 w-3" /> Editör
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {photo.target.catalog} · {photo.title}
        </p>
        <p className="tabular mt-0.5 truncate text-xs text-muted-foreground">
          @{photo.user.username} · ♥ {photo.likes} · 💬 {photo.comments}
        </p>
      </div>
    </Link>
  );
}
