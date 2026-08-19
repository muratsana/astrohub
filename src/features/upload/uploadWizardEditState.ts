import type { FilterExposure } from '@/domain/photography/integration';
import type { CaptureSession } from '@/domain/photography/captureSession';
import { VARSAYILAN_KADRAJ, type Kadraj } from '@/domain/profile/kadraj';
import {
  PHOTO_LICENSE,
  type AstroPhoto,
  type PhotoType,
  type ProcessingPalette,
} from '@/features/photos/types';
import { targets } from '@/features/targets/data';
import type { TargetKind } from '@/domain/targets/derive';

export interface WizardState {
  fileName: string;
  targetSlug: string;
  /** Seçim listesini daraltan obje tipi; hedef seçimini kaydetmez. */
  targetKind: TargetKind | 'hepsi';
  type: PhotoType;
  title: string;
  /**
   * ÇEKİM OTURUMLARI (SEZONLAR) — bir fotoğraf birden çok gecede toplanır.
   *
   * Tek `capturedAt` tarihi yerine oturum listesi: her oturum tek gece ya
   * da aralık (C02–C04). Boş liste "tarih girilmedi" demek. Yükleme
   * sırasında en erken gün geriye dönük `captured_at`e yazılıyor.
   */
  captureSessions: CaptureSession[];
  /**
   * ÇEKİM KONUMU — il ve ilçe, ikisi de ZORUNLU.
   *
   * Önceden tek bir serbest metin alanı vardı ("Saklıkent, Antalya")
   * ve galeri şehir süzgeci o metni virgülden bölüp son parçayı şehir
   * sayıyordu. "evin balkonu" yazan biri "Evin Balkonu" adında bir
   * şehir üretiyordu; süzgeç hiçbir zaman güvenilir olmadı.
   *
   * Görünürlük seçeneği de kalktı. "Tam koordinat" seçeneği bir
   * gizlilik denetimi gibi duruyordu ama gerçekte yaptığı şey, EXIF'ten
   * okunan ham enlem-boylamın etikete yazılabilmesiydi — yani bir
   * denetim değil, bir sızıntı kapısı. İl/ilçe düzeyi kullanıcının
   * gözlem yerini zaten açığa çıkarmıyor.
   */
  city: string;
  district: string;
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
  /**
   * KART (thumbnail) KADRAJI — karede hangi kare bölge görünecek (C07,
   * C10). {zoom, panX, panY} normalize; varsayılan = tam kare (otomatik).
   */
  thumbCrop: Kadraj;
  /** İşleme paleti — boş bırakılamaz, yayın adımına geçişi kilitliyor. */
  palette: ProcessingPalette | '';
  software: string;
  aiDeclared: boolean;
  license: string;
  allowDownload: boolean;
  watermarkRequired: boolean;
  copyrightConfirmed: boolean;
}

export const initialState: WizardState = {
  fileName: '',
  targetSlug: '',
  targetKind: 'hepsi',
  type: 'deep-sky',
  title: '',
  captureSessions: [],
  city: '',
  district: '',
  optic: '',
  camera: '',
  mount: '',
  exposures: [{ filter: 'L', frames: 0, exposureSeconds: 0 }],
  thumbCrop: VARSAYILAN_KADRAJ,
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

export function wizardStateFromPhoto(photo: AstroPhoto): WizardState {
  const hedef = targets.find(
    (target) =>
      target.catalog === photo.target.catalog ||
      target.aliases.includes(photo.target.catalog) ||
      target.name === photo.target.name
  );

  return {
    ...initialState,
    fileName: photo.image ? 'Mevcut fotoğraf' : photo.title,
    targetSlug: hedef?.slug ?? '',
    targetKind: hedef?.kind ?? 'hepsi',
    type: photo.type,
    title: photo.title,
    captureSessions:
      photo.captureSessions && photo.captureSessions.length > 0
        ? photo.captureSessions
        : photo.capturedAt
          ? [
              {
                id: `captured-${photo.id ?? photo.slug}`,
                startsOn: photo.capturedAt.slice(0, 10),
                endsOn: null,
              },
            ]
          : [],
    city: photo.city ?? '',
    district: photo.district ?? '',
    optic: photo.setup.optic,
    camera: photo.setup.camera,
    mount: photo.setup.mount,
    setupFilter: photo.setup.filters,
    setupGuide: photo.setup.guiding,
    exposures:
      photo.exposures.length > 0
        ? photo.exposures
        : [{ filter: 'L', frames: 0, exposureSeconds: 0 }],
    thumbCrop: photo.thumbCrop ?? VARSAYILAN_KADRAJ,
    palette: photo.palette,
    software: photo.processing.software.join(', '),
    aiDeclared: photo.processing.aiDeclared ?? false,
    license: photo.license,
    allowDownload: photo.access?.allowDownload ?? false,
    watermarkRequired: photo.access?.watermarkRequired ?? true,
    copyrightConfirmed: true,
  };
}
