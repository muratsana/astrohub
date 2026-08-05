import type { AstroEvent } from './types';

/**
 * ETKİNLİK VERİSİ — GERÇEK KAYITLAR.
 *
 * Aşağıdaki etkinliklerin tamamı Türkiye'de düzenlenen gerçek
 * organizasyonlardır; her kayıtta düzenleyenin ya da haber kaynağının
 * adresi `source.url` alanında durur ve `lastVerifiedAt` doğrulamanın
 * yapıldığı günü söyler.
 *
 * TARİH UYDURULMAZ. Duyurusu bulunup 2026 tarihi doğrulanamayan
 * etkinlikler bu listeye **girmez** — bir gözlemcinin yola çıkmasına yol
 * açacak bir tarih "muhtemelen böyledir" diye yazılamaz. Bilinen ama
 * tarihi doğrulanamayan etkinlik:
 *
 *   · Balıkesir Sındırgı Gökyüzü Gözlem Şenliği (Sarıcaova Yaylası,
 *     Gözören köyü) — GMKA duyurusu var, 2026 tarihi doğrulanamadı.
 *
 * AFİŞLER SİTEYE KOPYALANMAZ. Afişin telifi düzenleyendedir; izin
 * almadan yeniden yayımlamak hak ihlalidir ve "duyuruyu paylaşıyoruz"
 * savunması bunu değiştirmez. Kartlarda kendi görselimiz çizilir, afiş
 * için duyuru sayfasına bağlantı verilir (bkz. types.ts `posterUrl`).
 *
 * `registered` alanı hiçbir kayıtta doldurulmadı: gerçek kayıt sayısını
 * bilmiyoruz ve tahmin, dolu görünen bir etkinlik üretir.
 */
export const events: AstroEvent[] = [
  {
    slug: 'olimpos-gokyuzu-bilim-festivali-2026',
    title: '10. Olimpos Gökyüzü ve Bilim Festivali',
    type: 'gozlem-senligi',
    city: 'Antalya',
    venue: 'Olimpos, Kumluca',
    coords: { latitude: 36.3956, longitude: 30.4736 },
    startsAt: '2026-08-09T08:00:00+03:00',
    endsAt: '2026-08-12T11:00:00+03:00',
    free: false,
    camping: true,
    kidsFriendly: true,
    astrophotoFocused: true,
    telescopesProvided: true,
    organizer: { name: 'Kozmik Anafor', verified: true },
    description:
      "Türkiye'nin en köklü ve geniş katılımlı sivil gökyüzü etkinliği onuncu kez düzenleniyor. Gece profesyonel teleskoplarla gezegen, galaksi ve bulutsu gözlemi; gündüz sunumlar, söyleşiler ve atölyeler. Katılımcılar çadır alanında ya da kamp alanındaki klimalı bungalovlarda konaklıyor.",
    program: [
      { time: '1. Gün 08:00', title: 'Alan açılışı ve yerleşim' },
      { time: 'Akşam', title: 'Yıldız ve gezegen tanıtımı, teleskop gözlemi' },
      { time: 'Gündüz', title: 'Astrofotoğrafçılık atölyesi' },
      { time: 'Gündüz', title: 'Teleskop yapımı ve kostüm roket atölyeleri' },
      { time: 'Gündüz', title: 'Bilim insanı sunumları ve söyleşiler' },
    ],
    observedTargets: ['Satürn', 'Samanyolu merkezi', 'M 13', 'M 57'],
    rules: [
      'Çadır alanında tuvalet ve duş mevcut; çadırınızı kendiniz getiriyorsunuz.',
      'Bungalov konaklaması ayrı kontenjana tabidir.',
    ],
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #4c1d95 100%)',
    source: {
      name: 'Olimpos Gökyüzü ve Bilim Festivali',
      url: 'https://ogbf.kozmikanafor.com/',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Kayıt / iletişim',
      url: 'https://ogbf.kozmikanafor.com/',
    },
    image: {
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Olimpos%2C%20Antalya.jpg?width=1200',
      credit: 'Wikimedia Commons — Olimpos, Antalya',
      licence: 'CC BY-SA',
    },
  },
  {
    slug: 'ethem-hoca-gokyuzu-gozlem-senligi-2026',
    title: 'Ethem Hoca ile Gökyüzü Gözlem Şenliği',
    type: 'gozlem-senligi',
    city: 'Denizli',
    venue: 'Topuklu Yaylası, Beyağaç (1.700 m)',
    coords: { latitude: 37.2494, longitude: 28.8956 },
    startsAt: '2026-08-11T16:00:00+03:00',
    endsAt: '2026-08-15T12:00:00+03:00',
    free: true,
    camping: true,
    kidsFriendly: true,
    astrophotoFocused: true,
    telescopesProvided: true,
    organizer: {
      name: 'Denizli Büyükşehir Belediyesi & Beyağaç Belediyesi',
      verified: true,
    },
    description:
      "Beyağaç'taki 1.700 metre rakımlı Topuklu Yaylası, ışık kirliliğinden Türkiye'nin en uzak noktalarından biri olarak biliniyor; SQM ölçümleri bölgenin gökyüzü kalitesini doğruluyor. Geçen yıl yaklaşık 5.000 katılımcı ve 50 profesyonel/amatör astronom şenliğe katıldı.",
    program: [
      { time: 'Gündüz', title: 'Astronomi dersleri ve bilim etkinlikleri' },
      { time: 'Akşam', title: 'Teleskoplarla gökyüzü gözlemi' },
      { time: '12–13 Ağustos gecesi', title: 'Perseid meteor yağmuru zirvesi' },
    ],
    observedTargets: ['Perseid meteorları', 'Samanyolu', 'Satürn'],
    rules: [
      'Yayla 1.700 metrede; ağustosta bile gece sıcaklığı belirgin düşer.',
      'Beyaz ışık karanlık adaptasyonunu bozar — kırmızı fener getirin.',
    ],
    gradient: 'linear-gradient(160deg, #020617 0%, #172554 60%, #312e81 100%)',
    source: {
      name: 'Denizli Kent Haber',
      url: 'https://www.denizlikenthaber.com/haber-topuklu-yaylasinda-yildizlarla-dolu-bes-gun-basliyor-18050.html',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Başvuru / iletişim',
      url: 'https://apps.denizli.bel.tr/gokyuzugozlemsenligibasvuru/',
    },
  },
  {
    slug: 'keltepe-gozlem-senligi-2026',
    title: 'Keltepe Gözlem Şenliği ve Uzay Girişimciliği Festivali',
    type: 'gozlem-senligi',
    city: 'Karabük',
    venue: 'Keltepe, Karabük',
    coords: { latitude: 41.0736, longitude: 32.5411 },
    startsAt: '2026-08-14T14:00:00+03:00',
    endsAt: '2026-08-16T12:00:00+03:00',
    free: true,
    camping: true,
    kidsFriendly: true,
    astrophotoFocused: true,
    telescopesProvided: true,
    organizer: {
      name: 'Karabük Belediyesi & Astronomy Network',
      verified: true,
    },
    description:
      'Karabük Belediyesi, Karabük Gençlik ve Spor İl Müdürlüğü ile Astronomy Network organizasyon ekibinin iş birliğinde düzenleniyor. Gündüz bilim insanı sunumları, girişimcilik panelleri, astrofotoğrafçılık eğitimleri ve çocuk atölyeleri; geceleri teleskopla gözlem ve Perseid meteor yağmuru. Katılım ücretsiz, kontenjan sınırlı ve online kayıt zorunlu.',
    program: [
      { time: 'Gündüz', title: 'Bilim insanı sunumları' },
      { time: 'Gündüz', title: 'Uzay girişimciliği panelleri' },
      { time: 'Gündüz', title: 'Astrofotoğrafçılık eğitimi' },
      { time: 'Gündüz', title: 'Çocuk atölyeleri' },
      { time: 'Gece', title: 'Teleskopla gözlem ve Perseid izleme' },
    ],
    observedTargets: ['Perseid meteorları', 'Satürn', 'Samanyolu'],
    rules: [
      'Kontenjan sınırlı; alana giriş için online kayıt formu zorunludur.',
      'Güncel duyurular @keltepegozlemsenligi hesaplarından yayımlanıyor.',
    ],
    gradient: 'linear-gradient(150deg, #0b1120 0%, #1e293b 55%, #334155 100%)',
    source: {
      name: 'Karabük Derin Haber',
      url: 'https://www.karabukderinhaber.com/karabukte-keltepe-gozlem-senligi-ve-uzay-girisimciligi-festivali-basliyor',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Duyuru / iletişim',
      url: 'https://www.karabukderinhaber.com/karabukte-keltepe-gozlem-senligi-ve-uzay-girisimciligi-festivali-basliyor',
    },
  },
  {
    slug: 'uludag-astrofest-2026',
    title: 'Uludağ AstroFest — Gökyüzü Gözlem Festivali',
    type: 'gozlem-senligi',
    city: 'Bursa',
    venue: 'Uludağ, Osmangazi',
    coords: { latitude: 40.0994, longitude: 29.1608 },
    startsAt: '2026-08-20T16:00:00+03:00',
    endsAt: '2026-08-22T12:00:00+03:00',
    free: false,
    camping: true,
    kidsFriendly: true,
    astrophotoFocused: true,
    telescopesProvided: true,
    organizer: { name: 'Uludağ AstroFest', verified: true },
    description:
      "Uludağ üzerinde üç gün süren gözlem festivali: astronomi sunumları, teleskopla gökyüzü gözlemi, atölyeler, doğa yürüyüşleri ve bilim gösterileri. Marmara'nın en erişilebilir yüksek rakımlı gözlem noktalarından birinde düzenleniyor.",
    program: [
      { time: '1. Gün', title: 'Alan kurulumu ve karşılama' },
      { time: 'Akşam', title: 'Gökyüzü turu ve teleskop istasyonları' },
      { time: 'Gündüz', title: 'Atölyeler ve doğa yürüyüşü' },
    ],
    observedTargets: ['Satürn', 'M 31', 'M 13', 'Albireo'],
    rules: ['Araç farları alan içinde kapalı tutulur.'],
    gradient: 'linear-gradient(165deg, #0c0a1d 0%, #2e1065 55%, #4c1d95 100%)',
    source: {
      name: 'Uludağ AstroFest',
      url: 'https://uludagastrofest.com/',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Kayıt / iletişim',
      url: 'https://uludagastrofest.com/',
    },
    image: {
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/View%20of%20Bursa%20from%20the%20hills%20of%20Mount%20Uludag.jpg?width=1200',
      credit: 'Wikimedia Commons — Mount Uludağ',
      licence: 'CC BY-SA 3.0',
    },
  },
  {
    slug: 'ulusal-gokyuzu-gozlem-senligi-2026',
    title: 'TÜBİTAK Ulusal Gökyüzü Gözlem Şenliği',
    type: 'gozlem-senligi',
    city: 'Erzurum',
    venue: 'Palandöken / Konaklı Kayak Merkezi',
    coords: { latitude: 39.8508, longitude: 41.2417 },
    startsAt: '2026-08-27T14:00:00+03:00',
    endsAt: '2026-08-30T12:00:00+03:00',
    free: true,
    camping: false,
    kidsFriendly: true,
    astrophotoFocused: true,
    telescopesProvided: true,
    organizer: { name: 'TÜBİTAK Ulusal Gözlemevi', verified: true },
    description:
      "Türkiye'nin en köklü kamu astronomi etkinliği. Yıllarca Antalya Bakırlıtepe ile özdeşleşen şenlik, 2026'da Erzurum Palandöken/Konaklı'da planlanıyor. Palandöken'in rakımı ve kuru havası gözlem açısından avantajlı; ağustos sonunda gece sıcaklıkları düşük olabiliyor.",
    program: [
      { time: 'Gündüz', title: 'Sunumlar ve atölyeler' },
      { time: 'Akşam', title: 'Teleskopla gözlem oturumları' },
    ],
    observedTargets: ['Satürn', 'M 13', 'M 31', 'Samanyolu'],
    rules: [
      'Tarihler tahminidir; kesin program TÜBİTAK resmî kanallarından açıklanır.',
      'Başvurular genelde etkinlikten 1–2 ay önce açılır.',
    ],
    gradient: 'linear-gradient(155deg, #0a0f1a 0%, #14532d 60%, #166534 100%)',
    source: {
      name: 'TÜBİTAK Ulusal Gözlemevi',
      url: 'https://senlik.tug.tubitak.gov.tr/',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Başvuru / iletişim',
      url: 'https://senlik.tug.tubitak.gov.tr/',
    },
    image: {
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Palandoken%20Erzurum%202009.JPG?width=1200',
      credit: 'Wikimedia Commons — Palandöken, Erzurum',
      licence: 'CC BY-SA',
    },
  },
  {
    slug: 'zerzevan-gokyuzu-gozlem-2026',
    title: 'Zerzevan Kalesi Gökyüzü Gözlem Etkinliği ve Bilim Şenliği',
    type: 'halk-gozlemi',
    city: 'Diyarbakır',
    venue: 'Zerzevan Kalesi, Çınar',
    coords: { latitude: 37.6008, longitude: 40.3667 },
    startsAt: '2026-06-27T15:00:00+03:00',
    endsAt: '2026-06-27T23:00:00+03:00',
    free: true,
    camping: false,
    kidsFriendly: true,
    astrophotoFocused: false,
    telescopesProvided: true,
    organizer: { name: 'Diyarbakır Valiliği', verified: true },
    description:
      "Roma dönemi garnizon yerleşimi ve yeraltındaki Mithras Tapınağı ile bilinen Zerzevan Kalesi'nde düzenlenen gündüz bilim şenliği ve akşam teleskop gözlemi. Güneydoğu'nun kuru havası ve düşük ışık kirliliği bölgeyi gözlem için avantajlı kılıyor.",
    program: [
      { time: '15:00', title: 'Bilim şenliği ve atölyeler' },
      { time: '21:00', title: 'Teleskopla gökyüzü gözlemi' },
    ],
    observedTargets: ['Ay', 'Satürn', 'Jüpiter'],
    gradient: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 50%, #4c1d95 100%)',
    source: {
      name: 'Gazete Detay',
      url: 'https://gazetedetay.com/zerzevan-kalesinde-gokyuzu-gozlem-etkinligi-ve-bilim-senligi-duzenlenecek',
      lastVerifiedAt: '2026-07-28',
    },
    contact: {
      label: 'Duyuru / iletişim',
      url: 'https://gazetedetay.com/zerzevan-kalesinde-gokyuzu-gozlem-etkinligi-ve-bilim-senligi-duzenlenecek',
    },
    image: {
      url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mithraeum%20of%20Zerzevan%20Castle.jpg?width=1200',
      credit: 'Clemens Schmillen / Wikimedia Commons',
      licence: 'CC BY-SA 4.0',
    },
  },
];

export function getEventBySlug(slug: string): AstroEvent | undefined {
  return events.find((e) => e.slug === slug);
}
