import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/features/auth/AuthContext';
import { EquipmentPicker } from '@/features/equipment/EquipmentPicker';
import { useEquipmentCatalog } from '@/services/content/equipment';
import {
  uploadPhoto,
  publishPhoto,
  requestPlateSolve,
} from '@/services/photos/upload';
import { checkUploadSize, formatBytes } from '@/domain/membership/quota';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Field } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import {
  totalIntegrationSeconds,
  formatIntegration,
  type FilterExposure,
} from '@/domain/photography/integration';
import {
  photoTypeLabels,
  PHOTO_LICENSE,
  type PhotoType,
  type ProcessingPalette,
} from '@/features/photos/types';
import { TargetPicker } from '@/features/targets/TargetPicker';
import { SetupSelect } from './SetupSelect';
import { getTargetBySlug } from '@/features/targets/data';
import { resolveTargetId } from '@/services/content/targets';
import { kindToPhotoType, type TargetKind } from '@/domain/targets/derive';
import { guessTargetFromFilename } from '@/features/targets/codeGuess';
import { cn } from '@/lib/cn';
import { PageMeta } from '@/components/seo/PageMeta';
import {
  parseExif,
  cameraLabel,
  formatExposure,
  type ExifData,
} from '@/domain/photography/exif';
import { Alert } from '@/components/ui/Alert';
import { CropTool } from './CropTool';
import { slugify } from '@/lib/slug';
import {
  applyCropToFile,
  isFullFrame,
  FULL_FRAME,
  type CropRect,
} from '@/domain/photography/crop';

/**
 * İşleme paleti seçenekleri — `ProcessingPalette` ile birebir.
 *
 * Açıklamalar ürünün parçası: paleti ilk kez seçen biri "SHO" kısaltmasını
 * bilmek zorunda değil ama hangi filtrelerle çektiğini biliyor.
 */
const PALET_SECENEKLERI: { value: ProcessingPalette; label: string }[] = [
  { value: 'RGB', label: 'RGB — kırmızı/yeşil/mavi' },
  { value: 'LRGB', label: 'LRGB — parlaklık + RGB' },
  { value: 'SHO', label: 'SHO — Hubble paleti (SII/Hα/OIII)' },
  { value: 'HOO', label: 'HOO — Hα + OIII' },
  { value: 'Mono', label: 'Mono — tek kanal' },
];

const steps = [
  'Dosya',
  'Obje ve Katalog',
  'Çekim Oturumu',
  'Setup',
  'Pozlama',
  'Yayın',
] as const;

/**
 * `kindToPhotoType` alan katmanında string döner: domain katmanı arayüz
 * tiplerine bağımlı olmamalı (§12.5). Sınırda bir kez doğruluyoruz —
 * doğrulamadan cast etmek, tabloya yeni bir tür eklendiğinde geçersiz bir
 * değeri sessizce kaydederdi.
 */
function isPhotoType(value: string): value is PhotoType {
  return value in photoTypeLabels;
}

const selectClass =
  'h-11 w-full rounded-card border border-border bg-surface-1 px-3 text-sm text-foreground focus:border-primary/60';

interface WizardState {
  fileName: string;
  targetSlug: string;
  /** Seçim listesini daraltan obje tipi; hedef seçimini kaydetmez. */
  targetKind: TargetKind | 'hepsi';
  type: PhotoType;
  title: string;
  capturedAt: string;
  locationLabel: string;
  locationVisibility: 'exact' | 'approximate' | 'region' | 'hidden';
  optic: string;
  camera: string;
  mount: string;
  /* Katalog bağı — seçim yapıldıysa model slug'ı. Serbest metin girildiyse
     boş kalır ve künyede yalnızca metin saklanır. */
  opticSlug?: string;
  cameraSlug?: string;
  mountSlug?: string;
  /* Künye setup'tan dolduğunda bağ da kuruluyor; künye alanları yine
     fotoğrafın kendi kaydında saklanıyor ki setup sonradan değişirse
     eski fotoğrafın künyesi bozulmasın. */
  setupId?: string;
  setupFilter?: string;
  setupGuide?: string;
  effectiveFocalMm?: number | null;
  effectiveFRatio?: number | null;
  pixelScaleArcsec?: number | null;
  exposures: FilterExposure[];
  /** İşleme paleti — boş bırakılamaz, yayın adımına geçişi kilitliyor. */
  palette: ProcessingPalette | '';
  software: string;
  aiDeclared: boolean;
  license: string;
  allowDownload: boolean;
  watermarkRequired: boolean;
  copyrightConfirmed: boolean;
}

const initialState: WizardState = {
  fileName: '',
  targetSlug: '',
  targetKind: 'hepsi',
  type: 'deep-sky',
  title: '',
  capturedAt: '',
  locationLabel: '',
  locationVisibility: 'approximate',
  optic: '',
  camera: '',
  mount: '',
  exposures: [{ filter: 'L', frames: 0, exposureSeconds: 0 }],
  palette: '',
  software: '',
  aiDeclared: false,
  /*
   * Lisans artık seçilmiyor — kullanım şartlarındaki tek kural geçerli.
   * Alan durumda kalıyor çünkü künyede ve fotoğraf sayfasında
   * gösteriliyor; değeri tek yerden geliyor.
   */
  license: PHOTO_LICENSE,
  allowDownload: false,
  watermarkRequired: true,
  copyrightConfirmed: false,
};

/**
 * Fotoğraf yükleme sihirbazı (§7.4) — 6 adım.
 *
 * BU YORUM ESKİDEN "gerçek dosya yükleme + EXIF okuma + sunucu pipeline'ı
 * Faz 1.2'de bağlanır" diyordu ve YANLIŞTI: üçü de bağlı. EXIF tarayıcıda
 * okunuyor (`domain/photography/exif`), dosya küçültülüp `photos`
 * kovasına yazılıyor, satır `astro_photos`a düşüyor
 * (`services/photos/upload`). Yanlış bırakılan bir "henüz yok" notu,
 * sonraki okuyucuyu var olan bir özelliği yeniden yazmaya iter.
 */
export function UploadWizardPage() {
  /*
   * KIRPMA DURUMU DOSYADAN AYRI TUTULUYOR.
   *
   * Kırpılmış dosyayı `file` yerine koymak akla yakın ama yanlış:
   * kullanıcı oranı değiştirdiğinde yeniden kırpmak için ÖZGÜN dosya
   * gerekiyor. Kırpılmışın üstüne kırpmak, her ayarda biraz daha kalite
   * kaybetmek demekti. Dosya olduğu gibi duruyor; kırpma yalnızca bir
   * dikdörtgen ve gönderim anında bir kez uygulanıyor.
   */
  const [crop, setCrop] = useState<CropRect>(FULL_FRAME);
  const [exif, setExif] = useState<ExifData | null>(null);
  const [exifState, setExifState] = useState<'idle' | 'reading' | 'read' | 'none'>(
    'idle'
  );
  const [useExifGps, setUseExifGps] = useState(false);
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);

  /* Seçilen dosyanın kendisi — özet ekranında ve yüklemede gerekiyor. */
  const [file, setFile] = useState<File | null>(null);
  const [publishState, setPublishState] = useState<
    'idle' | 'hazirlaniyor' | 'kucultuluyor' | 'yukleniyor' | 'kaydediliyor' | 'bitti'
  >('idle');
  const [publishError, setPublishError] = useState<string | null>(null);

  const { user, configured } = useAuth();
  const equipmentCatalog = useEquipmentCatalog();

  /**
   * Seçilen slug'ın veritabanı kimliğini bulur.
   *
   * Tohum katalogda kimlik yok (uydurmak, var olmayan bir satıra referans
   * üretmek olurdu). Kimlik bulunamazsa ekipman bağı kurulmuyor ve ad
   * künyede serbest metin olarak saklanıyor — bağ kurulamaması, veriyi
   * kaybetmek için sebep değil.
   */
  function equipmentId(slug: string | undefined): string | null {
    if (!slug) return null;
    return equipmentCatalog.items.find((m) => m.slug === slug)?.id ?? null;
  }
  const navigate = useNavigate();

  /* Seçili hedef künyeye etiket olarak da yazılıyor: veritabanı bağı
     kurulamazsa (katalog henüz taşınmamışsa) fotoğrafın neyin fotoğrafı
     olduğu bilgisi kaybolmasın. */
  const selectedTarget = getTargetBySlug(state.targetSlug);

  const sizeVerdict = file ? checkUploadSize(file.size) : null;

  /**
   * Yükleme + yayımlama.
   *
   * Kota kontrolü BURADA YAPILMIYOR: veritabanı tetikleyicisi yapıyor
   * (§4.2) ve hata mesajı kotayı da kademeyi de söylüyor. İstemcide ikinci
   * bir kontrol koymak iki sınırın ayrışması riskini getirir, hiçbir
   * güvence eklemez.
   */
  async function submit() {
    if (!file || !user) return;
    setPublishError(null);

    try {
      /*
       * KIRPMA GÖNDERİM ANINDA, TEK SEFERDE UYGULANIYOR.
       *
       * Her ayarda dosyayı yeniden üretmek, JPEG'de her seferinde biraz
       * daha kalite kaybetmek olurdu. Kırpma yokken `applyCropToFile`
       * dosyaya hiç dokunmuyor ve özgün bayt dizisi olduğu gibi
       * yükleniyor.
       */
      const gonderilecek = await applyCropToFile(file, crop);

      const result = await uploadPhoto(
        {
          file: gonderilecek,
          userId: user.id,
          slug: slugifyPhoto(state.title || file.name),
          title: state.title || file.name,
          photoType: state.type,
          palette: state.palette,
          capturedAt: state.capturedAt || undefined,
          locationLabel: state.locationLabel || undefined,
          locationVisibility: state.locationVisibility,
          license: state.license,
          allowDownload: state.allowDownload,
          watermarkRequired: state.watermarkRequired,
          aiDeclared: state.aiDeclared,
          copyrightConfirmed: state.copyrightConfirmed,
          objectId: await resolveTargetId(state.targetSlug),
          targetLabel: selectedTarget
            ? `${selectedTarget.catalog} — ${selectedTarget.name}`
            : null,
          opticId: equipmentId(state.opticSlug),
          cameraId: equipmentId(state.cameraSlug),
          mountId: equipmentId(state.mountSlug),
          setupId: state.setupId ?? null,
          /*
           * Hesaplanan değerler künyeye YAZILIYOR, sonradan türetilmiyor:
           * kullanıcı ara halkayı ya da reduceri değiştirdiğinde geçmiş
           * fotoğrafın etkin odağı değişmemeli.
           */
          setup: {
            Optik: state.optic,
            Kamera: state.camera,
            Montür: state.mount,
            ...(state.setupFilter ? { Filtre: state.setupFilter } : {}),
            ...(state.setupGuide ? { Guide: state.setupGuide } : {}),
            ...(state.effectiveFocalMm != null
              ? { 'Etkin odak': `${Math.round(state.effectiveFocalMm)} mm` }
              : {}),
            ...(state.effectiveFRatio != null
              ? { 'Etkin f/': `f/${state.effectiveFRatio.toFixed(1)}` }
              : {}),
            ...(state.pixelScaleArcsec != null
              ? { 'Piksel ölçeği': `${state.pixelScaleArcsec.toFixed(2)} ″/px` }
              : {}),
            Yazılım: state.software,
          },
          exposures: state.exposures,
          /*
           * DOSYADAN OKUNANI SAKLA. Bu blok eskiden yoktu: EXIF yalnızca
           * form alanlarını ÖNDOLDURMAK için okunuyor, gönderim anında
           * çöpe gidiyordu. Kullanıcı bir alanı elle değiştirdiğinde
           * dosyadaki asıl değer artık hiçbir yerde durmuyordu.
           *
           * Koordinat gönderilmiyor — yalnızca varlığı. Kullanıcı EXIF
           * konumunu kullanmayı seçse bile (`useExifGps`) o seçim
           * `locationLabel`'a yansıyor; ham koordinat sunucuya gitmiyor.
           */
          exif: exif
            ? {
                camera: cameraLabel(exif),
                lens: exif.lens,
                iso: exif.iso,
                focalMm: exif.focalLength,
                apertureF: exif.fNumber,
                exposureSeconds: exif.exposureSeconds,
                gpsPresent: exif.hasGps,
              }
            : undefined,
        },
        setPublishState
      );

      await publishPhoto(result.photoId);

      /*
       * Çözüm isteği YAYINDAN SONRA ve BEKLENMEDEN. Fotoğraf artık
       * yayında; alan çözümü dakikalar içinde arkadan geliyor.
       */
      void requestPlateSolve(result.photoId);

      setPublishState('bitti');

      /*
       * Poz künyesi yazılamadıysa fotoğraf yine yayımlandı — o hata
       * fotoğrafı götürecek kadar büyük değil. Ama kullanıcı girdiği veriyi
       * kaybettiğini BİLMELİ: sessizce panele göndermek, poz bilgilerinin
       * kaydedildiği izlenimini bırakırdı.
       */
      if (!result.exposuresSaved) {
        setPublishError(
          'Fotoğraf yayımlandı ama poz bilgileri kaydedilemedi. Fotoğraf sayfasından yeniden ekleyebilirsiniz.'
        );
        return;
      }

      navigate('/panel');
    } catch (error) {
      setPublishState('idle');
      setPublishError(
        error instanceof Error ? error.message : 'Yükleme tamamlanamadı'
      );
    }
  }

  function patch(p: Partial<WizardState>) {
    setState((s) => ({ ...s, ...p }));
  }

  /**
   * Seçilen dosyanın EXIF'ini okur ve boş künye alanlarını doldurur.
   *
   * DOLU ALANLARA DOKUNULMAZ: kullanıcı bir değeri elle yazdıysa, EXIF onu
   * ezmemeli. İşlenmiş astrofotoğraflarda EXIF çoğu zaman yığınlama
   * yazılımının yazdığı eksik/yanlış veriyi taşır; kullanıcının yazdığı
   * değer her zaman daha güvenilirdir.
   *
   * GPS bilinçli olarak forma YAZILMAZ (§15.3) — yalnızca bildirilir.
   */
  async function handleFile(file: File | undefined) {
    if (!file) return;

    setFile(file);
    setPublishError(null);

    /*
     * DOSYA ADINDAN HEDEF TAHMİNİ. Astrofotoğrafçılar dosyayı neredeyse
     * her zaman obje koduyla adlandırıyor ("M31_L_300s.fit"); o kodu
     * kullanıcıya bir kez daha yazdırmak gereksiz.
     *
     * Tahmin BAĞLAYICI DEĞİL: alan doldurulmuş olarak açılıyor ve
     * kullanıcı yanlışsa değiştiriyor. Katalogda karşılığı olmayan bir
     * kod hiç yazılmıyor (bkz. `guessTargetFromFilename`), yani "IMG_2024"
     * gibi bir dosya adı asla bir gök cismine dönüşmüyor.
     *
     * Elle seçilmiş bir hedef EZİLMİYOR: kullanıcı önce hedefi seçip
     * sonra dosyayı değiştirdiyse, onun seçimi daha isabetli.
     */
    const guessed = state.targetSlug ? null : guessTargetFromFilename(file.name);

    patch({
      fileName: file.name,
      ...(guessed
        ? {
            targetSlug: guessed.slug,
            targetKind: guessed.kind,
            title: state.title || guessed.name,
            type: isPhotoType(kindToPhotoType[guessed.kind])
              ? (kindToPhotoType[guessed.kind] as PhotoType)
              : state.type,
          }
        : {}),
    });
    setExif(null);
    setUseExifGps(false);
    /* Yeni dosya, yeni kadraj: önceki seçim başka bir görüntüye aitti. */
    setCrop(FULL_FRAME);
    setExifState('reading');

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseExif(buffer);

      if (!parsed) {
        setExifState('none');
        return;
      }

      setExif(parsed);
      setExifState('read');

      const camera = cameraLabel(parsed);
      patch({
        camera: state.camera || camera || '',
        optic: state.optic || parsed.lens || '',
        capturedAt: state.capturedAt || parsed.capturedAt?.slice(0, 10) || '',
      });
    } catch {
      // Dosya okunamadı (izin, bozuk dosya) — akış durmaz.
      setExifState('none');
    }
  }

  const total = useMemo(
    () => totalIntegrationSeconds(state.exposures.filter((e) => e.frames > 0)),
    [state.exposures]
  );

  const canNext = useMemo(() => {
    switch (step) {
      case 0:
        return state.fileName.trim().length > 0;
      case 1:
        return state.title.trim().length > 0;
      case 4:
        /* Palet seçilmeden yayın adımına geçilemiyor: `AstroPhoto.palette`
           zorunlu ve galeri süzgeci ona dayanıyor. Sihirbaz bunu hiç
           sormadığı için yeni yüklenen fotoğraflar paletsiz kalıyordu. */
        return state.palette !== '';
      case 5:
        return state.copyrightConfirmed;
      default:
        return true;
    }
  }, [step, state]);

  return (
    <>
      <PageMeta
        title="Fotoğraf Yükle"
        description="Astrofotoğrafınızı hedef, setup, pozlama ve işleme verisiyle birlikte yayımlayın."
        noIndex
      />
      <Container className="py-8 sm:py-10">
        <header className="mb-8">
          <h1 className="type-page text-foreground">
            Fotoğraf Yükle
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            6 adımda teknik verileriyle birlikte astrofotoğrafını yayımla.
          </p>
        </header>

        {/* Adım göstergesi */}
        <ol
          className="mb-8 flex flex-wrap gap-2"
          aria-label="Sihirbaz adımları"
        >
          {steps.map((label, i) => (
            <li key={label}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                aria-current={i === step ? 'step' : undefined}
                className={cn(
                  'tabular flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  i === step
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : i < step
                      ? 'border-success/40 text-success'
                      : 'border-border text-muted-foreground/60'
                )}
              >
                <span>{i < step ? '✓' : i + 1}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>

        <div className="rounded-card border border-border bg-surface-1 p-4 sm:p-6">
          {step === 0 && (
            <div className="space-y-5">
              <StepTitle
                title="Dosya seç"
                hint="JPEG, PNG, WebP veya AVIF · en fazla 40 MB / 12.000 px (§10.5)"
              />

              <label
                htmlFor="file-input"
                className="flex aspect-[3/1] cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-border bg-surface-2/40 text-center transition-colors hover:border-primary/40"
              >
                <p className="text-sm font-medium text-foreground">
                  {state.fileName || 'Dosya seçmek için tıklayın'}
                </p>
                <p className="mt-1 px-4 text-xs leading-relaxed text-muted-foreground">
                  Dosya <span className="text-foreground">cihazınızdan
                  çıkmaz</span>: künye alanlarını doldurmak için EXIF bilgisi
                  tarayıcıda okunur. Sunucuya yükleme, depolama altyapısı
                  bağlandığında açılacak.
                </p>
              </label>

              <input
                id="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                onChange={(event) => void handleFile(event.target.files?.[0])}
              />

              {/*
                KIRPMA DOSYA ADIMINDA, AYRI BİR ADIMDA DEĞİL.

                Ayrı bir "kadraj" adımı düşünüldü ve reddedildi: kırpma
                yapmayacak kullanıcı — ki çoğunluk bu — sihirbazda
                geçmesi gereken bir adım daha görürdü. Burada, dosya
                seçildiği anda ve isteğe bağlı olarak duruyor.

                Alan ölçüsü ekipman adımından SONRA anlam kazanıyor
                (piksel ölçeği orada hesaplanıyor); araç o değeri
                aldığında satırı kendisi açıyor, almadığında sebebini
                yazıyor.
              */}
              {file && (
                <div className="rounded-card border border-border bg-surface-2/40 p-3">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
                    <h3 className="label text-foreground">Kadraj</h3>
                    <span className="text-meta text-faint">
                      {isFullFrame(crop)
                        ? 'kırpma yapılmadı — dosya olduğu gibi yüklenir'
                        : 'kırpma gönderim anında uygulanır'}
                    </span>
                  </div>
                  <CropTool
                    file={file}
                    arcsecPerPixel={state.pixelScaleArcsec}
                    value={crop}
                    onChange={setCrop}
                  />
                </div>
              )}

              {exifState === 'reading' && (
                <p className="text-meta text-muted-foreground" role="status">
                  EXIF okunuyor…
                </p>
              )}

              {exifState === 'none' && state.fileName && (
                <p className="rounded-card border border-border bg-surface-1 px-3 py-2.5 text-body-sm leading-relaxed text-muted-foreground">
                  Dosyada EXIF bulunamadı. İşlenmiş astrofotoğraflarda bu
                  normaldir — yığınlama yazılımları çıktıya kamera bilgisi
                  yazmaz. Alanları elle doldurabilirsiniz.
                </p>
              )}

              {exif && (
                <div className="rounded-card border border-border bg-surface-1">
                  <header className="flex items-center justify-between border-b border-border px-3 py-2">
                    <h3 className="label text-foreground">Okunan EXIF</h3>
                    <span className="label">otomatik dolduruldu</span>
                  </header>
                  <dl className="px-3 py-2">
                    <ExifRow label="Kamera" value={cameraLabel(exif)} />
                    <ExifRow label="Lens" value={exif.lens} />
                    <ExifRow
                      label="Poz"
                      value={
                        exif.exposureSeconds
                          ? formatExposure(exif.exposureSeconds)
                          : undefined
                      }
                    />
                    <ExifRow
                      label="Diyafram"
                      value={exif.fNumber ? `f/${exif.fNumber.toFixed(1)}` : undefined}
                    />
                    <ExifRow label="ISO" value={exif.iso?.toString()} />
                    <ExifRow
                      label="Odak"
                      value={exif.focalLength ? `${exif.focalLength} mm` : undefined}
                    />
                    <ExifRow
                      label="Çekim zamanı"
                      value={exif.capturedAt?.replace('T', ' ')}
                    />
                  </dl>

                  {exif.hasGps && (
                    /*
                     * KONUM MAHREMİYETİ (§15.3).
                     *
                     * GPS okunur ama KULLANILMAZ: ne forma yazılır ne de
                     * yayımlanır. Kullanıcının bilmesi gerekir — bilmediği
                     * bir veriyi paylaşmama kararı veremez — ama varsayılan
                     * her zaman gizlemektir. Onay açıkça istenir.
                     */
                    <div className="border-t border-warning/35 px-3 py-2.5">
                      <p className="text-body-sm leading-relaxed text-warning">
                        Bu dosya <strong>GPS koordinatı taşıyor</strong>. Konum
                        formunuza yazılmadı ve yayımlanmayacak; yalnızca
                        haberiniz olsun diye bildiriyoruz.
                      </p>
                      <label className="label mt-2 flex cursor-pointer items-center gap-2 text-muted-foreground has-[:checked]:text-foreground">
                        <input
                          type="checkbox"
                          checked={useExifGps}
                          onChange={(e) => {
                            setUseExifGps(e.target.checked);
                            if (e.target.checked && exif.gps) {
                              patch({
                                locationLabel: `${exif.gps.latitude.toFixed(4)}, ${exif.gps.longitude.toFixed(4)}`,
                                locationVisibility: 'approximate',
                              });
                            }
                          }}
                          className="h-3.5 w-3.5 rounded-card border-border accent-primary"
                        />
                        Koordinatı konum alanına yaz (yaklaşık görünürlükle)
                      </label>
                    </div>
                  )}
                </div>
              )}

              <Field label="Dosya adı" htmlFor="file-name">
                <Input
                  id="file-name"
                  placeholder="ornegin-ic434-sho.jpg"
                  value={state.fileName}
                  onChange={(e) => patch({ fileName: e.target.value })}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <StepTitle
                title="Obje ve kategori"
                hint="Önce ne çektiğinizi seçin; katalog o türe göre daralır"
              />

              <TargetPicker
                value={state.targetSlug}
                kind={state.targetKind}
                onKindChange={(targetKind) => patch({ targetKind })}
                onChange={(target) => {
                  if (!target) {
                    patch({ targetSlug: '' });
                    return;
                  }
                  /*
                   * TÜR ARTIK SEÇİLMİYOR, TÜRETİLİYOR. Kullanıcıya
                   * "M 42 seçtim, şimdi de türünü mü söyleyeyim?" diye
                   * sormak, katalogda zaten yazan bir bilgiyi ikinci kez
                   * istemekti — ve iki kaynağın ayrışmasına açıktı:
                   * bulutsu seçip "Gezegen" işaretlemek mümkündü.
                   *
                   * Eşleme `kindToPhotoType` üzerinden; katalog türü
                   * eşlemede yoksa mevcut değer korunuyor.
                   */
                  const suggested = kindToPhotoType[target.kind];
                  patch({
                    targetSlug: target.slug,
                    title: state.title || target.name,
                    type: isPhotoType(suggested) ? suggested : state.type,
                  });
                }}
                selectClassName={selectClass}
              />

              {/*
                Tür bir GİRDİ değil, bir SONUÇ — bu yüzden alan değil
                künye satırı. Gizlemek yerine göstermek gerekiyor:
                kullanıcı fotoğrafının hangi türde yayımlanacağını
                bilmeli ve yanlışsa hedefi düzelterek düzeltebilmeli.
              */}
              <div className="rounded-card border border-border bg-surface-1 px-3.5 py-3">
                <p className="label">Fotoğraf türü</p>
                <p className="mt-1 flex items-center gap-2">
                  <Badge tone="primary">{photoTypeLabels[state.type]}</Badge>
                  <span className="text-meta text-faint">
                    {state.targetSlug
                      ? 'obje türünden çıkarıldı'
                      : 'obje seçilince güncellenir'}
                  </span>
                </p>
              </div>
              <Field label="Başlık" htmlFor="w-title">
                <Input
                  id="w-title"
                  placeholder="ör. At Başı ve Alev Bulutsusu"
                  value={state.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <StepTitle
                title="Çekim oturumu"
                hint="Konum görünürlüğünü sen seçersin; GPS asla otomatik yayımlanmaz (§15.3)"
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Çekim tarihi" htmlFor="w-date">
                  <Input
                    id="w-date"
                    type="date"
                    value={state.capturedAt}
                    onChange={(e) => patch({ capturedAt: e.target.value })}
                  />
                </Field>
                <Field label="Lokasyon (metin)" htmlFor="w-loc">
                  <Input
                    id="w-loc"
                    placeholder="ör. Saklıkent, Antalya"
                    value={state.locationLabel}
                    onChange={(e) => patch({ locationLabel: e.target.value })}
                  />
                </Field>
              </div>
              <Field
                label="Konum görünürlüğü"
                htmlFor="w-vis"
                hint="Tam koordinat yalnızca açık onayınla kamuya açılır."
              >
                <select
                  id="w-vis"
                  className={selectClass}
                  value={state.locationVisibility}
                  onChange={(e) =>
                    patch({
                      locationVisibility: e.target
                        .value as WizardState['locationVisibility'],
                    })
                  }
                >
                  <option value="exact">Tam koordinat</option>
                  <option value="approximate">Yaklaşık (önerilen)</option>
                  <option value="region">İl/ilçe düzeyi</option>
                  <option value="hidden">Gizli</option>
                </select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <StepTitle
                title="Setup"
                hint="Kayıtlı setup’ınızı seçin ya da bileşenleri tek tek girin"
              />

              <SetupSelect
                onApply={(fill) =>
                  patch({
                    setupId: fill.setupId,
                    opticSlug: fill.opticSlug,
                    optic: fill.optic,
                    cameraSlug: fill.cameraSlug,
                    camera: fill.camera,
                    mountSlug: fill.mountSlug,
                    mount: fill.mount,
                    setupFilter: fill.filter,
                    setupGuide: fill.guide,
                    effectiveFocalMm: fill.effectiveFocalMm,
                    effectiveFRatio: fill.effectiveFRatio,
                    pixelScaleArcsec: fill.pixelScaleArcsec,
                  })
                }
              />
              {/*
                Serbest metin yerine katalog seçimi: "ASI2600", "asi 2600
                mm" ve "ZWO ASI2600MM Pro" aynı kameranın üç yazımı ve
                serbest metin bunları üç ayrı ekipman yapıyordu. Katalog
                bağı olunca "bu ekipmanla çekilmiş fotoğraflar" sorusu
                cevaplanabiliyor. Katalogda olmayan model seçicinin
                içinden eklenebiliyor (onaya gider).
              */}
              <EquipmentPicker
                category="optik-tup"
                label="Optik / teleskop"
                placeholder="ör. Esprit 100ED"
                value={{ slug: state.opticSlug, text: state.optic }}
                onChange={(v) => patch({ opticSlug: v.slug, optic: v.text })}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <EquipmentPicker
                  category="astro-kamera"
                  label="Kamera"
                  placeholder="ör. ASI2600MM Pro"
                  value={{ slug: state.cameraSlug, text: state.camera }}
                  onChange={(v) => patch({ cameraSlug: v.slug, camera: v.text })}
                />
                <EquipmentPicker
                  category="montur"
                  label="Montür"
                  placeholder="ör. EQ6-R Pro"
                  value={{ slug: state.mountSlug, text: state.mount }}
                  onChange={(v) => patch({ mountSlug: v.slug, mount: v.text })}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <StepTitle
                title="Pozlama ve filtreler"
                hint="Toplam entegrasyon otomatik hesaplanır"
              />

              {/*
                İŞLEME PALETİ ZORUNLU.

                Galeri süzgecinde "Tüm paletler" seçimi var ve kart
                künyesi "RGB · 20 sa" diye yazıyor; palet boşsa fotoğraf
                o süzgeçte hiç görünmüyor ve künye yarım kalıyor.
                Sihirbaz bu alanı hiç sormuyordu.

                Serbest metin değil sabit liste: süzgecin işe yaraması
                buna bağlı — herkesin kendi yazdığı palet adı hiçbir şeyi
                bir araya getirmez.
              */}
              <Field
                label="İşleme paleti"
                htmlFor="palette"
                hint="Zorunlu — galeri süzgeci ve kart künyesi bunu kullanıyor."
              >
                <Select
                  id="palette"
                  value={state.palette}
                  aria-invalid={state.palette === '' ? true : undefined}
                  onChange={(e) =>
                    patch({ palette: e.target.value as ProcessingPalette | '' })
                  }
                >
                  <option value="">Seçin…</option>
                  {PALET_SECENEKLERI.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="space-y-3">
                {state.exposures.map((row, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_1fr_1fr_auto] gap-3"
                  >
                    <Field label={i === 0 ? 'Filtre' : ''} htmlFor={`f-${i}`}>
                      <Input
                        id={`f-${i}`}
                        value={row.filter}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = { ...row, filter: e.target.value };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <Field
                      label={i === 0 ? 'Kare sayısı' : ''}
                      htmlFor={`n-${i}`}
                    >
                      <Input
                        id={`n-${i}`}
                        type="number"
                        min={0}
                        value={row.frames}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = { ...row, frames: Number(e.target.value) };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <Field
                      label={i === 0 ? 'Pozlama (sn)' : ''}
                      htmlFor={`s-${i}`}
                    >
                      <Input
                        id={`s-${i}`}
                        type="number"
                        min={0}
                        value={row.exposureSeconds}
                        onChange={(e) => {
                          const next = [...state.exposures];
                          next[i] = {
                            ...row,
                            exposureSeconds: Number(e.target.value),
                          };
                          patch({ exposures: next });
                        }}
                      />
                    </Field>
                    <div className="flex items-end pb-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`${row.filter} satırını sil`}
                        disabled={state.exposures.length === 1}
                        onClick={() =>
                          patch({
                            exposures: state.exposures.filter(
                              (_, j) => j !== i
                            ),
                          })
                        }
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  patch({
                    exposures: [
                      ...state.exposures,
                      { filter: '', frames: 0, exposureSeconds: 0 },
                    ],
                  })
                }
              >
                + Filtre satırı ekle
              </Button>
              <p className="tabular rounded-card border border-border bg-surface-2 px-4 py-3 text-sm">
                Toplam entegrasyon:{' '}
                <span className="font-semibold text-primary">
                  {formatIntegration(total)}
                </span>
              </p>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-5">
              <StepTitle
                title="İşleme, lisans ve yayın"
                hint="Önizleme ve onay"
              />
              <Field label="Kullanılan yazılımlar" htmlFor="w-sw">
                <Input
                  id="w-sw"
                  placeholder="ör. PixInsight, Photoshop"
                  value={state.software}
                  onChange={(e) => patch({ software: e.target.value })}
                />
              </Field>
              {/*
                LİSANS SEÇİMİ KALDIRILDI.
                Dört seçenekli bir açılır liste, çoğu kullanıcının
                farkını bilmediği bir hukuki karar sorup varsayılanı
                ("Tüm hakları saklıdır") olduğu gibi bırakmasına yol
                açıyordu — yani seçim gerçekte yapılmıyordu.

                Kural artık tek ve kullanım şartlarında yazılı: eser
                sahibinin hakları kendisinde kalır, Astrohub kaynak
                göstermek şartıyla kullanabilir. Aşağıdaki onay kutusu
                buna atıf yapıyor ve metne bağlantı veriyor.
              */}
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.aiDeclared}
                  onChange={(e) => patch({ aiDeclared: e.target.checked })}
                />
                İşlemede AI tabanlı araç (denoise, deconvolution, yıldız işleme
                vb.) kullandım — şeffaflık beyanı (§15.5).
              </label>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.allowDownload}
                  onChange={(e) => patch({ allowDownload: e.target.checked })}
                />
                Public gösterim kopyasının indirilmesine izin veriyorum.
              </label>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.watermarkRequired}
                  onChange={(e) =>
                    patch({ watermarkRequired: e.target.checked })
                  }
                />
                Yeniden kullanımda kaynak/filigran şartı görünsün.
              </label>
              <label className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                  checked={state.copyrightConfirmed}
                  onChange={(e) =>
                    patch({ copyrightConfirmed: e.target.checked })
                  }
                />
                <span>
                  Bu eserin sahibi olduğumu ve paylaşma hakkım bulunduğunu
                  onaylıyorum; Astrohub'ın bu fotoğrafı{' '}
                  <strong className="font-semibold text-foreground">
                    adımı kaynak göstererek
                  </strong>{' '}
                  kullanmasına izin veriyorum (§15.4,{' '}
                  <Link
                    to="/kullanim-kosullari"
                    target="_blank"
                    className="text-cold underline underline-offset-2"
                  >
                    kullanım şartları
                  </Link>
                  ).
                </span>
              </label>

              {/* Özet */}
              <div className="rounded-card border border-border bg-surface-2 p-4">
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  Özet
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="primary">{state.title || 'Başlıksız'}</Badge>
                  <Badge>{photoTypeLabels[state.type]}</Badge>
                  {state.capturedAt && <Badge>{state.capturedAt}</Badge>}
                  <Badge tone="cold">{formatIntegration(total)}</Badge>
                  <Badge>{state.license}</Badge>
                  <Badge tone={state.allowDownload ? 'cold' : 'muted'}>
                    {state.allowDownload ? 'İndirme açık' : 'İndirme kapalı'}
                  </Badge>
                  {state.watermarkRequired && <Badge>Kaynak/filigran şartı</Badge>}
                  {state.aiDeclared && <Badge tone="cold">AI beyanlı</Badge>}
                  {file && <Badge tone="muted">{formatBytes(file.size)}</Badge>}
                </div>

                {/*
                  Boyut kararı üç sonuçtan biri ve üçü ayrı anlatılıyor:
                  kabul, küçülterek kabul, ret. Tek bir "çok büyük" mesajı
                  küçültülebilecek bir dosyayı reddedilmiş gibi gösterirdi.
                */}
                {sizeVerdict && sizeVerdict.kind !== 'ok' && (
                  <p
                    className={
                      sizeVerdict.kind === 'reject'
                        ? 'mt-3 text-body-sm leading-relaxed text-danger'
                        : 'mt-3 text-body-sm leading-relaxed text-cold'
                    }
                  >
                    {sizeVerdict.reason}
                  </p>
                )}

                {!user && (
                  <p className="mt-3 text-body-sm leading-relaxed text-muted-foreground">
                    Yayımlamak için giriş yapmanız gerekir. Girdiğiniz künye
                    bilgileri bu sayfada kalır.
                  </p>
                )}

                {publishError && (
                  <Alert className="mt-3">
                    {publishError}
                  </Alert>
                )}
              </div>
            </div>
          )}

          {/* Gezinme */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="secondary"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              ← Geri
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                İleri →
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={
                  !file ||
                  !state.copyrightConfirmed ||
                  !configured ||
                  !user ||
                  publishState !== 'idle'
                }
                title={
                  !configured
                    ? 'Veritabanı bağlantısı yapılandırılmamış'
                    : !user
                      ? 'Yayımlamak için giriş yapın'
                      : !state.copyrightConfirmed
                        ? 'Telif onayı olmadan yayımlanamaz'
                        : undefined
                }
              >
                {publishState === 'idle' ? 'Yayımla' : progressLabel(publishState)}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </>
  );
}

/**
 * Başlıktan adres parçası üretir.
 *
 * Türkçe harfler ASCII karşılığına indirgeniyor: adres çubuğunda ve
 * paylaşılan bağlantıda yüzde kodlaması okunmaz bir şeye dönüşüyor.
 * Sonuna kısa bir rastgele ek geliyor çünkü slug tekil olmak zorunda ve
 * iki kullanıcının aynı hedefi aynı adla yüklemesi olağan.
 */
/** Yükleme aşamasını insan diline çevirir. */
function progressLabel(stage: string): string {
  switch (stage) {
    case 'hazirlaniyor':
      return 'Hazırlanıyor…';
    case 'kucultuluyor':
      return 'Görsel küçültülüyor…';
    case 'yukleniyor':
      return 'Yükleniyor…';
    case 'kaydediliyor':
      return 'Kaydediliyor…';
    default:
      return 'Tamamlandı';
  }
}

/**
 * Fotoğraf adresi — dönüşüm `lib/slug`ta, son ek burada.
 *
 * Son ek ÇAKIŞMA İÇİN: aynı hedefi iki kez yükleyen kullanıcı
 * "m31" adresini ikinci kez alamaz ve yükleme sessizce düşerdi.
 */
function slugifyPhoto(input: string): string {
  const suffix = Math.floor(Math.random() * 46656).toString(36);
  return `${slugify(input) || 'fotograf'}-${suffix}`;
}

function StepTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="type-section font-semibold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** EXIF künyesindeki tek satır; değer yoksa satır hiç çizilmez. */
function ExifRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="label shrink-0">{label}</dt>
      <dd className="tabular text-right text-body-sm text-foreground">{value}</dd>
    </div>
  );
}
