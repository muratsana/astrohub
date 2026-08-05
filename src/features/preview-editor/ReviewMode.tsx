import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { CloseIcon } from '@/components/ui/icons';
import { isPreviewEditorEnabled } from './PreviewEditorContext';
import {
  elementKey,
  elementLabel,
  newId,
  notesToMarkdown,
  readNotes,
  writeNotes,
  type ReviewNote,
} from './reviewStore';

/**
 * İNCELEME MODU — sayfanın herhangi bir öğesini seç, düzenle, not bırak.
 *
 * ══════════════════════════════════════════════════════════════════════
 * NE İŞE YARIYOR
 *
 * Tasarım/metin gözden geçirmesi sırasında "şu başlık uzun", "bu düğme
 * yanlış yerde", "burada 'Araçlar' yerine 'Hesaplayıcılar' yazsak" gibi
 * kararlar ekranın karşısında veriliyor ama başka bir yere — bir belgeye,
 * bir mesaja — yazılıyor. Sonra o notu okuyan kişi hangi öğeden
 * bahsedildiğini aramakla uğraşıyor.
 *
 * Bu mod notu ÖĞENİN ÜSTÜNDE bırakıyor: tıkla, yaz, listede dursun. Metin
 * düzenlemesi de aynı yerde — önerilen metni yazıp sonucun nasıl durduğunu
 * hemen görüyorsun.
 *
 * ══════════════════════════════════════════════════════════════════════
 * ÜRÜN ÖZELLİĞİ DEĞİL
 *
 * Yalnızca önizleme derlemesinde açık (`VITE_PREVIEW_EDITOR`). Üretim
 * derlemesinde bu dosya ayrı bir chunk'ta kalıyor ve hiç istenmiyor —
 * ziyaretçiye inen pakete girmiyor.
 *
 * ══════════════════════════════════════════════════════════════════════
 * DÜZENLEME KODU DEĞİŞTİRMEZ
 *
 * Metin değişikliği yalnızca tarayıcıda yaşıyor. Amaç kararı görmek;
 * kodu değiştirmek dışa aktarılan listeyi okuyan kişinin işi. Bunu
 * otomatik yapmak, gözden geçirme sırasında denenen her fikri koda
 * yazmak olurdu.
 */

/** Seçilebilir öğe etiketleri — kapsayıcılar değil, içerik taşıyanlar. */
const SELECTABLE =
  'h1, h2, h3, h4, p, li, a, button, span, td, th, label, summary, figcaption, dt, dd';

interface Selected {
  element: HTMLElement;
  key: string;
  label: string;
  original: string;
  rect: DOMRect;
}

export function ReviewMode() {
  const { pathname } = useLocation();
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(true);
  const [notes, setNotes] = useState<ReviewNote[]>(() => readNotes());
  const [selected, setSelected] = useState<Selected | null>(null);
  const [draft, setDraft] = useState('');
  const [replacement, setReplacement] = useState('');
  const [copied, setCopied] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const yorumRef = useRef<HTMLTextAreaElement>(null);

  const persist = useCallback((next: ReviewNote[]) => {
    setNotes(next);
    writeNotes(next);
  }, []);

  /* Rota değişince seçim düşüyor: başka sayfadaki bir öğeyi seçili
     göstermek, panelin neyi düzenlediğini belirsiz bırakırdı. */
  useEffect(() => {
    setSelected(null);
    setDraft('');
    setReplacement('');
  }, [pathname]);

  /*
   * ÖĞE SEÇİMİ — yakalama fazında dinleniyor.
   *
   * `capture: true` şart: seçilen öğelerin çoğu bağlantı ya da düğme ve
   * normal fazda dinleseydik tıklama önce onların kendi işleyicisine
   * gider, sayfa değişir, seçim hiç oluşmazdı.
   */
  useEffect(() => {
    if (!active) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      /* Panelin kendi içindeki tıklamalar seçim değil. */
      if (panelRef.current?.contains(target)) return;

      const element = target.closest<HTMLElement>(SELECTABLE);
      if (!element) return;

      event.preventDefault();
      event.stopPropagation();

      const original = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
      const key = elementKey(pathname, element);
      setSelected({
        element,
        key,
        label: elementLabel(element),
        original,
        rect: element.getBoundingClientRect(),
      });
      const mevcut = notes.find((n) => n.target === key);
      setDraft(mevcut?.text ?? '');
      setReplacement(mevcut?.replacement ?? original);
      setOpen(true);
      window.setTimeout(() => yorumRef.current?.focus(), 0);
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [active, pathname, notes]);

  /* Seçim çerçevesi sayfa kaydırılınca da öğenin üstünde kalmalı. */
  useEffect(() => {
    if (!selected) return;
    const guncelle = () =>
      setSelected((current) =>
        current ? { ...current, rect: current.element.getBoundingClientRect() } : null
      );
    window.addEventListener('scroll', guncelle, true);
    window.addEventListener('resize', guncelle);
    return () => {
      window.removeEventListener('scroll', guncelle, true);
      window.removeEventListener('resize', guncelle);
    };
  }, [selected]);

  /* Escape seçimi bırakıyor — moddan çıkmıyor. İkisini aynı tuşa
     bağlamak, yanlışlıkla modu kapatıp notu kaybetmek demekti. */
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selected) setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, selected]);

  const kaydet = useCallback(() => {
    if (!selected) return;
    const degisti = replacement.trim() !== selected.original;
    if (!draft.trim() && !degisti) return;

    const mevcut = notes.find((n) => n.target === selected.key);
    const note: ReviewNote = {
      id: mevcut?.id ?? newId(),
      route: pathname,
      target: selected.key,
      targetLabel: selected.label,
      text: draft,
      replacement: degisti ? replacement.trim() : null,
      original: selected.original,
      createdAt: mevcut?.createdAt ?? new Date().toISOString(),
      done: mevcut?.done ?? false,
    };

    /* Metin değişikliği ANINDA uygulanıyor — "nasıl durur" sorusunun
       cevabı ancak öğe gerçekten değişince görülür. */
    if (degisti) selected.element.textContent = replacement.trim();

    persist([...notes.filter((n) => n.id !== note.id), note]);
    setSelected(null);
  }, [selected, draft, replacement, notes, pathname, persist]);

  const kopyala = useCallback(async () => {
    const metin = notesToMarkdown(notes);
    try {
      await navigator.clipboard.writeText(metin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Pano izni yoksa metni seçilebilir bırakmak tek çare. */
      window.prompt('Notları kopyalayın:', metin);
    }
  }, [notes]);

  const buSayfa = useMemo(
    () => notes.filter((n) => n.route === pathname),
    [notes, pathname]
  );

  if (!isPreviewEditorEnabled) return null;

  return (
    <>
      {/* Seçim çerçevesi — tıklanabilir DEĞİL, altındaki öğeyi engellemesin. */}
      {active && selected && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] border-2 border-primary"
          style={{
            left: selected.rect.left - 2,
            top: selected.rect.top - 2,
            width: selected.rect.width + 4,
            height: selected.rect.height + 4,
          }}
        />
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/3 z-[61] -translate-y-1/2 rounded-l-card border border-r-0 border-primary bg-surface-1 px-2 py-4 text-meta tracking-[0.04em] text-primary [writing-mode:vertical-rl] hover:bg-surface-2"
        >
          İnceleme{notes.length > 0 ? ` (${notes.length})` : ''}
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="fixed inset-y-0 right-0 z-[61] flex w-[min(24rem,100vw)] flex-col border-l border-border-strong bg-background"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <h2 className="type-panel min-w-0 flex-1 truncate text-foreground">
              İnceleme
            </h2>
            <Button
              size="sm"
              variant={active ? 'primary' : 'secondary'}
              onClick={() => {
                setActive((v) => !v);
                setSelected(null);
              }}
            >
              {active ? 'Seçim açık' : 'Öğe seç'}
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="İnceleme panelini kapat"
              className="grid h-9 w-9 place-items-center text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!active && !selected && (
              <p className="border-b border-border px-4 py-3 text-meta leading-relaxed text-muted-foreground">
                <b className="text-foreground">Öğe seç</b>&apos;e basın, sonra
                sayfada herhangi bir başlık, paragraf, düğme ya da bağlantıya
                tıklayın. Yorum bırakabilir ve metni değiştirip nasıl durduğunu
                görebilirsiniz.
              </p>
            )}

            {selected && (
              <div className="border-b border-border px-4 py-3">
                <p className="label mb-2 text-primary">Seçili öğe</p>
                <p className="mb-3 break-words text-meta text-muted-foreground">
                  {selected.label}
                </p>

                <label className="mb-1 block label text-faint" htmlFor="rv-yorum">
                  Yorum
                </label>
                <textarea
                  id="rv-yorum"
                  ref={yorumRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Ne değişmeli, neden?"
                  className="mb-3 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground placeholder:text-faint focus:border-primary"
                />

                <label className="mb-1 block label text-faint" htmlFor="rv-metin">
                  Metin (değiştirirseniz sayfaya uygulanır)
                </label>
                <textarea
                  id="rv-metin"
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  rows={2}
                  className="mb-3 w-full rounded-card border border-border bg-surface-1 px-3 py-2 text-body-sm text-foreground focus:border-primary"
                />

                <div className="flex gap-2">
                  <Button size="sm" onClick={kaydet}>
                    Kaydet
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelected(null)}
                  >
                    Vazgeç
                  </Button>
                </div>
              </div>
            )}

            {buSayfa.length > 0 && (
              <div className="px-4 py-3">
                <p className="label mb-2 text-faint">Bu sayfadaki notlar</p>
                <ul className="space-y-2">
                  {buSayfa.map((note) => (
                    <li
                      key={note.id}
                      className="border border-border bg-surface-1 p-2.5"
                    >
                      <p className="mb-1 break-words text-meta text-muted-foreground">
                        {note.targetLabel}
                      </p>
                      {note.text && (
                        <p className="mb-1 text-body-sm text-foreground">
                          {note.text}
                        </p>
                      )}
                      {note.replacement && (
                        <p className="mb-1 text-meta text-cold">
                          → {note.replacement}
                        </p>
                      )}
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-1.5 text-meta text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={note.done}
                            onChange={() =>
                              persist(
                                notes.map((n) =>
                                  n.id === note.id ? { ...n, done: !n.done } : n
                                )
                              )
                            }
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          çözüldü
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            persist(notes.filter((n) => n.id !== note.id))
                          }
                          className="min-h-6 text-meta text-muted-foreground hover:text-danger"
                        >
                          sil
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <footer className="flex items-center gap-2 border-t border-border px-4 py-3">
            <span className="flex-1 text-meta text-muted-foreground">
              {notes.length} not · {notes.filter((n) => n.done).length} çözüldü
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={kopyala}
              disabled={notes.length === 0}
            >
              {copied ? 'Kopyalandı' : 'Markdown kopyala'}
            </Button>
          </footer>
        </div>
      )}
    </>
  );
}
