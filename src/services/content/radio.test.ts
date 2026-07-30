import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/supabase/client', () => ({
  isSupabaseConfigured: false,
  getSupabase: () => null,
}));

import { mapRadioRows, radioPublicUrl, fetchRadioTracks } from './radio';

/*
 * Ortam testlerde bilerek yapılandırmasız (vitest.config env'i boşaltıyor);
 * URL üretimi mock'lanmış modülle değil gerçek env kuralıyla sınanır.
 */
describe('radioPublicUrl', () => {
  it('yapılandırmasız ortamda adres üretmez', () => {
    expect(radioPublicUrl('gece/nocturne.mp3')).toBeNull();
  });
});

describe('mapRadioRows', () => {
  const base = {
    id: 'a1',
    title: 'Nocturne',
    artist: 'Astro',
    duration_sec: 240,
    note: null,
  };

  it('spotify satırında adresi olduğu gibi taşır', () => {
    const rows = [
      {
        ...base,
        source: 'spotify' as const,
        path: 'https://open.spotify.com/track/abc123',
      },
    ];
    const tracks = mapRadioRows(rows);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].url).toBe('https://open.spotify.com/track/abc123');
    expect(tracks[0].durationSec).toBe(240);
  });

  it('mp3 satırını adres kurulamıyorsa (env yok) sessizce atlar', () => {
    // Yarım kayıt üretmek yerine atlamak: adressiz mp3 çalınamaz ve
    // oynatıcıda tıklanınca kırılan bir satır olurdu.
    const rows = [
      { ...base, source: 'mp3' as const, path: 'gece/nocturne.mp3' },
    ];
    expect(mapRadioRows(rows)).toHaveLength(0);
  });

  it('null süre ve notu opsiyonel alana çevirir', () => {
    const rows = [
      {
        ...base,
        duration_sec: null,
        source: 'spotify' as const,
        path: 'https://open.spotify.com/track/x',
      },
    ];
    const track = mapRadioRows(rows)[0];
    expect(track.durationSec).toBeUndefined();
    expect(track.note).toBeUndefined();
  });
});

describe('fetchRadioTracks', () => {
  it('yapılandırmasız ortamda null döner — tohum listeye düşülür', async () => {
    await expect(fetchRadioTracks()).resolves.toBeNull();
  });
});
