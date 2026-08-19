import { getSupabase } from '@/services/supabase/client';

/**
 * ASSET TÜREV REGISTRY (X01) ve TÜREV TTL (X05).
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN BİR KAYIT DEFTERİ
 *
 * Türevler (display, thumb, feed, story) depoya yazılıyor ama hangisinin
 * hangi girdiden üretildiği hiçbir yerde yazmıyordu. Sonuç: bir türevin
 * güncel olup olmadığı ancak dosya adına bakılarak tahmin ediliyor,
 * yeniden üretilip üretilmeyeceği bilinemiyor ve temizlik yalnızca
 * "referans var mı" sorusuna indirgeniyordu.
 *
 * Registry üç soruyu cevaplıyor:
 *   · Bu fotoğrafın hangi türevleri var, nerede?
 *   · Bu türev hangi girdiden üretildi (`contentKey`) — yeniden üretmeye
 *     gerek var mı?
 *   · Ne zamana kadar durmalı (`expiresAt`) — sosyal çıktı yeniden
 *     üretilebilir, sonsuza kadar yer kaplamamalı (X05).
 *
 * ══════════════════════════════════════════════════════════════════════
 * KAYIT İKİNCİLDİR
 *
 * Türev üretimi ya da indirme, registry yazılamadı diye DURMUYOR: kayıt
 * bir muhasebe, işin kendisi değil. Hata yutuluyor ve türev yine
 * kullanıcıya gidiyor; eksik kayıt en kötü ihtimalle GC'nin o dosyayı
 * geç toplaması demek.
 */

export type DerivativeKind =
  | 'display'
  | 'thumb'
  | 'feed'
  | 'story'
  | 'annotated';

export interface DerivativeRecord {
  photoId: string;
  kind: DerivativeKind;
  storagePath: string;
  bucket?: string;
  /** Üretimi belirleyen girdi — kadraj damgası, içerik sürümü. */
  contentKey?: string;
  bytes?: number;
  width?: number;
  height?: number;
  /** Dolduğunda GC silebilir. Verilmezse kalıcı (display/thumb). */
  expiresAt?: Date | null;
}

/** Sosyal çıktıların ömrü — yeniden üretilebilir oldukları için sınırlı. */
export const SOCIAL_DERIVATIVE_TTL_DAYS = 30;

/** TTL gününü mutlak bir zamana çevirir. */
export function ttlFromNow(days: number, now = Date.now()): Date {
  return new Date(now + days * 24 * 60 * 60 * 1000);
}

/**
 * Türevi kaydeder (X01). Aynı yol ikinci kez kaydedilirse üzerine
 * yazılıyor — üretim idempotent, kayıt da öyle olmalı.
 */
export function recordDerivative(record: DerivativeRecord): void {
  const promise = getSupabase();
  if (!promise) return;
  void promise
    .then((supabase) =>
      supabase.from('asset_derivatives').upsert(
        {
          photo_id: record.photoId,
          kind: record.kind,
          bucket: record.bucket ?? 'photos',
          storage_path: record.storagePath,
          content_key: record.contentKey ?? null,
          bytes: record.bytes ?? null,
          width: record.width ?? null,
          height: record.height ?? null,
          expires_at: record.expiresAt ? record.expiresAt.toISOString() : null,
        },
        { onConflict: 'bucket,storage_path' }
      )
    )
    .catch(() => {
      /* Kayıt ikincil: türev yine kullanıcıya gidiyor. */
    });
}

/** Bir fotoğrafın kayıtlı türevleri — panel ve tanılama için. */
export async function fetchDerivatives(
  photoId: string
): Promise<DerivativeRecord[]> {
  const promise = getSupabase();
  if (!promise) return [];
  const supabase = await promise;
  const { data, error } = await supabase
    .from('asset_derivatives')
    .select('photo_id, kind, bucket, storage_path, content_key, bytes, width, height, expires_at')
    .eq('photo_id', photoId);
  if (error || !data) return [];
  return data.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      photoId: row.photo_id as string,
      kind: row.kind as DerivativeKind,
      bucket: (row.bucket as string) ?? 'photos',
      storagePath: row.storage_path as string,
      contentKey: (row.content_key as string) ?? undefined,
      bytes: (row.bytes as number) ?? undefined,
      width: (row.width as number) ?? undefined,
      height: (row.height as number) ?? undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    };
  });
}
