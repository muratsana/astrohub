export const SOFTWARE_SUGGESTIONS = [
  'PixInsight',
  'Siril',
  'Astro Pixel Processor',
  'Adobe Photoshop',
  'Photoshop',
  'Adobe Lightroom',
  'Lightroom',
  'Affinity Photo',
  'GIMP',
  'GraXpert',
  'NoiseXTerminator',
  'BlurXTerminator',
  'StarXTerminator',
  'StarNet++',
  'RC Astro Suite',
  'Seti Astro Suite',
  'DeepSkyStacker',
  'StarTools',
  'Nebulosity',
  'ImagesPlus',
  'MaxIm DL',
  'CCDStack',
  'AstroArt',
  'IRIS',
  'FITS Liberator',
  'AutoStakkert!',
  'RegiStax',
  'WinJUPOS',
  'AstroSurface',
  'FireCapture',
  'SharpCap',
  'PIPP',
  'LuckyStackWorker',
  'Lynkeos',
  'SER Player',
  'SolarStacker',
  'Sequator',
  'Starry Landscape Stacker',
  'StarStaX',
  'PTGui',
  'Hugin',
  'RawTherapee',
  'darktable',
  'Topaz Photo AI',
  'Topaz DeNoise AI',
  'Topaz Sharpen AI',
  'Neat Image',
  'Capture One',
  'DaVinci Resolve',
  'N.I.N.A.',
  'Sequence Generator Pro',
  'ASIAIR',
  'Ekos/KStars',
  'PHD2 Guiding',
  'MetaGuide',
  'APT - Astro Photography Tool',
  'Voyager',
  'TheSkyX',
  'Stellarium',
  'Cartes du Ciel',
  'SkySafari',
  'ASTAP',
  'astrometry.net',
  'Aladin',
] as const;

function normalizeSoftware(value: string): string {
  return value
    .toLowerCase()
    .replace(/adobe\s+/g, '')
    .replace(/[^a-z0-9ığüşöçİĞÜŞÖÇ+!]/gi, '');
}

export function selectedSoftwareNames(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function currentSoftwareQuery(value: string): string {
  const parts = value.split(',');
  return parts[parts.length - 1]?.trim() ?? '';
}

function completedSoftwareNames(value: string): string[] {
  const parts = value.split(',');
  return parts
    .slice(0, -1)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function softwareAutocompleteSuggestions(
  value: string,
  limit = 8
): string[] {
  const query = currentSoftwareQuery(value);
  const normalizedQuery = normalizeSoftware(query);
  const selected = new Set(
    completedSoftwareNames(value).map((item) => normalizeSoftware(item))
  );

  return SOFTWARE_SUGGESTIONS.filter((suggestion) => {
    if (selected.has(normalizeSoftware(suggestion))) return false;
    if (!normalizedQuery) return true;
    return normalizeSoftware(suggestion).includes(normalizedQuery);
  })
    .sort((a, b) => {
      const normalizedA = normalizeSoftware(a);
      const normalizedB = normalizeSoftware(b);
      const aStarts = normalizedA.startsWith(normalizedQuery);
      const bStarts = normalizedB.startsWith(normalizedQuery);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      const aLabelStarts = a.toLowerCase().startsWith(query.toLowerCase());
      const bLabelStarts = b.toLowerCase().startsWith(query.toLowerCase());
      if (aLabelStarts !== bLabelStarts) return aLabelStarts ? -1 : 1;
      return a.localeCompare(b, 'tr');
    })
    .slice(0, limit);
}

export function applySoftwareSuggestion(
  value: string,
  suggestion: string
): string {
  const parts = value.split(',');
  const prefix = parts
    .slice(0, -1)
    .map((part) => part.trim())
    .filter(Boolean);
  const normalizedSuggestion = normalizeSoftware(suggestion);
  const uniquePrefix = prefix.filter(
    (part) => normalizeSoftware(part) !== normalizedSuggestion
  );

  return [...uniquePrefix, suggestion].join(', ') + ', ';
}
