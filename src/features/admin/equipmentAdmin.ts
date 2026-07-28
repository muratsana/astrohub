import { getSupabase } from '@/services/supabase/client';
import { equipment, type EquipmentModel } from '@/features/equipment/data';
import {
  CONNECTION_LIST,
  isConnectionStandard,
} from '@/domain/equipment/connections';

/**
 * EKİPMAN VERİTABANI YÖNETİMİ.
 *
 * Yöneticinin iki işi var ve ikisi de veri kalitesiyle ilgili: eksik
 * teknik veriyi görmek ve tek tek doldurmak.
 *
 * EKSİK VERİ RAPORU NEDEN ÖNEMLİ: setup planlayıcısı bir alan boş
 * olduğunda "veri yetersiz" diyor ve o kontrolü hiç yapmıyor. Kullanıcı
 * bunun sebebini bilmiyor, yalnızca aracın işe yaramadığını görüyor.
 * Rapor, hangi kaydın hangi alanının eksik olduğunu sayıyla gösteriyor;
 * yönetici en çok kullanılan kategoriden başlayabiliyor.
 *
 * DÜZENLEME DOĞRUDAN VERİTABANINA yazıyor, tohum diziye değil. Tohum
 * dizi uygulamanın içinde ve bir sonraki sürümde geliyor; oradaki değeri
 * değiştirmek yeni bir yayın gerektirirdi. Yönetici düzeltmesi anında
 * canlıya çıkmalı — bu yüzden yazma DB'ye, senkronizasyon ise DB'de
 * olmayan kayıtları eklemekle sınırlı.
 */

/** Setup planlayıcısının ihtiyaç duyduğu, kategoriye göre değişen alanlar. */
export interface RequiredField {
  key: string;
  label: string;
  /** Bu alan hangi kategorilerde zorunlu sayılıyor? */
  categories: string[];
}

export const REQUIRED_FIELDS: RequiredField[] = [
  {
    key: 'connection_output',
    label: 'Çıkış bağlantısı',
    categories: ['optik-tup', 'lens', 'reducer', 'barlow', 'filtre-carki', 'guide'],
  },
  {
    key: 'connection_input',
    label: 'Giriş bağlantısı',
    categories: [
      'astro-kamera',
      'fotograf-makinesi',
      'reducer',
      'barlow',
      'filtre-carki',
    ],
  },
  {
    key: 'flange_distance_mm',
    label: 'Flanş–sensör mesafesi',
    categories: ['astro-kamera', 'fotograf-makinesi'],
  },
  {
    key: 'optic_factor',
    label: 'Çarpan',
    categories: ['reducer', 'barlow'],
  },
  {
    key: 'required_backfocus_mm',
    label: 'İstenen backfocus',
    categories: ['reducer'],
  },
  {
    key: 'optical_length_mm',
    label: 'Optik uzunluk',
    categories: ['filtre-carki', 'guide'],
  },
  {
    key: 'filter_thickness_mm',
    label: 'Filtre kalınlığı',
    categories: ['filtre'],
  },
  {
    key: 'weight_kg',
    label: 'Ağırlık',
    categories: ['optik-tup', 'lens', 'montur', 'astro-kamera', 'fotograf-makinesi'],
  },
];

export interface MissingFieldReport {
  slug: string;
  brand: string;
  model: string;
  category: string;
  /** Bu kayıtta eksik olan alan etiketleri. */
  missing: string[];
}

/**
 * Eksik teknik veri raporu — tohum katalog üzerinden.
 *
 * Neden tohum üzerinden? Rapor, uygulamanın gösterdiği katalogla aynı
 * olmalı. Veritabanı bağlı değilse arayüz tohumdan okuyor ve raporun
 * "her şey tamam" demesi yanıltıcı olurdu. Veritabanı bağlıysa
 * senkronizasyon ikisini eşitliyor.
 */
export function missingFieldReport(
  models: EquipmentModel[] = equipment
): MissingFieldReport[] {
  const rows: MissingFieldReport[] = [];

  for (const model of models) {
    const missing: string[] = [];

    for (const field of REQUIRED_FIELDS) {
      if (!field.categories.includes(model.category)) continue;
      if (!isFieldFilled(model, field.key)) missing.push(field.label);
    }

    if (missing.length > 0) {
      rows.push({
        slug: model.slug,
        brand: model.brand,
        model: model.model,
        category: model.category,
        missing,
      });
    }
  }

  /* En çok eksiği olan kayıt en üstte: yöneticinin bir saatini en çok
     etkilenen kayda harcaması, on kaydın birer alanını doldurmasından
     daha çok kontrolü çalışır hâle getiriyor. */
  return rows.sort((a, b) => b.missing.length - a.missing.length);
}

function isFieldFilled(model: EquipmentModel, key: string): boolean {
  switch (key) {
    case 'connection_input':
      return Boolean(model.connections?.input);
    case 'connection_output':
      return Boolean(model.connections?.output);
    case 'flange_distance_mm':
      return model.optics?.flangeDistanceMm !== undefined;
    case 'optic_factor':
      return model.optics?.factor !== undefined;
    case 'required_backfocus_mm':
      return model.optics?.requiredBackfocusMm !== undefined;
    case 'optical_length_mm':
      return model.optics?.opticalLengthMm !== undefined;
    case 'filter_thickness_mm':
      return model.optics?.filterThicknessMm !== undefined;
    case 'weight_kg':
      return Boolean(model.specs['Ağırlık']);
    default:
      return true;
  }
}

/** Kapsama özeti — "kaç kayıt eksiksiz". */
export interface CoverageSummary {
  total: number;
  complete: number;
  incomplete: number;
  /** Kategori → eksik kayıt sayısı. */
  byCategory: { category: string; missing: number }[];
}

export function coverageSummary(
  models: EquipmentModel[] = equipment
): CoverageSummary {
  const report = missingFieldReport(models);
  const counts = new Map<string, number>();
  for (const row of report) {
    counts.set(row.category, (counts.get(row.category) ?? 0) + 1);
  }

  return {
    total: models.length,
    complete: models.length - report.length,
    incomplete: report.length,
    byCategory: [...counts.entries()]
      .map(([category, missing]) => ({ category, missing }))
      .sort((a, b) => b.missing - a.missing),
  };
}

/* ══════════════════════ Düzenleme ══════════════════════ */

export interface EquipmentPatch {
  connection_input?: string | null;
  connection_output?: string | null;
  clear_aperture_mm?: number | null;
  image_circle_mm?: number | null;
  optical_length_mm?: number | null;
  required_backfocus_mm?: number | null;
  flange_distance_mm?: number | null;
  optic_factor?: number | null;
  filter_thickness_mm?: number | null;
  prism_size_mm?: number | null;
  production_status?: string;
  data_confidence?: string | null;
  verified_at?: string | null;
}

/**
 * Yamayı doğrular.
 *
 * Sınırda doğrulama, veritabanı kısıtının önünde ikinci bir kapı değil —
 * kullanıcıya anlaşılır bir mesaj vermenin tek yolu. Kısıt ihlali
 * PostgREST'ten "violates check constraint" diye dönüyor ve yönetici
 * hangi alanın sorunlu olduğunu göremiyor.
 */
export function validatePatch(patch: EquipmentPatch): string | null {
  for (const key of ['connection_input', 'connection_output'] as const) {
    const value = patch[key];
    if (value && !isConnectionStandard(value)) {
      return `Bilinmeyen bağlantı standardı: ${value}. Listeden seçin.`;
    }
  }

  if (patch.optic_factor !== undefined && patch.optic_factor !== null) {
    if (!(patch.optic_factor > 0)) {
      return 'Çarpan sıfırdan büyük olmalı — sıfır çarpan etkin odağı sıfırlar.';
    }
  }

  const positives: (keyof EquipmentPatch)[] = [
    'clear_aperture_mm',
    'image_circle_mm',
    'optical_length_mm',
    'required_backfocus_mm',
    'flange_distance_mm',
    'filter_thickness_mm',
    'prism_size_mm',
  ];
  for (const key of positives) {
    const value = patch[key];
    if (typeof value === 'number' && value < 0) {
      return `${key} negatif olamaz.`;
    }
  }

  return null;
}

export const CONNECTION_OPTIONS = CONNECTION_LIST;

export async function updateEquipment(
  slug: string,
  patch: EquipmentPatch
): Promise<void> {
  const problem = validatePatch(patch);
  if (problem) throw new Error(problem);

  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  const supabase = await promise;

  /* Düzenleme yapıldığı için doğrulama tarihi bugüne çekiliyor: değerin
     ne zaman elden geçtiği, değerin kendisi kadar önemli. */
  const { error } = await supabase
    .from('equipment_models')
    .update({ ...patch, verified_at: patch.verified_at ?? today() })
    .eq('slug', slug);

  if (error) throw new Error(error.message);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
