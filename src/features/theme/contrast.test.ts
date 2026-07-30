import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * KONTRAST REGRESYON KAPISI (QA GUI-02 / §6.7).
 *
 * Denetimde `text-faint` üç temada da WCAG AA'nın altındaydı (en kötü
 * 1.99:1) ve küçük metinlerde ~31 ihlalin kaynağıydı. Renkler
 * düzeltildi; bu test onların bir daha sessizce sönmesini engelliyor.
 *
 * Oranlar CSS'in KENDİSİNDEN okunuyor — testin içine kopyalanmış bir
 * palet, dosya değişince eskiyecek ve yeşil kalarak yanlış güven
 * verecekti.
 *
 * Eşik 4.5: WCAG 2.2 AA, küçük metin. Zemin olarak her temanın üç
 * yüzeyi de denenir; kart içindeki metin `surface-2` üzerinde durur ve
 * en kötü durum orada çıkar.
 */

const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');

/** Bir seçici bloğundan istenen token'ı okur (`:root`, `[data-theme=...]`). */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`seçici bulunamadı: ${selector}`);
  const open = css.indexOf('{', start);
  const end = css.indexOf('\n  }', open);
  const block = css.slice(open, end > 0 ? end : undefined);

  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--color-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const THEMES: Record<string, string> = {
  koyu: '@theme {',
  açık: ":root[data-theme='light']",
  saha: ":root[data-theme='field']",
};

/** Metin taşıyan token'lar — hepsi küçük puntoda okunabilir olmalı. */
const TEXT_TOKENS = [
  '--color-foreground',
  '--color-muted-foreground',
  '--color-faint',
  '--color-primary',
  '--color-cold',
  '--color-success',
  '--color-warning',
  '--color-danger',
];

const SURFACES = [
  '--color-background',
  '--color-surface-1',
  '--color-surface-2',
];

describe('tema kontrastı — WCAG 2.2 AA', () => {
  for (const [name, selector] of Object.entries(THEMES)) {
    describe(name, () => {
      const tokens = tokensIn(selector);

      for (const text of TEXT_TOKENS) {
        it(`${text} üç yüzeyde de 4.5:1 geçiyor`, () => {
          const color = tokens[text];
          expect(color, `${text} tanımlı değil (${name})`).toBeTruthy();

          for (const surface of SURFACES) {
            const bg = tokens[surface];
            expect(bg, `${surface} tanımlı değil (${name})`).toBeTruthy();
            const ratio = contrast(color, bg);
            expect(
              ratio,
              `${name}: ${text} / ${surface} = ${ratio.toFixed(2)}:1`
            ).toBeGreaterThanOrEqual(4.5);
          }
        });
      }

      it('üç metin kademesi ayırt edilebilir kalıyor', () => {
        /*
         * Kontrastı düzeltmenin kolay yolu üç kademeyi birbirine
         * yaklaştırmaktı; o zaman hepsi AA'yı geçer ama hiyerarşi
         * kaybolur. Kademeler arasında gözle görülür fark olmalı.
         */
        const bg = tokens['--color-background'];
        const fg = contrast(tokens['--color-foreground'], bg);
        const muted = contrast(tokens['--color-muted-foreground'], bg);
        const faint = contrast(tokens['--color-faint'], bg);

        expect(fg).toBeGreaterThan(muted * 1.25);
        expect(muted).toBeGreaterThan(faint * 1.25);
      });
    });
  }
});

describe('punto kademeleri', () => {
  it('en küçük semantik kademe 12px', () => {
    // 12px altı teknik metin mobilde okunmuyordu (QA GUI-01).
    expect(css).toMatch(/--text-meta:\s*12px/);
  });

  it('kart gövdesi kademesi en az 14px', () => {
    const match = css.match(/--text-body-sm:\s*(\d+(?:\.\d+)?)px/);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBeGreaterThanOrEqual(14);
  });
});
