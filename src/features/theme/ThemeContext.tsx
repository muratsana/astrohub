import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { THEME_COLOR, isTheme, nextTheme, type Theme } from './themes';

/**
 * Tema yönetimi.
 *
 * ÜÇ MOD, tek düğmeyle sırayla dolaşılır (sıra ve etiketler için
 * `themes.ts`):
 *
 *   light  açık     — gündüz masası; kâğıt zemin, grafit metin
 *   dark   koyu     — varsayılan; grafit zemin, fosfor kehribar aksan
 *   field  saha     — teleskop başında karanlık adaptasyonunu bozmayan
 *                     kırmızı. Mavi/yeşil kanallar tamamen kısılır.
 *
 * VARSAYILAN HÂLÂ KOYU ve sistem tercihini izlemiyoruz. Açık tema artık
 * var ama site bir cihaz gibi davranıyor: cihazın kendi varsayılan
 * görüntüsü olur, işletim sisteminden devralmaz. Kullanıcı bir kez
 * seçtiğinde seçimi kalıcı.
 *
 * Saha modu bir estetik tercih değil, sahada işe yarayan bir araç — bu
 * yüzden `fieldMode` ayrı bir bayrak olarak da veriliyor: "koyu mu"
 * sorusuyla "kırmızı mı" sorusu aynı şey değil.
 *
 * Tema `<html data-theme="…">` üzerinden uygulanır; renk token'ları
 * `src/index.css` içinde bu seçiciye göre yeniden atanır.
 */

const STORAGE_KEY = 'astrohub:theme';

interface ThemeContextValue {
  theme: Theme;
  /** Saha modu açık mı? (okunabilirlik için ayrı bayrak) */
  fieldMode: boolean;
  setTheme: (theme: Theme) => void;
  /** Sıradaki temaya geçer: açık → koyu → saha → açık. */
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'dark';
  } catch {
    // Gizli sekme / depolama kapalı: varsayılana düş.
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme]);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Depolama yoksa seçim yalnızca bu oturum için geçerli olur.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      fieldMode: theme === 'field',
      setTheme,
      cycleTheme: () => setTheme(nextTheme(theme)),
    }),
    [theme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  return ctx;
}
