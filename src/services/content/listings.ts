import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/services/supabase/client';
import {
  listings as listingsSeed,
  type Listing,
  type ListingCondition,
  type ListingStatus,
} from '@/features/marketplace/data';
/* Taksonomiden — kataloğun kendisi burada gerekmiyor ve onu çekmek
   ana sayfa paketine 80 kB ekliyordu (bkz. taxonomy.ts). */
import {
  equipmentCategoryOrder,
  type EquipmentCategory,
} from '@/features/equipment/taxonomy';
import { gradientFromSeed } from '@/components/media/tints';
import { sanitizeText } from '@/lib/sanitize';
import { threadSlug, slugSuffix } from './forum';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';
import { listingPhotoUrl } from '@/services/marketplace/photoUrl';

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
  seller_id?: string | null;
  slug: string;
  title: string;
  category_id: string;
  price: number | string;
  city: string;
  district: string | null;
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
  listing_photos:
    | { storage_path: string | null; position: number | null }[]
    | { storage_path: string | null; position: number | null }
    | null;
}

/* Tanınmayan durum `undefined` kalıyor: uydurulmuş bir "Yayında"
   etiketi, satıcıya ilanının göründüğünü söylemek olurdu. */
const LISTING_STATUSES: ListingStatus[] = [
  'draft',
  'active',
  'reserved',
  'sold',
  'archived',
];

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

function coverPhotoUrl(value: ListingRow['listing_photos']): string | undefined {
  const photos = (Array.isArray(value) ? value : value ? [value] : [])
    .filter((photo) => typeof photo.storage_path === 'string')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return listingPhotoUrl(photos[0]?.storage_path) ?? undefined;
}

export function mapListingRow(row: ListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id ?? undefined,
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
    district: row.district ?? undefined,
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
    imageUrl: coverPhotoUrl(row.listing_photos),
    status: LISTING_STATUSES.includes(row.status as ListingStatus)
      ? (row.status as ListingStatus)
      : undefined,
  };
}

const SELECT =
  'id, seller_id, slug, title, category_id, price, city, district, condition, has_invoice, ' +
  'shipping_ok, negotiable, description, includes, status, posted_at, ' +
  'profiles!listings_seller_id_profiles_fkey(username, display_name), ' +
  'equipment_models(slug), listing_photos(storage_path, position)';

/**
 * Pazaryeri listesine — ve dolayısıyla `/ilan/:slug` sayfasına — giren
 * durumlar.
 *
 * `sold` BURADA YOK, RLS'te VAR. Satır güvenliği satılmış ilanı okutuyor
 * (bkz. `listings_read`), ama katalog onu çekmiyor: pazaryeri satılmış
 * ilanla dolmasın. Sonuç: detay sayfası satılmış ilanı BULAMAZ, çünkü
 * sayfa kataloğun içinden arıyor.
 *
 * Dışa açık olmasının sebebi tam da bu: satıcının kendi listesinde
 * (`/panel/ilanlar`) hangi satırın tıklanabileceğine bu küme karar
 * veriyor. İki yerde iki ayrı liste tutmak, panelin kullanıcıyı 404'e
 * göndermesi demekti.
 */
export const PUBLIC_LISTING_STATUSES: ListingStatus[] = ['active', 'reserved'];

/** İlanın herkese açık detay sayfası var mı? */
export function isListingPubliclyVisible(status: ListingStatus | undefined) {
  /* Durumu okunamamış kayıt tıklanabilir sayılıyor: tohum ilanlarda durum
     yok ve onların sayfası var. Yanlış tarafa düşmek ölü bağlantı değil,
     yalnızca gereksiz bir tıklama. */
  return status === undefined || PUBLIC_LISTING_STATUSES.includes(status);
}

async function fetchListings(client: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await client
    .from('listings')
    .select(SELECT)
    .in('status', PUBLIC_LISTING_STATUSES)
    .order('posted_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data as unknown as ListingRow[]).map(mapListingRow);
}

export function useListings(): ContentSelection<Listing> {
  return useCatalog('ilan', listingsSeed, fetchListings);
}

/* ══════════════════════ Satıcının kendi ilanları ══════════════════════ */

export interface MyListingsState {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Oturum açmış kullanıcının KENDİ ilanları — her durumdan.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN `useListings` YETMİYOR
 *
 * İki fark var ve ikisi de bu ekranı imkânsız kılıyordu:
 *
 * 1. `fetchListings` yalnızca `active`/`reserved` çekiyor. Satıcı
 *    ilanını "satıldı" işaretlediği anda kendi listesinden de kaybolurdu
 *    — yani yanlışlıkla satıldı diyen biri geri dönemezdi. Burada durum
 *    süzgeci YOK; RLS zaten `seller_id = auth.uid()` satırlarını her
 *    durumda okutuyor.
 *
 * 2. `useCatalog` tablo boşken TOHUM veriye düşüyor. Herkese açık
 *    listede bu doğru (site boş görünmesin), burada felaket olurdu:
 *    kullanıcı hiç ilan vermemişken dört tane yabancı ilanı "senin
 *    ilanların" diye görürdü. Bu yüzden doğrudan sorgu.
 *
 * Supabase yapılandırılmamışsa boş liste döner — panelde "henüz ilan
 * yok" görünür, bu da doğrudur: yapılandırma olmadan ilan verilemez.
 */
export function useMyListings(userId: string | undefined): MyListingsState {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const clientPromise = userId ? getSupabase() : null;
    if (!userId || !clientPromise) {
      setListings([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    clientPromise
      .then(async (client) => {
        const { data, error: queryError } = await client
          .from('listings')
          .select(SELECT)
          .eq('seller_id', userId)
          .order('posted_at', { ascending: false })
          .limit(200);
        if (queryError) throw new Error(queryError.message);
        return (data as unknown as ListingRow[]).map(mapListingRow);
      })
      .then((rows) => {
        if (!active) return;
        setListings(rows);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setError(e instanceof Error ? e.message : 'İlanlar okunamadı');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { listings, loading, error, refresh };
}

/* ══════════════════════ Yazma ══════════════════════ */

export interface NewListingInput {
  title: string;
  category: EquipmentCategory;
  price: number;
  city: string;
  /** İlçe adı — isteğe bağlı; `DistrictSelect` kanonik yazımı veriyor. */
  district?: string;
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
    district: input.district
      ? sanitizeText(input.district, { maxLength: 60 })
      : null,
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
