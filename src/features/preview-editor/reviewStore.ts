/**
 * İNCELEME MODU DEPOSU — seçilen öğeler, notlar ve metin düzenlemeleri.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÖĞE NASIL ADRESLENİYOR
 *
 * Bir nota "hangi öğe" bilgisini bağlamak için kararlı bir kimlik gerek.
 * Üç aday vardı ve ikisi elendi:
 *
 *   · DOM yolu (`main > div:nth-child(3) > p`) — sayfa yeniden
 *     çizildiğinde ya da bir kart eklendiğinde kayıyor. Not yanlış öğeye
 *     yapışır ve bu, notun hiç olmamasından kötü.
 *   · React fiber anahtarları — üretim derlemesinde yok.
 *
 * Kalan: **rota + öğe etiketi + metnin ilk 60 karakteri**. Metin
 * değiştiğinde bağ kopuyor, evet — ama o zaman not zaten o metin
 * hakkında değil. Kayan bir bağdan daha dürüst.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÜZENLEMELER ÜRETİM KODUNU DEĞİŞTİRMEZ
 *
 * Bu araç bir CMS değil. Metin düzenlemesi yalnızca tarayıcıda yaşıyor
 * ve amacı "şu başlık şöyle olsa nasıl durur" sorusunu kod yazmadan
 * cevaplamak. Dışa aktarma çıktısı, değişikliği koda taşıyacak kişiye
 * verilen bir listedir — otomatik uygulanmaz.
 */

export interface ReviewNote {
  id: string;
  /** Notun bırakıldığı rota (`/araclar`). */
  route: string;
  /** Öğe kimliği — `elementKey` üretiyor. */
  target: string;
  /** Öğenin insan okunur tarifi ("h1 · Araçlar"). */
  targetLabel: string;
  /** Kullanıcının yazdığı yorum. */
  text: string;
  /** Düzenlenmişse yeni metin; yalnızca not bırakıldıysa null. */
  replacement: string | null;
  /** Öğenin nota bırakıldığı andaki metni. */
  original: string;
  createdAt: string;
  done: boolean;
}

const STORAGE_KEY = 'astrohub:inceleme-notlari';

/**
 * Öğe kimliği.
 *
 * Etiket adı + rota + metnin başı. Aynı sayfada aynı metni taşıyan iki
 * öğe varsa ikisi tek kimlik alıyor — bilinçli: kullanıcı için ikisi
 * "aynı şey" ve ayrı notlar açmak listeyi kirletirdi.
 */
export function elementKey(route: string, element: Element): string {
  const tag = element.tagName.toLowerCase();
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
  return `${route}::${tag}::${text}`;
}

/** Panelde ve dışa aktarımda görünen kısa tarif. */
export function elementLabel(element: Element): string {
  const tag = element.tagName.toLowerCase();
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const kisa = text.length > 44 ? `${text.slice(0, 44)}…` : text;
  return kisa ? `${tag} · ${kisa}` : tag;
}

export function readNotes(): ReviewNote[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isNote) : [];
  } catch {
    return [];
  }
}

export function writeNotes(notes: ReviewNote[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* Kota dolu ya da özel mod — kaydetmemek, çökmekten iyidir. */
  }
}

function isNote(value: unknown): value is ReviewNote {
  if (!value || typeof value !== 'object') return false;
  const n = value as Partial<ReviewNote>;
  return (
    typeof n.id === 'string' &&
    typeof n.route === 'string' &&
    typeof n.target === 'string' &&
    typeof n.text === 'string'
  );
}

/**
 * Notları Markdown'a çevirir — kopyalanıp doğrudan bir göreve yapıştırılsın.
 *
 * Rotaya göre gruplanıyor: aynı sayfadaki üç not, üç ayrı satır olarak
 * dağılmak yerine bir başlık altında duruyor ve düzeltmeyi yapacak kişi
 * sayfayı bir kez açıyor.
 */
export function notesToMarkdown(notes: ReviewNote[]): string {
  if (notes.length === 0) return '';

  const gruplar = new Map<string, ReviewNote[]>();
  for (const note of notes) {
    const liste = gruplar.get(note.route) ?? [];
    liste.push(note);
    gruplar.set(note.route, liste);
  }

  const satirlar: string[] = ['# Önizleme inceleme notları', ''];
  for (const [route, liste] of [...gruplar.entries()].sort()) {
    satirlar.push(`## ${route}`, '');
    for (const note of liste) {
      satirlar.push(`- **${note.targetLabel}**`);
      if (note.text.trim()) satirlar.push(`  - Yorum: ${note.text.trim()}`);
      if (note.replacement !== null && note.replacement !== note.original) {
        satirlar.push(`  - Mevcut: \`${note.original}\``);
        satirlar.push(`  - Önerilen: \`${note.replacement}\``);
      }
      if (note.done) satirlar.push('  - Durum: çözüldü');
    }
    satirlar.push('');
  }
  return satirlar.join('\n');
}

/** Yeni kimlik — `crypto.randomUUID` yoksa zaman damgalı yedek. */
export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `n${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
