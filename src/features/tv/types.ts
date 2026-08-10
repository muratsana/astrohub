/** Astrohub.tv — yayın tipleri ve gömme adresi üretimi. */

export type BroadcastKind = 'live' | 'scheduled' | 'archive';
export type YoutubeRef = 'video' | 'channel';

export const broadcastKindLabels: Record<BroadcastKind, string> = {
  live: 'Canlı',
  scheduled: 'Programda',
  archive: 'Arşiv',
};

export interface Broadcast {
  /**
   * Veritabanı kimliği. Tohum kayıtlarda YOK: yayın takibi gerçek bir
   * satıra bağlanır ve tohum bir yayını takip etmek yabancı anahtar
   * hatası verirdi. `AstroEvent.id` ile aynı gerekçe.
   */
  id?: string;
  slug: string;
  title: string;
  description: string;
  kind: BroadcastKind;
  refKind: YoutubeRef;
  /** 11 karakterlik video kimliği ya da UC ile başlayan kanal kimliği. */
  youtubeId: string;
  startsAt?: string;
  endsAt?: string;
  position: number;
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/**
 * Kimliğin beklenen biçimde olduğunu doğrular.
 *
 * Aynı kural veritabanında da kısıt olarak var (0011). İki yerde olması
 * tekrar değil: veritabanı kaydın bozuk yazılmasını, bu fonksiyon da
 * başka bir yoldan gelen (tohum veri, elle düzenlenmiş yerel kayıt)
 * bozuk bir kimliğin `<iframe src>` içine geçmesini engelliyor.
 */
export function isValidYoutubeId(ref: YoutubeRef, id: string): boolean {
  return ref === 'video' ? VIDEO_ID.test(id) : CHANNEL_ID.test(id);
}

/**
 * GÖMME ADRESİ KODDA KURULUR, VERİTABANINDAN GELMEZ.
 *
 * Veritabanında tam URL saklansaydı, o alana yazma yetkisi olan biri
 * oynatıcıyı bambaşka bir siteye çevirebilirdi — `<iframe src>` içine
 * doğrudan giden bir alan, en sessiz XSS yüzeylerinden biridir (§15.4).
 * Burada yalnızca **kimlik** alınır, adres sabittir ve kimlik biçime
 * uymuyorsa `null` döner: oynatıcı hiç render edilmez.
 *
 * `youtube-nocookie.com` tercih edildi: izleyici oynatmaya basmadan
 * YouTube'un reklam çerezleri yazılmaz (§15.7 ve çerez politikamız).
 */
export function youtubeEmbedUrl(
  ref: YoutubeRef,
  id: string,
  options: { autoplay?: boolean } = {}
): string | null {
  if (!isValidYoutubeId(ref, id)) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
  });
  if (options.autoplay) params.set('autoplay', '1');

  if (ref === 'channel') {
    // Kanalın o an yayında olan akışı. Yayın yoksa YouTube kendi
    // "yayın yok" ekranını gösterir; biz bunu tespit edemeyiz.
    params.set('channel', id);
    return `https://www.youtube-nocookie.com/embed/live_stream?${params}`;
  }

  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

/**
 * Yapıştırılan adresten ya da düz kimlikten video kimliği çıkarır.
 *
 * NEDEN VAR: editöre video eklemek isteyen kişinin elinde kimlik değil
 * tarayıcıdan kopyaladığı ADRES oluyor. "Kimliği kendin ayıkla" demek,
 * onu `watch?v=` sonrasını elle kesmeye zorlamak ve her seferinde bir
 * karakter fazla/eksik alma riskini kabul etmek olurdu.
 *
 * ÇIKARIM GEVŞEK, DOĞRULAMA KATI: hangi biçimden gelirse gelsin sonuç
 * `isValidYoutubeId`den geçiyor, geçmezse `null`. Yani bu fonksiyon
 * güvenlik sınırını genişletmiyor, yalnızca aynı sınırın önüne bir
 * kolaylık koyuyor. Depolamaya yine yalnızca kimlik yazılıyor.
 */
export function youtubeIdFromInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  /* Düz kimlik: en sık durum, adres ayrıştırmaya hiç girmiyor. */
  if (isValidYoutubeId('video', trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    const aday =
      host === 'youtu.be'
        ? url.pathname.slice(1)
        : host === 'youtube.com' || host === 'youtube-nocookie.com'
          ? (url.searchParams.get('v') ??
            url.pathname.replace(/^\/(embed|shorts|live)\//, ''))
          : '';
    return isValidYoutubeId('video', aday) ? aday : null;
  } catch {
    return null;
  }
}

/** İzleyicinin YouTube'da açması için normal izleme adresi. */
export function youtubeWatchUrl(ref: YoutubeRef, id: string): string | null {
  if (!isValidYoutubeId(ref, id)) return null;
  return ref === 'channel'
    ? `https://www.youtube.com/channel/${id}/live`
    : `https://www.youtube.com/watch?v=${id}`;
}

/**
 * Program sırası: canlı yayın her zaman başta, sonra yaklaşan programlar
 * (en yakın önce), en sonda arşiv (en yeni önce).
 *
 * Sıralamayı `position` kolonuna bırakmak, editörün canlı yayını her
 * seferinde elle en üste taşımasını gerektirirdi — ve unuttuğu gece
 * canlı yayın listenin ortasında kalırdı.
 */
export function sortBroadcasts(items: Broadcast[]): Broadcast[] {
  const rank: Record<BroadcastKind, number> = {
    live: 0,
    scheduled: 1,
    archive: 2,
  };

  return [...items].sort((a, b) => {
    if (rank[a.kind] !== rank[b.kind]) return rank[a.kind] - rank[b.kind];

    if (a.kind === 'scheduled') {
      return (a.startsAt ?? '').localeCompare(b.startsAt ?? '');
    }
    if (a.kind === 'archive') {
      return (b.startsAt ?? '').localeCompare(a.startsAt ?? '');
    }
    return a.position - b.position;
  });
}

/** Yayında olan kayıt — yoksa `null`. */
export function liveBroadcast(items: Broadcast[]): Broadcast | null {
  return items.find((item) => item.kind === 'live') ?? null;
}
