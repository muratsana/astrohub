import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useAuth } from '@/features/auth/AuthContext';
import { ThumbnailKadraj } from '@/features/upload/ThumbnailKadraj';
import { VARSAYILAN_KADRAJ, type Kadraj } from '@/domain/profile/kadraj';
import {
  thumbPathFromUrl,
  updateThumbCrop,
} from '@/services/photos/thumbCrop';
import type { AstroPhoto } from './types';

/**
 * KART KADRAJINI YÜKLEMEDEN SONRA DÜZENLEME (C09).
 *
 * Yalnızca kaydın sahibine ve gerçek bir satıra bağlı fotoğrafa çiziliyor;
 * tohum kayıtlarda ve başkasının fotoğrafında hiç görünmüyor. Kaynak
 * gösterim kopyası (2048 px); açılınca bir kez getirilip hem önizlemeye
 * hem yeniden üretime veriliyor. Kaydetme yeni bir versiyonlu thumb yazıp
 * eskisini siliyor (thumbCrop servisi).
 */
export function ThumbCropEditor({
  photo,
  onSaved,
}: {
  photo: AstroPhoto;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [acik, setAcik] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kadraj, setKadraj] = useState<Kadraj>(
    photo.thumbCrop ?? VARSAYILAN_KADRAJ
  );
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sahip = Boolean(user && photo.ownerId && photo.ownerId === user.id);
  if (!sahip || !photo.id || !photo.image?.url) return null;

  async function ac() {
    setHata(null);
    setBusy(true);
    try {
      const yanit = await fetch(photo.image!.url);
      if (!yanit.ok) throw new Error('Görsel yüklenemedi.');
      setFile(
        new File([await yanit.blob()], 'kaynak.jpg', { type: 'image/jpeg' })
      );
      setKadraj(photo.thumbCrop ?? VARSAYILAN_KADRAJ);
      setAcik(true);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Görsel yüklenemedi.');
    } finally {
      setBusy(false);
    }
  }

  async function kaydet() {
    if (!photo.id || !user || !file) return;
    setBusy(true);
    setHata(null);
    try {
      await updateThumbCrop({
        photoId: photo.id,
        userId: user.id,
        sourceFile: file,
        kadraj,
        oldThumbPath: thumbPathFromUrl(photo.image?.thumbUrl),
      });
      setAcik(false);
      setFile(null);
      onSaved();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label text-foreground">Kart kadrajı</h3>
        {!acik && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => void ac()}>
            {busy ? 'Hazırlanıyor…' : 'Kart kadrajını düzenle'}
          </Button>
        )}
      </div>

      {acik && file && (
        <div className="mt-3 space-y-3">
          <ThumbnailKadraj file={file} kadraj={kadraj} onChange={setKadraj} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={() => void kaydet()}>
              {busy ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setAcik(false);
                setFile(null);
              }}
            >
              Vazgeç
            </Button>
          </div>
        </div>
      )}

      {hata && <Alert>{hata}</Alert>}
    </div>
  );
}
