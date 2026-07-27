import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  defaultHeroSlides,
  type EditableField,
  type HeroSlide,
} from '@/features/home/hero/slides';

/**
 * ÖNİZLEME EDİTÖRÜ — tasarım gözden geçirmeleri için canlı metin düzenleme.
 *
 * Amaç: hero metinlerini kod değiştirmeden, doğrudan önizleme üzerinde
 * deneyebilmek. Öğeye tıklanır, sağdaki panelde alanı düzenlenir, sonuç
 * anında görünür.
 *
 * Bu bir ürün özelliği DEĞİLDİR: yalnızca önizleme derlemesinde etkindir
 * (`VITE_PREVIEW_EDITOR`). Üretimde sağlayıcı düzenlemeyi kapatır, tıklama
 * yakalayıcıları hiç bağlanmaz ve panel ayrı bir chunk'ta kalıp hiç
 * istenmez — kullanıcıya inen pakete girmez.
 *
 * Düzenlemeler `localStorage`'da tutulur — sayfa yenilense de kaybolmaz;
 * "Sıfırla" ile koda geri dönülür.
 */

const STORAGE_KEY = 'astrohub:preview-hero';

/** Editör yalnızca önizleme derlemesinde açıktır. */
export const isPreviewEditorEnabled =
  import.meta.env.VITE_PREVIEW_EDITOR === 'true';

export interface Selection {
  slideId: string;
  field: EditableField;
}

interface PreviewEditorValue {
  enabled: boolean;
  slides: HeroSlide[];
  /** Panel açık mı? */
  open: boolean;
  selection: Selection | null;
  /** Düzenlenmiş alan var mı? (Sıfırla butonunu göstermek için) */
  dirty: boolean;
  setOpen: (open: boolean) => void;
  select: (selection: Selection | null) => void;
  updateField: (slideId: string, field: EditableField, value: string) => void;
  reset: () => void;
}

const PreviewEditorContext = createContext<PreviewEditorValue | undefined>(
  undefined
);

function readStored(): HeroSlide[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeroSlide[];
    // Kod tarafında slayt eklenmiş/çıkarılmışsa saklanan kopya geçersizdir.
    if (!Array.isArray(parsed) || parsed.length !== defaultHeroSlides.length) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function PreviewEditorProvider({ children }: { children: ReactNode }) {
  const [slides, setSlides] = useState<HeroSlide[]>(
    () => (isPreviewEditorEnabled && readStored()) || defaultHeroSlides
  );
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);

  const updateField = useCallback(
    (slideId: string, field: EditableField, value: string) => {
      setSlides((current) => {
        const next = current.map((slide) =>
          slide.id === slideId ? { ...slide, [field]: value } : slide
        );
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Depolama yoksa düzenleme yalnızca bu oturumda kalır.
        }
        return next;
      });
    },
    []
  );

  const reset = useCallback(() => {
    setSlides(defaultHeroSlides);
    setSelection(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // yoksay
    }
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(slides) !== JSON.stringify(defaultHeroSlides),
    [slides]
  );

  const value = useMemo<PreviewEditorValue>(
    () => ({
      enabled: isPreviewEditorEnabled,
      slides,
      open,
      selection,
      dirty,
      setOpen,
      select: (next) => {
        setSelection(next);
        if (next) setOpen(true);
      },
      updateField,
      reset,
    }),
    [slides, open, selection, dirty, updateField, reset]
  );

  return (
    <PreviewEditorContext.Provider value={value}>
      {children}
    </PreviewEditorContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreviewEditor(): PreviewEditorValue {
  const ctx = useContext(PreviewEditorContext);
  if (!ctx)
    throw new Error(
      'usePreviewEditor, PreviewEditorProvider içinde kullanılmalıdır.'
    );
  return ctx;
}
