import type { Broadcast } from './types';

/**
 * ASTROHUB.TV PROGRAM LİSTESİ.
 *
 * Radyoda olduğu gibi burada da yayın **sitenindir**: programı editör
 * ekibi yapar, izleyici yayın ekleyemez. Yetki veritabanında da böyle
 * (0011: yazma politikası admin/content_editor).
 *
 * Liste kasıtlı olarak boş başlıyor. Örnek diye gerçek olmayan bir
 * YouTube kimliği yazmak, arayüzü dolu gösterip oynatmaya basınca
 * "video yok" ekranı vermekten başka işe yaramazdı.
 *
 * Yayın eklemek (editör): Yönetim → TV Kontrolü. Gereken tek bilgi
 * YouTube kimliği:
 *   · video   → izleme adresindeki `v=` parametresi (11 karakter)
 *   · kanal   → kanal adresindeki `UC…` ile başlayan 24 karakter
 * Tam URL istenmez; gömme adresi kodda kurulur (bkz. types.ts).
 */
export const broadcasts: Broadcast[] = [];
