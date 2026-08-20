import { describe, expect, it } from 'vitest';
import {
  RADIO_MAX_BYTES,
  radioObjectPath,
  validateAudioFile,
  validateBroadcast,
  validateTrack,
  validateTrackIdentity,
} from './broadcastAdmin';

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
      validateBroadcast({
        ...base,
        refKind: 'channel',
        youtubeId: 'dQw4w9WgXcQ',
      })
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
      validateTrack({
        title: '  ',
        artist: '',
        source: 'mp3',
        path: 'a.mp3',
        note: '',
      })
    ).toContain('Başlık');
  });
});

describe('validateTrackIdentity', () => {
  it('liste içi düzenlemede parça adını zorunlu tutar', () => {
    expect(
      validateTrackIdentity({ title: 'Night Drift', artist: 'AstroHub' })
    ).toBeNull();

    expect(
      validateTrackIdentity({ title: '  ', artist: 'AstroHub' })
    ).toContain('Başlık');
  });
});

/* ══════════════════════════════════════════════════════════════════════
   RADYO KASASI — sürükle bırak yüklemenin saf parçaları
   ══════════════════════════════════════════════════════════════════════ */

describe('radioObjectPath', () => {
  /*
   * ASIL KURAL. Depolama yolu ASCII kalmalı: Supabase Türkçe karakteri
   * kabul ediyor ama üretilen genel URL'de yüzde kodlamasına dönüşüyor
   * ve elle kopyalanan bir adres bozuluyor.
   */
  it('Türkçe harfleri karşılıklarına indiriyor', () => {
    expect(radioObjectPath('Gökyüzü Sessizliği.mp3', 'abc123')).toBe(
      'gokyuzu-sessizligi-abc123.mp3'
    );
  });

  it('boşluk ve noktalama yerine tek tire koyuyor', () => {
    expect(radioObjectPath('Gece   Yürüyüşü (v2).mp3', 'x1')).toBe(
      'gece-yuruyusu-v2-x1.mp3'
    );
  });

  it('baştaki ve sondaki tireleri atıyor', () => {
    expect(radioObjectPath('!!! deneme !!!.ogg', 'q9')).toBe('deneme-q9.ogg');
  });

  /*
   * Rastgele son ek olmasaydı aynı adlı ikinci dosya ilkini sessizce
   * ezerdi — editör iki farklı parça yükleyip birini kaybederdi.
   */
  it('son ek yolu benzersizleştiriyor', () => {
    expect(radioObjectPath('a.mp3', 'aaa')).not.toBe(
      radioObjectPath('a.mp3', 'bbb')
    );
  });

  it('uzantısız dosyayı mp3 sayıyor', () => {
    expect(radioObjectPath('nocturne', 'z1')).toBe('nocturne-z1.mp3');
  });

  it('adı tamamen elenen dosyaya yine de geçerli bir yol veriyor', () => {
    expect(radioObjectPath('###.mp3', 'k2')).toBe('parca-k2.mp3');
  });
});

describe('validateAudioFile', () => {
  const dosya = (ad: string, tur: string, boyut: number): File => {
    const f = new File(['x'], ad, { type: tur });
    Object.defineProperty(f, 'size', { value: boyut });
    return f;
  };

  it('geçerli MP3 kabul ediliyor', () => {
    expect(validateAudioFile(dosya('a.mp3', 'audio/mpeg', 1024))).toBeNull();
  });

  it('sınırı aşan dosya reddediliyor ve boyutu söyleniyor', () => {
    const sonuc = validateAudioFile(
      dosya('a.mp3', 'audio/mpeg', RADIO_MAX_BYTES + 1)
    );
    expect(sonuc).toContain('MB');
  });

  /*
   * Tarayıcı bazı .mp3 dosyalarına boş tür veriyor. Uzantıyı yedek
   * saymasaydık, geçerli bir dosya "türü tanınmadı" diye reddedilirdi.
   */
  it('tür boşsa uzantıya bakıyor', () => {
    expect(validateAudioFile(dosya('a.mp3', '', 1024))).toBeNull();
    expect(validateAudioFile(dosya('a.txt', '', 1024))).toContain('tanınmadı');
  });

  it('ses olmayan türü reddediyor', () => {
    expect(
      validateAudioFile(dosya('a.pdf', 'application/pdf', 1024))
    ).toContain('yüklenebilir');
  });
});
