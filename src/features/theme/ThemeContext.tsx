import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Tema yönetimi.
 *
 * İki mod vardır ve ikisi de koyudur:
 *
 *   dark   varsayılan — grafit zemin, fosfor kehribar aksan
 *   field  saha modu  — teleskop başında karanlık adaptasyonunu bozmayan
 *                       kırmızı. Mavi/yeşil kanallar tamamen kısılır.
 *
 * Açık tema **yoktur**: terminal metaforu tek bir görsel dünyada yaşar.
 * Saha modu bir estetik tercih değil, sahada işe yarayan bir araçtır —
 * bu yüzden sistem tercihini izlemez, yalnızca kullanıcı açar.
 *
 * Tema `<html data-theme="…">` üzerinden uygulanır; renk token'ları
 * `src/index.css` içinde bu seçiciye göre yeniden atanır.
 */

export type Theme = 'dark' | 'field';

const STORAGE_KEY = 'astrohub:theme';

interface ThemeContextValue {
  theme: Theme;
  /** Saha modu açık mı? (okunabilirlik için ayrı bayrak) */
  fieldMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleFieldMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'field' ? 'field' : 'dark';
  } catch {
    // Gizli sekme / depolama kapalı: varsayılana düş.
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Tarayıcı arayüzü (adres çubuğu) de moda uysun.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'field' ? '#0a0000' : '#07090b');
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
      toggleFieldMode: () => setTheme(theme === 'field' ? 'dark' : 'field'),
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
