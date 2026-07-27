/**
 * RADYO — tür tanımları.
 *
 * İki kaynak türü desteklenir ve **aralarındaki fark teknik bir kısıttır,
 * tasarım tercihi değil**:
 *
 *   mp3      Siteye yüklenen ses dosyası. `<audio>` ile çalınır; sıra
 *            kesintisiz akar, ses seviyesi kontrol edilebilir, parça bitince
 *            otomatik olarak sonrakine geçilir. Gerçek "radyo" davranışı.
 *
 *   spotify  Spotify parçası. Spotify lisans gereği ham ses akışını üçüncü
 *            taraf oynatıcılara açmaz; yalnızca kendi gömülü oynatıcısını
 *            (iframe) verir. Bu yüzden bir Spotify parçası sıraya "karışamaz":
 *            kendi oynatıcısında çalar, MP3 akışı o sırada duraklatılır ve
 *            parça bitince otomatik geçiş yapılamaz (iframe bize bitiş
 *            olayını bildirmez).
 *
 * Bu ayrımı arayüzde saklamıyoruz — kullanıcı neden bazı parçaların
 * kesintisiz akıp bazılarının akmadığını görebilmeli.
 */

export type TrackSource = 'mp3' | 'spotify';

export interface RadioTrack {
  id: string;
  title: string;
  artist: string;
  source: TrackSource;
  /**
   * mp3 için ses dosyasının genel URL'i (Supabase storage),
   * spotify için parça adresi (`https://open.spotify.com/track/...`).
   */
  url: string;
  /** Saniye cinsinden süre; mp3'lerde yüklemede okunur, bilinmiyorsa boş. */
  durationSec?: number;
  /** Kısa not — "yavaş tempo", "vokalsiz" gibi. */
  note?: string;
}

export interface RadioChannel {
  id: string;
  name: string;
  description: string;
  trackIds: string[];
}

/** Spotify parça adresinden gömülü oynatıcı adresini üretir. */
export function spotifyEmbedUrl(url: string): string | null {
  // Kabul edilen biçimler:
  //   https://open.spotify.com/track/<id>
  //   https://open.spotify.com/intl-tr/track/<id>?si=...
  //   spotify:track:<id>
  const uriMatch = url.match(/^spotify:track:([A-Za-z0-9]+)$/);
  if (uriMatch) return `https://open.spotify.com/embed/track/${uriMatch[1]}`;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== 'open.spotify.com') return null;

    // Yol dilimlerinden "track" ve ardından gelen kimliği bul; araya
    // "intl-tr" gibi yerelleştirme dilimleri girebiliyor.
    const parts = parsed.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('track');
    const id = i >= 0 ? parts[i + 1] : undefined;
    if (!id || !/^[A-Za-z0-9]+$/.test(id)) return null;

    return `https://open.spotify.com/embed/track/${id}`;
  } catch {
    return null;
  }
}

/** Saniyeyi `4:07` biçiminde yazar. */
export function formatTrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
