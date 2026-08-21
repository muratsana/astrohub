/**
 * FORUM — tür tanımları (§7.x topluluk).
 *
 * Kategoriler sabit ve az sayıdadır. Kullanıcının kategori açabildiği
 * forumlar hızla birbirinin kopyası on beş kategoriye dönüşüyor; burada
 * kategori seti editoryal bir karardır.
 *
 * KATEGORİ VE ROZET AYRI EKSENLER. Kategori konunun NEYLE İLGİLİ olduğunu
 * söyler (montür, filtre, yazılım); rozet NE TÜR bir gönderi olduğunu
 * (soru, rehber, inceleme). İkisini tek listede toplamak, "Montür" ile
 * "Soru" arasında seçim yaptırırdı — oysa bir konu ikisi birden.
 *
 * Rozet seti de sabittir. Serbest metin etiket, üç ay içinde 'phd2',
 * 'PHD2', 'phd 2' ve 'phd2 guiding' olarak dörde bölünüyor ve etikete
 * göre filtrelemeyi işe yaramaz hâle getiriyor.
 */

export type ForumCategoryId =
  | 'ekipmanlar'
  | 'yazilimlar'
  | 'goruntu-isleme'
  | 'etkinlikler'
  | 'topluluklar'
  | 'bilimsel-calismalar'
  | 'radyo-astronomi'
  | 'astro-kampcilik';

export interface ForumCategory {
  id: ForumCategoryId;
  name: string;
  description: string;
  /** Rozet ve vurgu rengi — galeri ailelerindeki desenin aynısı. */
  className: string;
}

/** Konunun türü — kategoriden bağımsız, sabit set. */
export type ForumLabelId =
  | 'soru'
  | 'sorun-giderme'
  | 'rehber'
  | 'inceleme'
  | 'tavsiye'
  | 'duyuru';

export interface ForumLabel {
  id: ForumLabelId;
  name: string;
  description: string;
  className: string;
}

export interface ForumAuthor {
  username: string;
  displayName: string;
  avatarPath?: string | null;
  /** Doğrulanmış organizatör / editör gibi işaretler. */
  badge?: string;
}

export interface ForumPost {
  id: string;
  author: ForumAuthor;
  createdAt: string;
  /** Düz metin. Zengin metin geldiğinde sanitize edilerek işlenecek. */
  body: string;
  /** Forum mesajına eklenen tek optimize görsel. */
  image?: ForumImage;
  /** Konuyu açanın "çözüm" olarak işaretlediği yanıt. */
  solution?: boolean;
  /**
   * Moderasyon kaldırdıysa gösterilecek gerekçe.
   *
   * Doluysa `body` boştur — metin `removed_content` arşivine taşınmıştır.
   * İki alan yerine tek bir "kaldırıldı" bayrağı tutmadık: gerekçenin
   * kendisi gösterilecek metin, bayrak olsaydı arayüz onu yeniden
   * uydurmak zorunda kalırdı.
   */
  removalReason?: string;
}

export interface ForumThread {
  id: string;
  slug: string;
  title: string;
  category: ForumCategoryId;
  author: ForumAuthor;
  createdAt: string;
  lastActivityAt: string;
  /** Açılış mesajı dâhil toplam mesaj sayısı. */
  replyCount: number;
  viewCount: number;
  pinned?: boolean;
  /** Kilitli konuya yeni mesaj yazılamaz. */
  locked?: boolean;
  /** Bir yanıt çözüm olarak işaretlendiyse. */
  solved?: boolean;
  /** Açılış mesajı. */
  body: string;
  /** Açılış mesajına eklenen tek optimize görsel. */
  image?: ForumImage;
  replies: ForumPost[];
  /** Sabit setten seçilen rozetler. */
  labels?: ForumLabelId[];
  /**
   * Açılış mesajı moderasyonla kaldırıldıysa gerekçe.
   *
   * Konu silinmiyor: başlık, künye ve yanıtlar yerinde kalıyor — tartışma
   * kaldırılan iletiden sonra da anlamlı. Kaybolan tek şey ihlal eden
   * metin.
   */
  removalReason?: string;
}

export interface ForumImage {
  url: string;
  width: number | null;
  height: number | null;
}

export const forumCategories: Record<ForumCategoryId, ForumCategory> = {
  ekipmanlar: {
    id: 'ekipmanlar',
    name: 'Ekipmanlar',
    description: 'Teleskop, montür, kamera, filtre ve aksesuarlar',
    className: 'border-primary/50 bg-primary/12 text-primary',
  },
  yazilimlar: {
    id: 'yazilimlar',
    name: 'Yazılımlar',
    description: 'NINA, PHD2, PixInsight, Siril, ASCOM/INDI',
    className: 'border-[#38bdf8]/50 bg-[#38bdf8]/12 text-[#7dd3fc]',
  },
  'goruntu-isleme': {
    id: 'goruntu-isleme',
    name: 'Görüntü İşleme',
    description: 'Yığınlama, kalibrasyon, streç, gürültü',
    className: 'border-[#a78bfa]/50 bg-[#a78bfa]/12 text-[#c4b1fd]',
  },
  etkinlikler: {
    id: 'etkinlikler',
    name: 'Etkinlikler',
    description: 'Buluşmalar, gözlem geceleri, atölyeler ve duyurular',
    className: 'border-[#e11d48]/50 bg-[#e11d48]/12 text-[#fb7185]',
  },
  topluluklar: {
    id: 'topluluklar',
    name: 'Topluluklar',
    description: 'Kulüpler, dernekler, forum kuralları ve ortak duyurular',
    className: 'border-[#34d399]/50 bg-[#34d399]/12 text-[#5fe0b0]',
  },
  'bilimsel-calismalar': {
    id: 'bilimsel-calismalar',
    name: 'Bilimsel Çalışmalar',
    description: 'Gözlem raporları, ölçümler ve araştırma notları',
    className: 'border-cold/50 bg-cold/12 text-cold',
  },
  'radyo-astronomi': {
    id: 'radyo-astronomi',
    name: 'Radyo Astronomi',
    description: 'Radyo gözlemleri, antenler, meteor scatter ve veri toplama',
    className: 'border-[#14b8a6]/50 bg-[#14b8a6]/12 text-[#2dd4bf]',
  },
  'astro-kampcilik': {
    id: 'astro-kampcilik',
    name: 'Astro Kampçılık',
    description: 'Karanlık gökyüzü noktaları, kamp, yol ve lojistik',
    className: 'border-[#f59e0b]/50 bg-[#f59e0b]/12 text-[#fbbf24]',
  },
};

/*
 * Sıra ekrandaki ana başlık sırasıdır. Ekipman en kalabalık destek alanı
 * olduğu için başta; kampçılık ise saha/lojistik niyetiyle listenin sonunda.
 */
export const forumCategoryOrder: ForumCategoryId[] = [
  'ekipmanlar',
  'yazilimlar',
  'goruntu-isleme',
  'etkinlikler',
  'topluluklar',
  'bilimsel-calismalar',
  'radyo-astronomi',
  'astro-kampcilik',
];

export const forumLabels: Record<ForumLabelId, ForumLabel> = {
  soru: {
    id: 'soru',
    name: 'Soru',
    description: 'Yanıt beklenen açık uçlu soru',
    className: 'border-primary/45 text-primary',
  },
  'sorun-giderme': {
    id: 'sorun-giderme',
    name: 'Sorun Giderme',
    description: 'Çalışmayan bir kurulum ya da beklenmeyen sonuç',
    className: 'border-danger/45 text-danger',
  },
  rehber: {
    id: 'rehber',
    name: 'Rehber',
    description: 'Adım adım anlatım, nasıl yapılır',
    className: 'border-success/45 text-success',
  },
  inceleme: {
    id: 'inceleme',
    name: 'İnceleme',
    description: 'Kullanım deneyimi, ürün değerlendirmesi',
    className: 'border-[#a78bfa]/45 text-[#c4b1fd]',
  },
  tavsiye: {
    id: 'tavsiye',
    name: 'Tavsiye',
    description: 'Satın alma ya da seçim önerisi isteği',
    className: 'border-[#f59e0b]/45 text-[#fbbf24]',
  },
  duyuru: {
    id: 'duyuru',
    name: 'Duyuru',
    description: 'Bilgilendirme; tartışma beklenmez',
    className: 'border-cold/45 text-cold',
  },
};

export const forumLabelOrder: ForumLabelId[] = [
  'soru',
  'sorun-giderme',
  'rehber',
  'inceleme',
  'tavsiye',
  'duyuru',
];

/** Bir konuya en çok bu kadar rozet takılabilir. */
export const forumLabelLimit = 3;

/* ══════════════════════ Görünüm ve sıralama ══════════════════════ */

/**
 * Liste yoğunluğu.
 *
 * 'baslik' yalnızca başlık ve rozetleri gösterir — konu taramak için.
 * 'detayli' altına açılış mesajının ilk satırını ekler — ne konuşulduğunu
 * listeden anlamak için. İkisi aynı veriyi gösteriyor; değişen okuma
 * biçimi, içerik değil.
 */
export type ForumDensity = 'baslik' | 'detayli';

export const forumDensities = ['baslik', 'detayli'] as const;

export type ForumSortId =
  | 'son-etkinlik'
  | 'en-yeni'
  | 'en-eski'
  | 'en-cok-yanit'
  | 'en-cok-goruntulenme';

export const forumSortOptions: { value: ForumSortId; label: string }[] = [
  { value: 'son-etkinlik', label: 'Son etkinlik' },
  { value: 'en-yeni', label: 'En yeni tarihli' },
  { value: 'en-eski', label: 'En eski tarihli' },
  { value: 'en-cok-yanit', label: 'En çok yanıtlanan' },
  { value: 'en-cok-goruntulenme', label: 'En çok görüntülenen' },
];

/**
 * "3 saat önce" biçiminde göreli zaman.
 *
 * `Intl.RelativeTimeFormat` kullanılır — Türkçe çekim kurallarını elle
 * yazmak ("1 gün önce" / "2 gün önce" / "bir ay önce") sessizce yanlış
 * sonuçlar üretiyordu.
 */
export function relativeTime(iso: string, now = new Date()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '—';

  const diffSec = Math.round((then - now.getTime()) / 1000);
  const abs = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat('tr-TR', { numeric: 'auto' });

  if (abs < 60) return rtf.format(Math.round(diffSec), 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
  if (abs < 31536000) return rtf.format(Math.round(diffSec / 2592000), 'month');
  return rtf.format(Math.round(diffSec / 31536000), 'year');
}

function time(iso: string): number {
  const value = new Date(iso).getTime();
  /* Bozuk tarih listeyi kırmasın: sıralamada en eski uca düşsün ki
     geçerli kayıtların sırası bozulmadan kalsın. */
  return Number.isFinite(value) ? value : 0;
}

/**
 * Konuları seçilen ölçüte göre sıralar; sabitlenenler her zaman üstte
 * kalır.
 *
 * Sabitleme sıralamanın üstünde tutuluyor — "en eski tarihli" seçilince
 * duyurunun listenin ortasına düşmesi, sabitlemeyi anlamsız kılardı.
 * Sabitleme bir sıralama tercihi değil, moderasyon kararı.
 */
export function sortThreads(
  threads: ForumThread[],
  sort: ForumSortId = 'son-etkinlik'
): ForumThread[] {
  const compare: Record<ForumSortId, (a: ForumThread, b: ForumThread) => number> =
    {
      'son-etkinlik': (a, b) => time(b.lastActivityAt) - time(a.lastActivityAt),
      'en-yeni': (a, b) => time(b.createdAt) - time(a.createdAt),
      'en-eski': (a, b) => time(a.createdAt) - time(b.createdAt),
      'en-cok-yanit': (a, b) => b.replyCount - a.replyCount,
      'en-cok-goruntulenme': (a, b) => b.viewCount - a.viewCount,
    };

  const by = compare[sort] ?? compare['son-etkinlik'];

  return [...threads].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return by(a, b);
  });
}

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

/** Kategori, rozet ve serbest metne göre konu filtresi. */
export function filterThreads(
  threads: ForumThread[],
  {
    category = 'hepsi',
    label = 'hepsi',
    search = '',
  }: {
    category?: ForumCategoryId | 'hepsi';
    label?: ForumLabelId | 'hepsi';
    search?: string;
  }
): ForumThread[] {
  const q = trLower(search.trim());

  return threads.filter((thread) => {
    if (category !== 'hepsi' && thread.category !== category) return false;
    if (label !== 'hepsi' && !(thread.labels ?? []).includes(label)) {
      return false;
    }
    if (!q) return true;

    const haystack = [
      thread.title,
      thread.body,
      thread.author.displayName,
      thread.author.username,
      forumCategories[thread.category]?.name ?? '',
      ...(thread.labels ?? []).map((id) => forumLabels[id]?.name ?? ''),
    ]
      .map(trLower)
      .join(' ');

    return haystack.includes(q);
  });
}
