import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
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
import { photos } from '@/features/photos/data';
import { listings } from '@/features/marketplace/data';
import {
  equipmentCategoryLabels,
  equipmentPath,
  type EquipmentModel,
} from './data';
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
  }, [model]);

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

            {model.notes && model.notes.length > 0 && (
              <Panel title="Pratik notlar">
                <ul className="space-y-2">
                  {model.notes.map((note) => (
                    <li
                      key={note}
                      className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
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

            <Panel title="Hesaplayıcılarda kullan">
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                Bu modelin değerlerini FOV, mozaik ve uyumluluk hesaplarına
                elle girebilirsiniz; hazır ön ayar listesinde de bulunur.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ButtonLink to="/araclar/fov" size="sm" variant="secondary">
                  FOV Hesaplayıcı
                </ButtonLink>
                <ButtonLink
                  to="/araclar/setup-uyumluluk"
                  size="sm"
                  variant="secondary"
                >
                  Uyumluluk Kontrolü
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
                <p className="py-4 text-[12px] text-muted-foreground">
                  Bu modelle çekilmiş kayıtlı fotoğraf yok. Kendi kaydınızı
                  eklerken setup alanına model adını yazarsanız burada
                  listelenir.
                </p>
              ) : (
                <CardGrid view="grid" density="tight">
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
                        <span className="min-w-0 truncate text-[12.5px] text-foreground">
                          {listing.title}
                        </span>
                        <span className="tabular shrink-0 text-[12px] text-primary">
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
                        <span className="min-w-0 truncate text-[12.5px] text-foreground">
                          <span className="text-muted-foreground">{alt.brand}</span>{' '}
                          {alt.model}
                        </span>
                        <span className="shrink-0 text-[10.5px] text-faint">
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
