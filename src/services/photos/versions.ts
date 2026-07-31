import { getSupabase } from '@/services/supabase/client';
import { renderResized, DISPLAY_MAX_EDGE } from '@/domain/photography/resize';
import { checkImageFormat, readHead } from '@/domain/photography/fileType';
import { sanitizeText } from '@/lib/sanitize';
import type { VersionKind } from '@/domain/photography/versions';

/**
 * İŞLEME REVİZYONU YÜKLEME.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NEDEN AYRI BİR AKIŞ, YENİ BİR FOTOĞRAF DEĞİL
 *
 * Aynı kaydın ikinci bir işlemesi YENİ BİR FOTOĞRAF DEĞİL: aynı gece,
 * aynı ekipman, aynı ham veri. Onu ayrı bir fotoğraf olarak yüklemek üç
 * şeyi bozardı — galeride aynı kare iki kez görünür, kota iki birim
 * yenir (§4.2 tam tersini söylüyor), ve "hangisi güncel" sorusunun
 * cevabı kalmaz.
 *
 * Sürüm olarak yüklenince üçü de çözülüyor: tek kart, tek kota birimi,
 * ve sürgüde yan yana karşılaştırılabilir bir geçmiş.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ARŞİV KOPYASI YOK
 *
 * Ana fotoğrafta ham dosya gizli bucket'a da yazılıyor (§10.2). Sürümde
 * yazılmıyor ve bu bilinçli: revizyon zaten İŞLENMİŞ bir çıktı, ham veri
 * değil. Her revizyonun 10 MB'lık arşivini tutmak, aynı gecenin ham
 * verisini beş kez saklamak olurdu.
 */

export interface VersionInput {
  photoId: string;
  userId: string;
  file: File;
  label: string;
  kind: VersionKind;
  note?: string;
  palette?: string;
}

export interface VersionResult {
  versionId: string;
  storagePath: string;
  width: number;
  height: number;
}

async function client() {
  const promise = getSupabase();
  if (!promise) throw new Error('Veritabanı bağlantısı yapılandırılmamış');
  return promise;
}

/**
 * Sürüm görselinin depolama yolu.
 *
 * Ana fotoğrafın klasörünün ALTINDA duruyor (`<user>/<photo>/…`) çünkü
 * storage politikası ilk klasör dilimine bakıyor (0012): yolu başka bir
 * yere koymak, sahibin kendi dosyasına erişememesi demekti.
 */
export function versionStoragePath(
  userId: string,
  photoId: string,
  versionId: string
): string {
  return `${userId}/${photoId}/v-${versionId}.jpg`;
}

/**
 * Yeni bir işleme sürümü yükler.
 *
 * SIRA: satır → dosya → yol. Fotoğraf akışıyla aynı gerekçe — yol
 * kimlikten türüyor, dolayısıyla satır önce açılmak zorunda. Dosya
 * yüklenemezse satır siliniyor; aksi halde panelde görseli olmayan bir
 * sürüm satırı kalırdı ve sürgü onu seçtiğinde boş bir kare çizerdi.
 */
export async function uploadVersion(
  input: VersionInput
): Promise<VersionResult> {
  const format = checkImageFormat(await readHead(input.file), input.file.type);
  if (format.kind === 'reject') throw new Error(format.reason);

  const supabase = await client();

  /*
   * SIRA NUMARASI MEVCUT SÜRÜMLERİN SONUNA. `position` tarihten değil
   * sayaçtan geliyor: aynı gün iki revizyon yüklenirse tarih ikisini
   * ayırmaz ve sürgü rastgele bir sıraya düşerdi.
   */
  const { data: mevcut, error: countError } = await supabase
    .from('photo_versions')
    .select('position')
    .eq('photo_id', input.photoId)
    .order('position', { ascending: false })
    .limit(1);

  if (countError) throw new Error(countError.message);
  const position =
    ((mevcut?.[0] as { position: number } | undefined)?.position ?? -1) + 1;

  const { data: created, error: insertError } = await supabase
    .from('photo_versions')
    .insert({
      photo_id: input.photoId,
      label: sanitizeText(input.label, { maxLength: 80 }),
      kind: input.kind,
      note: sanitizeText(input.note ?? '', { multiline: true, maxLength: 500 }),
      palette: input.palette ?? null,
      position,
    })
    .select('id')
    .single();

  if (insertError) throw new Error(insertError.message);
  const versionId = (created as { id: string }).id;

  try {
    const display = await renderResized(input.file, DISPLAY_MAX_EDGE);
    if (!display) {
      throw new Error(
        format.kind === 'risky'
          ? format.reason
          : 'Görsel bu tarayıcıda işlenemedi. JPEG ya da PNG deneyin.'
      );
    }

    const storagePath = versionStoragePath(
      input.userId,
      input.photoId,
      versionId
    );

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(storagePath, display.blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { error: updateError } = await supabase
      .from('photo_versions')
      .update({ storage_path: storagePath })
      .eq('id', versionId);

    if (updateError) throw new Error(updateError.message);

    return {
      versionId,
      storagePath,
      width: display.size.width,
      height: display.size.height,
    };
  } catch (cause) {
    /*
     * Görselsiz bir sürüm satırı bırakmıyoruz. Temizlik hatası
     * yutuluyor: kullanıcıya gösterilecek olan asıl hata, temizlik
     * hatası değil.
     */
    try {
      await supabase.from('photo_versions').delete().eq('id', versionId);
    } catch (temizlik) {
      console.error('geri alma: sürüm satırı silinemedi', temizlik);
    }
    throw cause;
  }
}

/**
 * Sürümü hem tablodan hem depodan siler.
 *
 * İLK SÜRÜM SİLİNEMEZ diye bir kural YOK ve olmamalı: kullanıcı ilk
 * işlemesini kaldırmak isteyebilir. Ama son kalan sürümü silmek, sürüm
 * geçmişini boşaltmaktan başka bir şey yapmaz — çağıran taraf o durumu
 * kendisi engelliyor (arayüzde düğme çizilmiyor).
 */
export async function deleteVersion(
  versionId: string,
  storagePath: string | null
): Promise<void> {
  const supabase = await client();

  const { error } = await supabase
    .from('photo_versions')
    .delete()
    .eq('id', versionId);
  if (error) throw new Error(error.message);

  if (!storagePath) return;
  try {
    await supabase.storage.from('photos').remove([storagePath]);
  } catch (cause) {
    console.error('sürüm görseli silinemedi', cause);
  }
}
