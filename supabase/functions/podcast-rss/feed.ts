/**
 * PODCAST RSS ÜRETİCİSİ — RSS 2.0 + iTunes ad alanı (§10.4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * ŞEMA BU GÜN İÇİN HAZIRLANMIŞTI, ÜRETİCİ YOKTU
 *
 * `0053` podcast tablosuna `language`, `author`, `owner_email` ve
 * `explicit` kolonlarını koydu; bölüm tablosuna `audio_url`,
 * `audio_bytes`, `duration_sec`, `season`, `episode_no`. Hatta indeksin
 * adı `podcast_episodes_feed_idx` — `(podcast_id, publish_at desc)`,
 * yani tam olarak bu sorgunun sırası. Alanlar duruyordu, hiçbiri
 * okunmuyordu.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN SAF BİR MODÜL
 *
 * `radyo-durum/durum.ts` ile aynı ayrım: HTTP kabuğu `index.ts`te, kural
 * burada. Bir feed'in doğruluğu (kaçış, tarih biçimi, zorunlu alanlar)
 * ağdan ve veritabanından bağımsız ölçülebilmeli — podcast dizinleri
 * geçersiz XML'i sessizce reddeder ve hata ancak günler sonra fark
 * edilir.
 *
 * ══════════════════════════════════════════════════════════════════════
 * "HAZIR YAPI" NE DEMEK DEĞİL
 *
 * Belge "RSS feed üretimine hazır yapı" diyor. Bu, üretilmemiş bir feed
 * demek değil: dizine (Apple/Spotify) verilecek adres GERÇEK bir XML
 * döndürmek zorunda. Statik dosya olarak üretmek de olmazdı — yeni
 * bölüm yayımlandığında feed'in güncellenmesi için siteyi yeniden
 * derlemek gerekirdi ve zamanlanmış yayın (`publish_at`) hiç çalışmazdı.
 */

/** Feed'e giren podcast serisi. */
export interface FeedPodcast {
  title: string;
  slug: string;
  description: string;
  language: string;
  author: string | null;
  ownerEmail: string | null;
  explicit: boolean;
  coverUrl: string | null;
  category: string | null;
}

/** Feed'e giren tek bölüm. */
export interface FeedEpisode {
  title: string;
  slug: string;
  description: string;
  publishAt: string;
  audioUrl: string | null;
  audioBytes: number | null;
  durationSec: number | null;
  season: number | null;
  episodeNo: number | null;
  /**
   * `null` = SERİNİNKİ geçerli.
   *
   * `0053` bu kolonu yalnızca seriye koymuş; bölüm bazında bir işaret
   * yok. Üretici düşüşü destekliyor ki kolon bir gün eklenirse yalnızca
   * `index.ts` değişsin.
   */
  explicit: boolean | null;
  guid: string;
}

export interface FeedOptions {
  /** Sitenin kök adresi — `https://astrohub.com.tr` gibi, sonda `/` yok. */
  siteUrl: string;
  /** Feed'in kendi adresi (`atom:link rel="self"`). */
  feedUrl: string;
}

/**
 * XML metin kaçışı.
 *
 * BEŞ KARAKTERİN HEPSİ, ve `&` ÖNCE. Ters sırada yapılsaydı `&lt;`
 * içindeki `&` ikinci turda tekrar kaçırılır ve `&amp;lt;` çıkardı —
 * dinleyici başlıkta düz metin olarak "&lt;" görürdü.
 *
 * CDATA kullanılmadı: bir bölüm açıklamasında `]]>` geçmesi (kod örneği,
 * alıntı) CDATA'yı erkenden kapatır ve feed'i bozar. Kaçış her girdide
 * çalışıyor, CDATA yalnızca çoğu girdide.
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * XML 1.0'da GEÇERSİZ olan kontrol karakterlerini atar.
 *
 * Kaçış bunları kurtarmıyor: `&#x1;` de geçersiz. Veritabanından gelen
 * bir metinde (kopyala-yapıştır artığı) tek bir `` bütün feed'i
 * ayrıştırılamaz yapar ve dizin seriyi düşürür.
 */
export function stripInvalidXml(value: string): string {
  /* XML 1.0 §2.2: yalnızca TAB, LF ve CR geçerli; kalan C0 kontrolleri
     hiçbir kaçışla temsil edilemiyor — `&#x1;` de geçersiz. */
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

const GUNLER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const AYLAR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * RFC 822 tarihi — RSS'in `pubDate` biçimi.
 *
 * `toUTCString()` KULLANILMADI. Çıktısı "Sat, 02 Aug 2026 10:00:00 GMT"
 * ve RFC 822 sayısal ofset ister; "GMT" bazı ayrıştırıcılarda geçiyor,
 * bazılarında geçmiyor. `+0000` her yerde geçiyor.
 *
 * Gün ve ay adları SABİT DİZİDEN geliyor, `toLocaleDateString`ten değil:
 * feed'in dili Türkçe olsa bile tarih biçimi İngilizce olmak zorunda ve
 * çalıştığı ortamın yereli bunu değiştirmemeli.
 */
export function rfc822(value: Date): string {
  const iki = (n: number) => String(n).padStart(2, '0');
  return (
    `${GUNLER[value.getUTCDay()]}, ${iki(value.getUTCDate())} ` +
    `${AYLAR[value.getUTCMonth()]} ${value.getUTCFullYear()} ` +
    `${iki(value.getUTCHours())}:${iki(value.getUTCMinutes())}:` +
    `${iki(value.getUTCSeconds())} +0000`
  );
}

/** Saniye → `HH:MM:SS`; iTunes `duration` bu biçimi bekliyor. */
export function itunesDuration(seconds: number): string {
  const t = Math.max(0, Math.trunc(seconds));
  const iki = (n: number) => String(n).padStart(2, '0');
  return `${iki(Math.floor(t / 3600))}:${iki(Math.floor((t % 3600) / 60))}:${iki(t % 60)}`;
}

/** Metni kaçırıp geçersiz karakterlerden temizler. */
function metin(value: string | null | undefined): string {
  return escapeXml(stripInvalidXml(value ?? ''));
}

function etiket(ad: string, deger: string | null | undefined): string {
  const v = metin(deger);
  return v ? `    <${ad}>${v}</${ad}>` : '';
}

/**
 * Bölümü `<item>` olarak yazar.
 *
 * SES DOSYASI OLMAYAN BÖLÜM FEED'E GİRMİYOR ve bu çağıranın işi
 * (`buildPodcastFeed` süzüyor): `<enclosure>` olmadan bir podcast
 * bölümü, dinleyicinin oynatamayacağı bir satır olurdu. Sitede
 * görünmeye devam ediyor — orada metin ve marker'lar da var.
 */
function item(
  episode: FeedEpisode,
  podcast: FeedPodcast,
  options: FeedOptions
): string {
  const link = `${options.siteUrl}/radyo/podcast/${podcast.slug}/${episode.slug}`;
  const satirlar = [
    '  <item>',
    etiket('title', episode.title),
    `    <link>${metin(link)}</link>`,
    /* `isPermaLink="false"`: GUID bir ADRES değil KİMLİK. Bölümün
       adresi değişirse (slug düzeltmesi) dizin onu yeni bölüm sanmamalı
       — abonelere aynı bölüm ikinci kez düşerdi. */
    `    <guid isPermaLink="false">${metin(episode.guid)}</guid>`,
    `    <pubDate>${rfc822(new Date(episode.publishAt))}</pubDate>`,
    etiket('description', episode.description),
    etiket('itunes:summary', episode.description),
  ];

  if (episode.audioUrl) {
    /* `length` zorunlu ve bilinmiyorsa 0 yazılıyor: alanı hiç yazmamak
       bazı dizinlerde bölümü geçersiz yapıyor, 0 ise "bilinmiyor"
       olarak kabul ediliyor. */
    satirlar.push(
      `    <enclosure url="${metin(episode.audioUrl)}" ` +
        `length="${episode.audioBytes ?? 0}" type="audio/mpeg" />`
    );
  }
  if (episode.durationSec !== null) {
    satirlar.push(
      `    <itunes:duration>${itunesDuration(episode.durationSec)}</itunes:duration>`
    );
  }
  if (episode.season !== null) {
    satirlar.push(`    <itunes:season>${episode.season}</itunes:season>`);
  }
  if (episode.episodeNo !== null) {
    satirlar.push(`    <itunes:episode>${episode.episodeNo}</itunes:episode>`);
  }
  /* Bölümün kendi işareti yoksa serininki geçerli — dizin her item'da
     bir değer bekliyor. */
  const isaret = episode.explicit ?? podcast.explicit;
  satirlar.push(
    `    <itunes:explicit>${isaret ? 'true' : 'false'}</itunes:explicit>`
  );
  satirlar.push('  </item>');
  return satirlar.filter(Boolean).join('\n');
}

/**
 * Seri + bölümlerden tam bir RSS belgesi üretir.
 *
 * SIRA YENİDEN ESKİYE. Podcast istemcileri feed sırasını koruyor;
 * eskiden yeniye yazan bir feed, uygulamada en eski bölümü "en son
 * yayımlanan" gibi gösterir.
 */
export function buildPodcastFeed(
  podcast: FeedPodcast,
  episodes: FeedEpisode[],
  options: FeedOptions
): string {
  const yayinlanabilir = episodes
    .filter((e) => e.audioUrl)
    .slice()
    .sort(
      (a, b) => new Date(b.publishAt).getTime() - new Date(a.publishAt).getTime()
    );

  const sayfa = `${options.siteUrl}/radyo/podcast/${podcast.slug}`;
  const govde = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" ' +
      'xmlns:atom="http://www.w3.org/2005/Atom" ' +
      'xmlns:content="http://purl.org/rss/1.0/modules/content/">',
    '<channel>',
    `    <title>${metin(podcast.title)}</title>`,
    `    <link>${metin(sayfa)}</link>`,
    `    <atom:link href="${metin(options.feedUrl)}" rel="self" type="application/rss+xml" />`,
    etiket('description', podcast.description),
    /* Dil kolonu `not null default 'tr'` — feed'de de zorunlu. */
    `    <language>${metin(podcast.language || 'tr')}</language>`,
    etiket('itunes:author', podcast.author),
    etiket('itunes:summary', podcast.description),
    `    <itunes:explicit>${podcast.explicit ? 'true' : 'false'}</itunes:explicit>`,
  ];

  if (podcast.coverUrl) {
    govde.push(`    <itunes:image href="${metin(podcast.coverUrl)}" />`);
    govde.push(
      `    <image><url>${metin(podcast.coverUrl)}</url>` +
        `<title>${metin(podcast.title)}</title>` +
        `<link>${metin(sayfa)}</link></image>`
    );
  }
  if (podcast.category) {
    govde.push(`    <itunes:category text="${metin(podcast.category)}" />`);
  }
  /*
   * SAHİP E-POSTASI YALNIZCA VARSA. Apple bu alanı doğrulama için
   * istiyor ama alan feed'de HERKESE AÇIK; boş bırakmak, olmayan bir
   * adres uydurmaktan iyi. `0053` kolonu zaten `null` olabilir.
   */
  if (podcast.ownerEmail) {
    govde.push(
      '    <itunes:owner>' +
        `<itunes:name>${metin(podcast.author ?? podcast.title)}</itunes:name>` +
        `<itunes:email>${metin(podcast.ownerEmail)}</itunes:email>` +
        '</itunes:owner>'
    );
  }
  if (yayinlanabilir.length) {
    govde.push(
      `    <lastBuildDate>${rfc822(new Date(yayinlanabilir[0].publishAt))}</lastBuildDate>`
    );
  }

  return [
    ...govde.filter(Boolean),
    ...yayinlanabilir.map((e) => item(e, podcast, options)),
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
}
