import { useMemo } from 'react';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterBar,
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ActiveFilters } from '@/components/ui/ActiveFilters';
import { CardGrid } from '@/components/ui/CardGrid';
import { ToolBar, ResultCount } from '@/components/ui/ToolBar';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { availableCities } from './filtering';
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
  const cities = useMemo(() => availableCities(photos), [photos]);
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
        <FilterBar activeCount={ex.chips.length}>
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
        </FilterBar>

        {/* SESSİZ KIRPMA YOK. Küme sınıra dayandıysa süzgeç eksik
            cevap veriyor ve bunu söylemek zorunda — "kaydetmiştim ama
            görünmüyor" en sinsi hata biçimi. */}
        {(kaydedilen.truncated || takipEdilen.truncated) && (
          <p className="mt-2 text-meta leading-relaxed text-warning">
            Kişisel süzgeç listenizin tamamını okuyamadı; çok sayıda kayıt
            var. Sonuç eksik olabilir.
          </p>
        )}

        <ActiveFilters
          chips={ex.chips}
          onRemove={ex.removeChip}
          onClearAll={ex.clearAll}
        />

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
          /* Kaydedilmiş görünümler ortak kontrol: `extra` yuvası
             sayesinde her liste sayfası aynı bileşeni takabiliyor.
             Oturumsuz ziyaretçide bileşen `null` dönüyor, yani şerit
             bugünkü hâlinde kalıyor. */
          extra={
            <>
              {/* CSV yalnızca yöneticide ve SÜZÜLMÜŞ listeyi indiriyor
                  — ekranda ne görünüyorsa o. */}
              <CsvExportButton
                module="galeri"
                rows={result}
                columns={CSV_SUTUNLARI}
              />
              <SavedViewsMenu module="galeri" />
            </>
          }
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
