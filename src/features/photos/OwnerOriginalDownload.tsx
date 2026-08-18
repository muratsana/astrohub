import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { ownerOriginalDownloadUrl } from '@/services/photos/originalDownload';
import { indirmeAdi } from '@/domain/photography/indirmeAdi';
import type { AstroPhoto } from './types';

/**
 * SAHİBİN ORİJİNAL DOSYA İNDİRMESİ (X04).
 *
 * Yayımlanan gösterim kopyası herkese açık olabilir (indirme tercihi) ama
 * tam çözünürlük arşiv orijinali gizli kovada — yalnızca sahibi indirebilir.
 * Bu düğme indirme tercihinden BAĞIMSIZ: kaydın sahibi, kendi eserinin
 * orijinaline her zaman ulaşabilmeli (yerel kopyasını kaybederse tek yedek).
 * Adres kısa ömürlü imzalı; erişim veritabanı ve depo RLS'iyle sınırlı.
 */
export function OwnerOriginalDownload({ photo }: { photo: AstroPhoto }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const sahip = Boolean(user && photo.ownerId && photo.ownerId === user.id);
  if (!sahip || !photo.id) return null;

  async function indir() {
    setBusy(true);
    setHata(null);
    try {
      const ad = indirmeAdi([
        'astrohub',
        photo.target.catalog,
        photo.title,
        'orijinal',
      ]);
      const url = await ownerOriginalDownloadUrl(photo.id!, ad);
      if (!url) {
        setHata('Bu kayıt için arşivlenmiş orijinal bulunamadı.');
        return;
      }
      /* İmzalı adres Content-Disposition: attachment taşıyor; düz bir
         gezinme bile indirme başlatıyor. */
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setHata('İndirilemedi, yeniden deneyin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="label text-foreground">Orijinal dosya</h3>
          <p className="text-meta text-faint">
            Tam çözünürlük arşiv kopyanız — yalnızca size açık.
          </p>
        </div>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => void indir()}>
          {busy ? 'Hazırlanıyor…' : 'Orijinali indir'}
        </Button>
      </div>
      {hata && (
        <p className="mt-2 text-meta text-warning" role="status">
          {hata}
        </p>
      )}
    </div>
  );
}
