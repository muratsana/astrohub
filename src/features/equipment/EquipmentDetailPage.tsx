import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Panel, SpecList, SpecRow } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { PhotoCard } from '@/features/photos/PhotoCard';
import { CardGrid } from '@/components/ui/CardGrid';
import { NotFoundPage } from '@/components/NotFoundPage';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd } from '@/lib/seo';
import { PassbandStrip } from './PassbandStrip';
import { useFilterSpectrum } from '@/services/content/filterSpectrum';
import { usePhotoCatalog } from '@/services/content/photos';
import { listings } from '@/features/marketplace/data';
import {
  equipmentCategoryLabels,
  equipmentPath,
  type EquipmentModel,
  productionStatusLabels,
  confidenceLabels,
} from './data';
import { connectionLabel } from '@/domain/equipment/connections';
import { safeUrl } from '@/lib/url';
import { comparePath } from './compare';
import { useEquipmentCatalog } from '@/services/content/equipment';

/**
 * EKİPMAN MODEL DETAYI (§7.11).
 *
 * Sayfanın değeri teknik künyede değil — o zaten üretici sitesinde var —
 * **ilişkilerde**: bu ekipmanla Astrohub'da hangi fotoğraflar çekilmiş,
 * ikinci elde satılık örneği var mı, aynı sınıfta hangi alternatifler var.
 *
 * FOTOĞRAF EŞLEŞTİRME
 * Fotoğraf kayıtlarında setup alanları şu an serbest metin ("Sky-Watcher
 * Esprit 100 (550mm)"). Eşleştirme bu yüzden model adının metin içinde
 * geçmesine bakıyor. Kırılgan bir yöntem ama yanlış eşleşme üretmiyor:
 * model adı yeterince ayırt edici ve eşleşme bulunamazsa bölüm hiç
 * görünmüyor. Faz 1.5'te setup ilişkisi FK'ye bağlanınca bu fonksiyon
 * tek satıra iner.
 */

/** Model adının bir setup metninde geçip geçmediği (TR duyarlı, gevşek). */
function mentions(text: string | undefined, model: EquipmentModel): boolean {
  if (!text) return false;
  const haystack = text.toLocaleLowerCase('tr-TR');
  const needle = model.model.toLocaleLowerCase('tr-TR');
  // "ASI2600MM Pro" → "asi2600mm" ile de eşleşsin: ilk kelime yeterli.
  const short = needle.split(' ')[0];
  return haystack.includes(needle) || (short.length >= 5 && haystack.includes(short));
}

export function EquipmentDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const catalog = useEquipmentCatalog();
  const model = slug
    ? catalog.items.find((item) => item.slug === slug)
    : undefined;

  const photos = usePhotoCatalog().items;
  const spectrum = useFilterSpectrum(model?.slug);

  const shotWith = useMemo(() => {
    if (!model) return [];
    return photos.filter((photo) =>
      [
        photo.setup.optic,
        photo.setup.camera,
        photo.setup.mount,
        photo.setup.guiding,
        photo.setup.filters,
      ].some((field) => mentions(field, model))
    );
  }, [photos, model]);

  const forSale = useMemo(() => {
    if (!model) return [];
    return listings.filter(
      (listing) =>
        listing.category === model.category &&
        (mentions(listing.title, model) || listing.title.includes(model.model))
    );
  }, [model]);

  /* Aynı kategorideki diğer modeller — kaynak hangisiyse ondan. */
  const alternatives = useMemo(
    () =>
      model
        ? catalog.items
            .filter((e) => e.category === model.category && e.slug !== model.slug)
            .slice(0, 4)
        : [],
    [catalog.items, model]
  );

  if (!model) return <NotFoundPage />;

  return (
    <>
      <PageMeta
        title={`${model.brand} ${model.model}`}
        description={
          model.summary ??
          `${model.brand} ${model.model} teknik künyesi, bu ekipmanla çekilmiş fotoğraflar ve ikinci el ilanları.`
        }
        canonicalPath={equipmentPath(model)}
        jsonLd={breadcrumbJsonLd([
          { name: 'Ana Sayfa', path: '/' },
          { name: 'Ekipman', path: '/ekipman' },
          {
            name: equipmentCategoryLabels[model.category],
            path: `/ekipman/${model.category}`,
          },
          { name: `${model.brand} ${model.model}`, path: equipmentPath(model) },
        ])}
      />

      <Container className="py-8 sm:py-10">
        <PageHeader
          breadcrumb={[
            { label: 'Ana Sayfa', to: '/' },
            { label: 'Ekipman', to: '/ekipman' },
            {
              label: equipmentCategoryLabels[model.category],
              to: `/ekipman/${model.category}`,
            },
            { label: model.model },
          ]}
          title={model.model}
          meta={model.brand}
          description={model.summary}
          actions={
            <>
              <Badge tone="primary">
                {equipmentCategoryLabels[model.category]}
              </Badge>
              {model.priceHint && <Badge>{model.priceHint}</Badge>}
              {/* Karşılaştırma bu modelle başlıyor: "hangisi" sorusu genelde
                  bir modelin sayfasında doğuyor, boş bir tabloda değil. */}
              <ButtonLink
                to={comparePath([model.slug])}
                size="sm"
                variant="secondary"
              >
                Karşılaştır
              </ButtonLink>
            </>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <Panel title="Teknik künye">
              <SpecList>
                <SpecRow label="Marka" value={model.brand} />
                <SpecRow label="Model" value={model.model} />
                {Object.entries(model.specs).map(([key, value]) => (
                  <SpecRow key={key} label={key} value={value} tone="cold" />
                ))}
                {model.priceHint && (
                  <SpecRow
                    label="Fiyat segmenti"
                    value={model.priceHint}
                    tone="muted"
                  />
                )}
              </SpecList>
            </Panel>

            {/*
              SPEKTRAL GEÇİŞ — yalnızca filtrelerde ve yalnızca veri varsa.

              Veri `astro_filter_*` tablolarından geliyor ve tohumu YOK
              (ayrıntı `services/content/filterSpectrum.ts` başlığında).
              Veritabanı yapılandırılmamışsa ya da o filtre için kayıt
              yoksa bölüm HİÇ çizilmiyor — boş bir "veri yok" paneli
              göstermek, sayfayı eksik gösterirdi.
            */}
            {spectrum && (
              <Panel
                title="Spektral geçiş"
                status={
                  spectrum.isDiscontinued ? 'üretimi durduruldu' : undefined
                }
              >
                <PassbandStrip spec={spectrum} />
              </Panel>
            )}

            {model.notes && model.notes.length > 0 && (
              <Panel title="Pratik notlar">
                <ul className="space-y-2">
                  {model.notes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-2 text-meta leading-relaxed text-muted-foreground"
                    >
                      <span aria-hidden className="text-primary">
                        ·
                      </span>
                      {note}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {/*
              KAYNAK VE DOĞRULAMA PANELİ.

              Teknik değerlerin nereden geldiği ve ne zaman doğrulandığı
              künyenin bir parçası. Bir backfocus değerine göre 40 mm'lik
              ara halka alan kullanıcı, o değerin üretici datasheet'inden
              mi yoksa tek bir foruma mı dayandığını bilmeli.
            */}
            <Panel title="Veri kaynağı ve doğrulama">
              <SpecList>
                <SpecRow
                  label="Üretim durumu"
                  value={
                    productionStatusLabels[model.productionStatus ?? 'bilinmiyor']
                  }
                  tone={model.productionStatus === 'guncel' ? 'cold' : 'muted'}
                />
                {model.releaseYear && (
                  <SpecRow label="Çıkış yılı" value={String(model.releaseYear)} />
                )}
                {model.discontinuedYear && (
                  <SpecRow
                    label="Üretimden kalkış"
                    value={String(model.discontinuedYear)}
                  />
                )}
                <SpecRow
                  label="Veri güven seviyesi"
                  value={
                    model.confidence
                      ? confidenceLabels[model.confidence]
                      : 'Belirtilmemiş'
                  }
                  tone={model.confidence === 'dogrulanmis' ? 'cold' : 'muted'}
                />
                <SpecRow
                  label="Son doğrulama"
                  value={
                    model.verifiedAt
                      ? new Date(model.verifiedAt).toLocaleDateString('tr-TR')
                      : 'Kayıt yok'
                  }
                  tone="muted"
                />
              </SpecList>

              {model.sources && model.sources.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {model.sources.map((source) => (
                    <li key={source.label} className="text-body-sm">
                      {source.url ? (
                        <a
                          href={safeUrl(source.url) ?? undefined}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="text-primary hover:underline"
                        >
                          {source.label}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{source.label}</span>
                      )}
                      <span className="ml-1 text-faint">({source.kind})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-meta leading-snug text-warning">
                  Bu modelin teknik değerleri için kaynak bağlantısı
                  kayıtlı değil. Üretici sayfasını biliyorsanız yönetim
                  ekibine iletebilirsiniz.
                </p>
              )}
            </Panel>

            {/*
              SETUP ZİNCİRİ ALANLARI ayrı panelde: bunlar künyenin süsü
              değil, hesabın girdisi. Eksik olanları açıkça "kayıt yok"
              diye göstermek, hesabın neden "veri yetersiz" dediğini
              anlaşılır kılıyor.
            */}
            <Panel title="Setup zinciri verileri">
              <SpecList>
                <SpecRow
                  label="Giriş bağlantısı"
                  value={
                    model.connections?.input
                      ? connectionLabel(model.connections.input)
                      : 'kayıt yok'
                  }
                  tone={model.connections?.input ? 'cold' : 'muted'}
                />
                <SpecRow
                  label="Çıkış bağlantısı"
                  value={
                    model.connections?.output
                      ? connectionLabel(model.connections.output)
                      : 'kayıt yok'
                  }
                  tone={model.connections?.output ? 'cold' : 'muted'}
                />
                {(
                  [
                    ['Net açıklık', model.optics?.clearApertureMm, 'mm'],
                    ['Görüntü çemberi', model.optics?.imageCircleMm, 'mm'],
                    ['Optik uzunluk', model.optics?.opticalLengthMm, 'mm'],
                    ['İstenen backfocus', model.optics?.requiredBackfocusMm, 'mm'],
                    ['Flanş–sensör', model.optics?.flangeDistanceMm, 'mm'],
                    ['Çarpan', model.optics?.factor, '×'],
                    ['Filtre kalınlığı', model.optics?.filterThicknessMm, 'mm'],
                    ['Prizma ölçüsü', model.optics?.prismSizeMm, 'mm'],
                  ] as const
                )
                  .filter(([, value]) => value !== undefined)
                  .map(([label, value, unit]) => (
                    <SpecRow
                      key={label}
                      label={label}
                      value={`${value} ${unit}`}
                      tone="cold"
                    />
                  ))}
              </SpecList>
              <p className="mt-2 text-meta leading-snug text-faint">
                Bu alanlar setup planlayıcısının hesaplarına girer. Boş olan
                bir alan için planlayıcı tahmin üretmez, “veri yetersiz” der.
              </p>
              <div className="mt-2">
                <ButtonLink to="/ekipman" size="sm">
                  Setup planlayıcıda kullan
                </ButtonLink>
              </div>
            </Panel>

            <Panel title="Hesaplayıcılarda kullan">
              <p className="text-meta leading-relaxed text-muted-foreground">
                Bu modelin değerlerini FoV, pixel scale ve uyumluluk hesaplarına
                elle girebilirsiniz; hazır ön ayar listesinde de bulunur.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink to="/simulator" size="sm" variant="secondary">
                  Simülatörde dene
                </ButtonLink>
              </div>
            </Panel>
          </div>

          <div className="space-y-4">
            <Panel
              title="Bu ekipmanla çekilenler"
              status={`${shotWith.length} fotoğraf`}
            >
              {shotWith.length === 0 ? (
                <p className="py-4 text-meta text-muted-foreground">
                  Bu modelle çekilmiş kayıtlı fotoğraf yok. Kendi kaydınızı
                  eklerken setup alanına model adını yazarsanız burada
                  listelenir.
                </p>
              ) : (
                <CardGrid view="grid">
                  {shotWith.map((photo) => (
                    <li key={photo.slug}>
                      <PhotoCard photo={photo} />
                    </li>
                  ))}
                </CardGrid>
              )}
            </Panel>

            {forSale.length > 0 && (
              <Panel title="İkinci elde" status={`${forSale.length} ilan`}>
                <ul>
                  {forSale.map((listing) => (
                    <li
                      key={listing.slug}
                      className="border-b border-border last:border-0"
                    >
                      <Link
                        to={`/ilan/${listing.slug}`}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-caption text-foreground">
                          {listing.title}
                        </span>
                        <span className="tabular shrink-0 text-meta text-primary">
                          {listing.price.toLocaleString('tr-TR')} ₺
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {alternatives.length > 0 && (
              <Panel
                title="Aynı sınıfta"
                status={equipmentCategoryLabels[model.category]}
              >
                <ul>
                  {alternatives.map((alt) => (
                    <li key={alt.slug} className="border-b border-border last:border-0">
                      <Link
                        to={equipmentPath(alt)}
                        className="flex items-baseline justify-between gap-3 py-2 transition-colors hover:text-primary"
                      >
                        <span className="min-w-0 truncate text-caption text-foreground">
                          <span className="text-muted-foreground">{alt.brand}</span>{' '}
                          {alt.model}
                        </span>
                        <span className="shrink-0 text-meta text-faint">
                          {alt.priceHint ?? ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}
