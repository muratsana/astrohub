import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * ═══════════════════════════════════════════════════════════════════════
 * TASARIM SİSTEMİ SÖZLEŞMESİ (Faz 2.1)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Bu dosya bir bileşen testi değil; KAYNAĞI ölçüyor.
 *
 * Sorun şuydu: token'lar vardı ama etraflarından dolaşılıyordu. Sayım —
 * `text-[12px]` 113 yerde, `text-[12.5px]` 41 yerde, `text-[13px]` 50
 * yerde, `rounded-[2px]` 21 yerde. Yani sistem yazılmıştı ve
 * kullanılmıyordu. `<h1>` tek başına BEŞ ayrı ölçü çiftiyle yazılmıştı.
 *
 * Token eklemek bu sorunu çözmez — token'ın etrafından dolaşmayı
 * İMKÂNSIZ kılan bir kapı çözer. Kapı burası.
 */

const root = resolve(__dirname, '../../..');
const css = readFileSync(join(root, 'src/index.css'), 'utf8');

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (name.endsWith('.tsx') && !name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

const sources = tsxFiles(join(root, 'src')).map((path) => ({
  path: relative(root, path),
  text: readFileSync(path, 'utf8'),
}));

describe('token ölçekleri tanımlı', () => {
  /*
   * Bir ölçek silinirse ona bağlı sınıflar Tailwind tarafından ÜRETİLMEZ
   * ve eleman punto/ölçü almadan çizilir — hata vermez, sadece yanlış
   * görünür. Sessiz kalmasın diye burada listeleniyor.
   */
  const olcekler: Record<string, string[]> = {
    'punto — gövde altı': ['--text-meta', '--text-caption', '--text-body-sm', '--text-body'],
    'punto — gösterge': [
      '--text-readout-sm',
      '--text-readout',
      '--text-readout-lg',
      '--text-readout-xl',
    ],
    ikon: ['--spacing-icon-inline', '--spacing-icon-ui', '--spacing-icon-lead'],
    'form ve düğme': [
      '--spacing-control-sm',
      '--spacing-control-md',
      '--spacing-control-lg',
      '--spacing-touch-min',
    ],
    katman: ['--z-sticky', '--z-drawer', '--z-modal', '--z-popover', '--z-toast'],
    yükselti: ['--shadow-overlay'],
    yüzey: ['--color-surface-1', '--color-surface-2', '--color-surface-3'],
    durum: ['--color-success', '--color-warning', '--color-danger'],
  };

  for (const [ad, tokenlar] of Object.entries(olcekler)) {
    it(`${ad} ölçeği eksiksiz`, () => {
      for (const token of tokenlar) {
        expect(css, token).toContain(`${token}:`);
      }
    });
  }

  it('başlık rolleri tanımlı', () => {
    for (const rol of [
      '.type-hero',
      '.type-page-lg',
      '.type-page',
      '.type-page-sm',
      '.type-section',
      '.type-panel',
    ]) {
      expect(css, rol).toContain(rol);
    }
  });

  /*
   * Başlık rolleri DUYARLI olmak zorunda: ölçünün kendisi değil, mobil
   * ile masaüstü arasındaki ORANI tutmak önemli. `sm:` karşılığı
   * unutulan bir başlık, masaüstünde mobil ölçüsünde kalır.
   */
  it('başlık rolleri kırılma noktası taşıyor', () => {
    const blok = css.slice(css.indexOf('.type-hero'));
    expect(blok).toContain('@media (min-width: 640px)');
    for (const rol of ['.type-hero', '.type-page-lg', '.type-page', '.type-page-sm', '.type-section']) {
      const duyarli = blok.slice(blok.indexOf('@media (min-width: 640px)'));
      expect(duyarli, `${rol} · sm karşılığı`).toContain(rol);
    }
  });
});

describe('token kaçağı yok', () => {
  /*
   * ASIL KAPI. Serbest punto yazmak, ölçeği hiç yazmamakla aynı kapıya
   * çıkıyor: her ekran kendi sayısını seçiyor ve site birleştirilmiş
   * görünüyor.
   */
  it('hiçbir dosyada serbest punto yok', () => {
    const kacaklar: string[] = [];
    for (const { path, text } of sources) {
      for (const m of text.matchAll(/text-\[[\d.]+px\]/g)) {
        kacaklar.push(`${path}: ${m[0]}`);
      }
    }
    expect(
      kacaklar,
      'Adlandırılmış punto kullanılmalı (text-meta / text-body-sm / text-readout-* / type-*)'
    ).toEqual([]);
  });

  it('hiçbir dosyada serbest radius yok', () => {
    const kacaklar: string[] = [];
    for (const { path, text } of sources) {
      for (const m of text.matchAll(/rounded-\[[^\]]+\]/g)) {
        kacaklar.push(`${path}: ${m[0]}`);
      }
    }
    expect(kacaklar, '`rounded-card` kullanılmalı').toEqual([]);
  });

  /*
   * YÜKSELTİ GÖLGESİ YOK — eksiklik değil, künyede yazılı bir karar:
   * "Yüzey ayrımı gölgeyle değil çizgiyle yapılır."
   *
   * AYRIM İNCE. Kaynakta `shadow-` geçen her yer ihlal değil: sitedeki
   * kullanımların hepsi BULANIKLIĞI SIFIR halkalar —
   * `shadow-[inset_0_0_0_2px_…]` bir odak halkası, `shadow-[0_0_0_1px_…]`
   * bir kenar çizgisi. Bunlar `box-shadow` özelliğini kullanan ÇİZGİLER,
   * gölge değil; `border` ile yapılamazlar çünkü kutu ölçüsünü değiştirir.
   *
   * Yasaklanan şey yükselti: Tailwind'in adlandırılmış kademeleri
   * (`shadow-md` gibi) ve bulanıklığı sıfırdan büyük serbest gölgeler.
   * İkisi de "bu yüzey ötekinin üstünde yüzüyor" der ve terminal dilini
   * bozar.
   */
  it('yükselti gölgesi kullanılmıyor — yüzey ayrımı çizgiyle', () => {
    const ADLI_KADEME = /\bshadow-(sm|md|lg|xl|2xl|inner)\b/;
    const kacaklar: string[] = [];

    for (const { path, text } of sources) {
      if (ADLI_KADEME.test(text)) {
        kacaklar.push(`${path}: adlandırılmış yükselti kademesi`);
      }
      for (const m of text.matchAll(/shadow-\[([^\]]+)\]/g)) {
        const uzunluklar = m[1].split('_').filter((t) => /^-?[\d.]+(px|rem)?$/.test(t));
        /* Üçüncü uzunluk bulanıklık. Sıfırsa bu bir halka; sıfırdan
           büyükse gerçek bir gölge. */
        const bulaniklik = uzunluklar[2] ?? '0';
        if (parseFloat(bulaniklik) !== 0) kacaklar.push(`${path}: ${m[0]}`);
      }
    }

    expect(kacaklar, 'Yüzey ayrımı gölgeyle değil çizgiyle yapılır').toEqual([]);
  });
});

describe('başlıklar ölçeğin dışına çıkmıyor', () => {
  /*
   * `<h1>` sitede BEŞ ayrı ölçü çiftiyle yazılmıştı; bölüm başlıkları da
   * Tailwind'in `text-lg`si ile ölçeğin dışına düşmüştü.
   *
   * Kural, "her başlık `type-*` almalı" DEĞİL — o fazla katı olurdu:
   * bir kart başlığı (`text-body-sm`) ya da küçük bir bölüm etiketi
   * (`label`) sayfa başlığı ölçeğine ait değildir ve olmamalı.
   *
   * Kural şu: başlık, projenin ölçeğinin DIŞINDAN bir punto seçemez.
   * Tailwind'in kendi `text-lg` / `text-sm` kademesi tam olarak bu —
   * projenin token'larıyla hiçbir ilişkisi olmayan paralel bir ölçek.
   */
  it('hiçbir h1/h2 Tailwind varsayılan punto kademesini kullanmıyor', () => {
    const TAILWIND_KADEME =
      /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\b/;
    const kacaklar: string[] = [];

    for (const { path, text } of sources) {
      for (const m of text.matchAll(/<h[12]\s[^>]*className=(["'{])([^>]*?)\1/g)) {
        if (TAILWIND_KADEME.test(m[2])) kacaklar.push(`${path}: ${m[2].slice(0, 70)}`);
      }
    }

    expect(kacaklar, 'Başlık proje ölçeğinden bir punto almalı').toEqual([]);
  });

  /*
   * Sayfa başlığı (`<h1>`) HER ZAMAN bir sayfa rolü taşımalı. Kart ya da
   * satır başlığı `<h2>` olabilir ama `<h1>` sayfanın kendisidir ve
   * ölçeğin tepesine aittir; puntosuz bırakılırsa tarayıcı varsayılanına
   * (2em) düşer ve ölçeğin tamamen dışına çıkar.
   */
  it('her h1 ölçekten bir rol taşıyor', () => {
    /*
     * `type-panel` de geçerli: giriş/kayıt sayfalarının tamamı 380px'lik
     * tek bir kart ve başlığı o kartın başlığıdır. Oraya sayfa ölçüsü
     * (26–30px) koymak, 32px'lik logonun yanındaki başlığı kartın
     * dışına taşırırdı.
     */
    const SAYFA_ROLU = /\btype-(hero|page|page-lg|page-sm|panel)\b/;
    const eksik: string[] = [];

    for (const { path, text } of sources) {
      for (const m of text.matchAll(/<h1\s[^>]*className=(["'{])([^>]*?)\1/g)) {
        if (m[2].includes('sr-only')) continue;
        if (!SAYFA_ROLU.test(m[2])) eksik.push(`${path}: ${m[2].slice(0, 70)}`);
      }
    }

    expect(eksik, 'Sayfa başlığı bir type-page* rolü almalı').toEqual([]);
  });
});
