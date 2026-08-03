/** Haftalık dış servis duman testi; PR akışını ağ dalgalanmasına bağlamaz. */
const targets = [
  {
    name: 'CARTO harita altlığı',
    url: 'https://a.basemaps.cartocdn.com/dark_all/6/37/22.png',
    type: 'image/',
  },
  {
    name: 'NASA GIBS gece ışıkları',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/default/GoogleMapsCompatible_Level8/3/5/4.jpg',
    type: 'image/',
  },
  {
    name: 'Open-Meteo hava API',
    url: 'https://api.open-meteo.com/v1/forecast?latitude=39.92&longitude=32.85&current=temperature_2m',
    type: 'application/json',
  },
];

const failures = [];
for (const target of targets) {
  try {
    const response = await fetch(target.url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'user-agent': 'Astrohub-External-Health/1.0' },
    });
    const type = response.headers.get('content-type') ?? '';
    if (!response.ok || !type.startsWith(target.type)) {
      failures.push(`${target.name}: HTTP ${response.status}, ${type || 'content-type yok'}`);
      continue;
    }
    console.log(`OK · ${target.name} · HTTP ${response.status}`);
  } catch (error) {
    failures.push(`${target.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures.length) {
  console.error(`Dış servis denetimi başarısız:\n${failures.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}

console.log(`Dış servis denetimi tamam · ${targets.length}/${targets.length}`);
