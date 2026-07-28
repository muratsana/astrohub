import { describe, expect, it } from 'vitest';
import { validateBroadcast, validateTrack } from './broadcastAdmin';

const base = {
  slug: 'perseid-gecesi',
  title: 'Perseid Gecesi Canlı Yayın',
  description: '',
  kind: 'scheduled' as const,
  refKind: 'video' as const,
  youtubeId: 'dQw4w9WgXcQ',
  startsAt: null,
};

describe('validateBroadcast', () => {
  it('geçerli kaydı kabul eder', () => {
    expect(validateBroadcast(base)).toBeNull();
  });

  it('kısa adda büyük harf ve boşluk kabul etmez', () => {
    expect(validateBroadcast({ ...base, slug: 'Perseid Gecesi' })).toContain(
      'küçük harf'
    );
  });

  it('kısa başlığı reddeder', () => {
    expect(validateBroadcast({ ...base, title: 'ab' })).toContain('3 karakter');
  });

  /*
   * Kimlik `<iframe src>` yolunda. Veritabanı kısıtı da reddeder ama o red
   * ham bir Postgres hatası olarak döner; editöre ne yapması gerektiğini
   * söyleyen cümle burada üretiliyor.
   */
  it('video kimliği yanlış uzunluktaysa ne yapılacağını söyler', () => {
    const message = validateBroadcast({ ...base, youtubeId: 'kisa' });
    expect(message).toContain('11 karakter');
    expect(message).toContain('v=');
  });

  it('kanal kimliği için farklı kural uygular', () => {
    expect(
      validateBroadcast({
        ...base,
        refKind: 'channel',
        youtubeId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
      })
    ).toBeNull();

    expect(
      validateBroadcast({ ...base, refKind: 'channel', youtubeId: 'dQw4w9WgXcQ' })
    ).toContain('UC ile başlar');
  });

  it('adres yapıştırılmışsa reddeder', () => {
    expect(
      validateBroadcast({
        ...base,
        youtubeId: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      })
    ).not.toBeNull();
  });
});

describe('validateTrack', () => {
  it('MP3 için bucket yolu ister, tam adres değil', () => {
    expect(
      validateTrack({
        title: 'Nocturne',
        artist: '',
        source: 'mp3',
        path: 'gece/nocturne.mp3',
        note: '',
      })
    ).toBeNull();

    expect(
      validateTrack({
        title: 'Nocturne',
        artist: '',
        source: 'mp3',
        path: 'https://proje.supabase.co/storage/v1/object/public/radio/n.mp3',
        note: '',
      })
    ).toContain('yol girilir');
  });

  it('Spotify bağlantısını yalnızca open.spotify.com kabul eder', () => {
    expect(
      validateTrack({
        title: 'Track',
        artist: '',
        source: 'spotify',
        path: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
        note: '',
      })
    ).toBeNull();

    expect(
      validateTrack({
        title: 'Track',
        artist: '',
        source: 'spotify',
        path: 'https://kotu.site/track/1',
        note: '',
      })
    ).toContain('open.spotify.com');
  });

  it('boş başlığı reddeder', () => {
    expect(
      validateTrack({ title: '  ', artist: '', source: 'mp3', path: 'a.mp3', note: '' })
    ).toContain('Başlık');
  });
});
