/**
 * "EKİPMANLARIM" ENVANTERİ.
 *
 * Kullanıcının sahip olduğu modellerin slug listesi. Yalnızca referans
 * saklanıyor: modelin teknik verisi katalogda düzeldiğinde envanterdeki
 * kayıt da düzeliyor.
 *
 * Şu an tarayıcıda. Hesap sistemi bağlandığında aynı arayüzle
 * `user_equipment` tablosuna taşınacak — bu yüzden fonksiyonlar senkron
 * değil de tek yönlü tutuldu ve dışarıya yalnızca slug veriyor.
 */

const STORAGE_KEY = 'astrohub:owned-equipment';

function read(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    /* Kota dolu ya da özel mod; kaydetmemek çökmekten iyidir. */
  }
}

export function listOwned(): string[] {
  return read();
}

export function isOwned(slug: string): boolean {
  return read().includes(slug);
}

/** Ekler ya da çıkarır; sonuçtaki durumu döndürür. */
export function toggleOwned(slug: string): boolean {
  const current = read();
  if (current.includes(slug)) {
    write(current.filter((s) => s !== slug));
    return false;
  }
  write([...current, slug]);
  return true;
}

export function removeOwned(slug: string): void {
  write(read().filter((s) => s !== slug));
}
