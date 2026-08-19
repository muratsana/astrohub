import { describe, expect, it } from 'vitest';
import { EMPTY_SETUP, tumFiltreler, type SetupDraft } from './types';

/**
 * ÇOKLU FİLTRE (F02).
 *
 * Filtre çarkında birçok filtre taşınır ama optik yolda AYNI ANDA BİR
 * tane vardır. Bu yüzden takılı filtre `slots.filtre`de (backfocus onu
 * hesaba katıyor), diğerleri ayrı bir listede. `tumFiltreler` künye ve
 * profil için ikisini birleştiriyor.
 */
function taslak(over: Partial<SetupDraft> = {}): SetupDraft {
  return { ...EMPTY_SETUP, slots: {}, ...over };
}

describe('tumFiltreler (F02)', () => {
  it('takılı filtre ilk sırada, çarktakiler sonra', () => {
    const d = taslak({
      slots: { filtre: 'ha-3nm' },
      extraFilters: ['oiii-3nm', 'sii-3nm'],
    });
    expect(tumFiltreler(d)).toEqual(['ha-3nm', 'oiii-3nm', 'sii-3nm']);
  });

  it('ek filtre yoksa yalnızca takılı olan', () => {
    expect(tumFiltreler(taslak({ slots: { filtre: 'l-pro' } }))).toEqual([
      'l-pro',
    ]);
  });

  it('hiç filtre yoksa boş liste', () => {
    expect(tumFiltreler(taslak())).toEqual([]);
  });

  it('takılı filtre ek listede de varsa iki kez görünmez', () => {
    const d = taslak({
      slots: { filtre: 'ha-3nm' },
      extraFilters: ['ha-3nm', 'oiii-3nm'],
    });
    expect(tumFiltreler(d)).toEqual(['ha-3nm', 'oiii-3nm']);
  });

  it('boş satırları (henüz seçilmemiş) ayıklar', () => {
    const d = taslak({ slots: { filtre: 'ha-3nm' }, extraFilters: ['', 'oiii'] });
    expect(tumFiltreler(d)).toEqual(['ha-3nm', 'oiii']);
  });

  it('takılı filtre yokken ek filtreler yine listelenir', () => {
    // Kullanıcı çarkını doldurdu ama hangisinin takılı olduğunu seçmedi.
    expect(tumFiltreler(taslak({ extraFilters: ['ha', 'oiii'] }))).toEqual([
      'ha',
      'oiii',
    ]);
  });
});
