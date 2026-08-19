import type { ReactNode } from 'react';
import { useUpNavigation } from '@/app/useUpNavigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { framingLink } from '@/features/targets/useActiveTarget';
import { Container } from '@/components/ui/Container';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RemoteImage } from '@/components/media/RemoteImage';
import { PlaceholderPage } from '@/components/PlaceholderPage';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  formatIntegration,
  totalIntegrationSeconds,
  exposureRowSeconds,
} from '@/domain/photography/integration';
import {
  oturumlariMetni,
  toplamGece,
  type CaptureSession,
} from '@/domain/photography/captureSession';
import { usePhotoCatalog } from '@/services/content/photos';
import { useAlanCozumuIstegi } from '@/services/photos/solveRequest';
import { useRoles } from '@/features/admin/useRoles';
import { indirmeAdi } from '@/domain/photography/indirmeAdi';
import { logDownload } from '@/services/photos/downloadMetrics';
import { guessConstellation } from '@/services/photos/constellation';
import { annotatedBlob } from './annotatedExport';
import {
  cozumGeometrisi,
  useAlandakiCisimler,
} from '@/services/content/fieldObjects';
import { useAlandakiYildizlar } from '@/services/content/fieldStars';
import { YILDIZ_ATFI } from '@/services/content/fieldStars';
import { useSavedPhoto } from '@/services/content/collections';
import { usePhotoLike } from '@/services/content/engagement';
import { PhotoComments } from './PhotoComments';
import { PhotoComparison } from './PhotoComparison';
import { PhotoViewer } from './PhotoViewer';
import { BortleIndicator } from './BortleIndicator';
import { RatingBadge } from './RatingBadge';
import { RatingChip } from './RatingChip';
import { VersionHistory } from './VersionHistory';
import { VersionUpload } from './VersionUpload';
import { ThumbCropEditor } from './ThumbCropEditor';
import { ShareKit } from './ShareKit';
import { OwnerOriginalDownload } from './OwnerOriginalDownload';
import { ReportButton } from '@/features/admin/ReportButton';
import { exifHasValues, photoTypeLabels } from './types';
import { familyOf, photoFamilies } from './families';
import { photoTargetHeading } from './photoHeading';
import { formatExposure } from '@/domain/photography/exif';
import type { AstroPhoto } from './types';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import { breadcrumbJsonLd, photoJsonLd } from '@/lib/seo';
import { useAuth } from '@/features/auth/AuthContext';
import { targets } from '@/features/targets/data';

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
    <PhotoDetail
      photo={photo}
      all={catalog.items}
      onRefresh={catalog.refresh}
    />
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
  /* Geri dönüş: geldiği yer varsa oraya, yoksa üst rotaya (FAZ 11). */
  const { geriDon } = useUpNavigation();
  const { user } = useAuth();
  const roles = useRoles();
  const [tab, setTab] = useState<TabId>('cekim');
  const integration = totalIntegrationSeconds(photo.exposures);
  const canEditPhoto = Boolean(
    photo.id && (roles.isAdmin || (user && photo.ownerId === user.id))
  );
  const family = photoFamilies[familyOf(photo.type)];
  const targetHeading = photoTargetHeading(photo);
  const targetSlug = targets.find(
    (target) =>
      target.catalog === photo.target.catalog ||
      target.aliases.includes(photo.target.catalog)
  )?.slug;

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
            ? {
                url: photo.image.url,
                alt: `${photo.title} — ${photo.target.catalog}`,
              }
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
        {/*
          ══════════════════════════════════════════════════════════════
          GERİ DÖNÜŞ ÜSTTE OLMALI (A03)

          "← Galeriye dön" düğmesi vardı ama sayfanın EN ALTINDAydı:
          fotoğrafın, yedi sekmenin, künyenin ve benzer fotoğrafların
          ardından. Galeriden gelip "bu değilmiş" diyen kullanıcı onu
          görmüyordu bile — geri dönmenin tek pratik yolu tarayıcının
          kendi geri düğmesiydi ve mobilde o da her zaman elin altında
          değil.

          Alttaki düğme KALDIRILMADI: uzun sayfayı sonuna kadar okuyan
          için orası da doğru yer. Aynı işi iki yerde sunmak burada
          tekrar değil, iki farklı okuma anına cevap.
        */}
        <div className="mb-4">
          <button
            type="button"
            onClick={geriDon}
            className="inline-flex items-center gap-1.5 rounded-card border border-border-strong px-3 py-1.5 text-meta text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            ← Galeriye dön
          </button>
        </div>

        <PhotoViewer photo={photo} />

        {/* Temel bilgi */}
        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {targetSlug ? (
                <Link
                  to={`/hedef/${targetSlug}`}
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
                >
                  {targetHeading}
                </Link>
              ) : (
                <span className="text-sm font-semibold text-primary">
                  {targetHeading}
                </span>
              )}
              <Badge
                tone={family.tone}
                className={cn('bg-surface-1/80', family.className)}
              >
                {family.label}
              </Badge>
            </div>
            {/* Fotoğraftan kadraja: "bunu ben de çekebilir miyim"
                sorusunun cevabı bir tık uzakta olmalı. */}
            {targetSlug && (
              <Link
                to={framingLink(targetSlug)}
                className="mt-1 inline-block text-meta text-muted-foreground transition-colors hover:text-primary"
              >
                Bu hedefi kadrajımda gör →
              </Link>
            )}
            <h1 className="mt-1 type-page text-foreground">{photo.title}</h1>
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
            {/* Puan verme eylem şeridinde: aşağıdaki panel görülmüyordu
                ve "yıldız verme düğmesi yok" diye bildirildi (G01). */}
            <RatingChip photo={photo} />
            <LikeChip photo={photo} />
            <ActionChip>💬 {photo.comments}</ActionChip>
            <SaveChip photo={photo} />
            <ShareChip photo={photo} />
            <DownloadChip photo={photo} />
            <ReportButton
              targetType="photo"
              targetId={photo.slug}
              targetPath={`/fotograf/${photo.slug}`}
            />
            {canEditPhoto && (
              <ButtonLink
                to={`/galeri/yukle?duzenle=${encodeURIComponent(photo.slug)}`}
                size="sm"
                variant="secondary"
              >
                Düzenle
              </ButtonLink>
            )}
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
            <VersionHistory
              versions={photo.versions}
              canManage={Boolean(user && photo.ownerId === user.id)}
              onDeleted={onRefresh}
            />
          ) : (
            <p className="mb-4 text-body-sm text-muted-foreground">
              Bu kaydın tek bir işlemesi var. İkinci bir sürüm eklendiğinde
              ikisi sürgüyle yan yana karşılaştırılabilir.
            </p>
          )}

          <div className="mt-4">
            <VersionUpload photo={photo} onUploaded={onRefresh} />
          </div>

          {/* Kart kadrajını sonradan düzenleme — sahibe (C09). */}
          <ThumbCropEditor photo={photo} onSaved={onRefresh} />

          {/* Paylaşım kiti — sahibe (D01, D02). */}
          <ShareKit photo={photo} />

          {/* Orijinal dosya indirme — sahibe, indirme tercihinden bağımsız (X04). */}
          <OwnerOriginalDownload photo={photo} />
        </section>

        {/*
          BÜYÜK PUANLAMA PANELİ KALDIRILDI.

          Panel buradaydı ve gerekçesi vardı: "hüküm vermeden önce
          künyeye bak". Ama görülmediği için kullanıcı "yıldız verme
          düğmesi yok" diye bildirdi; düğme eylem şeridine taşındı ve o
          andan sonra aynı iş sayfada İKİ KEZ duruyordu — üstte bir
          düğme, aşağıda bir panel.

          Ortalama ve oy sayısı kaybolmadı: `RatingBadge` başlığın
          yanında duruyor, oy verme ise şeritteki düğmede.
        */}

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
              /* Açıklama başlığın tanımıydı: "benzer" zaten "aynı hedef
                 veya aynı tür" demek. */
              title="Benzer Fotoğraflar"
              linkTo="/galeri"
            />
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((p) => (
                <li key={p.slug}>
                  <Link to={`/fotograf/${p.slug}`} className="group block">
                    {/* Gerçek thumbnail; yoksa RemoteImage yıldız alanı çizer (A10). */}
                    <div className="aspect-[4/3] w-full overflow-hidden border border-border">
                      <RemoteImage
                        src={p.image?.thumbUrl ?? p.image?.url}
                        alt={p.title}
                        seed={p.slug}
                        tint={p.gradient}
                        sizes="(max-width: 1024px) 45vw, 22vw"
                        className="transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </div>
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
          <Button variant="secondary" onClick={geriDon}>
            ← Galeriye dön
          </Button>
        </div>
      </Container>
    </>
  );
}

/* ── Sekme içerikleri ── */

/**
 * Çekim oturumlarını okunur biçime çevirir (C06). Kayıtta oturum varsa
 * onlar; yoksa eski tek `capturedAt` tarihinden tek örtük oturum türetilir
 * — tohum ve eski kayıtlar da çalışmaya devam etsin.
 */
function fotografOturumlari(photo: AstroPhoto): CaptureSession[] {
  if (photo.captureSessions && photo.captureSessions.length > 0) {
    return photo.captureSessions;
  }
  const gun = photo.capturedAt?.slice(0, 10);
  return gun
    ? [{ id: `captured-${photo.slug}`, startsOn: gun, endsOn: null }]
    : [];
}

function CaptureTab({ photo }: { photo: AstroPhoto }) {
  const oturumlar = fotografOturumlari(photo);
  const tarihMetni = oturumlariMetni(oturumlar) || '—';
  const geceSayisi = toplamGece(oturumlar);
  const cokOturum = oturumlar.length > 1;

  /*
   * TAKIMYILDIZ BOŞSA ÇÖZÜMDEN TÜRETİLİYOR (B07).
   *
   * Yalnızca alan BOŞKEN ve alan çözümü VARKEN soruluyor: kullanıcının
   * kendi beyanı hiçbir zaman ezilmiyor. Sonuç "tahmin" etiketiyle
   * gösteriliyor — ölçülen isabet %91 ve bu, bir künye alanını sessizce
   * doldurmak için yeterli değil.
   */
  const [tahmin, setTahmin] = useState<string | null>(null);
  const raDeg = photo.solve.raDeg;
  const decDeg = photo.solve.decDeg;
  const takimyildizBos = !photo.target.constellation;

  useEffect(() => {
    if (!takimyildizBos || raDeg == null || decDeg == null) return;
    let canli = true;
    void guessConstellation(raDeg, decDeg).then((sonuc) => {
      if (canli && sonuc) setTahmin(sonuc.name);
    });
    return () => {
      canli = false;
    };
  }, [takimyildizBos, raDeg, decDeg]);

  const takimyildiz = photo.target.constellation
    ? photo.target.constellation
    : tahmin
      ? `${tahmin} (alan çözümünden tahmin)`
      : '';

  return (
    <DL
      rows={[
        ['Astronomik hedef', `${photo.target.name} (${photo.target.catalog})`],
        ['Takımyıldız', takimyildiz],
        ['Fotoğraf türü', photoTypeLabels[photo.type]],
        [cokOturum ? 'Çekim tarihleri' : 'Çekim tarihi', tarihMetni],
        /* Birden çok gece/oturum varsa toplam gece emeği ayrı bir satır;
           tek gecede gereksiz ("1 gece" demek anlamsız). */
        ...(geceSayisi > 1
          ? ([['Çekim geceleri', `${geceSayisi} gece`]] as [string, string][])
          : []),
        [
          'Toplam entegrasyon',
          formatIntegration(totalIntegrationSeconds(photo.exposures)),
        ],
        ['İşleme paleti', photo.palette],
      ]}
    />
  );
}

/**
 * KÜNYEDEKİ EKİPMAN TIKLANABİLİR (§17.6).
 *
 * "Bu teleskopla başka ne çekilmiş" sorusunun cevabı galeride var ama
 * oraya ulaşmanın yolu yoktu: kullanıcı adı kopyalayıp galeriye gidip
 * süzgeci elle kurmak zorundaydı. Bağlantı doğrudan süzgeçlenmiş
 * galeriye gidiyor — süzgeç parametresi `gallerySpec`teki `param`
 * değeriyle aynı olmak ZORUNDA, yoksa bağlantı galeriyi süzgeçsiz açar
 * ve hata sessiz olur.
 */
function EkipmanBaglantisi({ param, value }: { param: string; value: string }) {
  /* Boş ya da "—" değerde bağlantı çizilmiyor: hiçbir fotoğrafın
     eşleşmediği bir süzgece götürmek, çalışmayan bir düğmedir. */
  if (!value || value === '—') return <>{value || '—'}</>;

  return (
    <Link
      to={`/galeri?${param}=${encodeURIComponent(value)}`}
      className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
    >
      {value}
    </Link>
  );
}

function EquipmentTab({ photo }: { photo: AstroPhoto }) {
  const s = photo.setup;
  return (
    <div className="space-y-6">
      <DL
        rows={[
          [
            'Optik',
            <EkipmanBaglantisi key="o" param="optik" value={s.optic} />,
          ],
          [
            'Kamera',
            <EkipmanBaglantisi key="k" param="kamera" value={s.camera} />,
          ],
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
          Dosyada konum verisi vardı; <strong>yayımlanmadı</strong>. Koordinat
          veritabanına hiç yazılmıyor — konum yalnızca yukarıdaki etikette,
          senin seçtiğin görünürlük seviyesinde duruyor.
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
  /*
   * ══════════════════════════════════════════════════════════════════
   * ÇÖZÜM DÜĞMESİ ARTIK SAHİBİNİN DEĞİL, YÖNETİCİNİN.
   *
   * Düğme fotoğrafın SAHİBİNE gösteriliyordu ve gerekçesi şuydu: çözüm
   * yalnızca yükleme anında tetikleniyordu, o an kaçırılmışsa bir daha
   * kimse tetiklemiyordu ve sahibinden başka isteyecek kimse yoktu.
   *
   * O gerekçe kalktı. Gönderim `plate-solve-poll` içindeki cron turuna
   * taşındı: bekleyen her fotoğraf beş dakikada bir kendiliğinden
   * gönderiliyor, yeni yükleme de eski birikmiş kayıt da. Sahibinin
   * basacağı bir düğme, sistemin zaten yaptığı işi elle yaptırmaktan
   * ibaret kaldı — ve basıldığında "kuyruğa alındı" demek dışında bir
   * şey yapmıyordu.
   *
   * Yönetimde duruyor çünkü orada hâlâ bir işe yarıyor: üç denemede de
   * çözülememiş bir kareyi elle zorlamak. Sunucu tarafı da aynı sınırı
   * bağımsız uyguluyor (`plate-solve` kendi kimlik kontrolünü yapıyor);
   * buradaki kontrol yalnızca arayüz.
   */
  const roles = useRoles();
  const canManage = roles.isAdmin;

  return (
    <div className="space-y-4">
      <DL
        rows={[
          ['Yazılımlar', photo.processing.software.join(', ')],
          ['İşleme adımları', photo.processing.steps ?? '—'],
          ['Lisans', photo.license],
          [
            'İndirme izni',
            photo.access?.allowDownload
              ? 'Gösterim kopyası indirilebilir'
              : 'Kapalı',
          ],
          [
            'Watermark tercihi',
            photo.access?.watermarkRequired
              ? 'Kaynak/filigran şartı var'
              : 'Zorunlu değil',
          ],
        ]}
      />
      <PlateSolvePanel
        solve={photo.solve}
        photoId={photo.id ?? ''}
        /* Kimliği olmayan kayıt tohum veriden geliyor ve sunucuda
           karşılığı yok; ona çözüm istemek 404 ile döner. */
        canManage={canManage && Boolean(photo.id)}
      />

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
 * Dört durum, dört farklı cümle. "Yok" hâlinde YÖNETİCİYE bir düğme
 * gösteriliyor, başkasına hiçbir şey: çözüm henüz gelmemiş bir
 * fotoğrafta boş bir kutu izleyiciye eksik bir şey varmış izlenimi
 * verirdi — oysa çözüm sırada ve kendiliğinden gelecek.
 */
function PlateSolvePanel({
  solve,
  photoId,
  canManage,
}: {
  solve: AstroPhoto['solve'];
  photoId: string;
  canManage: boolean;
}) {
  const istek = useAlanCozumuIstegi(photoId);

  const dugme = canManage ? (
    <CozumDugmesi istek={istek} durum={solve.durum} />
  ) : null;

  if (solve.durum === 'yok') {
    if (!canManage) return null;
    return (
      <div className="rounded-card border border-border bg-surface-2 px-4 py-3">
        <p className="text-meta leading-relaxed text-muted-foreground">
          Bu fotoğrafın alan çözümü yok. Çözüm, yıldız desenlerinden kadrajın
          gökyüzündeki yerini hesaplar; sonuç görüntünün üstüne katalog
          etiketleri olarak da düşer.
        </p>
        <div className="mt-2">{dugme}</div>
      </div>
    );
  }

  if (solve.durum === 'kuyrukta') {
    return (
      <p className="rounded-card border border-border bg-surface-2 px-4 py-3 text-meta text-muted-foreground">
        Alan çözümü sırada — yıldız desenlerinden kadraj hesaplanıyor. Sonuç
        birkaç dakika içinde burada görünecek.
      </p>
    );
  }

  if (solve.durum === 'basarisiz') {
    return (
      <div className="rounded-card border border-border bg-surface-2 px-4 py-3">
        <p className="text-meta text-faint">
          Alan çözümü yapılamadı{solve.error ? ` — ${solve.error}` : '.'}
        </p>
        {/* İkinci deneme çoğu zaman tutuyor: çözücü düşük yıldız
            sayısında ve yoğun bulutsu alanlarında bazen bulamıyor. */}
        <div className="mt-2">{dugme}</div>
      </div>
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
        bilgisinden bağımsızdır. Görüntünün üstündeki “Alan çözümü” düğmesi
        katalog etiketlerini açıyor.
      </p>
      {/* ATIF ARAYÜZDE, YALNIZCA KODDA DEĞİL. Yıldız adları dış
          kataloglardan geliyor ve kaynağını yazmak hem şart hem de
          okuyana "bu ad nereden geliyor" sorusunun cevabını veriyor. */}
      <p className="mt-1 text-meta text-faint">{YILDIZ_ATFI}</p>
      {dugme && <div className="mt-2">{dugme}</div>}
    </div>
  );
}

/**
 * Çözüm isteme düğmesi — üç durumu da tek yerde anlatıyor.
 *
 * Ayrı bileşen çünkü panelin dört dalında da aynı düğme görünüyor ve
 * dördünde kopyalamak, birinde hata mesajını göstermeyi unutmaya açık
 * kapı bırakırdı.
 */
function CozumDugmesi({
  istek,
  durum,
}: {
  istek: ReturnType<typeof useAlanCozumuIstegi>;
  durum: AstroPhoto['solve']['durum'];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="secondary"
        disabled={istek.isPending || durum === 'kuyrukta'}
        onClick={() => istek.mutate()}
      >
        {istek.isPending
          ? 'Gönderiliyor…'
          : durum === 'cozuldu'
            ? 'Yeniden çöz'
            : 'Alan çözümü iste'}
      </Button>
      {istek.isError && (
        <span className="text-meta text-danger">
          {(istek.error as Error).message}
        </span>
      )}
      {istek.isSuccess && (
        <span className="text-meta text-muted-foreground">
          {istek.data.durum === 'kuyrukta'
            ? 'Kuyruğa alındı — sonuç birkaç dakika içinde.'
            : (istek.data.aciklama ?? 'İstek alındı.')}
        </span>
      )}
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

  /*
   * İKİ NESİL KAYIT, İKİ FARKLI GÖSTERİM.
   *
   * `20260807160000` sonrası yüklenen kayıtlarda konum İL ve İLÇE
   * kolonlarında ve ikisi de zorunlu. Öncekilerde serbest bir metin
   * ("Saklıkent, Antalya", "evin balkonu") ve kullanıcının seçtiği bir
   * görünürlük seviyesi var.
   *
   * Eski kayıtları yeni biçimde göstermek için etiketten il çıkarmak,
   * tam olarak bu değişikliğin ortadan kaldırdığı tahmini geri
   * getirirdi. Onlar kendi etiketleriyle görünüyor.
   *
   * GÖRÜNÜRLÜK SATIRI TAMAMEN KALKTI. Eski kayıtlarda "Konum
   * görünürlüğü: Yaklaşık konum" diye bir satır yazıyordu ve okuyana
   * hiçbir şey söylemiyordu: konumun kendisi zaten üstteki satırda ne
   * kadar açıksa o kadar yazılı, hangi seviyede saklandığı ise
   * yükleyenin verdiği bir karar — izleyicinin işi değil.
   */
  const yapisal = Boolean(photo.city && photo.district);

  return (
    <div className="space-y-4">
      <DL
        rows={
          yapisal
            ? [
                ['İl', photo.city],
                ['İlçe', photo.district!],
              ]
            : [['Lokasyon', loc.label]]
        }
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

function DL({ rows }: { rows: [string, ReactNode][] }) {
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

/**
 * KAYDET — §7.3'ün "kaydet"i.
 *
 * Buraya kadar tıklanamayan bir `<span>`di: imleç bile değişmiyordu.
 * Kullanıcı bir fotoğrafı beğenebiliyor ama SAKLAYAMIYORDU; "sonra
 * bakarım" diye bir yer yoktu.
 *
 * Tohum fotoğrafta `photo.id` yok — o durumda çip yine düz metin kalıyor
 * (kaydı olmayan bir kaydı saklamak anlamsız), tıpkı beğenide olduğu
 * gibi.
 */
export function SaveChip({ photo }: { photo: AstroPhoto }) {
  const save = useSavedPhoto(photo.id);

  if (!save.canSave) {
    return <ActionChip>Koleksiyona kaydet</ActionChip>;
  }

  /*
   * KAYDET = KOLEKSİYONA EKLE, cihaza indirmek DEĞİL (B06).
   *
   * "Kaydet" tek başına iki şeyi çağrıştırıyordu: dosyayı bilgisayara
   * indirmek mi, yoksa "sonra bakarım" listesine eklemek mi. İndirme
   * artık ayrı bir menüde ("İndir"); bu düğme yalnızca koleksiyon.
   * Ayrım metnin kendisinde: buton "Koleksiyona kaydet", kaydedilince
   * "Koleksiyonda". Erişilebilir ad ve başlık da aynı sözcüğü kullanıyor
   * ki ekran okuyucuda da indirmeyle karışmasın.
   */
  const etiket = save.saved ? 'Koleksiyonda' : 'Koleksiyona kaydet';
  const erisimAdi = save.saved ? 'Koleksiyondan çıkar' : 'Koleksiyona kaydet';

  return (
    <button
      type="button"
      onClick={() => void save.toggle()}
      disabled={save.busy}
      aria-pressed={save.saved}
      aria-label={erisimAdi}
      title={save.error ?? erisimAdi}
      className={cn(
        'rounded-full border px-3 py-1.5 transition-colors',
        save.saved
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border bg-surface-1 text-muted-foreground hover:border-border-strong hover:text-foreground'
      )}
    >
      {etiket}
    </button>
  );
}

/**
 * PAYLAŞ.
 *
 * SUNUCU GEREKTİRMİYORDU AMA YİNE DE ÖLÜYDÜ. Paylaşmak bir adres
 * kopyalamaktan ibaret; arkasında tablo yok, bu yüzden "altyapı
 * bekliyordu" denemez — sadece yazılmamıştı.
 *
 * Önce `navigator.share` deneniyor (telefonda işletim sisteminin kendi
 * paylaşım sayfası açılıyor), yoksa panoya kopyalanıyor. İkisi de yoksa
 * çip düz metne dönüyor: çalışmayan bir düğme göstermek yerine.
 */
function ShareChip({ photo }: { photo: AstroPhoto }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');

  const canShare =
    typeof navigator !== 'undefined' &&
    (typeof navigator.share === 'function' ||
      typeof navigator.clipboard?.writeText === 'function');

  if (!canShare) return <ActionChip>Paylaş</ActionChip>;

  async function share() {
    const url = `${window.location.origin}/fotograf/${photo.slug}`;
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: photo.title, url });
        setState('idle');
        return;
      }
      await navigator.clipboard.writeText(url);
      setState('copied');
      /* İki saniye sonra eski etiketine dönüyor: kalıcı "kopyalandı",
         ikinci kez kopyalanıp kopyalanmadığını belirsiz bırakırdı. */
      setTimeout(() => setState('idle'), 2000);
    } catch {
      /* Kullanıcı paylaşım sayfasını kapattıysa da buraya düşüyor;
         "hata" demek yerine sessizce eski hâline dönüyor. */
      setState('error');
      setTimeout(() => setState('idle'), 2000);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="rounded-full border border-border bg-surface-1 px-3 py-1.5 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {state === 'copied'
        ? 'Bağlantı kopyalandı'
        : state === 'error'
          ? 'Paylaşılamadı'
          : 'Paylaş'}
    </button>
  );
}

/**
 * ══════════════════════════════════════════════════════════════════════
 * İNDİR — İKİ SEÇENEK, VE GERÇEKTEN DOSYA VERİYOR
 *
 * Düğme `<a href={...} download>` idi ve HİÇ İNDİRMİYORDU: `download`
 * niteliği FARKLI KAYNAKTAKİ adreslerde tarayıcı tarafından yok
 * sayılıyor. Görsel depolama alan adında, sayfa astrohub.com.tr'de —
 * yani tarayıcı indirmek yerine görselin kendisine GİDİYOR. Kullanıcı
 * tam ekran bir resimle baş başa kalıyor ve uygulamadan çıkmış oluyor.
 *
 * Dosya artık `fetch` ile alınıp blob adresine çevriliyor; o adres AYNI
 * KAYNAKTA olduğu için `download` çalışıyor ve ad kaydın kendisinden
 * türüyor (depolamadaki ad `display.jpg`ti ve indirme klasöründe on
 * tanesi yan yana duruyordu).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN İKİ SEÇENEK
 *
 * Alan çözümlü kopya ayrı bir dosya: paylaşırken bazen ölçüm istiyorsun
 * (nerede, hangi ölçekte), bazen yalnızca fotoğrafı. Tek dosyaya
 * etiketleri gömmek ikinci ihtiyacı imkânsız kılardı.
 *
 * Açıklamalı kopya astrometry.net'ten indirilmiyor, BURADA çiziliyor.
 * Gerekçesi `annotatedExport` başlığında: onların görüntüsü yalnızca
 * kendi kataloğunu biliyor ve ekrandaki etiketlerle ayrışırdı.
 *
 * Çözüm yoksa ikinci seçenek kapalı ve sebebi yazılı — tıklanabilir
 * görünüp hata veren bir seçenek, olmayandan kötü.
 */
export function DownloadChip({ photo }: { photo: AstroPhoto }) {
  const [acik, setAcik] = useState(false);
  const [durum, setDurum] = useState<'idle' | 'busy' | 'error'>('idle');
  const kapsayici = useRef<HTMLDivElement>(null);

  const geometri = useMemo(() => cozumGeometrisi(photo.solve), [photo.solve]);
  /* Katalog sorguları yalnızca menü AÇIKKEN kuruluyor: her fotoğraf
     sayfasında peşin iki sorgu, indirmeyecek kullanıcı için boşuna. */
  const { data: cisimler } = useAlandakiCisimler(geometri, acik);
  const { data: yildizlar } = useAlandakiYildizlar(geometri, acik);

  useEffect(() => {
    if (!acik) return;
    const disari = (e: MouseEvent) => {
      if (!kapsayici.current?.contains(e.target as Node)) setAcik(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAcik(false);
    };
    document.addEventListener('mousedown', disari);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', disari);
      document.removeEventListener('keydown', esc);
    };
  }, [acik]);

  if (!photo.access?.allowDownload || !photo.image?.url) return null;
  const kaynak = photo.image.url;
  const cozuldu = photo.solve.durum === 'cozuldu' && geometri !== null;

  function kaydet(blob: Blob, ad: string) {
    const adres = URL.createObjectURL(blob);
    const baglanti = document.createElement('a');
    baglanti.href = adres;
    baglanti.download = ad;
    document.body.appendChild(baglanti);
    baglanti.click();
    baglanti.remove();
    /* Adres hemen değil, tarayıcı indirmeyi başlattıktan sonra
       bırakılıyor: aynı karede iptal etmek indirmeyi düşürüyor. */
    setTimeout(() => URL.revokeObjectURL(adres), 10_000);
  }

  async function indir(annotated: boolean) {
    setDurum('busy');
    try {
      if (annotated) {
        const blob = await annotatedBlob({
          imageUrl: kaynak,
          rotationDeg: photo.solve.rotationDeg,
          fieldWidthDeg: photo.solve.fieldWidthDeg,
          cisimler: cisimler ?? [],
          yildizlar: yildizlar ?? [],
          kunye: `astrohub.com.tr · ${photo.target.catalog} · @${photo.user.username}`,
        });
        kaydet(
          blob,
          indirmeAdi([
            'astrohub',
            photo.target.catalog,
            photo.title,
            'alan-cozumlu',
          ])
        );
        logDownload('annotated', photo.id);
      } else {
        const yanit = await fetch(kaynak);
        if (!yanit.ok) throw new Error(String(yanit.status));
        kaydet(
          await yanit.blob(),
          indirmeAdi(['astrohub', photo.target.catalog, photo.title])
        );
        logDownload('foto', photo.id);
      }
      setDurum('idle');
      setAcik(false);
    } catch {
      setDurum('error');
      setTimeout(() => setDurum('idle'), 2500);
    }
  }

  return (
    <div className="relative" ref={kapsayici}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        disabled={durum === 'busy'}
        onClick={() => setAcik((a) => !a)}
        className="rounded-full border border-border bg-surface-1 px-3 py-1.5 text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground disabled:opacity-60"
      >
        {durum === 'busy'
          ? 'Hazırlanıyor…'
          : durum === 'error'
            ? 'İndirilemedi'
            : 'İndir'}
      </button>

      {acik && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-64 rounded-card border border-border bg-surface-1 p-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void indir(false)}
            className="block w-full rounded-card px-3 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-surface-2"
          >
            Fotoğraf (JPEG)
            <span className="block text-meta text-faint">
              Yayımlanan kopya — en uzun kenar 2048 px
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!cozuldu}
            onClick={() => void indir(true)}
            className="block w-full rounded-card px-3 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:bg-transparent"
          >
            Alan çözümlü (JPEG)
            <span className="block text-meta text-faint">
              {cozuldu
                ? 'Katalog etiketleri, ölçek çubuğu ve kuzey oku üstünde'
                : photo.solve.durum === 'kuyrukta'
                  ? 'Alan çözümü sırada — hazır olunca açılır'
                  : 'Bu kare için alan çözümü yok'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function ActionChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-1 px-3 py-1.5 text-muted-foreground">
      {children}
    </span>
  );
}
