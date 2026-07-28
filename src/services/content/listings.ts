import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase/client';
import {
  listings as listingsSeed,
  type Listing,
  type ListingCondition,
} from '@/features/marketplace/data';
import {
  equipmentCategoryOrder,
  type EquipmentCategory,
} from '@/features/equipment/data';
import { gradientFromSeed } from '@/components/media/tints';
import { sanitizeText } from '@/lib/sanitize';
import { threadSlug, slugSuffix } from './forum';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';

/**
 * İLANLAR — okuma ve yazma.
 *
 * Pazaryeri şeması başından beri vardı ama ilan **oluşturma** hiç
 * yazılmamıştı: sayfa dört tohum ilanı gösteriyor, kullanıcı kendi
 * ekipmanını satamıyordu. İlan veremeyen bir pazaryeri, katalog.
 *
 * TASLAK DEĞİL, DOĞRUDAN YAYINDA. Şema `draft` durumunu destekliyor ama
 * ilan verme akışında taslak aşaması yok: kullanıcı formu doldurup
 * gönderdiğinde ilan `active` oluyor. Taslak, sonradan "yayımla"
 * düğmesine basmayı gerektirir ve pratikte ilanların yarısı taslakta
 * kalır — satıcı verdiğini sanır, kimse göremez.
 *
 * SATILDI İŞARETİ SİLMEKTEN İYİ. İlan kaldırıldığında kayıt silinmiyor,
 * `sold` durumuna geçiyor: alıcı için fiyat geçmişi, satıcı için de
 * geçmiş satış sayısı orada kalıyor.
 */

interface ListingRow {
  id: string;
  slug: string;
  title: string;
  category_id: string;
  price: number | string;
  city: string;
  condition: string;
  has_invoice: boolean;
  shipping_ok: boolean;
  negotiable: boolean;
  description: string;
  includes: string[] | null;
  status: string;
  posted_at: string | null;
  profiles: { username: string; display_name: string | null } | null;
  equipment_models: { slug: string } | { slug: string }[] | null;
}

const CONDITIONS: ListingCondition[] = [
  'Sıfır gibi',
  'Çok iyi',
  'İyi',
  'Yıpranmış',
];

function num(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Gömülü tekil ilişki dizi olarak da gelebiliyor (bkz. useInventory). */
function embeddedSlug(value: unknown): string | undefined {
  const items = Array.isArray(value) ? value : [value];
  const slug = (items[0] as { slug?: unknown } | null)?.slug;
  return typeof slug === 'string' ? slug : undefined;
}

export function mapListingRow(row: ListingRow): Listing {
  return {
    slug: row.slug,
    title: row.title,
    /* Tanınmayan kategori ilanı listeden düşürmesin: filtre bir
       kolaylık, ilanın var olma şartı değil. İlk kategoriye çekiliyor. */
    category: (equipmentCategoryOrder.includes(
      row.category_id as EquipmentCategory
    )
      ? row.category_id
      : equipmentCategoryOrder[0]) as EquipmentCategory,
    price: num(row.price),
    city: row.city,
    condition: (CONDITIONS.includes(row.condition as ListingCondition)
      ? row.condition
      : 'İyi') as ListingCondition,
    hasInvoice: row.has_invoice,
    shippingOk: row.shipping_ok,
    negotiable: row.negotiable || undefined,
    seller: {
      username: row.profiles?.username ?? 'bilinmiyor',
      /* Doğrulama ve puan henüz ÜRETİLMİYOR. Tohum ilanlarda demo
         değerler var; veritabanı kaydında sıfır. Olmayan bir güven
         işaretini var göstermek, alıcıyı yanıltmanın en doğrudan yolu
         olurdu — arayüz 0 puanı "değerlendirme yok" olarak basıyor. */
      verified: false,
      rating: 0,
    },
    postedAt: row.posted_at ?? '',
    gradient: gradientFromSeed(row.slug),
    description: row.description || undefined,
    includes: row.includes && row.includes.length > 0 ? row.includes : undefined,
    equipmentSlug: embeddedSlug(row.equipment_models),
  };
}

const SELECT =
  'id, slug, title, category_id, price, city, condition, has_invoice, ' +
  'shipping_ok, negotiable, description, includes, status, posted_at, ' +
  'profiles!listings_seller_id_profiles_fkey(username, display_name), ' +
  'equipment_models(slug)';

async function fetchListings(client: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await client
    .from('listings')
    .select(SELECT)
    .in('status', ['active', 'reserved'])
    .order('posted_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data as unknown as ListingRow[]).map(mapListingRow);
}

export function useListings(): ContentSelection<Listing> {
  return useCatalog('ilan', listingsSeed, fetchListings);
}

/* ══════════════════════ Yazma ══════════════════════ */

export interface NewListingInput {
  title: string;
  category: EquipmentCategory;
  price: number;
  city: string;
  condition: ListingCondition;
  description: string;
  includes: string[];
  hasInvoice: boolean;
  shippingOk: boolean;
  negotiable: boolean;
  sellerId: string;
  /** Katalogdaki modelin slug'ı — künye ve alternatifler oradan gelir. */
  equipmentSlug?: string;
}

/**
 * Form doğrulaması.
 *
 * Sunucu tarafında kısıt yok (fiyat pozitifliği dışında), bu yüzden
 * burada duruyor. Amaç ilanı reddetmek değil, alıcının cevap
 * alabileceği bir ilan çıkmasını sağlamak: başlıksız ve açıklamasız bir
 * ilan mesaj trafiği üretir, satış üretmez.
 */
export function validateListing(input: NewListingInput): string | null {
  if (sanitizeText(input.title, { maxLength: 160 }).length < 8) {
    return 'Başlık en az 8 karakter olmalı — marka ve model yazın.';
  }
  if (!(input.price > 0)) {
    return 'Fiyat sıfırdan büyük olmalı.';
  }
  if (input.price > 10_000_000) {
    return 'Fiyat çok yüksek görünüyor; kuruş yerine lira girdiğinizden emin olun.';
  }
  if (input.city.trim().length < 2) {
    return 'Şehir gerekli — alıcı elden teslim olup olmadığını bilmek ister.';
  }
  if (sanitizeText(input.description, { multiline: true }).length < 20) {
    return 'Açıklama çok kısa. Kullanım süresi, kutu/fatura durumu ve varsa kusurlar yazılmadan ilan soru yağmuruna tutulur.';
  }
  return null;
}

async function client(): Promise<SupabaseClient> {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/** İlanı yayımlar ve slug'ını döndürür. */
export async function createListing(input: NewListingInput): Promise<string> {
  const problem = validateListing(input);
  if (problem) throw new Error(problem);

  const supabase = await client();
  const title = sanitizeText(input.title, { maxLength: 160 });
  const slug = threadSlug(title, slugSuffix());

  /* Katalog modeli seçildiyse kimliğini çözüyoruz: ilan detayında
     teknik künye ve "benzer modeller" oradan geliyor. Bulunamazsa ilan
     yine de yayımlanıyor — katalogda olmayan bir ürün satılamaz değil. */
  let modelId: string | null = null;
  if (input.equipmentSlug) {
    const { data } = await supabase
      .from('equipment_models')
      .select('id')
      .eq('slug', input.equipmentSlug)
      .maybeSingle();
    modelId = (data as { id: string } | null)?.id ?? null;
  }

  const { error } = await supabase.from('listings').insert({
    slug,
    seller_id: input.sellerId,
    title,
    category_id: input.category,
    model_id: modelId,
    price: input.price,
    city: sanitizeText(input.city, { maxLength: 60 }),
    condition: input.condition,
    has_invoice: input.hasInvoice,
    shipping_ok: input.shippingOk,
    negotiable: input.negotiable,
    description: sanitizeText(input.description, {
      multiline: true,
      maxLength: 5000,
    }),
    includes: input.includes
      .map((line) => sanitizeText(line, { maxLength: 120 }))
      .filter(Boolean),
    status: 'active',
    posted_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return slug;
}

/**
 * İlanı satıldı olarak işaretler.
 *
 * Silmiyoruz: fiyat geçmişi alıcı için, satış sayısı satıcı için değerli.
 * RLS yalnızca ilan sahibine ve moderatöre izin veriyor.
 */
export async function markListingSold(slug: string): Promise<void> {
  const supabase = await client();
  const { error } = await supabase
    .from('listings')
    .update({ status: 'sold', sold_at: new Date().toISOString() })
    .eq('slug', slug);

  if (error) throw new Error(error.message);
}
