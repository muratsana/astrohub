import type { SetupInput } from '@/domain/equipment/compatibility';

/**
 * KAYITLI SETUP'LAR (§7.12).
 *
 * Setup'lar şu an **tarayıcıda** saklanır. Hesap sistemi gelene kadar
 * sunucuda saklayacak bir yer yok ve "kaydet" düğmesini hiç koymamak,
 * uyumluluk aracını her açılışta baştan doldurmak demekti.
 *
 * PAYLAŞIM SORUNU VE ÇÖZÜMÜ
 * Yerel kayıt, `/setup/<id>` bağlantısını başka bir cihazda çalışmaz hâle
 * getirir. Bunu görmezden gelip "paylaş" demek, karşı tarafa boş sayfa
 * göstermek olurdu. Bu yüzden bağlantıya setup'ın **kendisi** de gömülür
 * (`?d=<kodlanmış>`): kayıt cihazda, bağlantı kendi kendine yeterli.
 *
 * Kodlama base64url'dir; şifreleme DEĞİLDİR ve öyle sunulmaz — içinde
 * kişisel veri yok, yalnızca ekipman değerleri var.
 */

const STORAGE_KEY = 'astrohub:setups';

export interface SavedSetup {
  id: string;
  name: string;
  savedAt: string;
  input: SetupInput;
}

/* ══════════════════════ Kodlama ══════════════════════ */

/** UTF-8 güvenli base64url kodlama. */
export function encodeSetup(setup: Pick<SavedSetup, 'name' | 'input'>): string {
  const json = JSON.stringify(setup);
  // `btoa` yalnızca latin1 kabul eder; Türkçe karakterler için önce UTF-8'e.
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Kodlanmış dizeyi çözer; bozuksa `null` döner (asla hata fırlatmaz). */
export function decodeSetup(
  value: string | null | undefined
): Pick<SavedSetup, 'name' | 'input'> | null {
  if (!value) return null;
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes));

    // En temel doğrulama: beklenen alanlar yoksa bozuk sayılır. Gelen veri
    // adres çubuğundan geliyor, yani düzenlenmiş olabilir.
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.name !== 'string' ||
      !parsed.input ||
      typeof parsed.input !== 'object' ||
      !parsed.input.optic ||
      !parsed.input.camera ||
      !parsed.input.mount
    ) {
      return null;
    }
    return parsed as Pick<SavedSetup, 'name' | 'input'>;
  } catch {
    return null;
  }
}

/* ══════════════════════ Yerel depo ══════════════════════ */

function read(): SavedSetup[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as SavedSetup[]) : [];
  } catch {
    return [];
  }
}

function write(setups: SavedSetup[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
  } catch {
    // Kota dolu ya da depolama kapalı — kayıt bu oturumda kalır.
  }
}

export function listSetups(): SavedSetup[] {
  return read().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function getSetup(id: string): SavedSetup | undefined {
  return read().find((s) => s.id === id);
}

/**
 * Setup'ı kaydeder ve kaydı döndürür.
 *
 * Kimlik zaman damgasından türetilir; çakışma ihtimali yok denecek kadar
 * düşük ve `crypto.randomUUID` her ortamda (eski Safari, güvensiz bağlam)
 * bulunmuyor.
 */
export function saveSetup(name: string, input: SetupInput, now = new Date()): SavedSetup {
  const setup: SavedSetup = {
    id: `s${now.getTime().toString(36)}`,
    name: name.trim() || 'Adsız setup',
    savedAt: now.toISOString(),
    input,
  };
  write([setup, ...read().filter((s) => s.id !== setup.id)]);
  return setup;
}

export function deleteSetup(id: string): void {
  write(read().filter((s) => s.id !== id));
}
