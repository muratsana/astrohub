import { useMemo } from 'react';
import { Link } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  FilterCell,
  FilterToggle,
  filterControlClass,
} from '@/components/ui/FilterBar';
import { ModuleToolbar } from '@/components/ui/ModuleToolbar';
import { CardGrid } from '@/components/ui/CardGrid';
import { CatalogSourceNote } from '@/components/ui/CatalogSourceNote';
import { FeaturedPanel } from '@/components/ui/FeaturedPanel';
import { RemoteImage } from '@/components/media/RemoteImage';
import { useViewMode } from '@/components/ui/useViewMode';
import { PhotoCard } from './PhotoCard';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoWeekRounds } from '@/services/content/photoOfWeek';
import { cities as turkeyCities } from '@/features/location/cities';
import { useExplorer } from '@/features/explorer/useExplorer';
import { gallerySpec } from './gallerySpec';
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
  exposureRowSeconds,
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
        <header className="mb-5 border-b border-border pb-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="type-page text-foreground">Fotoğraf Galerisi</h1>
            <div className="w-fit rounded-card border border-border-strong bg-surface-1 p-1">
              <ButtonLink to="/galeri/yukle" size="sm">
                Fotoğraf Yükle
              </ButtonLink>
            </div>
          </div>
        </header>

        {/*
          HAFTANIN FOTOĞRAFI — düzen artık `FeaturedPanel`'den geliyor.

          Ölçülen eski durum (1440×900): şerit 611px, alt kenarı 838px ve
          galeri ızgarası 1120px'de başlıyordu — yani fold üstünde HİÇ
          fotoğraf yoktu. Sebep şuydu: görselin yüksekliğini KOMŞU SÜTUN
          dayatıyordu, dokuz satırlık EXIF tablosu ne kadar uzarsa görsel
          de o kadar uzuyordu.

          Çözüm — görselin sabit 16:9 oranda durması, metnin ona sığması —
          doğruydu ama yalnızca bu sayfada uygulanmıştı. Aynı düzen artık
          ortak bileşende; haber, yazı, ilan ve etkinlik manşetleri de
          buradan geliyor. Gerekçenin tamamı `FeaturedPanel` başlığında.
        */}
        {weeklyPick && (
          <FeaturedPanel
            to={`/fotograf/${weeklyPick.photo.slug}`}
            mediaLabel={`Haftanın Fotoğrafı: ${weeklyPick.photo.title}`}
            media={
              <RemoteImage
                src={weeklyPick.photo.image?.url}
                alt={weeklyPick.photo.target.name}
                seed={weeklyPick.photo.slug}
                tint={weeklyPick.photo.gradient}
                sizes="(min-width: 1024px) 760px, 100vw"
                widths={[640, 960, 1200]}
                priority
              />
            }
            badges={
              <>
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
              </>
            }
            title={weeklyPick.photo.title}
            subtitle={
              <>
                {weeklyPick.photo.target.name} ·{' '}
                <Link
                  to={`/profil/${weeklyPick.photo.user.username}`}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  @{weeklyPick.photo.user.username}
                </Link>
              </>
            }
            /* Panelde AKSİYON DÜĞMESİ YOK — ikisi de kaldırıldı.
               "Fotoğrafı aç" görselin ve başlığın zaten gittiği yere
               üçüncü bir kapıydı; "Haftanın fotoğrafları arşivi" ise
               hemen altındaki arşiv şeridinin "Tüm arşiv" düğmesiyle
               aynı adrese gidiyordu. İkisi 48px yer tutuyor ve o yer
               künyenin: düğmeler dururken tam EXIF ortak 350px'lik
               panele sığmıyordu. */
          >
            <WeeklyPhotoKunye photo={weeklyPick.photo} />
          </FeaturedPanel>
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
                      /* 64×80 px'lik kutu: küçük kopya varsa o iner. */
                      backgroundImage: item.photo.image
                        ? `url(${item.photo.image.thumbUrl ?? item.photo.image.url})`
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
            options: gallerySpec.sorts.map((sort) => ({
              value: sort.value,
              label: sort.label,
            })),
          }}
          view={{ mode: view, onChange: setView }}
          showResultCount={false}
        >
          <FilterCell
            label="Ara"
            htmlFor="gallery-search"
            active={ex.searchInput.trim().length > 0}
          >
            <Input
              id="gallery-search"
              type="search"
              placeholder="Hedef, katalog veya kullanıcı"
              value={ex.searchInput}
              onChange={(e) => ex.setSearch(e.target.value)}
              className={filterControlClass}
            />
          </FilterCell>

          <FilterCell
            label="Tür"
            htmlFor="gallery-family"
            active={family !== 'hepsi'}
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
/**
 * HAFTANIN FOTOĞRAFININ TAM KÜNYESİ.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÖRT SATIRLIK ÖZET YETMİYORDU
 *
 * Önceden künye ilk dört alanla kesiliyordu ("poz süresi, çekim yeri,
 * çekim tarihi, toplam entegrasyon") ve gerisini görmek için fotoğrafın
 * sayfasına gitmek gerekiyordu. Oysa haftanın fotoğrafı vitrindir:
 * bakan kişinin ilk sorusu "bu nasıl çekilmiş" ve cevabın burada olması
 * gerekiyor.
 *
 * Şimdi iki blok var:
 *
 *   1. FİLTRE TABLOSU — her filtre için kare sayısı × poz süresi ve o
 *      filtrenin toplamı, altında genel toplam. Astrofotoğrafta "20 saat"
 *      tek başına eksik bilgi: 20 saatin ne kadarı Hα, ne kadarı OIII
 *      olduğu sonucun rengini belirliyor.
 *   2. KÜNYE — çekim tarihi/yeri, gökyüzü koşulu ve ekipman zinciri.
 *
 * VERİ YOKSA SATIR YOK. Boş bir "—" listesi, künyesi olmayan bir kaydı
 * künyesi varmış gibi gösterirdi; her alan kendi varlığını kontrol
 * ediyor.
 */
function WeeklyPhotoKunye({ photo }: { photo: AstroPhoto }) {
  const pozlar = photo.exposures ?? [];
  const toplam = totalIntegrationSeconds(pozlar);

  const kunye: [string, string][] = [];
  const ekle = (etiket: string, deger?: string | number | null) => {
    const metin = deger === null || deger === undefined ? '' : String(deger);
    if (metin.trim() !== '') kunye.push([etiket, metin]);
  };
  ekle('Çekim tarihi', formatPhotoDate(photo.capturedAt));
  ekle('Çekim yeri', photo.location.label);
  ekle(
    'Gökyüzü',
    [
      photo.location.bortle ? `Bortle ${photo.location.bortle}` : null,
      photo.location.sqm ? `SQM ${photo.location.sqm}` : null,
    ]
      .filter(Boolean)
      .join(' · ')
  );
  ekle('Optik', photo.setup.optic || photo.exif?.lens);
  ekle('Kamera', photo.setup.camera || photo.exif?.camera);
  ekle('Montür', photo.setup.mount);
  ekle('Guiding', photo.setup.guiding);
  ekle('Redüktör', photo.setup.reducer);
  ekle('İşleme paleti', photo.palette);

  if (pozlar.length === 0 && kunye.length === 0) return null;

  return (
    /*
      TABLO VE KÜNYE YAN YANA.

      İkisi alt alta dizildiğinde metin sütunu 1440px'de 536px istiyordu
      ve manşet paneli diğer modüllerin iki katı yüksekliğe çıkıyordu.
      Veriyi kısaltmak seçenek değildi — tam EXIF bu şeridin varlık
      sebebi. Yan yana dizilince aynı veri 350px'lik ortak yüksekliğe
      sığıyor: solda filtre dökümü, sağda ekipman künyesi.

      `lg` altında panel zaten tek sütuna iniyor ve yüksekliği içerik
      belirliyor; orada eski alt alta düzen sürüyor.
    */
    <div className="mt-3 grid gap-3 border-t border-border pt-3 lg:grid-cols-2 lg:gap-5">
      {pozlar.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[18rem] border-collapse text-left">
            <caption className="sr-only">Filtre bazlı pozlama dökümü</caption>
            <thead>
              <tr className="text-meta text-faint">
                <th scope="col" className="pb-1 pr-3 font-medium">
                  Filtre
                </th>
                <th scope="col" className="pb-1 pr-3 text-right font-medium">
                  Kare
                </th>
                <th scope="col" className="pb-1 pr-3 text-right font-medium">
                  Poz
                </th>
                <th scope="col" className="pb-1 text-right font-medium">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {pozlar.map((satir, index) => (
                <tr
                  key={`${satir.filter}-${index}`}
                  className="border-t border-border/60"
                >
                  <td className="py-1 pr-3 text-meta text-foreground">
                    {satir.filter}
                  </td>
                  <td className="tabular py-1 pr-3 text-right text-meta text-muted-foreground">
                    {satir.frames}
                  </td>
                  <td className="tabular py-1 pr-3 text-right text-meta text-muted-foreground">
                    {formatExposure(satir.exposureSeconds)}
                  </td>
                  <td className="tabular py-1 text-right text-meta text-foreground">
                    {formatIntegration(exposureRowSeconds(satir))}
                  </td>
                </tr>
              ))}
              {toplam > 0 && (
                <tr className="border-t border-border">
                  <td className="py-1 pr-3 text-meta text-faint">Toplam</td>
                  <td className="tabular py-1 pr-3 text-right text-meta text-faint">
                    {pozlar.reduce((acc, satir) => acc + satir.frames, 0)}
                  </td>
                  <td className="py-1 pr-3" />
                  <td className="tabular py-1 text-right text-meta font-medium text-primary">
                    {formatIntegration(toplam)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {kunye.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 self-start">
          {kunye.map(([etiket, deger]) => (
            <div key={etiket} className="min-w-0">
              <dt className="text-meta text-faint">{etiket}</dt>
              <dd className="truncate text-meta text-foreground" title={deger}>
                {deger}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function formatPhotoDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}
