import { equipment } from '@/features/equipment/data';
import {
  cameraMechanicalPresetsFrom,
  cameraPresetsFrom,
  factorPresetsFrom,
  guidePresetsFrom,
  mountPresetsFrom,
  opticMechanicalPresetsFrom,
  opticPresetsFrom,
  type CameraMechanicalPreset,
  type CameraPreset,
  type FactorPreset,
  type GuidePreset,
  type MountPreset,
  type OpticMechanicalPreset,
  type OpticPreset,
} from '@/domain/equipment/presets';

/**
 * HESAPLAYICI ÖN AYARLARI — artık elle yazılmıyor.
 *
 * Bu dosya bir zamanlar dört aracın ekipman listesini elle taşıyordu ve
 * her biri ekipman veritabanından bağımsız yaşıyordu. Aynı teleskop iki
 * yerde farklı ağırlıkla yazılıydı; hangisinin doğru olduğunu söyleyecek
 * bir kaynak yoktu.
 *
 * Şimdi listeler `domain/equipment/presets.ts` kurallarıyla ekipman
 * kataloğundan türetiliyor. Kataloğa bir model eklendiğinde — editör ya da
 * kullanıcı eklesin — FOV, mozaik ve uyumluluk araçları onu aynı anda
 * görüyor.
 */

export type {
  OpticPreset,
  CameraPreset,
  MountPreset,
  FactorPreset,
  GuidePreset,
  OpticMechanicalPreset,
  CameraMechanicalPreset,
};

export const opticPresets: OpticPreset[] = opticPresetsFrom(equipment);
export const cameraPresets: CameraPreset[] = cameraPresetsFrom(equipment);
export const mountPresets: MountPreset[] = mountPresetsFrom(equipment);
export const opticMechanicalPresets: OpticMechanicalPreset[] =
  opticMechanicalPresetsFrom(equipment);
export const cameraMechanicalPresets: CameraMechanicalPreset[] =
  cameraMechanicalPresetsFrom(equipment);

/**
 * Guide seçenekleri, "guide yok" ile başlar.
 *
 * `-1` odak, "ana optikle aynı" demek: off-axis guider ana teleskobun
 * odağını kullanır ve o değer kullanıcının girdiği odaktan gelir. Sabit bir
 * sayı yazmak, OAG'yi her kurulumda yanlış hesaplamak olurdu.
 */
export const guidePresets: GuidePreset[] = [
  { slug: 'yok', label: 'Guide yok', focalLength: 0, pixelSize: 0 },
  ...guidePresetsFrom(equipment),
  {
    slug: 'oag',
    label: 'OAG (ana optikle aynı odak)',
    focalLength: -1,
    pixelSize: 3.75,
  },
];

/**
 * Çarpan listesi katalogdan gelir ama başında "yok" ve sonunda yuvarlak
 * değerler durur: kullanıcının elindeki reducer katalogda olmayabilir ve
 * "0.8×" yazan bir düğme, markası bilinmeyen bir parçayı da karşılar.
 */
export const reducerPresets: { label: string; factor: number }[] = [
  { label: 'Yok (1.0×)', factor: 1 },
  ...factorPresetsFrom(equipment).map((p) => ({
    label: p.label,
    factor: p.factor,
  })),
  { label: 'Genel reducer 0.8×', factor: 0.8 },
  { label: 'Genel barlow 1.5×', factor: 1.5 },
];

/** Yaygın filtre kalınlıkları (mm) — katalogda kalınlık kolonu yok. */
export const filterThicknessPresets: { label: string; mm: number }[] = [
  { label: 'Filtre yok', mm: 0 },
  { label: '2 mm (1.25")', mm: 2 },
  { label: '3 mm (2" tipik)', mm: 3 },
  { label: '3.5 mm (kalın cam)', mm: 3.5 },
];
