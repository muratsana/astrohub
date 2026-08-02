import { describe, expect, it } from 'vitest';
import {
  buildPodcastFeed,
  escapeXml,
  itunesDuration,
  rfc822,
  stripInvalidXml,
  type FeedEpisode,
  type FeedPodcast,
} from './feed';

/**
 * PODCAST RSS ÜRETİCİSİ (§10.4).
 *
 * Bu testlerin hepsi tek bir şeyi koruyor: **feed'in geçerli kalmasını**.
 * Podcast dizinleri bozuk XML'i sessizce reddeder — hata ekranı yok,
 * uyarı e-postası yok; seri bir gün listeden düşer ve sebebi günler
 * sonra anlaşılır. Bu yüzden kaçış, tarih biçimi ve zorunlu alanlar
 * ağdan bağımsız ölçülüyor.
 */

const podcast: FeedPodcast = {
  title: 'Gökyüzü Sohbetleri',
  slug: 'gokyuzu-sohbetleri',
  description: 'Aylık astronomi sohbeti',
  language: 'tr',
  author: 'Astrohub',
  ownerEmail: 'podcast@ornek.test',
  explicit: false,
  coverUrl: 'https://ornek.test/kapak.jpg',
  category: 'Science',
};

const bolum = (over: Partial<FeedEpisode> = {}): FeedEpisode => ({
  title: 'Birinci bölüm',
  slug: 'birinci-bolum',
  description: 'Açılış',
  publishAt: '2026-08-02T10:00:00.000Z',
  audioUrl: 'https://ornek.test/1.mp3',
  audioBytes: 12_345_678,
  durationSec: 3725,
  season: 1,
  episodeNo: 1,
  explicit: null,
  guid: 'bolum-1-id',
  ...over,
});

const secenekler = {
  siteUrl: 'https://astrohub.com.tr',
  feedUrl: 'https://astrohub.com.tr/radyo/podcast/gokyuzu-sohbetleri.xml',
};

describe('XML kaçışı', () => {
  it('beş karakteri de kaçırıyor', () => {
    expect(escapeXml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&apos;&amp;&apos;&lt;/a&gt;'
    );
  });

  it('& ÖNCE kaçıyor — çift kaçış yok', () => {
    /* Ters sırada `&lt;` içindeki `&` ikinci turda tekrar kaçar ve
       dinleyici başlıkta düz metin olarak "&lt;" görürdü. */
    expect(escapeXml('<')).toBe('&lt;');
    expect(escapeXml('&lt;')).toBe('&amp;lt;');
  });

  it('XML 1.0 dışı kontrol karakterlerini atıyor', () => {
    /* Kaçış bunları KURTARMIYOR: `&#x1;` de geçersiz. Tek bir bayt
       bütün feed'i ayrıştırılamaz yapar. */
    expect(stripInvalidXml('abc')).toBe('abc');
  });

  it('TAB, LF ve CR korunuyor', () => {
    expect(stripInvalidXml('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });
});

describe('tarih ve süre biçimleri', () => {
  it('pubDate RFC 822 ve SAYISAL ofset taşıyor', () => {
    /* `toUTCString()` "GMT" yazıyor; bazı ayrıştırıcılar kabul etmiyor. */
    const yazi = rfc822(new Date('2026-08-02T09:05:07.000Z'));
    expect(yazi).toBe('Sun, 02 Aug 2026 09:05:07 +0000');
    expect(yazi).not.toContain('GMT');
  });

  it('gün ve ay adları yerelden ETKİLENMİYOR', () => {
    /* Feed'in dili Türkçe olsa da RFC 822 İngilizce ad istiyor. */
    expect(rfc822(new Date('2026-01-04T00:00:00Z'))).toMatch(/^Sun, 04 Jan/);
  });

  it('süre HH:MM:SS', () => {
    expect(itunesDuration(3725)).toBe('01:02:05');
    expect(itunesDuration(59)).toBe('00:00:59');
    expect(itunesDuration(-5)).toBe('00:00:00');
  });
});

describe('kanal', () => {
  const xml = buildPodcastFeed(podcast, [bolum()], secenekler);

  it('iTunes ve atom ad alanlarını bildiriyor', () => {
    expect(xml).toContain('xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"');
    expect(xml).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
  });

  it('kendi adresini `atom:link rel="self"` ile veriyor', () => {
    expect(xml).toContain(`href="${secenekler.feedUrl}" rel="self"`);
  });

  it('dil, yazar ve kapak yazılıyor', () => {
    expect(xml).toContain('<language>tr</language>');
    expect(xml).toContain('<itunes:author>Astrohub</itunes:author>');
    expect(xml).toContain('<itunes:image href="https://ornek.test/kapak.jpg" />');
  });

  it('lastBuildDate EN YENİ bölümden geliyor', () => {
    const cok = buildPodcastFeed(
      podcast,
      [
        bolum({ guid: 'a', slug: 'a', publishAt: '2026-07-01T10:00:00Z' }),
        bolum({ guid: 'b', slug: 'b', publishAt: '2026-08-20T10:00:00Z' }),
      ],
      secenekler
    );
    expect(cok).toContain('<lastBuildDate>Thu, 20 Aug 2026 10:00:00 +0000</lastBuildDate>');
  });

  /*
   * Sahip e-postası feed'de HERKESE AÇIK. Kolon `null` olabiliyor ve o
   * durumda blok hiç yazılmıyor — olmayan bir adres uydurmaktansa alanı
   * boş bırakmak.
   */
  it('sahip e-postası yoksa itunes:owner hiç yazılmıyor', () => {
    const gizli = buildPodcastFeed(
      { ...podcast, ownerEmail: null },
      [bolum()],
      secenekler
    );
    expect(gizli).not.toContain('itunes:owner');
    expect(gizli).not.toContain('itunes:email');
  });
});

describe('bölümler', () => {
  it('enclosure, süre, sezon ve bölüm numarası yazılıyor', () => {
    const xml = buildPodcastFeed(podcast, [bolum()], secenekler);
    expect(xml).toContain(
      '<enclosure url="https://ornek.test/1.mp3" length="12345678" type="audio/mpeg" />'
    );
    expect(xml).toContain('<itunes:duration>01:02:05</itunes:duration>');
    expect(xml).toContain('<itunes:season>1</itunes:season>');
    expect(xml).toContain('<itunes:episode>1</itunes:episode>');
  });

  it('GUID isPermaLink="false" — adres değil KİMLİK', () => {
    /* Slug düzeltilirse dizin bölümü yeni sanmamalı; abonelere aynı
       bölüm ikinci kez düşerdi. */
    const xml = buildPodcastFeed(podcast, [bolum()], secenekler);
    expect(xml).toContain('<guid isPermaLink="false">bolum-1-id</guid>');
  });

  it('bağlantı gerçek rotayı gösteriyor', () => {
    const xml = buildPodcastFeed(podcast, [bolum()], secenekler);
    expect(xml).toContain(
      '<link>https://astrohub.com.tr/radyo/podcast/gokyuzu-sohbetleri/birinci-bolum</link>'
    );
  });

  /*
   * ASIL KURAL: enclosure'ı olmayan bir item, dinleyicinin
   * oynatamayacağı bir satır. Sitede görünmeye devam ediyor (orada metin
   * ve marker'lar da var), feed'e girmiyor.
   */
  it('ses dosyası olmayan bölüm feed’e GİRMİYOR', () => {
    const xml = buildPodcastFeed(
      podcast,
      [bolum({ audioUrl: null, title: 'Sessiz' })],
      secenekler
    );
    expect(xml).not.toContain('Sessiz');
    expect(xml).not.toContain('<item>');
  });

  it('sıra YENİDEN ESKİYE', () => {
    const xml = buildPodcastFeed(
      podcast,
      [
        bolum({ guid: 'eski', slug: 'eski', title: 'Eski', publishAt: '2026-07-01T10:00:00Z' }),
        bolum({ guid: 'yeni', slug: 'yeni', title: 'Yeni', publishAt: '2026-08-20T10:00:00Z' }),
      ],
      secenekler
    );
    expect(xml.indexOf('Yeni')).toBeLessThan(xml.indexOf('Eski'));
  });

  it('bölümün explicit işareti yoksa serininki geçerli', () => {
    const sert = buildPodcastFeed(
      { ...podcast, explicit: true },
      [bolum({ explicit: null })],
      secenekler
    );
    expect(sert.match(/<itunes:explicit>true<\/itunes:explicit>/g)).toHaveLength(2);

    const yumusak = buildPodcastFeed(
      { ...podcast, explicit: true },
      [bolum({ explicit: false })],
      secenekler
    );
    expect(yumusak).toContain('<itunes:explicit>false</itunes:explicit>');
  });

  it('boyut bilinmiyorsa length="0" yazılıyor', () => {
    /* Alanı hiç yazmamak bazı dizinlerde bölümü geçersiz yapıyor. */
    const xml = buildPodcastFeed(podcast, [bolum({ audioBytes: null })], secenekler);
    expect(xml).toContain('length="0"');
  });
});

describe('bütün olarak geçerli', () => {
  it('kullanıcı metnindeki XML gövdeyi bozmuyor', () => {
    const xml = buildPodcastFeed(
      { ...podcast, title: 'Ay & <Güneş>' },
      [bolum({ title: 'M31 <> "Andromeda"', description: 'a ]]> b' })],
      secenekler
    );
    /* Kaçış sonrası ham `<` yalnızca ETİKETLERDE kalmalı: gövdeye
       sızan tek bir açı işareti belgeyi ayrıştırılamaz yapar. */
    expect(xml).toContain('<title>Ay &amp; &lt;Güneş&gt;</title>');
    expect(xml).toContain('&lt;&gt; &quot;Andromeda&quot;');
    /* CDATA kullanılmadığı için `]]>` zararsız. */
    expect(xml).toContain('a ]]&gt; b');
  });

  it('tarayıcı ayrıştırıcısı belgeyi hatasız okuyor', () => {
    const xml = buildPodcastFeed(
      { ...podcast, title: 'Ay & <Güneş>', description: 'ab' },
      [bolum(), bolum({ guid: '2', slug: 'iki', title: 'M31 & "M32"' })],
      secenekler
    );
    const belge = new DOMParser().parseFromString(xml, 'application/xml');
    expect(belge.querySelector('parsererror')).toBeNull();
    expect(belge.querySelectorAll('item')).toHaveLength(2);
    expect(belge.querySelector('channel > title')?.textContent).toBe('Ay & <Güneş>');
  });

  it('bölüm yokken de geçerli bir belge çıkıyor', () => {
    const xml = buildPodcastFeed(podcast, [], secenekler);
    const belge = new DOMParser().parseFromString(xml, 'application/xml');
    expect(belge.querySelector('parsererror')).toBeNull();
    expect(belge.querySelectorAll('item')).toHaveLength(0);
  });
});
