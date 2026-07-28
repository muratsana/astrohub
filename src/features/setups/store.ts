import { EMPTY_SETUP, type SetupDraft } from '@/domain/setup/types';

/**
 * KAYITLI SETUP'LAR — yeni model.
 *
 * Eski `storage.ts` uyumluluk aracının düz sayı girdilerini saklıyordu;
 * bu depo ise setup'ı **katalog referanslarıyla** saklıyor. Fark önemli:
 * katalogdaki bir modelin ağırlığı düzeltildiğinde kayıtlı setup'ın
 * hesabı da düzeliyor. Sayıyı kopyalasaydık, kayıt yanlış değerle donmuş
 * kalırdı.
 *
 * Depo hâlâ tarayıcıda. Hesap sistemi bağlandığında aynı arayüzle
 * Supabase'e taşınacak; `SavedSetup` tipini o yüzden serileştirilebilir
 * tuttuk — içinde fonksiyon ya da model nesnesi yok, yalnızca slug.
 */

const STORAGE_KEY = 'astrohub:setups:v2';

export type SetupVisibility = 'ozel' | 'profilde' | 'herkese-acik';

export const visibilityLabels: Record<SetupVisibility, string> = {
  ozel: 'Özel — yalnızca ben',
  profilde: 'Profilimde görünsün',
  'herkese-acik': 'Herkese açık',
};

export interface SavedSetup {
  id: string;
  name: string;
  description?: string;
  /** "Geniş alan", "Galaksi", "Gezegen"… serbest metin. */
  purpose?: string;
  visibility: SetupVisibility;
  /** Fotoğraf yüklerken öntanımlı gelecek setup. */
  isDefault?: boolean;
  draft: SetupDraft;
  createdAt: string;
  updatedAt: string;
}

function read(): SavedSetup[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isSavedSetup) : [];
  } catch {
    return [];
  }
}

function write(setups: SavedSetup[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(setups));
  } catch {
    /* Kota dolu ya da özel mod — kaydetmemek, çökmekten iyidir. */
  }
}

/**
 * En temel doğrulama.
 *
 * Veri `localStorage`'dan geliyor ve elle düzenlenmiş olabilir. Bozuk
 * bir kaydı listeye almak, setup sayfasını her açılışta çökertirdi.
 */
export function isSavedSetup(value: unknown): value is SavedSetup {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<SavedSetup>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    !!s.draft &&
    typeof s.draft === 'object' &&
    typeof (s.draft as SetupDraft).slots === 'object'
  );
}

export function listSetups(): SavedSetup[] {
  return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getSetup(id: string): SavedSetup | undefined {
  return read().find((s) => s.id === id);
}

export function defaultSetup(): SavedSetup | undefined {
  return read().find((s) => s.isDefault);
}

export interface SaveInput {
  id?: string;
  name: string;
  description?: string;
  purpose?: string;
  visibility?: SetupVisibility;
  draft: SetupDraft;
}

/** Kaydeder ve kaydın kendisini döndürür (yeni id üretilmiş olabilir). */
export function saveSetup(input: SaveInput, now: string): SavedSetup {
  const setups = read();
  const existing = input.id ? setups.find((s) => s.id === input.id) : undefined;

  const record: SavedSetup = {
    id: existing?.id ?? newId(),
    name: input.name.trim() || 'Adsız setup',
    description: input.description?.trim() || undefined,
    purpose: input.purpose?.trim() || undefined,
    visibility: input.visibility ?? existing?.visibility ?? 'ozel',
    isDefault: existing?.isDefault,
    draft: input.draft,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const next = existing
    ? setups.map((s) => (s.id === record.id ? record : s))
    : [record, ...setups];
  write(next);
  return record;
}

export function deleteSetup(id: string): void {
  write(read().filter((s) => s.id !== id));
}

/** Kopya çıkarır — şablon olarak kullanma yolu. */
export function duplicateSetup(id: string, now: string): SavedSetup | null {
  const source = getSetup(id);
  if (!source) return null;
  return saveSetup(
    {
      name: `${source.name} (kopya)`,
      description: source.description,
      purpose: source.purpose,
      visibility: source.visibility,
      draft: source.draft,
    },
    now
  );
}

/**
 * Varsayılan setup — aynı anda yalnızca bir tane.
 *
 * Diğerlerinin bayrağını da temizliyoruz; iki varsayılan olduğunda
 * fotoğraf yükleme ekranı hangisini seçeceğini bilemez ve sıraya göre
 * rastgele davranırdı.
 */
export function setDefaultSetup(id: string): void {
  write(read().map((s) => ({ ...s, isDefault: s.id === id })));
}

export function newId(): string {
  return `setup-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyDraft(): SetupDraft {
  return { ...EMPTY_SETUP, slots: {} };
}
