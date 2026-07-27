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
 * Tema yönetimi (§19.7): koyu tema varsayılandır, açık tema opsiyoneldir.
 * Seçim `localStorage`'da saklanır; kullanıcı hiç seçim yapmadıysa işletim
 * sistemi tercihi (`prefers-color-scheme`) takip edilir.
 *
 * Tema `<html data-theme="…">` üzerinden uygulanır; renk token'ları
 * `src/index.css` içinde bu seçiciye göre yeniden atanır.
 */

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'astrohub:theme';

interface ThemeContextValue {
  theme: Theme;
  /** Kullanıcı açık bir seçim yaptı mı? (yoksa sistem tercihi izlenir) */
  isExplicit: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    // Gizli sekme / depolama kapalı: sessizce sistem tercihine düş.
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Theme | null>(() => readStoredTheme());
  const [system, setSystem] = useState<Theme>(() => systemTheme());

  const theme = stored ?? system;

  // Kullanıcı seçim yapmadıysa sistem tercihi değişimini canlı takip et.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: light)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) =>
      setSystem(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Tarayıcı arayüzü (adres çubuğu) de temaya uysun.
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#f6f8fc' : '#050a12');
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setStored(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Depolama yoksa seçim yalnızca bu oturum için geçerli olur.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isExplicit: stored !== null,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }),
    [theme, stored, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalıdır.');
  return ctx;
}
