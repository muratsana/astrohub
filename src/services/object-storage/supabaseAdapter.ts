import { requireSupabase } from '@/services/supabase/client';
import type {
  ObjectStorageAdapter,
  SignedUploadTarget,
  StorageBucket,
} from './types';

/**
 * Supabase Storage tabanlı adapter (MVP başlangıcı). Büyük medya hacmi
 * büyüyünce S3/R2/B2 adapter'ına geçiş bu arayüz sayesinde tek noktada olur
 * (§10.1). İstemci daima ObjectStorageAdapter arayüzüne bağımlıdır.
 */
export class SupabaseStorageAdapter implements ObjectStorageAdapter {
  async createSignedUploadUrl(
    bucket: StorageBucket,
    path: string,
    options?: { expiresIn?: number; contentType?: string }
  ): Promise<SignedUploadTarget> {
    const client = await requireSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) {
      throw new Error(`İmzalı yükleme URL'i alınamadı: ${error?.message}`);
    }
    return {
      url: data.signedUrl,
      path: data.path,
      expiresIn: options?.expiresIn ?? 3600,
    };
  }

  async createSignedDownloadUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn = 3600
  ): Promise<string> {
    const client = await requireSupabase();
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);
    if (error || !data) {
      throw new Error(`İmzalı indirme URL'i alınamadı: ${error?.message}`);
    }
    return data.signedUrl;
  }

  async getPublicUrl(bucket: StorageBucket, path: string): Promise<string> {
    const client = await requireSupabase();
    return client.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }

  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    const client = await requireSupabase();
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) throw new Error(`Nesne silinemedi: ${error.message}`);
  }
}
