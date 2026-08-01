import { describe, expect, it } from 'vitest';
import {
  authUrl,
  backoffMs,
  DAILY_QUOTA,
  parseDuration,
  parseTokenResponse,
  QUOTA_COST,
  quotaAllows,
  shouldRetry,
  toSyncedVideo,
  uploadsPlaylistId,
} from './youtube';

/**
 * YOUTUBE ADAPTÖRÜ.
 *
 * Ölçülen dört şey: süre biçiminin tuzakları, kota bütçesi, jeton
 * yanıtındaki `refresh_token` yokluğu (entegrasyonlarda en sık yapılan
 * hata) ve bozuk video kaydının bütün senkronizasyonu düşürmemesi.
 */

describe('parseDuration', () => {
  it('tam biçimi çözüyor', () => {
    expect(parseDuration('PT1H2M3S')).toBe(3723);
  });

  it('eksik bileşenleri çözüyor', () => {
    expect(parseDuration('PT4M13S')).toBe(253);
    expect(parseDuration('PT45S')).toBe(45);
    expect(parseDuration('PT2H')).toBe(7200);
    expect(parseDuration('PT90M')).toBe(5400);
  });

  it('gün bileşenini çözüyor', () => {
    expect(parseDuration('P1DT2H')).toBe(93_600);
  });

  it('ondalık saniyeyi aşağı yuvarlıyor', () => {
    expect(parseDuration('PT10.5S')).toBe(10);
  });

  /**
   * CANLI YAYINDA SÜRE `P0D` GELİYOR. 0 yazmak "video boş" demek
   * olurdu; doğru cevap "bilmiyoruz" ve arayüz süreyi hiç göstermiyor.
   */
  it('sıfır süre null dönüyor — canlı yayın P0D veriyor', () => {
    expect(parseDuration('P0D')).toBeNull();
    expect(parseDuration('PT0S')).toBeNull();
  });

  it('bozuk ve boş girdiler null', () => {
    expect(parseDuration('1:02:03')).toBeNull();
    expect(parseDuration('')).toBeNull();
    expect(parseDuration(null)).toBeNull();
    expect(parseDuration(undefined)).toBeNull();
  });
});

describe('kota', () => {
  /* Bir arama çağrısı yüz listeleme çağrısına bedel — senkronizasyon
     bu yüzden `search` kullanmıyor. */
  it('search diğerlerinin yüz katı', () => {
    expect(QUOTA_COST['search.list']).toBe(100);
    expect(QUOTA_COST['playlistItems.list']).toBe(1);
  });

  it('boş bütçede izin veriyor', () => {
    expect(quotaAllows(0, 'playlistItems.list')).toBe(true);
  });

  /* %10 pay tek seferlik çağrılara ayrılıyor: tam tavana kadar
     harcamak, o gün kanal doğrulamayı imkânsız kılardı. */
  it('pay bölgesine girmiyor', () => {
    expect(quotaAllows(DAILY_QUOTA * 0.9, 'playlistItems.list')).toBe(false);
    expect(quotaAllows(DAILY_QUOTA * 0.9 - 1, 'playlistItems.list')).toBe(true);
  });

  it('pahalı çağrı bütçeyi daha erken bitiriyor', () => {
    expect(quotaAllows(8800, 'search.list')).toBe(true);
    expect(quotaAllows(8950, 'search.list')).toBe(false);
  });
});

describe('uploadsPlaylistId', () => {
  /* UCxxx → UUxxx: YouTube'un sabit kuralı. `channels.list` çağırmak
     bir kota birimi ve bir gidiş dönüş daha olurdu. */
  it('kanal kimliğinden playlist üretiyor', () => {
    expect(uploadsPlaylistId('UCabcdefghijklmnopqrstuv')).toBe(
      'UUabcdefghijklmnopqrstuv'
    );
  });

  it('bozuk kanal kimliği null', () => {
    expect(uploadsPlaylistId('kanal')).toBeNull();
    expect(uploadsPlaylistId('UC-kisa')).toBeNull();
  });
});

describe('toSyncedVideo', () => {
  const item = {
    id: 'dQw4w9WgXcQ',
    snippet: {
      title: 'Orion Bulutsusu Çekimi',
      description: 'Uzun pozlama denemesi.',
      publishedAt: '2026-07-01T18:00:00Z',
      thumbnails: {
        default: { url: 'https://i.ytimg.com/default.jpg' },
        high: { url: 'https://i.ytimg.com/high.jpg' },
        maxres: { url: 'https://i.ytimg.com/maxres.jpg' },
      },
    },
    contentDetails: { duration: 'PT12M30S' },
  };

  it('alanları satıra çeviriyor', () => {
    const v = toSyncedVideo(item);
    expect(v?.youtubeId).toBe('dQw4w9WgXcQ');
    expect(v?.title).toBe('Orion Bulutsusu Çekimi');
    expect(v?.durationSec).toBe(750);
    expect(v?.publishedAt).toBe('2026-07-01T18:00:00Z');
  });

  /* `default` 120px — kart görselinde bulanık görünür. */
  it('en büyük kapağı seçiyor', () => {
    expect(toSyncedVideo(item)?.thumbnailUrl).toBe(
      'https://i.ytimg.com/maxres.jpg'
    );
  });

  it('maxres yoksa bir alt boyuta düşüyor', () => {
    const v = toSyncedVideo({
      ...item,
      snippet: {
        ...item.snippet,
        thumbnails: { default: { url: 'https://i.ytimg.com/default.jpg' } },
      },
    });
    expect(v?.thumbnailUrl).toBe('https://i.ytimg.com/default.jpg');
  });

  it('kapak yoksa null — arayüz kendi görselini çiziyor', () => {
    const v = toSyncedVideo({ ...item, snippet: { title: 'Başlık' } });
    expect(v?.thumbnailUrl).toBeNull();
  });

  /**
   * BOZUK KAYIT ATLANIYOR, HATA VERİLMİYOR. Bir listede tek bozuk kayıt
   * yüzünden senkronizasyonu düşürmek, doksan dokuz sağlam videoyu da
   * kaybetmek olurdu.
   */
  it.each([
    ['kimlik yok', { snippet: { title: 'X' } }],
    ['kimlik bozuk', { id: '"><script>', snippet: { title: 'X' } }],
    ['kimlik kısa', { id: 'abc', snippet: { title: 'X' } }],
    ['başlık boş', { id: 'dQw4w9WgXcQ', snippet: { title: '   ' } }],
    ['öğe null', null],
    ['öğe metin', 'video'],
  ])('%s → null', (_ad, girdi) => {
    expect(toSyncedVideo(girdi)).toBeNull();
  });
});

describe('authUrl', () => {
  const url = authUrl({
    clientId: 'abc.apps.googleusercontent.com',
    redirectUri: 'https://astrohub.example/oauth/youtube',
    state: 'rastgele-durum',
  });

  /**
   * `access_type=offline` + `prompt=consent` İKİSİ BİRDEN GEREKLİ.
   * İkincisi olmadan Google, kullanıcı daha önce izin verdiyse yenileme
   * jetonunu tekrar göndermiyor — ve o jeton olmadan bağlantı bir saat
   * sonra ölüyor.
   */
  it('yenileme jetonu isteyen parametreleri taşıyor', () => {
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  /* En dar kapsam: yazma yetkisi istemek, sızan bir jetonun kanalı
     yönetebilmesi demekti. */
  it('yalnızca okuma kapsamı istiyor', () => {
    /* Kapsam parametresinin KENDİSİ okunuyor: adresin başka yerinde
       "youtube" geçiyor (redirect_uri de /oauth/youtube ile bitiyor) ve
       düz metin araması bunu yazma kapsamı sanabilirdi. */
    const scope = new URL(url).searchParams.get('scope');
    expect(scope).toBe('https://www.googleapis.com/auth/youtube.readonly');
  });

  it('CSRF için state taşıyor', () => {
    expect(url).toContain('state=rastgele-durum');
  });
});

describe('parseTokenResponse', () => {
  const now = Date.parse('2026-08-01T10:00:00Z');

  it('ilk yetkilendirmede yenileme jetonu geliyor', () => {
    const t = parseTokenResponse(
      { access_token: 'AT', refresh_token: 'RT', expires_in: 3600 },
      now
    );
    expect(t?.accessToken).toBe('AT');
    expect(t?.refreshToken).toBe('RT');
  });

  /**
   * YENİLEMEDE `refresh_token` GELMİYOR ve bu normal. `null` dönüyor;
   * çağıran mevcut jetonu KORUYOR. Üzerine `null` yazsaydık bağlantı
   * ilk yenilemede kendini öldürürdü.
   */
  it('yenilemede yenileme jetonu yok — null dönüyor', () => {
    const t = parseTokenResponse({ access_token: 'AT2', expires_in: 3600 }, now);
    expect(t?.accessToken).toBe('AT2');
    expect(t?.refreshToken).toBeNull();
  });

  /* Altmış saniye pay: tam sınırda yenilenen jetonla giden istek 401 alır. */
  it('son kullanma bir dakika erkene alınıyor', () => {
    const t = parseTokenResponse({ access_token: 'AT', expires_in: 3600 }, now);
    expect(t?.expiresAt).toBe('2026-08-01T10:59:00.000Z');
  });

  it('expires_in yoksa bir saat varsayılıyor', () => {
    const t = parseTokenResponse({ access_token: 'AT' }, now);
    expect(t?.expiresAt).toBe('2026-08-01T10:59:00.000Z');
  });

  it.each([
    ['boş yanıt', null],
    ['erişim jetonu yok', { refresh_token: 'RT' }],
    ['erişim jetonu boş', { access_token: '' }],
  ])('%s → null', (_ad, girdi) => {
    expect(parseTokenResponse(girdi, now)).toBeNull();
  });
});

describe('shouldRetry', () => {
  /**
   * 403 KOTA HATASI DENENMEMELİ: kota gün sonuna kadar dolu ve tekrar
   * denemek yalnızca daha çok hata üretir. 429 ve 5xx denenmeli — ikisi
   * de geçici. İkisi de "başarısız" görünüyor ama biri bekleyerek
   * çözülüyor, diğeri ertesi günü bekliyor.
   */
  it('geçici hatalar deneniyor', () => {
    expect(shouldRetry(429)).toBe(true);
    expect(shouldRetry(500)).toBe(true);
    expect(shouldRetry(503)).toBe(true);
  });

  it('kota ve yetki hataları denenmiyor', () => {
    expect(shouldRetry(403)).toBe(false);
    expect(shouldRetry(401)).toBe(false);
    expect(shouldRetry(404)).toBe(false);
    expect(shouldRetry(400)).toBe(false);
  });
});

describe('backoffMs', () => {
  it('üstel artıyor ve tavana oturuyor', () => {
    expect(backoffMs(0)).toBe(1000);
    expect(backoffMs(1)).toBe(2000);
    expect(backoffMs(2)).toBe(4000);
    expect(backoffMs(10)).toBe(8000);
  });
});
