import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CloseIcon } from '@/components/ui/icons';
import { editableFields } from '@/features/home/hero/slides';
import { usePreviewEditor } from './PreviewEditorContext';
import { cn } from '@/lib/cn';

/**
 * ÖNİZLEME EDİTÖRÜ PANELİ — sağ kenarda açılan düzenleme çekmecesi.
 *
 * Hero'daki bir öğeye tıklandığında açılır ve o slaydın tüm metin alanlarını
 * gösterir; seçilen alan vurgulanır ve odak oraya taşınır. Değişiklikler
 * anında hero'ya yansır ve `localStorage`'da saklanır.
 *
 * Yalnızca önizleme derlemesinde render edilir (bkz. PreviewEditorContext)
 * ve yalnızca ana sayfada görünür: düzenlediği tek şey hero, diğer
 * sayfalarda sekme içeriğin üstüne binerdi.
 */
export function PreviewEditorPanel() {
  const {
    enabled,
    open,
    setOpen,
    slides,
    selection,
    select,
    updateField,
    reset,
    dirty,
  } = usePreviewEditor();

  const activeInputRef = useRef<HTMLInputElement>(null);

  // Seçim değişince ilgili alana odaklan — tıklayıp hemen yazmaya başlanır.
  useEffect(() => {
    if (open && selection) activeInputRef.current?.select();
  }, [open, selection]);

  const { pathname } = useLocation();

  // Editör yalnızca hero'yu düzenler — başka sayfada gösterilmez.
  if (!enabled || pathname !== '/') return null;

  const activeSlide =
    slides.find((s) => s.id === selection?.slideId) ?? slides[0];

  return (
    <>
      {/* Açma düğmesi — panel kapalıyken sağ kenarda durur */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-card border border-r-0 border-cold bg-surface-1 px-2 py-4 text-[10px] tracking-[0.04em] text-cold [writing-mode:vertical-rl] hover:bg-surface-2"
        >
          Önizleme editörü
        </button>
      )}

      <aside
        aria-label="Önizleme editörü"
        aria-hidden={!open}
        className={cn(
          'fixed right-0 top-0 z-50 flex h-dvh w-[min(360px,88vw)] flex-col',
          'border-l border-border-strong bg-surface-1 transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="label text-foreground">Önizleme Editörü</h2>
            <p className="mt-0.5 text-[10px] text-faint">
              Hero metinlerini canlı düzenle
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Paneli kapat"
            className="rounded-card border border-border p-1.5 text-muted-foreground hover:border-border-strong hover:text-foreground"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-border px-4 py-3">
          <p className="label mb-2">Slayt</p>
          <div className="flex flex-wrap gap-1.5">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() =>
                  select({ slideId: slide.id, field: 'title' })
                }
                aria-pressed={activeSlide.id === slide.id}
                className={cn(
                  'rounded-card border px-2.5 py-1 text-[10px] tracking-[0.03em] transition-colors',
                  activeSlide.id === slide.id
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
                )}
              >
                {String(i + 1).padStart(2, '0')} · {slide.badge}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!selection && (
            <p className="mb-4 rounded-card border border-cold/40 bg-surface-2 px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
              Hero üzerindeki bir metne tıkla — etiket, başlık, alt metin ya da
              butona. Alan burada açılır.
            </p>
          )}

          <div className="space-y-3">
            {editableFields.map((field) => {
              const isActive =
                selection?.slideId === activeSlide.id &&
                selection.field === field.key;
              const value = activeSlide[field.key];
              const isLong = field.key === 'subtitle' || field.key === 'title';

              return (
                <label
                  key={field.key}
                  className={cn(
                    'block rounded-card border p-2.5 transition-colors',
                    isActive
                      ? 'border-cold bg-surface-2'
                      : 'border-border bg-transparent'
                  )}
                >
                  <span className="label mb-1.5 block">{field.label}</span>

                  {isLong ? (
                    <textarea
                      ref={
                        isActive
                          ? (activeInputRef as unknown as React.RefObject<HTMLTextAreaElement>)
                          : undefined
                      }
                      value={value}
                      rows={field.key === 'subtitle' ? 3 : 2}
                      onFocus={() =>
                        select({ slideId: activeSlide.id, field: field.key })
                      }
                      onChange={(e) =>
                        updateField(activeSlide.id, field.key, e.target.value)
                      }
                      className="w-full resize-y rounded-card border border-border bg-surface-1 px-2.5 py-2 text-[12px] leading-relaxed text-foreground outline-none focus:border-primary"
                    />
                  ) : (
                    <Input
                      ref={isActive ? activeInputRef : undefined}
                      value={value}
                      onFocus={() =>
                        select({ slideId: activeSlide.id, field: field.key })
                      }
                      onChange={(e) =>
                        updateField(activeSlide.id, field.key, e.target.value)
                      }
                      className="h-9 text-[12px]"
                    />
                  )}

                  {field.key === 'ctaTo' && (
                    <span className="mt-1 block text-[10px] text-faint">
                      Site içi yol, ör. /galeri
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-[10px] leading-snug text-faint">
            {dirty ? 'Değişiklikler tarayıcında saklanıyor' : 'Kod değerleri'}
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={reset}
            disabled={!dirty}
          >
            Sıfırla
          </Button>
        </footer>
      </aside>
    </>
  );
}
