const bridge = 'http://127.0.0.1:4765/status';

document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('open').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://astrohub.com.tr/simulator' });
});

refresh();

async function refresh() {
  setText('error', '');
  try {
    const response = await fetch(bridge, { headers: { Accept: 'application/json' } });
    const data = await response.json();
    setText('state', data.connected ? 'Canlı' : 'Bridge açık');
    setText('model', data.name || data.driverId || '—');
    setText('ra', formatRa(data.rightAscensionHours));
    setText('dec', formatDeg(data.declinationDeg));
    setText('site', `${formatDeg(data.siteLatitudeDeg)} / ${formatDeg(data.siteLongitudeDeg)}`);
  } catch (error) {
    setText('state', 'Kapalı');
    setText('error', 'Mount Bridge çalışmıyor. Önce tools/mount-bridge içindeki bridge’i başlatın.');
  }
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function formatRa(value) {
  if (typeof value !== 'number') return '—';
  const h = Math.floor(value);
  const m = Math.floor((value - h) * 60);
  const s = Math.round(((value - h) * 60 - m) * 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function formatDeg(value) {
  return typeof value === 'number' ? `${value.toFixed(2)}°` : '—';
}

function pad(value) {
  return String(value).padStart(2, '0');
}
