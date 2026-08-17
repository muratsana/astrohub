import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listings as listingsSeed,
  type Listing,
  type ListingCondition,
} from '@/features/marketplace/data';
import {
  equipmentCategoryOrder,
  type EquipmentCategory,
} from '@/features/equipment/taxonomy';
import { gradientFromSeed } from '@/components/media/tints';
import { useCatalog } from './useCatalog';
import type { ContentSelection } from './select';
import { listingPhotoUrl } from '@/services/marketplace/photoUrl';

interface RecentListingRow {
  id: string;
  seller_id?: string | null;
  slug: string;
  title: string;
  category_id: string;
  price: number | string;
  city: string;
  condition: string;
  posted_at: string | null;
  profiles: { username: string; display_name: string | null } | null;
  listing_photos:
    | { storage_path: string | null; position: number | null }[]
    | { storage_path: string | null; position: number | null }
    | null;
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

function coverPhotoUrl(
  value: RecentListingRow['listing_photos']
): string | undefined {
  const photos = (Array.isArray(value) ? value : value ? [value] : [])
    .filter((photo) => typeof photo.storage_path === 'string')
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return listingPhotoUrl(photos[0]?.storage_path) ?? undefined;
}

function mapRecentListingRow(row: RecentListingRow): Listing {
  return {
    id: row.id,
    sellerId: row.seller_id ?? undefined,
    slug: row.slug,
    title: row.title,
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
    hasInvoice: false,
    shippingOk: false,
    seller: {
      username: row.profiles?.username ?? 'bilinmiyor',
      verified: false,
      rating: 0,
    },
    postedAt: row.posted_at ?? '',
    gradient: gradientFromSeed(row.slug),
    imageUrl: coverPhotoUrl(row.listing_photos),
  };
}

const SELECT =
  'id, seller_id, slug, title, category_id, price, city, condition, posted_at, ' +
  'profiles!listings_seller_id_profiles_fkey(username, display_name), ' +
  'listing_photos(storage_path, position)';

async function fetchRecentListings(client: SupabaseClient): Promise<Listing[]> {
  const { data, error } = await client
    .from('listings')
    .select(SELECT)
    .eq('status', 'yayinda')
    /*
     * SİLİNMİŞ KAYIT PUBLIC LİSTEDE DURMAZ.
     *
     * RLS bunu tek başına halletmiyor ve bu bilinçli: okuma politikası
     * `app.icerik_gorunur(status, deleted_at)` YANINDA sahiplik ve rol
     * dallarını da taşıyor (`or seller_id = auth.uid() or app.is_admin()
     * or app.has_role('moderator')`) — sahibi kendi taslağını, yönetici
     * de her kaydı görebilsin diye. Sonuç olarak soft-delete edilmiş bir
     * kayıt, SAHİBİNE ve YÖNETİCİYE public sayfada görünmeye devam
     * ediyordu; panel ise aynı kayıt için "public'te görünmüyor" diyordu.
     *
     * Ziyaretçi için sızıntı yok (onda yalnızca `icerik_gorunur` dalı
     * çalışıyor), ama sahibi hangi ilanın canlı hangisinin silinmiş
     * olduğunu ayırt edemiyordu. Süzgeç bu yüzden sorguda.
     */
    .is('deleted_at', null)
    /* Satılmış ilan ana sayfa şeridinde görünmüyor (FAZ 3). */
    .neq('sale_state', 'satildi')
    .order('posted_at', { ascending: false })
    .limit(24);

  if (error) throw new Error(error.message);
  return (data as unknown as RecentListingRow[]).map(mapRecentListingRow);
}

export function useRecentListings(): ContentSelection<Listing> {
  return useCatalog('son-ilan', listingsSeed, fetchRecentListings);
}
