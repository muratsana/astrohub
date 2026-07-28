import { EyeIcon, MoonIcon, SunIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';
import { useTheme } from './ThemeContext';
import { nextTheme, themeLabels, type Theme } from './themes';

/**
 * TEMA DÜĞMESİ — üç kademe, tek düğme.
 *
 * Üç ayrı düğme (açık/koyu/saha) üst çubukta üç kutu demekti ve 390px'te
 * yer yok. Tek düğme sırayla dolaşıyor; hangi modda olduğunu **ikon**
 * söylüyor, metin değil:
 *
 *   güneş  açık tema
 *   ay     koyu tema
 *   göz    saha modu (karanlık adaptasyonu)
 *
 * Metin etiketi üst çubuktan kaldırıldı: "Saha" yazısı yalnızca üç moddan
 * birinin adıydı ve diğer ikisinde yanlış oluyordu. Erişilebilir ad
 * `aria-label` ile korunuyor ve **bir sonraki** modu söylüyor — düğmenin
 * vaadi, mevcut durum değil, tıklayınca ne olacağı.
 */

const ICONS: Record<Theme, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  field: EyeIcon,
};

export function ThemeIcon({
  theme,
  className,
}: {
  theme: Theme;
  className?: string;
}) {
  const Icon = ICONS[theme];
  return <Icon className={className} />;
}

/** Üst çubuk biçimi — yalnızca ikon, 32px dokunma hedefi (§6.7). */
export function ThemeToggle() {
  const { theme, cycleTheme } = useTheme();
  const upcoming = nextTheme(theme);

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Tema: ${themeLabels[theme]} — ${themeLabels[upcoming].toLocaleLowerCase('tr-TR')}na geç`}
      title={`${themeLabels[theme]} · tıkla → ${themeLabels[upcoming].toLocaleLowerCase('tr-TR')}`}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-card border transition-colors',
        theme === 'dark'
          ? 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground'
          : 'border-primary bg-primary/10 text-primary'
      )}
    >
      <ThemeIcon theme={theme} className="h-3.5 w-3.5" />
    </button>
  );
}

/**
 * Çekmece biçimi — telefonda tema düğmesi üst çubukta yok (yer yok), tek
 * erişim yolu burası. Üç mod tek tek listeleniyor: çekmecede yer var ve
 * dolaşmak yerine doğrudan seçmek daha az tıklama.
 */
export function ThemeToggleRow() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="mt-2 sm:hidden">
      <p className="label mb-1.5">Tema</p>
      <div className="grid grid-cols-3 gap-1.5">
        {(['light', 'dark', 'field'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setTheme(option)}
            aria-pressed={theme === option}
            className={cn(
              'flex flex-col items-center gap-1 rounded-card border px-2 py-2 text-[10px] tracking-[0.02em] transition-colors',
              theme === option
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground'
            )}
          >
            <ThemeIcon theme={option} className="h-4 w-4" />
            {themeLabels[option].replace(' tema', '').replace(' modu', '')}
          </button>
        ))}
      </div>
    </div>
  );
}
