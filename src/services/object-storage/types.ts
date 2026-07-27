/**
 * Nesne depolama soyutlaması (§10.1). Depolama sağlayıcısı (R2/B2/S3/Supabase
 * Storage) kod içinde doğrudan kullanılmaz; bu adapter üzerinden erişilir.
 * Böylece sağlayıcı değişimi tek noktada yönetilir.
 */

/** Bucket/container kimlikleri (§10.2). */
export type StorageBucket =
  | 'astro-originals' // özel: orijinal yayımlama dosyası
  | 'astro-derived' // CDN/public: AVIF/WebP varyantları
  | 'astro-upload-staging' // özel/geçici: tamamlanmamış yüklemeler
  | 'avatars'
  | 'event-media'
  | 'site-media'
  | 'equipment-media'
  | 'listing-media'
  | 'learning-media'
  | 'processing-datasets';

export interface SignedUploadTarget {
  /** İstemcinin doğrudan dosya yükleyeceği URL. */
  url: string;
  /** Yüklemeden sonra nesneye erişim için kalıcı yol/anahtar. */
  path: string;
  /** URL geçerlilik süresi (saniye). */
  expiresIn: number;
}

export interface ObjectStorageAdapter {
  /**
   * İstemci tarafı doğrudan yükleme için imzalı URL üretir (§10.3).
   * Orijinal dosyalar uygulama sunucusundan geçirilmez.
   */
  createSignedUploadUrl(
    bucket: StorageBucket,
    path: string,
    options?: { expiresIn?: number; contentType?: string }
  ): Promise<SignedUploadTarget>;

  /** Özel nesneler için süreli okuma URL'i (orijinaller public değildir — §10.4). */
  createSignedDownloadUrl(
    bucket: StorageBucket,
    path: string,
    expiresIn?: number
  ): Promise<string>;

  /**
   * Public bucket'lar için kalıcı CDN URL'i.
   * Sağlayıcı SDK'sı tembel yüklendiği için imza asenkrondur.
   */
  getPublicUrl(bucket: StorageBucket, path: string): Promise<string>;

  /** Nesneyi siler (lifecycle/temizlik — §10.8). */
  remove(bucket: StorageBucket, paths: string[]): Promise<void>;
}
