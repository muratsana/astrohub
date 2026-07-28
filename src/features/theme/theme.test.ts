import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { THEME_ORDER, nextTheme, themeLabels, type Theme } from './themes';

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

describe('tema sırası', () => {
  it('üç kademe taşır', () => {
    expect(THEME_ORDER).toEqual(['light', 'dark', 'field']);
  });

  it('sondan başa sarar', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('field');
    expect(nextTheme('field')).toBe('light');
  });

  it('üç kez basınca başlangıca döner', () => {
    // Düğme tek; kullanıcı istediği moda ulaşamıyorsa döngü kırıktır.
    let theme: Theme = 'dark';
    for (let i = 0; i < THEME_ORDER.length; i++) theme = nextTheme(theme);
    expect(theme).toBe('dark');
  });

  it('her kademenin bir etiketi var', () => {
    for (const theme of THEME_ORDER) {
      expect(themeLabels[theme], theme).toBeTruthy();
    }
  });
});

describe('tema paletleri', () => {
  /*
   * Bir tema eklenip paleti yazılmazsa arayüz sessizce koyu temayla
   * çalışmaya devam eder: düğme dolaşır, hiçbir şey değişmez. Bu testin
   * yakaladığı tek şey o — token bloğu var mı.
   *
   * `dark` varsayılan ve `:root` üzerinden geliyor; kendi seçicisi yok.
   */
  const withSelector = THEME_ORDER.filter((t) => t !== 'dark');

  it.each(withSelector)('%s temasının token bloğu var', (theme) => {
    expect(css).toContain(`:root[data-theme='${theme}']`);
  });

  it.each(withSelector)('%s teması zemin ve metin rengini tanımlar', (theme) => {
    const block = css.slice(css.indexOf(`:root[data-theme='${theme}']`));
    const body = block.slice(0, block.indexOf('}'));
    for (const token of [
      '--color-background',
      '--color-foreground',
      '--color-primary',
      '--color-border',
    ]) {
      expect(body, `${theme} · ${token}`).toContain(token);
    }
  });

  it('açık tema color-scheme değerini de çevirir', () => {
    // Yalnızca token'ları değiştirip `color-scheme: dark` bırakmak,
    // tarayıcının kendi çizdiği kaydırma çubuğunu ve form denetimlerini
    // koyu bırakır — sayfa açık, denetimler koyu olurdu.
    const block = css.slice(css.indexOf(":root[data-theme='light']"));
    expect(block.slice(0, block.indexOf('}'))).toContain('color-scheme: light');
  });
});
