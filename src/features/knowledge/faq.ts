/**
 * SIK SORULAN SORULAR (§14.9).
 *
 * Sözlükle aynı kapıdan geçiyor: `content_entries`, `kind = 'sss'`.
 * Gerekçe `glossary.ts` başlığında.
 *
 * ══════════════════════════════════════════════════════════════════════
 * SORULAR SİTE HAKKINDA, ASTRONOMİ DERSİ DEĞİL
 *
 * Astronomi bilgisi için sözlük ve yazılar var. SSS'in işi, kullanıcının
 * SİTEYİ kullanırken takıldığı yerleri cevaplamak: kota, gizlilik,
 * telif, moderasyon, ilan güvenliği. Buraya "Samanyolu nasıl çekilir"
 * koymak, iki modülü de bulanıklaştırırdı.
 *
 * ══════════════════════════════════════════════════════════════════════
 * CEVAPLAR SİTENİN GERÇEK DAVRANIŞINI ANLATIYOR
 *
 * Her cevap, kodda karşılığı olan bir davranışı tarif ediyor. Olmayan
 * bir özelliği "var" diye yazmak — ya da "yakında" demek — §14'ün
 * "çalışmayan placeholder gösterme" kuralının metin hâlindeki ihlali
 * olurdu. Ödeme sorusu bu yüzden "ödeme alınmıyor" diyor: bugünkü
 * gerçek bu (Faz 9, `IMPLEMENTED_DISABLED`).
 */

export type FaqCategory = 'hesap' | 'icerik' | 'gizlilik' | 'ilan' | 'teknik';

export const faqCategoryLabels: Record<FaqCategory, string> = {
  hesap: 'Hesap ve üyelik',
  icerik: 'İçerik ve galeri',
  gizlilik: 'Gizlilik',
  ilan: 'İlanlar',
  teknik: 'Teknik',
};

export interface FaqItem {
  slug: string;
  /** Sorunun kendisi. */
  title: string;
  /** Kısa cevap — listede açılmadan görünen. */
  summary: string;
  /** Uzun cevap; paragraflar. */
  body: string[];
  category: FaqCategory;
}

export const faqItems: FaqItem[] = [
  {
    slug: 'uyelik-ucretli-mi',
    title: 'Astrohub ücretli mi?',
    category: 'hesap',
    summary:
      'Hayır. Şu an sitede ödeme alınmıyor ve satın alma yüzeyi hiç yok.',
    body: [
      'Standart üyelik ücretsizdir ve sitenin tamamı bu üyelikle kullanılabilir. Premium kademe kota farkları için tanımlıdır ama ödeme sağlayıcısı kurulmadığı için satın alınamaz.',
      'Üyelik sayfası hangi kademede neyin değiştiğini gösterir; devre dışı bir "satın al" düğmesi bile koymadık, çünkü çalışmayan bir düğme çalışacakmış izlenimi verir.',
    ],
  },
  {
    slug: 'fotograf-kotasi',
    title: 'Kaç fotoğraf yükleyebilirim?',
    category: 'hesap',
    summary:
      'Standart üyelikte aylık 5, Premium\'da 30 fotoğraf; fotoğraf başına 10 MB sınır var.',
    body: [
      'Kota aylık yenilenir ve panelde kalan hakkınızı görebilirsiniz. Sınır dosya başına da geçerlidir: 10 MB üstü bir dosya yüklenmez.',
      'Kota dolduğunda mevcut fotoğraflarınız etkilenmez; yalnızca yeni yükleme durur.',
    ],
  },
  {
    slug: 'hesabimi-silebilir-miyim',
    title: 'Hesabımı silebilir miyim?',
    category: 'hesap',
    summary: 'Evet. Hesap sayfasından silme talebi açabilirsiniz.',
    body: [
      'Talep yöneticiye düşer ve işlendiğinde profiliniz, fotoğraflarınız ve gözlem günlüğünüz silinir. KVKK kapsamındaki haklarınız gizlilik metninde ayrıntılı yazılıdır.',
    ],
  },
  {
    slug: 'fotografimin-telifi',
    title: 'Yüklediğim fotoğrafın telifi kimde?',
    category: 'icerik',
    summary:
      'Sizde. Astrohub fotoğrafınızın telif hakkını almaz; yalnızca sitede göstermek için kullanır.',
    body: [
      'Yükleme sırasında kullanım şartlarına atıf yapılır ve orada bu açıkça yazılıdır. Fotoğrafınızı silerseniz siteden kalkar.',
      'Başkasının fotoğrafını kendi adınıza yüklemek moderasyon sebebidir.',
    ],
  },
  {
    slug: 'gozlem-gunlugu-kim-gorur',
    title: 'Gözlem günlüğümü kim görebilir?',
    category: 'gizlilik',
    summary:
      'Varsayılan olarak yalnızca siz. Bir kaydı herkese açmadıkça kimse göremez.',
    body: [
      'Her kayıtta "profilimde herkese açık göster" kutusu vardır ve kapalı gelir. Bu kural veritabanı düzeyinde uygulanır: kapalı bir kayıt, adresi bilinse bile başkasına dönmez.',
      'Kaydı sonradan açabilir ya da tekrar kapatabilirsiniz.',
    ],
  },
  {
    slug: 'konum-bilgisi',
    title: 'Fotoğrafımın konum bilgisi paylaşılıyor mu?',
    category: 'gizlilik',
    summary:
      'Tam koordinat paylaşılmaz. EXIF\'teki GPS verisi veritabanına yazılmaz.',
    body: [
      'Fotoğrafın künyesinde şehir ya da saha adı görünür; tam koordinat ayrı ve korumalı tutulur. Gözlem günlüğünde ise koordinat alanı hiç yoktur — yalnızca serbest metin konum girilir.',
      'Gözlem sahalarında da hassas konumlar için koruma seçeneği vardır.',
    ],
  },
  {
    slug: 'ilan-guvenligi',
    title: 'İlanlarda ödeme güvenli mi?',
    category: 'ilan',
    summary:
      'Astrohub ödemeye aracılık etmez ve emanet (escrow) hizmeti sunmaz.',
    body: [
      'İletişim ve teslim tamamen taraflar arasındadır. Platform bir pazaryeri değil, bir ilan panosudur; para hiçbir aşamada Astrohub üzerinden geçmez.',
      'Şüpheli bir ilan gördüğünüzde raporlayın — moderasyon kuyruğuna düşer.',
    ],
  },
  {
    slug: 'ilan-suresi',
    title: 'İlanım ne kadar yayında kalır?',
    category: 'ilan',
    summary: 'İlanlar süresiz yayında kalır; satıldığında sizin kapatmanız gerekir.',
    body: [
      'Otomatik süre sonu bugün uygulanmıyor. Satılan ilanı kapatmak ilan sahibinin sorumluluğunda; kapatılmayan ilanlar moderasyonda temizlenebilir.',
    ],
  },
  {
    slug: 'radyo-tv-kapali',
    title: 'Radyo ya da TV bölümü neden görünmüyor?',
    category: 'teknik',
    summary:
      'Yönetici bu bölümleri geçici olarak kapatmış olabilir; kapalıyken menüden de kalkarlar.',
    body: [
      'Site yönetimi bazı bölümleri bakım ya da içerik hazırlığı sırasında kapatabiliyor. Kapalı bir bölüme doğrudan gitmeye çalışırsanız "bu bölüm şu an kapalı" ekranını görürsünüz — sayfa silinmiş değildir, geri gelir.',
    ],
  },
  {
    slug: 'hava-verisi-nereden',
    title: 'Hava ve gökyüzü koşulları nereden geliyor?',
    category: 'teknik',
    summary:
      'Bulut, rüzgâr ve seeing tahmini dış bir hava servisinden; ay fazı ve karanlık pencereleri tarayıcıda hesaplanır.',
    body: [
      'Efemeris hesapları (ay fazı, alacakaranlık, hedef yüksekliği) sunucuya gitmeden cihazınızda yapılır — bu yüzden konum değiştirdiğinizde anında güncellenir.',
      'Tahmin verisi bir modeldir: gerçek gökyüzü koşulları tutmayabilir. Gece planınızı yaparken tahmini tek başına ölçüt almayın.',
    ],
  },
];
