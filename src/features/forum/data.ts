import type { ForumThread } from './types';

/**
 * FORUM ÖRNEK VERİSİ.
 *
 * Sitenin geri kalanıyla aynı desen: modül önce yerel veriyle çalışır,
 * Supabase bağlandığında `data.ts` yerini sorguya bırakır. Böylece arayüz
 * boş bir kabuk olarak değil, gerçek yoğunlukta geliştirilip test edilir.
 *
 * İçerik Türkiye'deki astrofotoğrafçıların gerçekten konuştuğu konulardan
 * seçildi — dolgu metin (lorem ipsum) yerleşim kararlarını yanıltıyor:
 * Türkçe kelime uzunlukları ve büyük harfli özel adlar farklı kırılıyor.
 */
export const forumThreads: ForumThread[] = [
  {
    id: 't-1',
    slug: 'forum-kurallari-ve-baslarken',
    title: 'Forum kuralları ve başlarken okunacaklar',
    category: 'baslangic',
    author: {
      username: 'astrohub',
      displayName: 'Astrohub Ekibi',
      badge: 'Editör',
    },
    createdAt: '2026-06-01T10:00:00+03:00',
    lastActivityAt: '2026-07-20T14:30:00+03:00',
    replyCount: 3,
    viewCount: 1842,
    pinned: true,
    locked: true,
    labels: ['duyuru', 'rehber'],
    body: 'Foruma hoş geldiniz. Soru sorarken ekipmanınızı, çekim koşullarınızı (Bortle, seeing, ay fazı) ve denediklerinizi yazarsanız çok daha hızlı yanıt alırsınız. Ekran görüntüsü yerine ham veriden örnek paylaşmak, işleme sorularında en çok işe yarayan şey.',
    replies: [
      {
        id: 't-1-r1',
        author: { username: 'astrohub', displayName: 'Astrohub Ekibi', badge: 'Editör' },
        createdAt: '2026-06-01T10:05:00+03:00',
        body: 'Ekipman sorularında lütfen montür yükünü ve kullandığınız guide setup’ını da belirtin. "Yıldızlar uzuyor" başlıklarının çoğu aslında yük ya da balans sorunu çıkıyor.',
      },
    ],
  },
  {
    id: 't-2',
    slug: 'ilk-teleskop-130-mm-mi-8-inc-dobson-mi',
    title: 'İlk teleskop: 130 mm newton mu, 8 inç dobson mu?',
    category: 'baslangic',
    author: { username: 'gokhan_k', displayName: 'Gökhan K.' },
    createdAt: '2026-07-18T21:12:00+03:00',
    lastActivityAt: '2026-07-26T09:41:00+03:00',
    replyCount: 12,
    viewCount: 486,
    solved: true,
    labels: ['tavsiye', 'soru'],
    body: 'Ankara’da oturuyorum, şehir içinden çıkmam zor. Bütçem 15–20 bin TL civarı. Gözlem ağırlıklı düşünüyorum ama ileride fotoğraf da çekmek isterim. 130 mm newton mu yoksa 8 inç dobson mu daha mantıklı?',
    replies: [
      {
        id: 't-2-r1',
        author: { username: 'meltem_yildiz', displayName: 'Meltem Yıldız' },
        createdAt: '2026-07-18T22:40:00+03:00',
        solution: true,
        body: 'Gözlem ağırlıklıysa 8 inç dobson tartışmasız daha çok şey gösterir — açıklık her şeydir. Ama "ileride fotoğraf" cümlesi tuzak: dobson ile derin uzay fotoğrafı pratikte olmuyor, ekvatoryal montür gerekiyor. İkisini aynı aletle çözmeye çalışmak yerine önce hangisini gerçekten yapacağınıza karar verin. Şehirden çıkamıyorsanız gözlemde de Bortle 8’de dobson’dan beklentinizi düşük tutun.',
      },
      {
        id: 't-2-r2',
        author: { username: 'gokhan_k', displayName: 'Gökhan K.' },
        createdAt: '2026-07-19T08:15:00+03:00',
        body: 'Bu ayrımı hiç böyle düşünmemiştim. Gözlemle başlayıp fotoğrafı ayrı bir setup olarak planlayacağım. Teşekkürler.',
      },
    ],
  },
  {
    id: 't-3',
    slug: 'sho-paletinde-yesil-tasmasi',
    title: 'SHO paletinde yeşil taşması nasıl kontrol edilir?',
    category: 'isleme',
    author: { username: 'burak_deniz', displayName: 'Burak Deniz' },
    createdAt: '2026-07-22T23:50:00+03:00',
    lastActivityAt: '2026-07-27T01:20:00+03:00',
    replyCount: 8,
    viewCount: 312,
    labels: ['soru'],
    body: 'Kuzey Amerika bulutsusunu SHO ile işledim ama sonuç neredeyse tamamen yeşil çıkıyor. SCNR uyguluyorum, bu sefer de her şey soluyor. Kanalları birleştirmeden önce mi ayarlamak gerekiyor?',
    replies: [
      {
        id: 't-3-r1',
        author: { username: 'meltem_yildiz', displayName: 'Meltem Yıldız' },
        createdAt: '2026-07-23T00:30:00+03:00',
        body: 'Yeşil baskınlığı SHO’da normaldir — Ha kanalı yeşile düştüğü ve en güçlü sinyal o olduğu için. SCNR’yi en sonda tek seferde uygulamak yerine, birleştirmeden önce kanalları ayrı ayrı aynı seviyeye getirin (linear fit iyi çalışıyor). O aşamayı atlarsanız SCNR sinyali kesmek zorunda kalıyor, "soluyor" dediğiniz şey bu.',
      },
    ],
  },
  {
    id: 't-4',
    slug: 'phd2-guide-hatasi-dogu-batida-farkli',
    title: 'PHD2 guide hatası doğuda ve batıda farklı çıkıyor',
    category: 'yazilim',
    author: { username: 'serkan_ay', displayName: 'Serkan Ay' },
    createdAt: '2026-07-25T20:05:00+03:00',
    lastActivityAt: '2026-07-26T22:10:00+03:00',
    replyCount: 5,
    viewCount: 198,
    labels: ['sorun-giderme'],
    body: 'Meridyenin doğusunda RMS 0.6" civarında, batıya geçince 1.4"e çıkıyor. Kutup hizası iyi (drift ile kontrol ettim). Balansı biraz doğu ağır bıraktım. Ne kaçırıyorum?',
    replies: [
      {
        id: 't-4-r1',
        author: { username: 'tolga_m', displayName: 'Tolga M.' },
        createdAt: '2026-07-25T21:00:00+03:00',
        body: 'Meridyen sonrası balans yönü tersine dönüyor: doğu ağır bıraktığınız yük, batıya geçince dişliyi ters yönden yüklüyor ve backlash açığa çıkıyor. Kablo sürtünmesini de kontrol edin — batıda kablo gerginliği artıyorsa RMS aynen böyle davranır.',
      },
    ],
  },
  {
    id: 't-5',
    slug: 'kizilcahamam-agustos-gozlem-bulusmasi',
    title: 'Kızılcahamam’da ağustos gözlem buluşması — yol ve konaklama',
    category: 'astro-kampcilik',
    author: { username: 'meltem_yildiz', displayName: 'Meltem Yıldız' },
    createdAt: '2026-07-24T12:00:00+03:00',
    lastActivityAt: '2026-07-27T08:55:00+03:00',
    replyCount: 17,
    viewCount: 640,
    labels: ['duyuru'],
    body: 'Perseid için 11–13 ağustos aralığında gidiyoruz. Son 6 km stabilize yol, sedan ile çıkılıyor ama yağmur sonrası zorlanabilirsiniz. Çadır alanı geniş, su yok — yanınızda getirin.',
    replies: [],
  },
  {
    id: 't-6',
    slug: 'asi533-mi-imx571-mi-kucuk-sensor-tartismasi',
    title: 'ASI533 mü IMX571 mi? Küçük sensör gerçekten dezavantaj mı?',
    category: 'kameralar',
    author: { username: 'tolga_m', displayName: 'Tolga M.' },
    createdAt: '2026-07-19T18:30:00+03:00',
    lastActivityAt: '2026-07-25T11:05:00+03:00',
    replyCount: 21,
    viewCount: 894,
    labels: ['tavsiye', 'soru'],
    body: '80 mm f/6 apo ile kullanacağım. Kare sensör kadrajda esneklik veriyor ama APS-C’nin alanı cazip. Amaç ağırlıklı geniş alan bulutsular. Fiyat farkı ciddi, kararsız kaldım.',
    replies: [
      {
        id: 't-6-r1',
        author: { username: 'burak_deniz', displayName: 'Burak Deniz' },
        createdAt: '2026-07-19T19:45:00+03:00',
        body: '80 mm f/6’da APS-C köşeleri düzleştirici olmadan zorlar. Kare sensörün gerçek avantajı burada: kullandığınız alan optiğin temiz kaldığı bölge. Geniş alan istiyorsanız daha kısa odak + kare sensör, uzun odak + büyük sensörden daha çok işe yarıyor.',
      },
    ],
  },
  {
    id: 't-7',
    slug: 'temmuz-gozlem-raporu-uludag',
    title: 'Gözlem raporu: Uludağ, 21 Temmuz — SQM 21.4',
    category: 'gozlem-raporlari',
    author: { username: 'gokhan_k', displayName: 'Gökhan K.' },
    createdAt: '2026-07-22T09:00:00+03:00',
    lastActivityAt: '2026-07-23T15:12:00+03:00',
    replyCount: 4,
    viewCount: 271,
    labels: ['inceleme'],
    body: 'Gece boyunca bulutsuzdu, seeing orta (yıldızlar 200x’te oynuyordu). SQM 21.4 okudum, ay yoktu. M13 çözünürlüğü şaşırtıcıydı. Sabaha karşı nem çok arttı, ısıtıcı bandı olmayan herkes çiy yedi.',
    replies: [],
  },
];
