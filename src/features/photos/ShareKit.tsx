import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import {
  shareCaption,
  shareHashtags,
  type CaptionOptions,
} from '@/domain/photography/shareCaption';
import {
  renderShareImage,
  type ShareFormat,
} from '@/domain/photography/shareImage';
import { buildZip, type ZipEntry } from '@/domain/photography/zip';
import { annotatedBlob } from './annotatedExport';
import {
  cozumGeometrisi,
  useAlandakiCisimler,
} from '@/services/content/fieldObjects';
import { useAlandakiYildizlar } from '@/services/content/fieldStars';
import { logDownload } from '@/services/photos/downloadMetrics';
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
  const [filigran, setFiligran] = useState(true);
  const [gorselBusy, setGorselBusy] = useState<ShareFormat | 'zip' | null>(null);
  const [gorselHata, setGorselHata] = useState<string | null>(null);
  /* Kaynak: yayımlanan fotoğraf mı, alan çözümlü kopya mı (D11). */
  const [kaynak, setKaynak] = useState<'foto' | 'annotated'>('foto');

  const sahip = Boolean(user && photo.ownerId && photo.ownerId === user.id);

  const geometri = useMemo(() => cozumGeometrisi(photo.solve), [photo.solve]);
  const cozuldu = photo.solve.durum === 'cozuldu' && geometri !== null;
  /* Katalog verisi yalnızca annotated kaynak seçiliyken çekiliyor. */
  const { data: cisimler } = useAlandakiCisimler(
    geometri,
    cozuldu && kaynak === 'annotated'
  );
  const { data: yildizlar } = useAlandakiYildizlar(
    geometri,
    cozuldu && kaynak === 'annotated'
  );

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

  /* Blob → baytlar. `blob.arrayBuffer()` her ortamda yok (jsdom'da eksik);
     Response üzerinden okumak tarayıcıda da test ortamında da çalışıyor. */
  async function blobBytes(blob: Blob): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await new Response(blob).arrayBuffer());
  }

  function kaydet(blob: Blob, ad: string) {
    const adres = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = adres;
    a.download = ad;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(adres), 10_000);
  }

  function indir() {
    kaydet(
      new Blob([kunye], { type: 'text/plain;charset=utf-8' }),
      `astrohub-${photo.slug}-caption.txt`
    );
    logDownload('caption', photo.id);
  }

  /*
   * KAYNAK BLOB'U (D11). "foto" seçiliyse yayımlanan gösterim kopyası;
   * "annotated" seçiliyse alan çözümlü kopya BURADA çiziliyor (katalog
   * etiketleri, ölçek çubuğu, kuzey oku) — indirme menüsündeki aynı
   * annotatedBlob. Kaynak, üretilen tüm sosyal görsellerin girdisi.
   */
  async function kaynakBlob(): Promise<Blob> {
    const url = photo.image!.url;
    if (kaynak === 'annotated' && cozuldu) {
      return annotatedBlob({
        imageUrl: url,
        rotationDeg: photo.solve.rotationDeg,
        fieldWidthDeg: photo.solve.fieldWidthDeg,
        cisimler: cisimler ?? [],
        yildizlar: yildizlar ?? [],
        kunye: `astrohub.com.tr · ${photo.target.catalog} · @${photo.user.username}`,
      });
    }
    const yanit = await fetch(url);
    if (!yanit.ok) throw new Error('Görsel okunamadı.');
    return yanit.blob();
  }

  /* Sosyal görsel üretimi (D03, D04, D05, D13). Kaynak koyu zemine
     BOZULMADAN ortalanıyor; istenirse @kullanıcı adı filigranı. */
  async function gorselIndir(format: ShareFormat) {
    if (!photo.image?.url) return;
    setGorselBusy(format);
    setGorselHata(null);
    try {
      const blob = await renderShareImage(await kaynakBlob(), {
        format,
        watermark: filigran ? `@${photo.user.username}` : undefined,
      });
      if (!blob) throw new Error('Bu tarayıcı görseli işleyemedi.');
      kaydet(blob, `astrohub-${photo.slug}-${format}.jpg`);
      logDownload(format, photo.id);
    } catch (e) {
      setGorselHata(e instanceof Error ? e.message : 'Görsel üretilemedi.');
    } finally {
      setGorselBusy(null);
    }
  }

  /* TEK ZIP (D12): feed + story + caption.txt tek pakette. Kaynak bir kez
     çiziliyor, iki formata da o besleniyor — aynı görselin iki fetch'i
     olmuyor. */
  async function zipIndir() {
    if (!photo.image?.url) return;
    setGorselBusy('zip');
    setGorselHata(null);
    try {
      const kaynakVeri = await kaynakBlob();
      const watermark = filigran ? `@${photo.user.username}` : undefined;
      const feed = await renderShareImage(kaynakVeri, { format: 'feed', watermark });
      const story = await renderShareImage(kaynakVeri, { format: 'story', watermark });
      if (!feed || !story) throw new Error('Bu tarayıcı görseli işleyemedi.');
      const entries: ZipEntry[] = [
        { name: 'feed.jpg', data: await blobBytes(feed) },
        { name: 'story.jpg', data: await blobBytes(story) },
        {
          name: 'caption.txt',
          data: new TextEncoder().encode(kunye),
        },
      ];
      kaydet(
        new Blob([buildZip(entries)], { type: 'application/zip' }),
        `astrohub-${photo.slug}-paylasim.zip`
      );
      logDownload('zip', photo.id);
    } catch (e) {
      setGorselHata(e instanceof Error ? e.message : 'Paket üretilemedi.');
    } finally {
      setGorselBusy(null);
    }
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

          {photo.image?.url && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="label text-foreground">Sosyal görseller</span>
                <label className="flex items-center gap-1.5 text-meta text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={filigran}
                    onChange={(e) => setFiligran(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-surface-2 accent-primary"
                  />
                  @{photo.user.username} filigranı
                </label>
              </div>
              <p className="text-meta text-faint">
                Fotoğraf bozulmadan koyu zemine ortalanır — feed 4:5,
                story 9:16.
              </p>

              {/* Kaynak seçimi yalnızca alan çözümü hazırsa (D11). */}
              {cozuldu && (
                <div
                  role="radiogroup"
                  aria-label="Kaynak"
                  className="flex flex-wrap gap-3 text-meta text-muted-foreground"
                >
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="paylasim-kaynak"
                      checked={kaynak === 'foto'}
                      onChange={() => setKaynak('foto')}
                      className="accent-primary"
                    />
                    Fotoğraf
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="paylasim-kaynak"
                      checked={kaynak === 'annotated'}
                      onChange={() => setKaynak('annotated')}
                      className="accent-primary"
                    />
                    Alan çözümlü
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={gorselBusy !== null}
                  onClick={() => void gorselIndir('feed')}
                >
                  {gorselBusy === 'feed' ? 'Üretiliyor…' : 'Feed görseli (4:5)'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={gorselBusy !== null}
                  onClick={() => void gorselIndir('story')}
                >
                  {gorselBusy === 'story' ? 'Üretiliyor…' : 'Story görseli (9:16)'}
                </Button>
                <Button
                  size="sm"
                  disabled={gorselBusy !== null}
                  onClick={() => void zipIndir()}
                >
                  {gorselBusy === 'zip' ? 'Paketleniyor…' : 'Tek ZIP indir'}
                </Button>
              </div>
              {gorselHata && (
                <p className="text-meta text-warning" role="status">
                  {gorselHata}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
