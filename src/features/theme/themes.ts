/**
 * TEMA TANIMLARI — bileşen içermeyen saf katman.
 *
 * Sıra, etiketler ve adres çubuğu renkleri `ThemeContext` içinde
 * dururken her tüketici React bağlamını da yanında taşımak zorunda
 * kalıyordu; ayrıca aynı dosyadan hem bileşen hem sabit dışa vermek
 * hızlı yenilemeyi (fast refresh) bozuyor. Veri burada, bağlam orada.
 */

export type Theme = 'light' | 'dark' | 'field';

/**
 * Düğmenin dolaştığı sıra — aydınlıktan karanlığa.
 *
 * Kullanıcı düğmeye bastığında ekranın hangi yöne gideceğini tahmin
 * edebilmeli; rastgele bir sıra her tıklamayı sürprize çevirirdi.
 */
export const THEME_ORDER: readonly Theme[] = ['light', 'dark', 'field'];

export const themeLabels: Record<Theme, string> = {
  light: 'Açık tema',
  dark: 'Koyu tema',
  field: 'Saha modu',
};

/** Adres çubuğu rengi — tarayıcı arayüzü de moda uysun. */
export const THEME_COLOR: Record<Theme, string> = {
  light: '#f5f6f3',
  dark: '#07090b',
  field: '#0a0000',
};

export function isTheme(value: unknown): value is Theme {
  return THEME_ORDER.includes(value as Theme);
}

/** Sıradaki tema — dizinin sonunda başa sarar. */
export function nextTheme(current: Theme): Theme {
  const index = THEME_ORDER.indexOf(current);
  return THEME_ORDER[(index + 1) % THEME_ORDER.length];
}
