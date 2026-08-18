import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import {
  shareCaption,
  shareHashtags,
  type CaptionOptions,
} from '@/domain/photography/shareCaption';
import type { AstroPhoto } from './types';

/**
 * PAYLAŞIM KİTİ — sahibe özel, sosyal gönderiye hazır künye (D01, D02,
 * D06–D10, D14).
 *
 * Yalnızca kaydın sahibine çiziliyor (D01): başkasının fotoğrafı için
 * "paylaşım kiti" bir anlam taşımıyor ve künyede @kullanıcı adı sahibinki.
 * "Hazırla" bir kez açıyor (D02); künye, seçilen alanlara göre canlı
 * güncelleniyor.
 *
 * Görsel çıktılar (feed/story) ayrı bir bileşende; bu bileşen künye
 * tarafını taşıyor — tek tık kopyala (D08) ve caption.txt indir (D09).
 */
export function ShareKit({ photo }: { photo: AstroPhoto }) {
  const { user } = useAuth();
  const [acik, setAcik] = useState(false);
  const [secenekler, setSecenekler] = useState<CaptionOptions>({});
  const [not, setNot] = useState('');
  const [kopyalandi, setKopyalandi] = useState(false);

  const sahip = Boolean(user && photo.ownerId && photo.ownerId === user.id);

  const kunye = useMemo(() => {
    const govde = shareCaption(
      {
        target: photo.target,
        exposures: photo.exposures,
        palette: photo.palette,
        captureSessions: photo.captureSessions,
        capturedAt: photo.capturedAt,
        setup: photo.setup,
        location: {
          label: photo.location.label,
          visibility: photo.location.visibility,
        },
        username: photo.user.username,
      },
      { ...secenekler, note: not }
    );
    return `${govde}\n\n${shareHashtags({
      target: photo.target,
      exposures: photo.exposures,
      palette: photo.palette,
      setup: photo.setup,
      location: photo.location,
      username: photo.user.username,
    })}`;
  }, [photo, secenekler, not]);

  if (!sahip) return null;

  function toggle(alan: keyof CaptionOptions) {
    setSecenekler((s) => ({
      ...s,
      [alan]: s[alan] === false ? true : false,
    }));
    setKopyalandi(false);
  }

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(kunye);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    } catch {
      setKopyalandi(false);
    }
  }

  function indir() {
    const blob = new Blob([kunye], { type: 'text/plain;charset=utf-8' });
    const adres = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = adres;
    a.download = `astrohub-${photo.slug}-caption.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(adres), 10_000);
  }

  return (
    <div className="mt-4 rounded-card border border-border bg-surface-1 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="label text-foreground">Paylaşım kiti</h3>
        {!acik && (
          <Button size="sm" variant="secondary" onClick={() => setAcik(true)}>
            Paylaşım kiti hazırla
          </Button>
        )}
      </div>

      {acik && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-3 text-meta text-muted-foreground">
            {(
              [
                ['dates', 'Tarihler'],
                ['equipment', 'Ekipman'],
                ['location', 'Konum'],
                ['handle', 'Kullanıcı adı'],
              ] as [keyof CaptionOptions, string][]
            ).map(([alan, etiket]) => (
              <label key={alan} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={secenekler[alan] !== false}
                  onChange={() => toggle(alan)}
                  className="h-4 w-4 rounded border-border bg-surface-2 accent-primary"
                />
                {etiket}
              </label>
            ))}
          </div>

          <label className="block">
            <span className="label mb-1 block text-foreground">Not (isteğe bağlı)</span>
            <Input
              value={not}
              onChange={(e) => {
                setNot(e.target.value);
                setKopyalandi(false);
              }}
              placeholder="İlk SHO denemem…"
            />
          </label>

          <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-card border border-border bg-surface-2 p-3 text-body-sm text-foreground">
            {kunye}
          </pre>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void kopyala()}>
              {kopyalandi ? 'Kopyalandı ✓' : 'Künyeyi kopyala'}
            </Button>
            <Button size="sm" variant="secondary" onClick={indir}>
              caption.txt indir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
