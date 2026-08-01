import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Container } from '@/components/ui/Container';
import { ButtonLink } from '@/components/ui/Button';
import { PhotoPlaceholder } from '@/components/media/PhotoPlaceholder';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  formatIntegration,
  totalIntegrationSeconds,
  exposureRowSeconds,
} from '@/domain/photography/integration';
import { usePhotoCatalog } from '@/services/content/photos';
import { usePhotoLike } from '@/services/content/engagement';
import { PhotoComments } from './PhotoComments';
import { PhotoComparison } from './PhotoComparison';
import { PhotoViewer } from './PhotoViewer';
import { BortleIndicator } from './BortleIndicator';
import { RatingControl, RatingBadge } from './RatingControl';
import { VersionHistory } from './VersionHistory';
import { VersionUpload } from './VersionUpload';
import { ReportButton } from '@/features/admin/ReportButton';
import { exifHasValues, photoTypeLabels } from './types';
import { formatExposure } from '@/domain/photography/exif';
import type { AstroPhoto } from './types';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, photoJsonLd } from '@/lib/seo';

type TabId = 'cekim' | 'ekipman' | 'pozlama' | 'islem' | 'konum';

const tabs: { id: TabId; label: string }[] = [
  { id: 'cekim', label: 'Çekim Bilgileri' },
  { id: 'ekipman', label: 'Ekipman' },
  { id: 'pozlama', label: 'Pozlama & Kalibrasyon' },
  { id: 'islem', label: 'İşleme & Lisans' },
  { id: 'konum', label: 'Konum & Gökyüzü' },
];

/**
 * Fotoğraf detay sayfası (§7.3): üstte geniş görüntüleyici, temel bilgi,
 * sekmeli teknik veri ve alt öneriler. Konum daima seçilen görünürlük
 * seviyesinde gösterilir (§15.3).
 */
export function PhotoDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const catalog = usePhotoCatalog();
  const photo = catalog.items.find((p) => p.slug === slug);

  if (!photo) {
    return (
      <PlaceholderPage
        title="Fotoğraf bulunamadı"
        description="Bu fotoğraf yayından kaldırılmış ya da bağlantı hatalı olabilir."
      />
    );
  }

  return (
    <PhotoDetail photo={photo} all={catalog.items} onRefresh={catalog.refresh} />
  );
}

function PhotoDetail({
  photo,
  all,
  onRefresh,
}: {
  photo: AstroPhoto;
  all: AstroPhoto[];
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<TabId>('cekim');
  const integration = totalIntegrationSeconds(photo.exposures);

  const related = useMemo(
    () =>
      all
        .filter(
          (p) =>
            p.slug !== photo.slug &&
            (p.target.catalog === photo.target.catalog || p.type === photo.type)
        )
        .slice(0, 4),
    [all, photo]
  );

  return (
    <>
      <PageMeta
        title={`${photo.title} — ${photo.target.catalog}`}
        description={`${photo.description.slice(0, 150)} · ${photo.setup.optic} + ${photo.setup.camera}, ${formatIntegration(integration)} entegrasyon, ${photo.city}.`}
        image={
          photo.image
            ? { url: photo.image.url, alt: `${photo.title} — ${photo.target.catalog}` }
            : undefined
        }
        jsonLd={[
          photoJsonLd({
            title: photo.title,
            path: `/fotograf/${photo.slug}`,
            description: photo.description,
            author: photo.user.displayName,
            capturedAt: photo.capturedAt,
            license: photo.license,
          }),
          breadcrumbJsonLd([
            { name: 'Ana Sayfa', path: '/' },
            { name: 'Fotoğraflar', path: '/galeri' },
            { name: photo.title, path: `/fotograf/${photo.slug}` },
          ]),
        ]}
      />
      <Container className="py-8 sm:py-10">
        <PhotoViewer photo={photo} />

        {/* Temel bilgi */}
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {photo.target.catalog} · {photoTypeLabels[photo.type]}
            </p>
            <h1 className="mt-1 type-page text-foreground">
              {photo.title}
            </h1>
            <p className="tabular mt-2 text-sm text-muted-foreground">
              <Link
                to={`/profil/${photo.user.username}`}
                className="font-medium text-foreground hover:text-primary"
              >
                {photo.user.displayName}
              </Link>{' '}
              · {new Date(photo.capturedAt).toLocaleDateString('tr-TR')} ·{' '}
              {photo.location.label} · Toplam {formatIntegration(integration)}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {photo.description}
            </p>
          </div>

          <div className="tabular flex shrink-0 items-center gap-2 text-sm">
            <RatingBadge rating={photo.rating} />
            <LikeChip photo={photo} />
            <ActionChip>💬 {photo.comments}</ActionChip>
            <ActionChip>Kaydet</ActionChip>
            <ActionChip>Paylaş</ActionChip>
            <ReportButton
              targetType="photo"
              targetId={photo.slug}
              targetPath={`/fotograf/${photo.slug}`}
            />
          </div>
        </div>

        {/* Sekmeler */}
        <div
          role="tablist"
          aria-label="Teknik veri sekmeleri"
          className="mt-8 flex flex-wrap gap-1 border-b border-border"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="py-6">
          {tab === 'cekim' && <CaptureTab photo={photo} />}
          {tab === 'ekipman' && <EquipmentTab photo={photo} />}
          {tab === 'pozlama' && <ExposureTab photo={photo} />}
          {tab === 'islem' && <ProcessingTab photo={photo} />}
          {tab === 'konum' && <LocationTab photo={photo} />}
        </div>

        {/*
          SÜRÜMLER BÖLÜMÜ TEK SÜRÜMDE DE ÇİZİLİYOR.

          Eskiden `versions.length > 1` koşulu vardı ve bunun görünmeyen
          bir sonucu vardı: sahibi ikinci sürümü ekleyemiyordu, çünkü
          ekleme düğmesi bu bölümün içindeydi ve bölüm ancak İKİ sürüm
          varken çiziliyordu. Yani sürüm eklemenin ön koşulu, zaten sürüm
          eklemiş olmaktı.

          Artık karşılaştırma sürgüsü iki sürüm gerektiriyor (tek sürümü
          kendisiyle karşılaştırmanın anlamı yok) ama bölüm ve ekleme
          düğmesi her zaman sahibine görünüyor.
        */}
        <section className="mt-8 border-t border-border pt-8">
          <SectionHeader
            title="Sürümler"
            description="Aynı kaydın işleme sürümleri. Sürümler fotoğraf kotasında ayrı fotoğraf sayılmaz (§4.2)."
            meta={
              photo.versions && photo.versions.length > 0
                ? `${photo.versions.length} sürüm`
                : undefined
            }
          />

          {photo.versions && photo.versions.length > 1 ? (
            <VersionHistory versions={photo.versions} />
          ) : (
            <p className="mb-4 text-body-sm text-muted-foreground">
              Bu kaydın tek bir işlemesi var. İkinci bir sürüm eklendiğinde
              ikisi sürgüyle yan yana karşılaştırılabilir.
            </p>
          )}

          <div className="mt-4">
            <VersionUpload photo={photo} onUploaded={onRefresh} />
          </div>
        </section>

        {/*
          PUANLAMA SEKMELERİN ALTINDA, ÜSTÜNDE DEĞİL. Hüküm vermeden önce
          künyeye bakılmalı: entegrasyon, ekipman ve gökyüzü görülmeden
          verilen puan, yalnızca ilk izlenimi ölçer.
        */}
        <div className="mt-6">
          <RatingControl photo={photo} />
        </div>

        <section className="mt-8 border-t border-border pt-8">
          <SectionHeader
            title="Teknik Karşılaştırma"
            description="Aynı hedefin başka bir kaydıyla yan yana: entegrasyon, palet, ekipman ve gökyüzü farkı."
          />
          <PhotoComparison photo={photo} />

          <div className="mt-6">
            <PhotoComments photo={photo} />
          </div>
        </section>

        {/* Alt öneriler (§7.3) */}
        {related.length > 0 && (
          <section className="mt-8 border-t border-border pt-10">
            <SectionHeader
              title="Benzer Fotoğraflar"
              description="Aynı hedef veya aynı türden diğer kareler"
              linkTo="/galeri"
            />
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link to={`/fotograf/${p.slug}`} className="group block">
                    <PhotoPlaceholder
                      gradient={p.gradient}
                      alt={p.title}
                      className="aspect-[4/3] w-full border border-border transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                    <p className="mt-2 truncate text-sm font-medium text-foreground">
                      {p.target.catalog} · {p.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{p.user.username}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-10">
          <ButtonLink to="/galeri" variant="secondary">
            ← Galeriye dön
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}

/* ── Sekme içerikleri ── */

function CaptureTab({ photo }: { photo: AstroPhoto }) {
  return (
    <DL
      rows={[
        ['Astronomik hedef', `${photo.target.name} (${photo.target.catalog})`],
        ['Takımyıldız', photo.target.constellation],
        ['Fotoğraf türü', photoTypeLabels[photo.type]],
        [
          'Çekim tarihi',
          new Date(photo.capturedAt).toLocaleDateString('tr-TR'),
        ],
        [
          'Toplam entegrasyon',
          formatIntegration(totalIntegrationSeconds(photo.exposures)),
        ],
        ['İşleme paleti', photo.palette],
      ]}
    />
  );
}

function EquipmentTab({ photo }: { photo: AstroPhoto }) {
  const s = photo.setup;
  return (
    <div className="space-y-6">
      <DL
        rows={[
          ['Optik', s.optic],
          ['Kamera', s.camera],
          ['Montür', s.mount],
          ['Guiding', s.guiding ?? '—'],
          ['Filtreler', s.filters ?? '—'],
          ['Reducer / Barlow', s.reducer ?? '—'],
        ]}
      />
      <ExifPanel photo={photo} />
    </div>
  );
}

/**
 * DOSYADAN OKUNAN KÜNYE.
 *
 * Yukarıdaki liste kullanıcının YAZDIĞI künye; buradaki değerler
 * dosyanın kendisinden okundu. İkisi ayrı kutularda duruyor ve bu
 * bilinçli: çeliştiklerinde hangisinin ne olduğu görünmeli. Kullanıcı
 * "Canon EOS Ra" yazmış ama dosyada "NIKON D810A" varsa, bu bir bilgi —
 * tek listede birleştirseydik biri diğerini sessizce ezerdi.
 *
 * Hiç EXIF yoksa kutu ÇİZİLMİYOR. İşlenmiş astrofotoğrafların çoğunda
 * EXIF yığınlama sırasında kayboluyor ve bu normal; altı tire gösteren
 * bir kutu, eksik bir şey varmış izlenimi verirdi.
 */
function ExifPanel({ photo }: { photo: AstroPhoto }) {
  const exif = photo.exif;
  if (!exif) return null;

  const rows: [string, string][] = [];
  if (exif.camera) rows.push(['Kamera (dosya)', exif.camera]);
  if (exif.lens) rows.push(['Lens (dosya)', exif.lens]);
  if (exif.iso !== null) rows.push(['ISO', String(exif.iso)]);
  if (exif.focalMm !== null)
    rows.push(['Odak uzaklığı', `${Number(exif.focalMm.toFixed(1))} mm`]);
  if (exif.apertureF !== null)
    rows.push(['Diyafram', `f/${Number(exif.apertureF.toFixed(1))}`]);
  if (exif.exposureSeconds !== null)
    rows.push(['Kare pozu', formatExposure(exif.exposureSeconds)]);

  if (!exifHasValues(exif) && !exif.gpsPresent) return null;

  return (
    <div className="rounded-card border border-border bg-surface-1 p-4">
      <p className="label caps mb-3 text-muted-foreground">
        Dosyadan okunan künye (EXIF)
      </p>

      {rows.length > 0 ? (
        <DL rows={rows} />
      ) : (
        <p className="text-meta text-faint">
          Dosyada teknik künye alanı bulunamadı.
        </p>
      )}

      {exif.gpsPresent && (
        <p className="mt-3 rounded-card border border-cold/25 bg-cold/8 px-3 py-2 text-meta text-cold">
          Dosyada konum verisi vardı; <strong>yayımlanmadı</strong>.
          Koordinat veritabanına hiç yazılmıyor — konum yalnızca yukarıdaki
          etikette, senin seçtiğin görünürlük seviyesinde duruyor.
        </p>
      )}
    </div>
  );
}

function ExposureTab({ photo }: { photo: AstroPhoto }) {
  const total = totalIntegrationSeconds(photo.exposures);
  const c = photo.calibration;
  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-card border border-border">
        <table className="w-full min-w-96 text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-left text-xs tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Filtre</th>
              <th className="px-4 py-2.5 font-medium">Kare</th>
              <th className="px-4 py-2.5 font-medium">Pozlama</th>
              <th className="px-4 py-2.5 font-medium">Toplam</th>
            </tr>
          </thead>
          <tbody className="tabular">
            {photo.exposures.map((row) => (
              <tr
                key={row.filter}
                className="border-b border-border/50 last:border-0"
              >
                <td className="px-4 py-2.5 font-medium text-foreground">
                  {row.filter}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.frames}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {row.exposureSeconds < 1
                    ? `${(row.exposureSeconds * 1000).toFixed(0)} ms`
                    : `${row.exposureSeconds} sn`}
                </td>
                <td className="px-4 py-2.5 text-foreground">
                  {formatIntegration(exposureRowSeconds(row))}
                </td>
              </tr>
            ))}
            <tr className="bg-surface-1">
              <td
                className="px-4 py-2.5 font-semibold text-foreground"
                colSpan={3}
              >
                Toplam entegrasyon
              </td>
              <td className="px-4 py-2.5 font-semibold text-primary">
                {formatIntegration(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Kalibrasyon kareleri
        </h3>
        {c ? (
          <DL
            rows={[
              ['Dark', c.darks?.toString() ?? '—'],
              ['Flat', c.flats?.toString() ?? '—'],
              ['Bias', c.bias?.toString() ?? '—'],
              ['Dark-flat', c.darkFlats?.toString() ?? '—'],
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Kalibrasyon bilgisi paylaşılmamış.
          </p>
        )}
      </div>
    </div>
  );
}

function ProcessingTab({ photo }: { photo: AstroPhoto }) {
  return (
    <div className="space-y-4">
      <DL
        rows={[
          ['Yazılımlar', photo.processing.software.join(', ')],
          ['İşleme adımları', photo.processing.steps ?? '—'],
          ['Lisans', photo.license],
        ]}
      />
      <PlateSolvePanel solve={photo.solve} />

      {photo.processing.aiDeclared && (
        <p className="rounded-card border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-xs text-accent-blue">
          ℹ️ Fotoğrafçı, işlemede AI tabanlı araç (denoise/deconvolution vb.)
          kullanıldığını beyan etmiştir (şeffaflık politikası).
        </p>
      )}
    </div>
  );
}

/**
 * ALAN ÇÖZÜMÜ KÜNYESİ.
 *
 * Künyedeki hedef adı kullanıcının yazdığı bir İDDİA; buradaki değerler
 * fotoğraftaki yıldız desenlerinden çıkan bir ÖLÇÜM. Panel bu ayrımı
 * açıkça söylüyor — iki satırı aynı listede yan yana koymak, ikisini
 * aynı güvenilirlikte gösterirdi.
 *
 * Dört durum, dört farklı cümle. "Yok" hâlinde HİÇBİR ŞEY gösterilmiyor:
 * çözüm istenmemiş bir fotoğrafta boş bir kutu, eksik bir şey varmış
 * izlenimi verirdi.
 */
function PlateSolvePanel({ solve }: { solve: AstroPhoto['solve'] }) {
  if (solve.durum === 'yok') return null;

  if (solve.durum === 'kuyrukta') {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-4 py-3 text-meta text-muted-foreground">
        Alan çözümü sırada — yıldız desenlerinden kadraj hesaplanıyor.
        Sonuç birkaç dakika içinde burada görünecek.
      </p>
    );
  }

  if (solve.durum === 'basarisiz') {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-4 py-3 text-meta text-faint">
        Alan çözümü yapılamadı{solve.error ? ` — ${solve.error}` : '.'}
      </p>
    );
  }

  const derece = (value: number | null, basamak = 3) =>
    value === null ? '—' : `${value.toFixed(basamak)}°`;

  return (
    <div className="rounded-card border border-cold/25 bg-cold/8 px-4 py-3">
      <p className="label caps mb-2 text-cold">Alan çözümü · ölçüm</p>
      <DL
        rows={[
          ['Merkez (RA)', derece(solve.raDeg)],
          ['Merkez (Dec)', derece(solve.decDeg)],
          ['Dönüklük', derece(solve.rotationDeg, 1)],
          [
            'Ölçek',
            solve.scaleArcsecPx === null
              ? '—'
              : `${solve.scaleArcsecPx.toFixed(2)} ″/px`,
          ],
          [
            'Alan',
            solve.fieldWidthDeg && solve.fieldHeightDeg
              ? `${solve.fieldWidthDeg.toFixed(2)}° × ${solve.fieldHeightDeg.toFixed(2)}°`
              : '—',
          ],
        ]}
      />
      <p className="mt-2 text-meta text-faint">
        Bu değerler fotoğraftaki yıldız desenlerinden hesaplandı
        {solve.provider ? ` (${solve.provider})` : ''}; künyedeki hedef
        bilgisinden bağımsızdır.
      </p>
    </div>
  );
}

/**
 * KONUM SEKMESİ.
 *
 * Gizlilik politikası cümlesi buradan kaldırıldı: doğruydu ama her
 * fotoğrafın altında tekrar eden bir POLİTİKA metniydi ve kullanıcının o
 * ekranda sorduğu soruyu ("nasıl bir gökyüzü?") cevaplamıyordu. Politika
 * yerinde duruyor — yükleme sihirbazında, seçim yapılırken söyleniyor;
 * doğru yer orası, çünkü karar orada veriliyor.
 *
 * Yerine geçen Bortle şeridi aynı bilgiyi ölçekle veriyor.
 */
function LocationTab({ photo }: { photo: AstroPhoto }) {
  const loc = photo.location;
  const visibilityLabel = {
    exact: 'Tam koordinat',
    approximate: 'Yaklaşık konum',
    region: 'Bölge düzeyi',
    hidden: 'Gizli',
  }[loc.visibility];
  return (
    <div className="space-y-4">
      <DL
        rows={[
          ['Lokasyon', loc.label],
          ['Konum görünürlüğü', visibilityLabel],
        ]}
      />
      <BortleIndicator
        bortle={loc.bortle}
        city={photo.city}
        locationLabel={loc.label}
        sqm={loc.sqm}
      />
    </div>
  );
}

/* ── Küçük yardımcılar ── */

function DL({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="text-sm font-medium text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * BEĞENİ DÜĞMESİ.
 *
 * Tohum kayıtlarda veritabanı kimliği yok; o durumda düğme yerine sayı
 * duruyor. Tıklanabilir görünüp hiçbir şey yapmamak, tıklanamaz
 * görünmekten kötü.
 */
function LikeChip({ photo }: { photo: AstroPhoto }) {
  const like = usePhotoLike(photo.id, photo.likes);

  if (!like.canLike) {
    return <ActionChip>♥ {like.count}</ActionChip>;
  }

  return (
    <button
      type="button"
      onClick={() => void like.toggle()}
      disabled={like.busy}
      aria-pressed={like.liked}
      aria-label={like.liked ? 'Beğeniyi geri al' : 'Beğen'}
      title={like.error ?? undefined}
      className={cn(
        'tabular rounded-full border px-3 py-1.5 transition-colors',
        like.liked
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border bg-surface-1 text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      ♥ {like.count}
    </button>
  );
}

function ActionChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-1 px-3 py-1.5 text-muted-foreground">
      {children}
    </span>
  );
}
