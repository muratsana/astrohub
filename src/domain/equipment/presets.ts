import {
  parseMeasure,
  parseResolution,
  sensorSizeMm,
} from './specs';

/**
 * HESAPLAYICI ÖN AYARLARI — ekipman kataloğundan türetilir.
 *
 * Eskiden FOV, mozaik ve uyumluluk araçları kendi elle yazılmış ekipman
 * listelerini taşıyordu. Aynı teleskop dört yerde ayrı ayrı yazılıydı ve
 * biri düzeltilince diğerleri eskiyordu — "Esprit 100" bir listede 550 mm,
 * ötekinde 550 mm ama 6.4 kg yerine 6.0 kg.
 *
 * Artık tek kaynak katalog. Araçlar ekipmanı buradan alıyor; katalog
 * büyüdükçe araçların ön ayar listesi de kendiliğinden büyüyor ve
 * kullanıcının kendi eklediği model de listeye geliyor.
 *
 * VERİSİ EKSİK OLAN KAYIT LİSTEYE GİRMEZ. Ağırlığı bilinmeyen bir tüpü
 * uyumluluk kontrolüne sokmak, montür yükünü olduğundan hafif göstermek
 * olurdu; uydurma bir sayı, eksik bir sayıdan tehlikelidir.
 */

/** Ön ayar üretmek için gereken en az bilgi — kategori dışı alan yok. */
export interface CatalogEntry {
  slug: string;
  brand: string;
  model: string;
  category: string;
  specs: Record<string, string>;
}

function label(entry: CatalogEntry, suffix?: string): string {
  const base = `${entry.brand} ${entry.model}`;
  return suffix ? `${base} (${suffix})` : base;
}

export interface OpticPreset {
  slug: string;
  brand: string;
  label: string;
  focalLength: number;
  aperture: number;
}

/** Odak ve açıklığı okunabilen optik tüp + lens kayıtları. */
export function opticPresetsFrom(entries: CatalogEntry[]): OpticPreset[] {
  return entries
    .filter((e) => e.category === 'optik-tup' || e.category === 'lens')
    .map((e) => {
      const focalLength = parseMeasure(e.specs['Odak']);
      const aperture = parseMeasure(e.specs['Açıklık']);
      if (focalLength === null || aperture === null) return null;
      return {
        slug: e.slug,
        brand: e.brand,
        label: label(e, `${focalLength} mm`),
        focalLength,
        aperture,
      };
    })
    .filter((p): p is OpticPreset => p !== null)
    .sort((a, b) => a.focalLength - b.focalLength);
}

export interface CameraPreset {
  slug: string;
  brand: string;
  label: string;
  pixelSize: number;
  sensorWidth: number;
  sensorHeight: number;
}

/**
 * Sensör boyutu çözünürlük × piksel boyutundan türetilir (§9.2).
 * Çözünürlüğü yazılmamış kamera listeye giremez: kadraj hesabı sensör
 * boyutu olmadan yapılamaz ve "varsayılan APS-C" koymak, kullanıcının
 * göremeyeceği bir varsayımı hesabın içine gömerdi.
 */
export function cameraPresetsFrom(entries: CatalogEntry[]): CameraPreset[] {
  return entries
    .filter(
      (e) =>
        e.category === 'astro-kamera' || e.category === 'fotograf-makinesi'
    )
    .map((e) => {
      const pixelSize = parseMeasure(e.specs['Piksel']);
      const sensor = sensorSizeMm(e.specs['Çözünürlük'], pixelSize);
      if (pixelSize === null || !sensor) return null;
      return {
        slug: e.slug,
        brand: e.brand,
        label: label(e, `${pixelSize} µm`),
        pixelSize,
        sensorWidth: sensor.widthMm,
        sensorHeight: sensor.heightMm,
      };
    })
    .filter((p): p is CameraPreset => p !== null)
    .sort((a, b) => b.sensorWidth - a.sensorWidth);
}

export interface MountPreset {
  slug: string;
  brand: string;
  label: string;
  payloadCapacityKg: number;
}

export function mountPresetsFrom(entries: CatalogEntry[]): MountPreset[] {
  return entries
    .filter((e) => e.category === 'montur')
    .map((e) => {
      const payloadCapacityKg = parseMeasure(e.specs['Yük kapasitesi']);
      if (payloadCapacityKg === null) return null;
      return {
        slug: e.slug,
        brand: e.brand,
        label: label(e, `${payloadCapacityKg} kg`),
        payloadCapacityKg,
      };
    })
    .filter((p): p is MountPreset => p !== null)
    .sort((a, b) => a.payloadCapacityKg - b.payloadCapacityKg);
}

export interface FactorPreset {
  slug: string;
  brand: string;
  label: string;
  factor: number;
}

/**
 * Reducer ve barlow tek listede: ikisi de efektif odağı çarpar, biri
 * küçültür diğeri büyütür. Ayrı iki menü, kullanıcıyı "hangisi bende var"
 * sorusundan önce "hangi menüye bakayım" sorusuyla uğraştırırdı.
 */
export function factorPresetsFrom(entries: CatalogEntry[]): FactorPreset[] {
  return entries
    .filter((e) => e.category === 'reducer' || e.category === 'barlow')
    .map((e) => {
      const factor = parseMeasure(e.specs['Çarpan']);
      if (factor === null || factor <= 0) return null;
      return {
        slug: e.slug,
        brand: e.brand,
        label: label(e, `${factor}×`),
        factor,
      };
    })
    .filter((p): p is FactorPreset => p !== null)
    .sort((a, b) => a.factor - b.factor);
}

export interface OpticMechanicalPreset extends OpticPreset {
  weightKg: number;
  /** Düzelticinin istediği backfocus, mm. */
  requiredBackfocusMm: number;
}

export function opticMechanicalPresetsFrom(
  entries: CatalogEntry[]
): OpticMechanicalPreset[] {
  return opticPresetsFrom(entries)
    .map((preset) => {
      const entry = entries.find((e) => e.slug === preset.slug)!;
      const weightKg = parseMeasure(entry.specs['Ağırlık']);
      const requiredBackfocusMm = parseMeasure(entry.specs['Backfocus']);
      if (weightKg === null || requiredBackfocusMm === null) return null;
      return { ...preset, weightKg, requiredBackfocusMm };
    })
    .filter((p): p is OpticMechanicalPreset => p !== null);
}

export interface CameraMechanicalPreset extends CameraPreset {
  weightKg: number;
  /** Flanş–sensör mesafesi, mm. */
  backfocusMm: number;
}

export function cameraMechanicalPresetsFrom(
  entries: CatalogEntry[]
): CameraMechanicalPreset[] {
  return cameraPresetsFrom(entries)
    .map((preset) => {
      const entry = entries.find((e) => e.slug === preset.slug)!;
      const weightKg = parseMeasure(entry.specs['Ağırlık']);
      const backfocusMm = parseMeasure(entry.specs['Backfocus']);
      if (weightKg === null || backfocusMm === null) return null;
      return { ...preset, weightKg, backfocusMm };
    })
    .filter((p): p is CameraMechanicalPreset => p !== null);
}

export interface GuidePreset {
  slug: string;
  brand: string;
  label: string;
  focalLength: number;
  pixelSize: number;
}

/**
 * Guide seçenekleri iki parçadan kurulur: guide teleskobu (odak) ve guide
 * kamerası (piksel). Katalogda ikisi ayrı kayıt olduğu için burada
 * eşleştiriliyor — kullanıcı ikisini ayrı ayrı seçmek zorunda kalmasın.
 */
export function guidePresetsFrom(entries: CatalogEntry[]): GuidePreset[] {
  const scopes = entries.filter(
    (e) => e.category === 'guide' && parseMeasure(e.specs['Odak']) !== null
  );
  const cameras = entries.filter(
    (e) => e.category === 'guide' && parseResolution(e.specs['Çözünürlük'])
  );

  const combos: GuidePreset[] = [];
  for (const scope of scopes) {
    for (const camera of cameras) {
      const focalLength = parseMeasure(scope.specs['Odak'])!;
      const pixelSize = parseMeasure(camera.specs['Piksel']);
      if (pixelSize === null) continue;
      combos.push({
        slug: `${scope.slug}+${camera.slug}`,
        brand: scope.brand,
        label: `${scope.model} + ${camera.model}`,
        focalLength,
        pixelSize,
      });
    }
  }
  return combos;
}
