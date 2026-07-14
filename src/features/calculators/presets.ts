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

export const reducerPresets: { label: string; factor: number }[] = [
  { label: 'Yok (1.0×)', factor: 1 },
  { label: 'Reducer 0.8×', factor: 0.8 },
  { label: 'Reducer 0.75×', factor: 0.75 },
  { label: 'Reducer 0.7×', factor: 0.7 },
  { label: 'Barlow 1.5×', factor: 1.5 },
  { label: 'Barlow 2.0×', factor: 2 },
];
