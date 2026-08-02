import {
  buildPodcastFeed,
  type FeedEpisode,
  type FeedPodcast,
} from './feed.ts';

/**
 * PODCAST RSS UÇ NOKTASI — `GET /podcast-rss?seri=<slug>` (§10.4).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN EDGE FONKSİYONU, NEDEN STATİK DOSYA DEĞİL
 *
 * Feed'i derleme zamanında üretip `dist/`e koymak denenebilirdi ve
 * ZAMANLANMIŞ YAYINI bozardı: `0053` bir bölümü `status = 'published'`
 * + ileri tarihli `publish_at` ile kaydetmeye izin veriyor, yani bölüm
 * kendi saati gelince yayına giriyor. Statik feed o saatte değil, bir
 * sonraki derlemede güncellenirdi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SERVİS ANAHTARI KULLANILMIYOR — `anon` YETERLİ
 *
 * `radyo-durum` servis anahtarı taşıyor çünkü YAZIYOR. Burada iş salt
 * okuma ve okunan şey zaten herkese açık: `0053`ün RLS politikası
 * yayımlanmış seriyi ve saati gelmiş bölümü `anon`a veriyor.
 *
 * Servis anahtarıyla okumak, RLS'i atlayıp TASLAK bölümleri feed'e
 * sızdırma riskini bu dosyanın doğru filtre yazmasına bağlardı. `anon`
 * ile okumak o riski veritabanına devrediyor: yayımlanmamış bir bölüm
 * buraya HİÇ ulaşmıyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * CORS YOK, CACHE VAR
 *
 * Feed'i tarayıcı JS'i değil podcast istemcisi çekiyor; `Access-Control-*`
 * başlıkları bu tüketici için anlamsız. Buna karşılık `Cache-Control`
 * gerçekten gerekli: dizinler feed'i sık yokluyor ve her yoklamanın
 * veritabanına inmesi gereksiz.
 */

const SITE = Deno.env.get('SITE_URL') ?? 'https://astrohub.com.tr';

interface PodcastRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  language: string | null;
  author: string | null;
  owner_email: string | null;
  explicit: boolean | null;
  cover_url: string | null;
  category: string | null;
}

interface EpisodeRow {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  publish_at: string | null;
  audio_url: string | null;
  audio_bytes: number | null;
  duration_sec: number | null;
  season: number | null;
  episode_no: number | null;
}

function xmlYanit(govde: string, status = 200): Response {
  return new Response(govde, {
    status,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      /* Beş dakika: yeni bölüm makul sürede görünsün, dizin yoklaması
         veritabanını dövmesin. `stale-while-revalidate` ile kenar,
         tazelenirken eski kopyayı vermeye devam ediyor. */
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}

function hata(mesaj: string, status: number): Response {
  /* Hata da XML: podcast istemcisi `application/rss+xml` bekliyor ve
     JSON gövdeyi "bozuk feed" diye raporluyor. */
  return xmlYanit(
    `<?xml version="1.0" encoding="UTF-8"?>\n<error>${mesaj}</error>\n`,
    status
  );
}

Deno.serve(async (istek) => {
  if (istek.method !== 'GET') {
    return hata('Yalnızca GET', 405);
  }

  const adres = new URL(istek.url);
  const seri = adres.searchParams.get('seri')?.trim();
  if (!seri) return hata('Seri belirtilmedi', 400);

  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anon) return hata('Yapılandırma eksik', 500);

  const basliklar = { apikey: anon, Authorization: `Bearer ${anon}` };

  const seriYanit = await fetch(
    `${url}/rest/v1/podcasts?select=id,title,slug,description,language,author,` +
      `owner_email,explicit,cover_url,category&slug=eq.${encodeURIComponent(seri)}` +
      `&status=eq.published&limit=1`,
    { headers: basliklar }
  );
  if (!seriYanit.ok) return hata('Seri okunamadı', 502);
  const seriler = (await seriYanit.json()) as PodcastRow[];
  const kayit = seriler?.[0];
  /* Yayımlanmamış seri 404 — 200 + boş feed, dizine "seri var ama boş"
     der ve seri yayımlanmadan listelenmesine yol açardı. */
  if (!kayit) return hata('Seri bulunamadı', 404);

  /*
   * `publish_at <= now()` BURADA DA SÜZÜLÜYOR. RLS zaten süzüyor ama
   * bu ikinci süzgeç bedava (indeks `podcast_episodes_feed_idx` tam bu
   * sıra) ve politika bir gün gevşerse feed sessizce ileri tarihli
   * bölüm yayımlamasın.
   */
  const simdi = new Date().toISOString();
  const bolumYanit = await fetch(
    `${url}/rest/v1/podcast_episodes?select=id,title,slug,description,publish_at,` +
      `audio_url,audio_bytes,duration_sec,season,episode_no` +
      `&podcast_id=eq.${kayit.id}` +
      `&status=eq.published&publish_at=lte.${simdi}` +
      `&order=publish_at.desc&limit=300`,
    { headers: basliklar }
  );
  if (!bolumYanit.ok) return hata('Bölümler okunamadı', 502);
  const bolumler = (await bolumYanit.json()) as EpisodeRow[];

  const podcast: FeedPodcast = {
    title: kayit.title,
    slug: kayit.slug,
    description: kayit.description ?? '',
    language: kayit.language ?? 'tr',
    author: kayit.author,
    ownerEmail: kayit.owner_email,
    explicit: kayit.explicit ?? false,
    coverUrl: kayit.cover_url,
    category: kayit.category,
  };

  const episodes: FeedEpisode[] = (bolumler ?? [])
    .filter((b) => b.publish_at)
    .map((b) => ({
      title: b.title,
      slug: b.slug,
      description: b.description ?? '',
      publishAt: b.publish_at as string,
      audioUrl: b.audio_url,
      audioBytes: b.audio_bytes,
      durationSec: b.duration_sec,
      season: b.season,
      episodeNo: b.episode_no,
      /*
       * BÖLÜM BAZINDA `explicit` ŞEMADA YOK — canlı ölçümde bulundu.
       * `0053` bu kolonu yalnızca SERİYE koymuş; `podcast_episodes`ten
       * istemek PostgREST'e 400 verdiriyordu ve feed 502 dönüyordu.
       * Birim testler göremezdi: sahte veri kolon listesini bilmiyor.
       *
       * `null` = "serininkini kullan". Üretici bu düşüşü zaten
       * destekliyor (`episode.explicit ?? podcast.explicit`), yani
       * kolon bir gün eklenirse tek satır değişecek.
       */
      explicit: null,
      /* GUID satır kimliği — slug değişse de abonelerde aynı bölüm
         ikinci kez belirmiyor. */
      guid: b.id,
    }));

  /*
   * `self` BAĞLANTISI `SUPABASE_URL`DEN KURULUYOR — İSTEĞİN ADRESİNDEN
   * DEĞİL.
   *
   * İlk sürüm `istek.url`i kullanıyordu ve CANLI ÖLÇÜMDE yanlış çıktı:
   * edge çalışma zamanı isteği İÇ adresiyle görüyor, yani feed
   * `http://<proje>.supabase.co/podcast-rss` diyordu — şema `http`,
   * `/functions/v1` öneki yok. Dinleyicinin çektiği adres bu değil.
   *
   * Dizinler `rel="self"` ile gerçekten çektikleri adresin aynı olmasını
   * bekliyor; uyuşmazlık "feed taşındı" diye yorumlanıp aboneliği
   * kırabiliyor. `SUPABASE_URL` genel ve kanonik adres, o yüzden
   * bağlantı ondan kuruluyor.
   */
  const kendi =
    `${url.replace(/\/+$/, '')}/functions/v1/podcast-rss` +
    `?seri=${encodeURIComponent(kayit.slug)}`;

  return xmlYanit(
    buildPodcastFeed(podcast, episodes, {
      siteUrl: SITE,
      feedUrl: kendi,
    })
  );
});
