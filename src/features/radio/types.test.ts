import { describe, it, expect } from 'vitest';
import { spotifyEmbedUrl, formatTrackTime } from './types';

describe('spotifyEmbedUrl', () => {
  it('standart parça adresini gömülü adrese çevirir', () => {
    expect(
      spotifyEmbedUrl('https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT')
    ).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
  });

  it('yerelleştirilmiş adresi de çözer', () => {
    // Spotify Türkiye'den kopyalanan bağlantı yola "intl-tr" dilimi ekler;
    // naif bir "üçüncü dilimi al" yaklaşımı burada kırılırdı.
    expect(
      spotifyEmbedUrl(
        'https://open.spotify.com/intl-tr/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123'
      )
    ).toBe('https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT');
  });

  it('spotify: URI biçimini kabul eder', () => {
    expect(spotifyEmbedUrl('spotify:track:4cOdK2wGLETKBW3PvgPWqT')).toBe(
      'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT'
    );
  });

  it('parça olmayan Spotify adreslerini reddeder', () => {
    expect(
      spotifyEmbedUrl('https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3')
    ).toBeNull();
    expect(spotifyEmbedUrl('https://open.spotify.com/')).toBeNull();
  });

  it('yabancı ve tehlikeli adresleri reddeder', () => {
    // Bu değer doğrudan bir iframe src'sine gidiyor: başka bir host ya da
    // javascript: şeması buradan geçmemeli.
    expect(spotifyEmbedUrl('https://kotu-site.example/track/123')).toBeNull();
    expect(spotifyEmbedUrl('javascript:alert(1)')).toBeNull();
    expect(spotifyEmbedUrl('not a url')).toBeNull();
    expect(spotifyEmbedUrl('')).toBeNull();
  });
});

describe('formatTrackTime', () => {
  it('saniyeyi dakika:saniye biçimine çevirir', () => {
    expect(formatTrackTime(0)).toBe('0:00');
    expect(formatTrackTime(7)).toBe('0:07');
    expect(formatTrackTime(247)).toBe('4:07');
    expect(formatTrackTime(3600)).toBe('60:00');
  });

  it('geçersiz değerlerde çökmez', () => {
    expect(formatTrackTime(NaN)).toBe('0:00');
    expect(formatTrackTime(-5)).toBe('0:00');
    expect(formatTrackTime(Infinity)).toBe('0:00');
  });
});
