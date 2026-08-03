/**
 * Fotoğraf sürümleri ve teknik karşılaştırma (§8.1).
 *
 * KOTA KURALI: aynı fotoğrafın sürümleri fotoğraf kotasında ayrı fotoğraf
 * sayılmaz (§4.2). Kural burada yazılıdır çünkü hem ön yüzün göstereceği
 * sayı hem de sunucunun zorlayacağı sınır aynı tanımı kullanmalı — iki
 * yerde ayrı yazılırsa er ya da geç biri "sürümü de say" der ve kullanıcı
 * kotasını neden doldurduğunu anlamaz.
 *
 * KARŞILAŞTIRMA: iki fotoğrafın farkını **anlamlı** alanlarda çıkarır.
 * Fark listesi otomatik üretilmiyor (tüm alanları gezip eşitsizleri
 * listelemek), çünkü sonuç "beğeni sayısı farklı" gibi gürültüyle dolardı.
 */

import { totalIntegrationSeconds, formatIntegration } from './integration';
import type { FilterExposure } from './integration';

export type VersionKind =
  | 'ilk-isleme'
  | 'yeni-entegrasyon'
  | 'farkli-palet'
  | 'yeni-kalibrasyon'
  | 'revize-isleme';

export const versionKindLabels: Record<VersionKind, string> = {
  'ilk-isleme': 'İlk işleme',
  'yeni-entegrasyon': 'Yeni entegrasyon',
  'farkli-palet': 'Farklı palet',
  'yeni-kalibrasyon': 'Yeni kalibrasyon',
  'revize-isleme': 'Revize işleme',
};

export interface PhotoVersion {
  id: string;
  label: string;
  kind: VersionKind;
  /** Sürümün yayımlandığı tarih (ISO). */
  publishedAt: string;
  /** Bu sürümde ne değişti — tek cümle. */
  note: string;
  /** Görsel yokken çizilen yer tutucu tonu. */
  gradient: string;
  /**
   * Sürümün kendi görselinin genel adresi.
   *
   * Yoksa karşılaştırma sürgüsü yer tutucu gradyana düşüyor ve bunu
   * AÇIKÇA söylüyor. Gradyan bir görüntü değil; iki gradyanı yan yana
   * koyup "işleme farkına bak" demek, olmayan bir farkı varmış gibi
   * göstermek olurdu.
   */
  imageUrl?: string;
  /** Depodaki nesne yolu; yalnızca sahibin sürüm yönetimi için kullanılır. */
  storagePath?: string;
  /** Bu sürümdeki toplam entegrasyon (değiştiyse). */
  exposures?: FilterExposure[];
  /** Bu sürümde kullanılan palet (değiştiyse). */
  palette?: string;
}

/**
 * Kota sayımı: bir kullanıcının fotoğrafları kaç "kota birimi" tutar?
 *
 * Sürüm sayısı ne olursa olsun her fotoğraf bir birimdir.
 */
export function quotaUnits(photoVersionCounts: number[]): number {
  return photoVersionCounts.length;
}

/** Toplam sürüm sayısı — panelde bilgi olarak gösterilir, kotaya girmez. */
export function totalVersions(photoVersionCounts: number[]): number {
  return photoVersionCounts.reduce((sum, count) => sum + Math.max(count, 1), 0);
}

/* ══════════════════════ Teknik karşılaştırma ══════════════════════ */

export interface ComparablePhoto {
  slug: string;
  title: string;
  exposures: FilterExposure[];
  palette: string;
  setup: { optic: string; camera: string; mount: string; filters?: string };
  bortle?: number;
  capturedAt: string;
}

export interface ComparisonRow {
  label: string;
  a: string;
  b: string;
  /** İki değer farklı mı? Arayüz farklı satırları vurgular. */
  differs: boolean;
  /**
   * Sayısal alanlarda farkın yönü ve büyüklüğü — "2sa 30dk daha uzun" gibi
   * bir cümle kurulabilsin diye.
   */
  delta?: string;
}

/** Bortle farkını okunur hâle getirir (düşük daha karanlıktır). */
function bortleDelta(a: number | undefined, b: number | undefined): string | undefined {
  if (a === undefined || b === undefined) return undefined;
  if (a === b) return undefined;
  const diff = Math.abs(a - b);
  return a < b
    ? `A ${diff} basamak daha karanlık`
    : `B ${diff} basamak daha karanlık`;
}

/**
 * İki fotoğrafın teknik karşılaştırması (§8.1).
 *
 * Karşılaştırılan alanlar bilinçli olarak sonucu açıklayan alanlar:
 * entegrasyon, palet, ekipman, filtre, gökyüzü kalitesi. "Neden bu daha
 * temiz çıkmış" sorusunun cevabı bu beş satırın içindedir.
 */
export function comparePhotos(
  a: ComparablePhoto,
  b: ComparablePhoto
): ComparisonRow[] {
  const integrationA = totalIntegrationSeconds(a.exposures);
  const integrationB = totalIntegrationSeconds(b.exposures);
  const integrationDiff = Math.abs(integrationA - integrationB);

  const rows: ComparisonRow[] = [
    {
      label: 'Toplam entegrasyon',
      a: formatIntegration(integrationA),
      b: formatIntegration(integrationB),
      differs: integrationA !== integrationB,
      delta:
        integrationA === integrationB
          ? undefined
          : `${integrationA > integrationB ? 'A' : 'B'} ${formatIntegration(integrationDiff)} daha uzun`,
    },
    {
      label: 'Poz sayısı',
      a: String(a.exposures.reduce((s, e) => s + e.frames, 0)),
      b: String(b.exposures.reduce((s, e) => s + e.frames, 0)),
      differs:
        a.exposures.reduce((s, e) => s + e.frames, 0) !==
        b.exposures.reduce((s, e) => s + e.frames, 0),
    },
    {
      label: 'Palet',
      a: a.palette,
      b: b.palette,
      differs: a.palette !== b.palette,
    },
    {
      label: 'Optik',
      a: a.setup.optic,
      b: b.setup.optic,
      differs: a.setup.optic !== b.setup.optic,
    },
    {
      label: 'Kamera',
      a: a.setup.camera,
      b: b.setup.camera,
      differs: a.setup.camera !== b.setup.camera,
    },
    {
      label: 'Filtre',
      a: a.setup.filters ?? '—',
      b: b.setup.filters ?? '—',
      differs: (a.setup.filters ?? '') !== (b.setup.filters ?? ''),
    },
    {
      label: 'Gökyüzü (Bortle)',
      a: a.bortle !== undefined ? `Bortle ${a.bortle}` : '—',
      b: b.bortle !== undefined ? `Bortle ${b.bortle}` : '—',
      differs: a.bortle !== b.bortle,
      delta: bortleDelta(a.bortle, b.bortle),
    },
  ];

  return rows;
}

/** Karşılaştırmada kaç alan farklı çıktı? */
export function differenceCount(rows: ComparisonRow[]): number {
  return rows.filter((row) => row.differs).length;
}
