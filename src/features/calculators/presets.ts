/** FOV hesaplayıcı için yaygın ekipman ön ayarları (§7.11 veritabanının tohumu). */

export interface OpticPreset {
  label: string;
  focalLength: number;
  aperture: number;
}

export interface CameraPreset {
  label: string;
  pixelSize: number;
  sensorWidth: number;
  sensorHeight: number;
}

export const opticPresets: OpticPreset[] = [
  { label: 'Samyang 135mm f/2', focalLength: 135, aperture: 67.5 },
  { label: 'RedCat 51 (250mm f/4.9)', focalLength: 250, aperture: 51 },
  { label: 'WO Z73 (430mm)', focalLength: 430, aperture: 73 },
  { label: 'SW 72ED (420mm)', focalLength: 420, aperture: 72 },
  { label: 'Esprit 100 (550mm)', focalLength: 550, aperture: 100 },
  { label: '8" f/4 Newton (800mm)', focalLength: 800, aperture: 203 },
  { label: 'SCT 8" (2032mm)', focalLength: 2032, aperture: 203 },
];

export const cameraPresets: CameraPreset[] = [
  {
    label: 'ZWO ASI2600 (APS-C, 3.76µm)',
    pixelSize: 3.76,
    sensorWidth: 23.5,
    sensorHeight: 15.7,
  },
  {
    label: 'ZWO ASI533 (1", 3.76µm)',
    pixelSize: 3.76,
    sensorWidth: 11.31,
    sensorHeight: 11.31,
  },
  {
    label: 'ZWO ASI294 (4/3, 4.63µm)',
    pixelSize: 4.63,
    sensorWidth: 19.1,
    sensorHeight: 13.0,
  },
  {
    label: 'ZWO ASI183 (1", 2.4µm)',
    pixelSize: 2.4,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
  },
  {
    label: 'Canon APS-C DSLR (4.3µm)',
    pixelSize: 4.3,
    sensorWidth: 22.3,
    sensorHeight: 14.9,
  },
  {
    label: 'Tam kare / Full-frame (5.94µm)',
    pixelSize: 5.94,
    sensorWidth: 36,
    sensorHeight: 24,
  },
];

/**
 * Uyumluluk kontrolü ön ayarları.
 *
 * FOV hesabı ağırlık ve backfocus bilmez; uyumluluk kontrolü bilir. Bu yüzden
 * optik/kamera ön ayarları burada mekanik alanlarla genişletilir — mevcut
 * listeleri bozmamak için ayrı tutulur, `label` ile eşleşirler.
 */
export interface MountPreset {
  label: string;
  payloadCapacityKg: number;
}

export const mountPresets: MountPreset[] = [
  { label: 'SW Star Adventurer GTi (5 kg)', payloadCapacityKg: 5 },
  { label: 'iOptron GEM28 (12.7 kg)', payloadCapacityKg: 12.7 },
  { label: 'SW HEQ5 Pro (13.6 kg)', payloadCapacityKg: 13.6 },
  { label: 'SW EQ6-R Pro (20 kg)', payloadCapacityKg: 20 },
  { label: 'iOptron CEM70 (31.7 kg)', payloadCapacityKg: 31.7 },
];

export interface OpticMechanicalPreset {
  label: string;
  focalLength: number;
  aperture: number;
  weightKg: number;
  /** Düzelticinin istediği backfocus, mm. */
  requiredBackfocusMm: number;
}

export const opticMechanicalPresets: OpticMechanicalPreset[] = [
  {
    label: 'Samyang 135mm f/2',
    focalLength: 135,
    aperture: 67.5,
    weightKg: 0.9,
    requiredBackfocusMm: 0,
  },
  {
    label: 'WO RedCat 51 (250mm)',
    focalLength: 250,
    aperture: 51,
    weightKg: 1.6,
    requiredBackfocusMm: 55,
  },
  {
    label: 'SW 72ED + flattener (420mm)',
    focalLength: 420,
    aperture: 72,
    weightKg: 2.0,
    requiredBackfocusMm: 55,
  },
  {
    label: 'SW Esprit 100 (550mm)',
    focalLength: 550,
    aperture: 100,
    weightKg: 6.4,
    requiredBackfocusMm: 55,
  },
  {
    label: '8" f/4 Newton + koma düzeltici (800mm)',
    focalLength: 800,
    aperture: 203,
    weightKg: 8.6,
    requiredBackfocusMm: 55,
  },
  {
    label: 'SCT 8" (2032mm)',
    focalLength: 2032,
    aperture: 203,
    weightKg: 5.7,
    requiredBackfocusMm: 105,
  },
];

export interface CameraMechanicalPreset extends CameraPreset {
  weightKg: number;
  /** Flanş–sensör mesafesi, mm. */
  backfocusMm: number;
}

export const cameraMechanicalPresets: CameraMechanicalPreset[] = [
  {
    label: 'ZWO ASI2600 (APS-C, 3.76µm)',
    pixelSize: 3.76,
    sensorWidth: 23.5,
    sensorHeight: 15.7,
    weightKg: 0.7,
    backfocusMm: 17.5,
  },
  {
    label: 'ZWO ASI533 (1", 3.76µm)',
    pixelSize: 3.76,
    sensorWidth: 11.31,
    sensorHeight: 11.31,
    weightKg: 0.47,
    backfocusMm: 12.5,
  },
  {
    label: 'ZWO ASI294 (4/3, 4.63µm)',
    pixelSize: 4.63,
    sensorWidth: 19.1,
    sensorHeight: 13.0,
    weightKg: 0.41,
    backfocusMm: 17.5,
  },
  {
    label: 'ZWO ASI183 (1", 2.4µm)',
    pixelSize: 2.4,
    sensorWidth: 13.2,
    sensorHeight: 8.8,
    weightKg: 0.41,
    backfocusMm: 17.5,
  },
  {
    label: 'Canon APS-C DSLR (4.3µm)',
    pixelSize: 4.3,
    sensorWidth: 22.3,
    sensorHeight: 14.9,
    weightKg: 0.65,
    backfocusMm: 44,
  },
];

export interface GuidePreset {
  label: string;
  focalLength: number;
  pixelSize: number;
}

export const guidePresets: GuidePreset[] = [
  { label: 'Guide yok', focalLength: 0, pixelSize: 0 },
  { label: 'ZWO 30F4 mini (120mm) + ASI120', focalLength: 120, pixelSize: 3.75 },
  { label: 'SVBony 60mm + ASI120', focalLength: 240, pixelSize: 3.75 },
  { label: 'OAG (ana optikle aynı odak)', focalLength: -1, pixelSize: 3.75 },
];

/** Yaygın filtre kalınlıkları (mm). */
export const filterThicknessPresets: { label: string; mm: number }[] = [
  { label: 'Filtre yok', mm: 0 },
  { label: '2 mm (1.25")', mm: 2 },
  { label: '3 mm (2" tipik)', mm: 3 },
  { label: '3.5 mm (kalın cam)', mm: 3.5 },
];

export const reducerPresets: { label: string; factor: number }[] = [
  { label: 'Yok (1.0×)', factor: 1 },
  { label: 'Reducer 0.8×', factor: 0.8 },
  { label: 'Reducer 0.75×', factor: 0.75 },
  { label: 'Reducer 0.7×', factor: 0.7 },
  { label: 'Barlow 1.5×', factor: 1.5 },
  { label: 'Barlow 2.0×', factor: 2 },
];
