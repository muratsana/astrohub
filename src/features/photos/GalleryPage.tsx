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
import { CARD_RATIO } from '@/components/ui/cardRatios';
import { cn } from '@/lib/cn';
import { RemoteImage } from '@/components/media/RemoteImage';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { cities as turkeyCities } from '@/features/location/cities';
import { useExplorer } from '@/features/explorer/useExplorer';
import { gallerySpec } from './gallerySpec';
import { CsvExportButton } from '@/features/explorer/CsvExportButton';
import { SavedViewsMenu } from '@/features/explorer/SavedViewsMenu';
import type { CsvColumn } from '@/lib/csv';
import { personalFacet, withFacets } from '@/features/explorer/personalFacets';
import { useSavedPhotoIds } from '@/services/content/collections';
import { useFollowingIds } from '@/services/content/social';
import { type AstroPhoto, type ProcessingPalette } from './types';
import { photoFamilies, familyOrder } from './families';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { photoWeekArchive, selectWeeklyPhoto } from './weeklyPick';
import { formatExposure } from '@/domain/photography/exif';
import {
  formatIntegration,
  totalIntegrationSeconds,
} from '@/domain/photography/integration';

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
 * CSV SÜTUNLARI.
 *
 * KART ÜZERİNDE GÖRÜNENLER değil, KAYDIN KÜNYESİ dışa aktarılıyor:
 * dosyayı açan kişi listeyi gözle taramak için değil, üzerinde işlem
 * yapmak için indiriyor. Gradyan ve görsel yolu gibi çizim alanları
 * dışarıda — elektronik tabloda karşılığı yok.
 */
const CSV_SUTUNLARI: CsvColumn<AstroPhoto>[] = [
  { label: 'Başlık', value: (p) => p.title },
  { label: 'Hedef', value: (p) => p.target.name },
  { label: 'Katalog', value: (p) => p.target.catalog },
  { label: 'Takımyıldız', value: (p) => p.target.constellation },
  { label: 'Tür', value: (p) => p.type },
  { label: 'Palet', value: (p) => p.palette },
  { label: 'Kullanıcı', value: (p) => p.user.username },
  { label: 'Şehir', value: (p) => p.city },
  { label: 'Çekim', value: (p) => p.capturedAt },
  { label: 'Beğeni', value: (p) => p.likes },
  { label: 'Yorum', value: (p) => p.comments },
  { label: 'Adres', value: (p) => `/fotograf/${p.slug}` },
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

        {/*
          HAFTANIN FOTOĞRAFI — YÜKSEKLİĞİ GÖRSEL BELİRLİYOR, METİN DEĞİL.

          Ölçülen eski durum (1440×900): şerit 611px, alt kenarı 838px ve
          galeri ızgarası 1120px'de başlıyordu — yani fold üstünde HİÇ
          fotoğraf yoktu. 1366×768'de şeridin kendisi bile fold'un altına
          taşıyordu; 390×844'te 932px ile ekranın tamamından uzundu.

          Sebep şuydu: görsel `min-h` ile duruyor, gerçek yüksekliği
          KOMŞU SÜTUN dayatıyordu — dokuz satırlık EXIF tablosu ne kadar
          uzarsa görsel de o kadar uzuyordu. Yani bir fotoğraf şeridinin
          boyunu tablo satır sayısı belirliyordu.

          Şimdi görsel sabit `wide` (16:9) oranında ve sütun genişliği o
          oranın ~305px yüksekliğe denk düşeceği şekilde ayarlı — eski
          boyun yarısı. Metin sütunu bu yüksekliğe sığmak zorunda, tersi
          değil; künye bu yüzden dört değere indi ve tamamı "Fotoğrafı aç"
          ile bir tık ötede duruyor.
        */}
        {weeklyPick && (
          <section className="mb-5 overflow-hidden rounded-card border border-border bg-surface-1">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,0.62fr)_minmax(300px,1fr)]">
              <Link
                to={`/fotograf/${weeklyPick.photo.slug}`}
                aria-label={`Haftanın Fotoğrafı: ${weeklyPick.photo.title}`}
                className={cn(
                  'relative overflow-hidden bg-surface-2',
                  CARD_RATIO.wide
                )}
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
              </Link>
              <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success" className="w-fit">
                    Haftanın Fotoğrafı
                  </Badge>
                  <Badge tone="primary" className="w-fit">
                    {weeklyPick.weekLabel}
                  </Badge>
                  {weeklyPick.yearLabel && (
                    <span className="text-meta tabular text-faint">
                      {weeklyPick.yearLabel}
                    </span>
                  )}
                </div>
                <h2 className="type-section mt-3 text-foreground">
                  {weeklyPick.photo.title}
                </h2>
                <p className="mt-1 text-body-sm text-muted-foreground">
                  {weeklyPick.photo.target.name} ·{' '}
                  <Link
                    to={`/profil/${weeklyPick.photo.user.username}`}
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    @{weeklyPick.photo.user.username}
                  </Link>
                </p>
                <WeeklyPhotoKunye photo={weeklyPick.photo} />
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink
                    to={`/fotograf/${weeklyPick.photo.slug}`}
                    size="sm"
                  >
                    Fotoğrafı aç
                  </ButtonLink>
                  <ButtonLink
                    to="/haftanin-fotografi"
                    size="sm"
                    variant="secondary"
                  >
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
                      {item.yearLabel ? `${item.yearLabel} · ` : ''}@
                      {item.photo.user.username}
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
          showResultCount={false}
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
          /*
            KAYDEDİLMİŞ GÖRÜNÜM + CSV: ikisi de yazıldığı hâlde hiçbir
            sayfaya bağlanmamıştı (eski dal incelemesi §4). Bileşenler
            kendi görünürlük kurallarını taşıyor — CSV yalnızca
            yöneticide, kayıtlı görünümler yalnızca oturum açıkken
            çiziliyor — bu yüzden burada koşul yok.
          */
          extra={
            <>
              <SavedViewsMenu module="galeri" />
              <CsvExportButton
                module="galeri"
                rows={result}
                columns={CSV_SUTUNLARI}
              />
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
                if (next !== 'hepsi' && next !== family)
                  ex.toggleFacet('aile', next);
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
            Kişisel süzgeç listenizin tamamını okuyamadı; çok sayıda kayıt var.
            Sonuç eksik olabilir.
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

/**
 * ŞERİTTEKİ KISA KÜNYE.
 *
 * Eskiden burada dokuz satırlık tam EXIF tablosu vardı ve şeridin
 * yüksekliğini O belirliyordu — bir fotoğraf şeridinin boyu, tablonun
 * satır sayısına bağlıydı. Görsel sabit orana alınınca tablo artık
 * sığmıyor.
 *
 * DÖRT DEĞER, ÇÜNKÜ TAMAMI BİR TIK ÖTEDE. Fotoğraf detay sayfası zaten
 * künyenin tamamını taşıyor ve "Fotoğrafı aç" hemen altında duruyor.
 * Şeridin işi kaydı tüketmek değil, açmaya değer olduğunu göstermek.
 *
 * Sıra `weeklyPhotoExifRows`ün sırası: poz süresi, çekim yeri, tarih,
 * toplam entegrasyon. Boş alan zaten listeye girmiyor, yani dört değerden
 * azı varsa satır kısalıyor — "—" ile doldurulmuyor.
 */
function WeeklyPhotoKunye({ photo }: { photo: AstroPhoto }) {
  const rows = weeklyPhotoExifRows(photo).slice(0, 4);
  if (rows.length === 0) return null;

  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-meta text-faint">{label}</dt>
          <dd className="truncate text-meta text-foreground" title={value}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function weeklyPhotoExifRows(photo: AstroPhoto): [string, string][] {
  const exif = photo.exif;
  const rows: [string, string][] = [];
  const add = (label: string, value?: string | null) => {
    if (value && value.trim() !== '') rows.push([label, value]);
  };
  const primaryExposure = photo.exposures[0]?.exposureSeconds;
  const uniqueExposureSeconds = [
    ...new Set(photo.exposures.map((row) => row.exposureSeconds)),
  ];
  const exposureLabel =
    exif?.exposureSeconds !== null && exif?.exposureSeconds !== undefined
      ? formatExposure(exif.exposureSeconds)
      : uniqueExposureSeconds.length === 1
        ? formatExposure(uniqueExposureSeconds[0])
        : primaryExposure
          ? photo.exposures
              .map(
                (row) => `${row.filter} ${formatExposure(row.exposureSeconds)}`
              )
              .join(' · ')
          : null;
  const filterLabel =
    photo.setup.filters ||
    [...new Set(photo.exposures.map((row) => row.filter).filter(Boolean))].join(
      ' · '
    );
  const integrationSeconds = totalIntegrationSeconds(photo.exposures);
  const exposurePlan = photo.exposures
    .filter((row) => row.filter && row.frames > 0 && row.exposureSeconds > 0)
    .map(
      (row) =>
        `${row.filter}: ${row.frames}×${formatExposure(row.exposureSeconds)}`
    )
    .join(' · ');

  add('Poz süresi', exposureLabel);
  add('Çekim yeri', photo.location.label);
  add('Çekim tarihi', formatPhotoDate(photo.capturedAt));
  if (integrationSeconds > 0)
    add('Toplam entegrasyon', formatIntegration(integrationSeconds));
  add('Filtreler', filterLabel);
  add('Poz planı', exposurePlan);

  const sky = [
    photo.location.bortle ? `Bortle ${photo.location.bortle}` : null,
    photo.location.sqm ? `SQM ${photo.location.sqm}` : null,
  ].filter(Boolean);
  add('Gökyüzü', sky.join(' · '));

  add('Optik', photo.setup.optic || exif?.lens);
  add('Kamera', photo.setup.camera || exif?.camera);
  if (exif?.lens && exif.lens !== photo.setup.optic)
    rows.push(['Lens', exif.lens]);
  if (exif?.iso !== null && exif?.iso !== undefined)
    rows.push(['ISO', String(exif.iso)]);
  if (exif?.focalMm !== null && exif?.focalMm !== undefined)
    rows.push(['Odak', `${Number(exif.focalMm.toFixed(1))} mm`]);
  if (exif?.apertureF !== null && exif?.apertureF !== undefined)
    rows.push(['Diyafram', `f/${Number(exif.apertureF.toFixed(1))}`]);

  return rows;
}

function formatPhotoDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
