/**
 * ÇEKİM OTURUMLARI (SEZONLAR) — bir fotoğraf birden çok gecede toplanır.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN TEK TARİH YETMEDİ
 *
 * Astrofotoğraf çoğu zaman tek gecede bitmiyor: aynı hedef haftalar,
 * bazen aylar boyunca farklı gecelerde çekiliyor ve tek bir karede
 * toplanıyor. Model tek bir `captured_at` tarihi tutuyordu; kullanıcı
 * "14 gece boyunca topladım" diyemiyordu (C03). Ayrıca bir oturum tek
 * bir gece de olabilir, bir tarih ARALIĞI da (ör. "12–18 Ocak") — ikisi
 * de gerçek (C02, C04).
 *
 * MODEL: Her oturum bir başlangıç günü, isteğe bağlı bir bitiş günü
 * taşır. Bitiş yoksa oturum tek gecedir; varsa aralıktır. Günler
 * saatsiz `YYYY-MM-DD`; saat astrofotoğrafta anlamsız (gece boyu poz)
 * ve zaman-dilimi karmaşası getirirdi.
 *
 * Tarih matematiği React'ten ayrı bu katmanda; formatlar tek yerden
 * geliyor ki kart künyesi, detay sayfası ve paylaşım kiti aynı yazımı
 * kullansın (C06).
 */

export interface CaptureSession {
  /**
   * İstemci tarafı kimlik — pozlama satırlarını oturuma bağlamak için
   * (C05). DB'de gerçek satır kimliğiyle değişiyor; formda yerel.
   */
  id: string;
  /** Başlangıç günü, `YYYY-MM-DD`. */
  startsOn: string;
  /** Bitiş günü. `null` ise oturum tek gece; doluysa aralık. */
  endsOn: string | null;
}

/** `YYYY-MM-DD` mı? Saatli/kirli değerler reddedilsin. */
export function isGunDamgasi(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/**
 * Oturumu normalize eder: bitiş başlangıçtan önceyse ikisi yer değiştirir,
 * bitiş başlangıca eşitse tek geceye iner (aralık değil).
 *
 * Kullanıcı tarih seçicilerde sırayı kolayca ters giriyor; "18–12 Ocak"
 * bir hata değil, düzeltilecek bir giriş. Eşit uçlu "aralık" da aralık
 * değildir — tek gece olarak saklanıyor ki gösterim "12–12 Ocak" demesin.
 */
export function oturumuDuzelt(session: CaptureSession): CaptureSession {
  const { id, startsOn } = session;
  let endsOn = session.endsOn;
  if (endsOn !== null) {
    if (!isGunDamgasi(endsOn)) endsOn = null;
    else if (endsOn < startsOn) {
      return { id, startsOn: endsOn, endsOn: startsOn };
    } else if (endsOn === startsOn) {
      endsOn = null;
    }
  }
  return { id, startsOn, endsOn };
}

/** Oturum tek gece mi (bitiş yok ya da başlangıca eşit). */
export function tekGece(session: CaptureSession): boolean {
  return oturumuDuzelt(session).endsOn === null;
}

/** Bir oturumdaki gece sayısı (aralık dahil, uçlar dahil). */
export function geceSayisi(session: CaptureSession): number {
  const d = oturumuDuzelt(session);
  if (d.endsOn === null) return 1;
  const bir = new Date(`${d.startsOn}T00:00:00Z`).getTime();
  const iki = new Date(`${d.endsOn}T00:00:00Z`).getTime();
  return Math.round((iki - bir) / 86_400_000) + 1;
}

const AY_KISA = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

function parcala(gun: string): { y: number; m: number; d: number } {
  const [y, m, d] = gun.split('-').map(Number);
  return { y, m, d };
}

/**
 * Tek oturumu okunur Türkçe biçime çevirir (C06):
 *   · tek gece            → "15 Oca 2026"
 *   · aynı ay aralığı     → "12–18 Oca 2026"
 *   · aynı yıl, farklı ay → "28 Oca – 3 Şub 2026"
 *   · farklı yıl          → "28 Ara 2025 – 3 Oca 2026"
 *
 * Yıl aralığın SONUNDA bir kez: "12–18 Oca 2026" iki kez 2026 yazmaz.
 * Farklı yıllarda iki uçta da yıl var, yoksa hangi ucun hangi yıla ait
 * olduğu belirsiz kalırdı.
 */
export function oturumMetni(session: CaptureSession): string {
  const d = oturumuDuzelt(session);
  const b = parcala(d.startsOn);
  const baslangic = `${b.d} ${AY_KISA[b.m - 1]}`;

  if (d.endsOn === null) return `${baslangic} ${b.y}`;

  const s = parcala(d.endsOn);
  const bitis = `${s.d} ${AY_KISA[s.m - 1]}`;

  if (b.y !== s.y) {
    return `${baslangic} ${b.y} – ${bitis} ${s.y}`;
  }
  if (b.m !== s.m) {
    return `${baslangic} – ${bitis} ${s.y}`;
  }
  // Aynı ay: ay adı bir kez, günler tire ile.
  return `${b.d}–${s.d} ${AY_KISA[b.m - 1]} ${b.y}`;
}

/**
 * Birden çok oturumu okunur biçime çevirir (C06).
 *
 * Oturumlar başlangıç gününe göre sıralanıp virgülle listeleniyor; künye
 * "12–18 Oca, 3 Şub 2026" gibi okunuyor. Boş liste boş metin verir —
 * çağıran tarafta "çekim tarihi yok" olarak ele alınır.
 */
export function oturumlariMetni(sessions: CaptureSession[]): string {
  const sirali = [...sessions]
    .map(oturumuDuzelt)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  return sirali.map(oturumMetni).join(', ');
}

/**
 * Tüm oturumlar boyunca toplam çekim gecesi (C06 künyesinde "14 gece").
 * Oturumlar çakışsa bile basitçe toplanıyor: kullanıcı beyanı, takvim
 * kesişimi değil — "3 gece + 5 gece" 8 gece emek demek.
 */
export function toplamGece(sessions: CaptureSession[]): number {
  return sessions.reduce((sum, s) => sum + geceSayisi(s), 0);
}

/**
 * Geriye dönük tek tarih (`astro_photos.captured_at`) için: en erken
 * başlangıç günü. Oturum yoksa `null`. Eski tek-tarih alanı bu değerle
 * dolduruluyor ki sezon bilmeyen okuma yolları (galeri yılı, sıralama)
 * çalışmaya devam etsin.
 */
export function enErkenGun(sessions: CaptureSession[]): string | null {
  if (sessions.length === 0) return null;
  return sessions
    .map((s) => oturumuDuzelt(s).startsOn)
    .reduce((a, b) => (a < b ? a : b));
}
