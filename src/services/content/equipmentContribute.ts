import { getSupabase } from '@/services/supabase/client';
import { sanitizeText } from '@/lib/sanitize';
import { brandSlug, type EquipmentCategory } from '@/features/equipment/data';

/**
 * KATALOGDA OLMAYAN EKİPMANI EKLEME.
 *
 * Piyasada binlerce model var ve editör kataloğu asla tam olmayacak.
 * Katalogda modelini bulamayan kullanıcı künyeyi eksik bırakmak zorunda
 * kalıyordu; artık kendisi ekleyebiliyor.
 *
 * KAYIT ONAYSIZ BAŞLAR. `approved = false` ve RLS gereği yalnızca ekleyene
 * görünür (0013). Onaysız bir katkının herkese açık katalogda belirmesi,
 * kataloğun güvenilirliğini ilk yanlış girişte bitirirdi. Kullanıcı kendi
 * kaydını kullanabilir — künyesinde görünür — ama başkası göremez.
 *
 * MARKA DA EKLENEBİLİR. Model yeni bir markaya aitse marka kaydı da
 * onaysız açılır; aksi hâlde "markası olmayan model" diye bir boşluk
 * kalırdı ve kullanıcı yine tıkanırdı.
 */

export interface ContributionInput {
  brand: string;
  model: string;
  category: EquipmentCategory;
  /** Serbest spec alanları — typed kolona ayrıştırma editör onayında. */
  specs?: Record<string, string>;
  userId: string;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/** Model slug'ı: marka + model, çakışmayı önlemek için kısa ek ile. */
export function contributionSlug(brand: string, model: string): string {
  const base = `${brandSlug(brand)}-${brandSlug(model)}`.slice(0, 70);
  const suffix = Math.floor(Math.random() * 46656).toString(36);
  return `${base || 'model'}-${suffix}`;
}

export function validateContribution(
  input: Pick<ContributionInput, 'brand' | 'model'>
): string | null {
  if (input.brand.trim().length < 2) return 'Marka en az 2 karakter olmalı.';
  if (input.model.trim().length < 2) return 'Model adı en az 2 karakter olmalı.';
  return null;
}

export interface Contribution {
  slug: string;
  brand: string;
  model: string;
  category: EquipmentCategory;
}

export async function contributeEquipment(
  input: ContributionInput
): Promise<Contribution> {
  const problem = validateContribution(input);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const brand = sanitizeText(input.brand, { maxLength: 80 }).trim();
  const model = sanitizeText(input.model, { maxLength: 120 }).trim();
  const brandId = brandSlug(brand);

  /*
   * Marka önce: model satırı markaya yabancı anahtarla bağlı ve olmayan
   * bir markaya insert doğrudan reddedilir. `on conflict do nothing`
   * marka zaten varsa sessizce geçiyor — mevcut bir markayı onaysıza
   * çevirmemek için `do update` KULLANILMIYOR.
   */
  const { error: brandError } = await supabase
    .from('equipment_brands')
    .upsert(
      { id: brandId, name: brand, submitted_by: input.userId, approved: false },
      { onConflict: 'id', ignoreDuplicates: true }
    );
  if (brandError) throw new Error(brandError.message);

  const slug = contributionSlug(brand, model);
  const { error } = await supabase.from('equipment_models').insert({
    slug,
    brand_id: brandId,
    category_id: input.category,
    model,
    specs: input.specs ?? {},
    submitted_by: input.userId,
    approved: false,
  });

  if (error) throw new Error(error.message);

  return { slug, brand, model, category: input.category };
}
