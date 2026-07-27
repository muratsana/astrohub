/**
 * FORUM — tür tanımları (§7.x topluluk).
 *
 * Kategoriler sabit ve az sayıdadır. Kullanıcının kategori açabildiği
 * forumlar hızla birbirinin kopyası on beş kategoriye dönüşüyor; burada
 * kategori seti editoryal bir karardır.
 */

export type ForumCategoryId =
  | 'baslangic'
  | 'ekipman'
  | 'isleme'
  | 'gozlem-raporlari'
  | 'saha-ve-seyahat'
  | 'yazilim';

export interface ForumCategory {
  id: ForumCategoryId;
  name: string;
  description: string;
  /** Rozet ve vurgu rengi — galeri ailelerindeki desenin aynısı. */
  className: string;
}

export interface ForumAuthor {
  username: string;
  displayName: string;
  /** Doğrulanmış organizatör / editör gibi işaretler. */
  badge?: string;
}

export interface ForumPost {
  id: string;
  author: ForumAuthor;
  createdAt: string;
  /** Düz metin. Zengin metin geldiğinde sanitize edilerek işlenecek. */
  body: string;
  /** Konuyu açanın "çözüm" olarak işaretlediği yanıt. */
  solution?: boolean;
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
  replies: ForumPost[];
  tags?: string[];
}

export const forumCategories: Record<ForumCategoryId, ForumCategory> = {
  baslangic: {
    id: 'baslangic',
    name: 'Başlangıç',
    description: 'İlk teleskop, ilk kayıt, temel sorular',
    className: 'border-[#34d399]/50 bg-[#34d399]/12 text-[#5fe0b0]',
  },
  ekipman: {
    id: 'ekipman',
    name: 'Ekipman',
    description: 'Teleskop, montür, kamera, filtre; kurulum ve arıza',
    className: 'border-primary/50 bg-primary/12 text-primary',
  },
  isleme: {
    id: 'isleme',
    name: 'Görüntü İşleme',
    description: 'Yığınlama, kalibrasyon, streç, gürültü',
    className: 'border-[#a78bfa]/50 bg-[#a78bfa]/12 text-[#c4b1fd]',
  },
  'gozlem-raporlari': {
    id: 'gozlem-raporlari',
    name: 'Gözlem Raporları',
    description: 'Gece notları, seeing koşulları, gözlem günlükleri',
    className: 'border-cold/50 bg-cold/12 text-cold',
  },
  'saha-ve-seyahat': {
    id: 'saha-ve-seyahat',
    name: 'Saha ve Seyahat',
    description: 'Karanlık gökyüzü noktaları, kamp, yol ve lojistik',
    className: 'border-[#f59e0b]/50 bg-[#f59e0b]/12 text-[#fbbf24]',
  },
  yazilim: {
    id: 'yazilim',
    name: 'Yazılım',
    description: 'NINA, PHD2, PixInsight, Siril, ASCOM/INDI',
    className: 'border-[#38bdf8]/50 bg-[#38bdf8]/12 text-[#7dd3fc]',
  },
};

export const forumCategoryOrder: ForumCategoryId[] = [
  'baslangic',
  'ekipman',
  'isleme',
  'gozlem-raporlari',
  'saha-ve-seyahat',
  'yazilim',
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

/** Konuları son etkinliğe göre sıralar; sabitlenenler her zaman üstte kalır. */
export function sortThreads(threads: ForumThread[]): ForumThread[] {
  return [...threads].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return (
      new Date(b.lastActivityAt).getTime() -
      new Date(a.lastActivityAt).getTime()
    );
  });
}

function trLower(s: string): string {
  return s.toLocaleLowerCase('tr-TR');
}

/** Kategori ve serbest metne göre konu filtresi. */
export function filterThreads(
  threads: ForumThread[],
  {
    category = 'hepsi',
    search = '',
    onlyUnsolved = false,
  }: {
    category?: ForumCategoryId | 'hepsi';
    search?: string;
    onlyUnsolved?: boolean;
  }
): ForumThread[] {
  const q = trLower(search.trim());

  return threads.filter((thread) => {
    if (category !== 'hepsi' && thread.category !== category) return false;
    if (onlyUnsolved && thread.solved) return false;
    if (!q) return true;

    const haystack = [
      thread.title,
      thread.body,
      thread.author.displayName,
      thread.author.username,
      ...(thread.tags ?? []),
    ]
      .map(trLower)
      .join(' ');

    return haystack.includes(q);
  });
}
