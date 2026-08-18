/**
 * Pozlama ve entegrasyon süresi hesapları (§7.4 adım 5, §17.1).
 * Filtre bazlı pozlama satırlarından toplam entegrasyon otomatik hesaplanır.
 * İş kuralı React'ten ayrı domain katmanında tutulur (§12.5).
 */

export interface FilterExposure {
  /** Filtre adı (L, R, G, B, Ha, OIII, SII, UV/IR-cut...) */
  filter: string;
  /** Kare sayısı */
  frames: number;
  /** Tek kare pozlama süresi (saniye) */
  exposureSeconds: number;
  /**
   * Bu pozlamanın toplandığı çekim oturumu — istemci tarafı oturum
   * kimliği (C05). Boşsa pozlama fotoğrafın geneline yazılıyor. Yalnızca
   * arayüz ve yükleme için; entegrasyon hesabına girmiyor.
   */
  sessionId?: string;
}

/**
 * Yeni pozlama satırı — son satırın tekrar eden değerlerini taşır (C01).
 *
 * Astrofotoğrafçı çoğu filtreyi AYNI kare sayısı ve tek-kare pozuyla
 * çekiyor (ör. LRGB'de her kanal 60×300 sn). Yeni satırı boş açmak, aynı
 * iki sayıyı her filtre için elden yazdırıyordu. Filtre KOPYALANMIYOR:
 * her satırın filtresi farklı; kopyalansaydı kullanıcı önce eskisini
 * silip sonra yenisini yazacaktı — kolaylık değil, angarya olurdu.
 */
export function yeniPozSatiri(rows: FilterExposure[]): FilterExposure {
  const son = rows[rows.length - 1];
  return son
    ? { filter: '', frames: son.frames, exposureSeconds: son.exposureSeconds }
    : { filter: '', frames: 0, exposureSeconds: 0 };
}

/** Tek filtre satırının toplam süresi (saniye). */
export function exposureRowSeconds(row: FilterExposure): number {
  if (row.frames < 0 || row.exposureSeconds < 0) {
    throw new Error('Kare sayısı ve pozlama süresi negatif olamaz');
  }
  return row.frames * row.exposureSeconds;
}

/** Tüm satırların toplam entegrasyonu (saniye). */
export function totalIntegrationSeconds(rows: FilterExposure[]): number {
  return rows.reduce((sum, row) => sum + exposureRowSeconds(row), 0);
}

/**
 * Saniyeyi insan okunur Türkçe biçime çevirir: "12 sa 30 dk", "45 dk", "90 sn".
 * Teknik etiketlerde kullanılır (kartlar, detay sayfası).
 */
export function formatIntegration(seconds: number): string {
  if (seconds < 0) throw new Error('Süre negatif olamaz');
  if (seconds < 60) return `${Math.round(seconds)} sn`;

  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} dk`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours} sa ${minutes} dk` : `${hours} sa`;
}
