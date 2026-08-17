import { useCallback, useEffect, useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import type { GuideDocument, GuideSegment } from '@/domain/content/guide';
import { cn } from '@/lib/cn';
import {
  GUIDE_SEEDS,
  describeSegmentProblem,
  fetchGuideForEdit,
  fetchGuideStatuses,
  guideSeed,
  resetGuideToSeed,
  saveGuide,
  type GuideStatus,
} from './guidesAdmin';

/**
 * UZUN FORM REHBER DÜZENLEME.
 *
 * SNR, kutup ve drizzle rehberlerinin gövdeleri blok modeline sığmıyor
 * (üçü toplam 16 tablo, 11 infografik ve 12 canlı hesaplayıcı taşıyor),
 * o yüzden derleme öncesi üretilip kod olarak yaşıyorlardı. Sonuç:
 * yayındaki bir yazım hatasını düzeltmek depo değişikliği ve yeniden
 * dağıtım gerektiriyordu.
 *
 * Bu ekran gövdeyi BÖLÜM BÖLÜM açıyor. Zengin editör kullanılmıyor ve bu
 * bilinçli: TipTap içeriği kendi şemasına indirger, rehberdeki tabloları
 * ve infografikleri ilk kaydetmede öğütürdü. Burada düzenlenen şey ham
 * bölüm HTML'i — yazım hatası düzeltmek, sayı güncellemek, paragraf
 * değiştirmek için doğru araç.
 *
 * HESAPLAYICI BÖLÜMLERİ SALT OKUNUR. Onlar metin değil, React bileşenine
 * işaret eden yer tutucular; içeriği kodda yaşıyor.
 *
 * ŞEKİL DEĞİŞTİRMEK BU EKRANIN İŞİ DEĞİL. Gövdedeki grafikler üreticinin
 * jsdom içinde paketin kendi çizim kodunu koşturmasıyla üretiliyor; onlar
 * değişecekse `docs/<rehber>/standalone-kaynak.html` düzenlenip üretici
 * yeniden çalıştırılır. Ekranda bu yazıyor.
 */
export function GuideControl({ canWrite }: { canWrite: boolean }) {
  const [statuses, setStatuses] = useState<GuideStatus[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [slug, setSlug] = useState<string | null>(null);
  const [doc, setDoc] = useState<GuideDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const loadStatuses = useCallback(async () => {
    try {
      setStatuses(await fetchGuideStatuses());
      setListError(null);
    } catch (error) {
      setListError(
        error instanceof Error ? error.message : 'Rehber durumu okunamadı.'
      );
    }
  }, []);

  useEffect(() => {
    void loadStatuses();
  }, [loadStatuses]);

  async function open(next: string) {
    setBusy(true);
    setFormError(null);
    setNotice(null);
    setConfirmReset(false);
    try {
      const loaded = await fetchGuideForEdit(next);
      setSlug(next);
      setDoc(loaded);
      setDirty(false);
    } catch (error) {
      setSlug(next);
      setDoc(null);
      setFormError(
        error instanceof Error ? error.message : 'Rehber açılamadı.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!slug || !doc) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await saveGuide(slug, doc);
      setDirty(false);
      setNotice(
        'Rehber kaydedildi. Site artık bu sürümü çiziyor; koddaki sürüm tohum olarak duruyor.'
      );
      await loadStatuses();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Rehber kaydedilemedi.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (!slug) return;
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      await resetGuideToSeed(slug);
      const seed = guideSeed(slug);
      if (seed) setDoc({ toc: seed.toc, segments: seed.segments });
      setDirty(false);
      setConfirmReset(false);
      setNotice('Panel sürümü silindi; site koddaki sürüme döndü.');
      await loadStatuses();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Tohuma dönülemedi.'
      );
    } finally {
      setBusy(false);
    }
  }

  function updateSegment(index: number, html: string) {
    setDoc((current) => {
      if (!current) return current;
      const segments = current.segments.map((segment, i) =>
        i === index && segment.kind === 'html'
          ? ({ kind: 'html', html } as GuideSegment)
          : segment
      );
      return { ...current, segments };
    });
    setDirty(true);
  }

  const status = statuses.find((item) => item.slug === slug);
  const problems = doc
    ? doc.segments
        .map((segment, index) => ({
          index,
          problem: describeSegmentProblem(segment),
        }))
        .filter((item) => item.problem)
    : [];

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Bu rehberlerin gövdesi blok modeline sığmıyor; burada bölüm bölüm ham
        HTML düzenleniyor. Gövdedeki grafikler üretici betikle çiziliyor —
        onları değiştirmek için <code>docs/&lt;rehber&gt;/standalone-kaynak.html</code>{' '}
        düzenlenip <code>node scripts/&lt;rehber&gt;-icerik.mjs</code> çalıştırılır.
      </Alert>

      {listError && <Alert tone="danger">{listError}</Alert>}

      <div className="flex flex-wrap gap-1.5 rounded-card border border-border bg-surface-1 p-2">
        {GUIDE_SEEDS.map((seed) => {
          const s = statuses.find((item) => item.slug === seed.slug);
          return (
            <button
              key={seed.slug}
              type="button"
              onClick={() => void open(seed.slug)}
              className={cn(
                'flex items-center gap-2 rounded-card border px-3 py-1.5 text-meta transition-colors',
                slug === seed.slug
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              {seed.title}
              {s?.edited && <Badge tone="primary">Panelde</Badge>}
            </button>
          );
        })}
      </div>

      {!slug ? (
        <EmptyState
          message="Rehber seçin"
          hint="Üstteki sekmelerden bir rehbere tıklayın."
        />
      ) : (
        <Panel
          title={guideSeed(slug)?.title ?? slug}
          titleAs="h3"
          status={status?.edited ? 'Panel sürümü yayında' : 'Koddaki tohum yayında'}
        >
          <div className="space-y-3">
            {formError && <Alert tone="danger">{formError}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
            {problems.length > 0 && (
              <Alert tone="danger">
                {problems.length} bölümde izin verilmeyen desen var; kaydetme
                kapalı. İlki: bölüm {problems[0]!.index + 1} —{' '}
                {problems[0]!.problem}
              </Alert>
            )}

            {doc && (
              <>
                <p className="text-meta text-muted-foreground">
                  {doc.segments.length} bölüm ·{' '}
                  {doc.segments.filter((s) => s.kind === 'widget').length}{' '}
                  hesaplayıcı ·{' '}
                  <a
                    href={guideSeed(slug)?.path}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    yayındaki sayfayı aç
                  </a>
                </p>

                <ol className="space-y-3">
                  {doc.segments.map((segment, index) => (
                    <li key={index} className="rounded-card border border-border p-2.5">
                      <p className="label mb-1.5 text-muted-foreground">
                        Bölüm {index + 1}
                        {segment.kind === 'widget' && ' · hesaplayıcı'}
                      </p>
                      {segment.kind === 'widget' ? (
                        <p className="rounded-card border border-border bg-surface-2 px-2.5 py-2 text-meta text-muted-foreground">
                          <code>{segment.id}</code> — canlı hesaplayıcı, içeriği
                          kodda. Buradan düzenlenmiyor.
                        </p>
                      ) : (
                        <textarea
                          value={segment.html}
                          rows={10}
                          disabled={!canWrite || busy}
                          onChange={(event) =>
                            updateSegment(index, event.target.value)
                          }
                          className="w-full rounded-card border border-border bg-surface-1 px-2.5 py-2 font-mono text-caption leading-relaxed text-foreground outline-none focus:border-primary"
                        />
                      )}
                    </li>
                  ))}
                </ol>

                {canWrite && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy || !dirty || problems.length > 0}
                      onClick={() => void save()}
                    >
                      {busy ? 'Kaydediliyor…' : 'Kaydet'}
                    </Button>

                    {status?.edited &&
                      (confirmReset ? (
                        <>
                          <span className="text-meta text-danger">
                            Panel sürümü silinecek —
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void reset()}
                            className="text-meta text-danger underline"
                          >
                            tohuma dön
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmReset(false)}
                            className="text-meta text-muted-foreground"
                          >
                            vazgeç
                          </button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setConfirmReset(true)}
                        >
                          Tohuma dön
                        </Button>
                      ))}

                    {dirty && (
                      <span className="text-meta text-warning">
                        Kaydedilmemiş değişiklik var.
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      )}
    </div>
  );
}
