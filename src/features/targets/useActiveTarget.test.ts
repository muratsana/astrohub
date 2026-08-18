import { describe, expect, it } from 'vitest';
import { framingLink, SETUP_PARAM, TARGET_PARAM, toolLink } from './useActiveTarget';

describe('toolLink', () => {
  it('hedef ve ekipmanı adrese koyar', () => {
    expect(toolLink('/araclar/kadraj', { hedef: 'm31-andromeda', ekipman: 'abc' })).toBe(
      '/araclar/kadraj?hedef=m31-andromeda&ekipman=abc'
    );
  });

  /*
   * BOŞ DEĞER ATILIYOR. `?hedef=&ekipman=` gibi bir adres hem çirkin hem
   * de "seçim var ama boş" diye okunuyor — ve o adresi açan araç boş
   * dizeyi geçerli bir slug sanıp katalogda arardı.
   */
  it('boş ve null değerleri atar', () => {
    expect(toolLink('/araclar/kadraj', { hedef: 'm31', ekipman: null })).toBe(
      '/araclar/kadraj?hedef=m31'
    );
    expect(toolLink('/araclar/kadraj', { hedef: '', ekipman: '' })).toBe(
      '/araclar/kadraj'
    );
    expect(toolLink('/araclar/kadraj', {})).toBe('/araclar/kadraj');
  });

  it('slug içindeki özel karakterleri kodlar', () => {
    expect(toolLink('/x', { hedef: 'sh2-101' })).toBe('/x?hedef=sh2-101');
    expect(toolLink('/x', { hedef: 'a b' })).toContain('hedef=a+b');
  });
});

describe('framingLink', () => {
  it('kadraj aracına hedefle gider', () => {
    expect(framingLink('ngc6960')).toBe('/araclar/kadraj?hedef=ngc6960');
  });

  it('ekipman verilirse onu da taşır', () => {
    expect(framingLink('ngc6960', 'setup-1')).toBe(
      '/araclar/kadraj?hedef=ngc6960&ekipman=setup-1'
    );
  });
});

/* Parametre adları dört araç ve altı düğme tarafından okunuyor; değişmesi
   sessizce her devretmeyi kırar. */
describe('parametre adları', () => {
  it('sabit kalır', () => {
    expect(TARGET_PARAM).toBe('hedef');
    expect(SETUP_PARAM).toBe('ekipman');
  });
});
