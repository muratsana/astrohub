import { getSupabase } from '@/services/supabase/client';

/**
 * İNDİRME / EXPORT ÖLÇÜMÜ (X06).
 *
 * Bir indirme/export gerçekleştiğinde `download_events`e bir satır ekliyor.
 * ATEŞLE-VE-UNUT: indirmenin kendisini asla bloke etmiyor ve hata yutuluyor
 * — bir sayacın yazılamaması kullanıcının dosyasını almasına engel olamaz.
 * Kullanıcı kimliği yazılmıyor (gizlilik); yalnızca ne indirildiği.
 */
export type DownloadKind =
  | 'foto'
  | 'annotated'
  | 'original'
  | 'caption'
  | 'feed'
  | 'story'
  | 'zip';

export function logDownload(kind: DownloadKind, photoId?: string): void {
  const promise = getSupabase();
  if (!promise) return;
  void promise
    .then((supabase) =>
      supabase.from('download_events').insert({ kind, photo_id: photoId ?? null })
    )
    .catch(() => {
      /* Ölçüm ikincil: yazılamazsa sessizce geçiliyor. */
    });
}
