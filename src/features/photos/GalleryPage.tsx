import { useMemo } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { CardGrid } from '@/components/ui/CardGrid';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { RemoteImage } from '@/components/media/RemoteImage';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { cities as turkeyCities } from '@/features/location/cities';
import { useExplorer } from '@/features/explorer/useExplorer';
import { gallerySpec } from './gallerySpec';
import { personalFacet, withFacets } from '@/features/explorer/personalFacets';
import { SavedViewsMenu } from '@/features/explorer/SavedViewsMenu';
import { CsvExportButton } from '@/features/explorer/CsvExportButton';
import { useSavedPhotoIds } from '@/services/content/collections';
import { useFollowingIds } from '@/services/content/social';
import { type AstroPhoto, type ProcessingPalette } from './types';
import { photoFamilies, familyOrder } from './families';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { photoWeekArchive, selectWeeklyPhoto } from './weeklyPick';

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
/**
 * CSV sütunları (Faz 4, yalnız admin).
 *
 * KART ÜZERİNDE GÖRÜNENLER değil, KAYDIN KÜNYESİ dışa aktarılıyor:
 * dosyayı açan kişi listeyi gözle taramak için değil, üzerinde işlem
 * yapmak için indiriyor. Gradyan, görsel yolu gibi çizim alanları
 * dışarıda — elektronik tabloda karşılığı yok.
 */
const CSV_SUTUNLARI = [
  { label: 'Başlık', value: (p: AstroPhoto) => p.title },
  { label: 'Hedef', value: (p: AstroPhoto) => p.target.name },
  { label: 'Katalog', value: (p: AstroPhoto) => p.target.catalog },
  { label: 'Takımyıldız', value: (p: AstroPhoto) => p.target.constellation },
  { label: 'Tür', value: (p: AstroPhoto) => p.type },
  { label: 'Palet', value: (p: AstroPhoto) => p.palette },
  { label: 'Kullanıcı', value: (p: AstroPhoto) => p.user.username },
  { label: 'Şehir', value: (p: AstroPhoto) => p.city },
  { label: 'Çekim', value: (p: AstroPhoto) => p.capturedAt },
  { label: 'Beğeni', value: (p: AstroPhoto) => p.likes },
  { label: 'Yorum', value: (p: AstroPhoto) => p.comments },
  { label: 'Adres', value: (p: AstroPhoto) => `/fotograf/${p.slug}` },
];

export function GalleryPage() {
  const [view, setView] = useViewMode('galeri');

  const catalog = usePhotoCatalog();
  const rounds = usePhotoWeekRounds();
  const photos = catalog.items;
  const cities = turkeyCities.map((city) => city.name);
  const weeklyPick = useMemo(
    () => selectWeeklyPhoto(photos, rounds.rounds),
    [photos, rounds.rounds]
  );
  const weeklyArchive = useMemo(
    () => photoWeekArchive(photos, rounds.rounds).slice(0, 8),
    [photos, rounds.rounds]
  );

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
  /*
   * KİŞİSEL FACET'LER (Faz 4). `collections` ve `follows` tabloları
   * Faz 5'te gelmişti ama explorer onları OKUMUYORDU: kullanıcı
   * fotoğrafı kaydediyor, sonra galeride "kaydettiklerim" diye
   * süzemiyordu.
   *
   * İkisi de yalnızca KÜME HAZIRSA ekleniyor. Oturumsuz ziyaretçide ya
   * da yükleme sürerken facet HİÇ ÇİZİLMİYOR — çizilseydi kullanıcı
   * kutuyu işaretler, liste boşalır ve "hiç kaydetmemişim" diye
   * düşünürdü. Gerekçenin tamamı `personalFacets.ts` başlığında.
   */
  const kaydedilen = useSavedPhotoIds();
  const takipEdilen = useFollowingIds();

  const spec = useMemo(
    () =>
      withFacets(gallerySpec, [
        kaydedilen.ready
          ? personalFacet({
              param: 'kaydettiklerim',
              label: 'Kaydettiklerim',
              /* Tohum kayıtlarda `id` YOK (bkz. `AstroPhoto.id`); onlar
                 hiçbir zaman kaydedilmiş sayılmıyor ve bu doğru —
                 kaydedilebilir de değiller. */
              has: (p) => Boolean(p.id && kaydedilen.ids.has(p.id)),
            })
          : null,
        takipEdilen.ready
          ? personalFacet({
              param: 'takip',
              label: 'Takip ettiklerim',
              has: (p) => Boolean(p.ownerId && takipEdilen.ids.has(p.ownerId)),
            })
          : null,
      ]),
    [kaydedilen.ready, kaydedilen.ids, takipEdilen.ready, takipEdilen.ids]
  );

  const ex = useExplorer(photos, spec);
  const kisiselAcik = (param: string) =>
    (ex.query.facets[param]?.length ?? 0) > 0;
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
            <>
              <ButtonLink to="/secki" size="sm" variant="secondary">
                Aylık Seçki
              </ButtonLink>
              <ButtonLink to="/galeri/yukle" size="sm">
                Fotoğraf Yükle
              </ButtonLink>
            </>
          }
        />

        {weeklyPick && (
          <section className="mb-5 overflow-hidden rounded-card border border-border bg-surface-1">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <Link
                to={`/fotograf/${weeklyPick.photo.slug}`}
                aria-label={`Haftanın Fotoğrafı: ${weeklyPick.photo.title}`}
                className="relative min-h-[17.5rem] overflow-hidden bg-surface-2"
              >
                <RemoteImage
                  src={weeklyPick.photo.image?.url}
                  alt={weeklyPick.photo.target.name}
                  seed={weeklyPick.photo.slug}
                  tint={weeklyPick.photo.gradient}
                  sizes="(min-width: 1024px) 760px, 100vw"
                  widths={[640, 960, 1200]}
                  priority
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--color-background)_24%,transparent))]"
                />
                <Badge
                  tone="success"
                  className="absolute left-3 top-3 bg-background/85 backdrop-blur-sm"
                >
                  {weeklyPick.weekLabel}
                </Badge>
              </Link>
              <div className="flex flex-col justify-center p-4 sm:p-5">
                <Badge tone="success" className="w-fit">
                  Haftanın Fotoğrafı
                </Badge>
                {weeklyPick.yearLabel && (
                  <span className="mt-2 text-meta tabular text-faint">
                    {weeklyPick.yearLabel}
                  </span>
                )}
                <h2 className="type-section mt-3 text-foreground">
                  {weeklyPick.photo.title}
                </h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {weeklyPick.photo.target.name} · @{weeklyPick.photo.user.username}
                </p>
                <p className="mt-4 text-body-sm leading-relaxed text-muted-foreground">
                  Galerinin öne çıkan karesi. Künyesi, setup bilgisi ve
                  işleme notlarıyla birlikte inceleyebilirsiniz.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <ButtonLink to={`/fotograf/${weeklyPick.photo.slug}`} size="sm">
                    Fotoğrafı aç
                  </ButtonLink>
                  <ButtonLink to="/haftanin-fotografi" size="sm" variant="secondary">
                    Arşiv
                  </ButtonLink>
                </div>
              </div>
            </div>
          </section>
        )}

        {weeklyArchive.length > 0 && (
          <section className="mb-5 rounded-card border border-border bg-surface-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-3 py-2.5">
              <div>
                <h2 className="text-body-sm font-semibold text-foreground">
                  Haftanın Fotoğrafları Arşivi
                </h2>
                <p className="mt-0.5 text-meta text-muted-foreground">
                  Geçmiş haftaların kazananlarını hafta numarasıyla takip edin.
                </p>
              </div>
              <ButtonLink to="/haftanin-fotografi" size="sm" variant="ghost">
                Tüm arşiv
              </ButtonLink>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              {weeklyArchive.map((item) => (
                <Link
                  key={item.id}
                  to={`/fotograf/${item.photo.slug}`}
                  className="flex min-w-0 gap-3 border-b border-border px-3 py-3 transition-colors hover:bg-surface-2 sm:border-r lg:[&:nth-child(4n)]:border-r-0"
                >
                  <span
                    className="relative h-16 w-20 shrink-0 rounded-card border border-border bg-cover bg-center"
                    style={{
                      backgroundImage: item.photo.image
                        ? `url(${item.photo.image.url})`
                        : item.photo.gradient,
                    }}
                    aria-hidden
                  >
                    <span className="absolute left-1 top-1 rounded-card border border-success/50 bg-background/85 px-1.5 py-0.5 text-[0.62rem] font-medium leading-none tracking-[0.03em] text-success">
                      {item.weekLabel}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <Badge tone="success">Haftanın Fotoğrafı</Badge>
                    <span className="mt-1 block truncate text-body-sm font-medium text-foreground">
                      {item.photo.title}
                    </span>
                    <span className="block truncate text-meta text-muted-foreground">
                      {item.yearLabel ? `${item.yearLabel} · ` : ''}
                      @{item.photo.user.username}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Filtre paneli */}
        <ModuleToolbar
          activeFilters={{
            chips: ex.chips,
            onRemove: ex.removeChip,
            onClearAll: ex.clearAll,
          }}
          result={{ current: ex.total, total: photos.length, noun: 'fotoğraf' }}
          sort={{
            id: 'f-sort',
            value: ex.query.sort,
            onChange: ex.setSort,
            options: gallerySpec.sorts.map((s) => ({
              value: s.value,
              label: s.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
          extra={
            <>
              <CsvExportButton
                module="galeri"
                rows={result}
                columns={CSV_SUTUNLARI}
              />
              <SavedViewsMenu module="galeri" />
            </>
          }
        >
          <FilterCell
            label="Ara"
            htmlFor="gallery-search"
            active={ex.searchInput.trim().length > 0}
            className="min-w-[22rem] flex-[2_1_22rem]"
          >
            <Input
              id="gallery-search"
              type="search"
              placeholder="Hedef, katalog (M31, NGC 7000) veya kullanıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>
          <FilterCell
            label="Tür"
            htmlFor="gallery-family"
            active={family !== 'hepsi'}
            className="min-w-[12rem]"
          >
            <Select
              id="gallery-family"
              value={family}
              onChange={(event) => {
                const next = event.target.value;
                /* Tek seçim davranışı korunuyor: aile sekmeleri bir sekme
                   şeridi, çoklu seçim listesi değil. */
                if (family !== 'hepsi') ex.toggleFacet('aile', family);
                if (next !== 'hepsi' && next !== family) ex.toggleFacet('aile', next);
              }}
              className={filterControlClass}
            >
              <option value="hepsi">Tüm türler</option>
              {familyOrder.map((key) => (
                <option key={key} value={key}>
                  {photoFamilies[key].label}
                </option>
              ))}
            </Select>
          </FilterCell>

          <FilterCell
            label="Palet"
            htmlFor="f-palette"
            active={(ex.query.facets.palet?.[0] ?? 'hepsi') !== 'hepsi'}
          >
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

          <FilterCell
            label="Şehir"
            htmlFor="f-city"
            active={(ex.query.facets.sehir?.[0] ?? 'hepsi') !== 'hepsi'}
          >
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

          {kaydedilen.ready && (
            <FilterToggle
              id="f-saved"
              label="Kaydettiklerim"
              checked={kisiselAcik('kaydettiklerim')}
              onChange={() => ex.toggleFacet('kaydettiklerim', 'evet')}
            />
          )}
          {takipEdilen.ready && (
            <FilterToggle
              id="f-following"
              label="Takip ettiklerim"
              checked={kisiselAcik('takip')}
              onChange={() => ex.toggleFacet('takip', 'evet')}
            />
          )}
        </ModuleToolbar>

        {/* SESSİZ KIRPMA YOK. Küme sınıra dayandıysa süzgeç eksik
            cevap veriyor ve bunu söylemek zorunda — "kaydetmiştim ama
            görünmüyor" en sinsi hata biçimi. */}
        {(kaydedilen.truncated || takipEdilen.truncated) && (
          <p className="mt-2 text-meta leading-relaxed text-warning">
            Kişisel süzgeç listenizin tamamını okuyamadı; çok sayıda kayıt
            var. Sonuç eksik olabilir.
          </p>
        )}

        <CatalogSourceNote selection={catalog} />

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
