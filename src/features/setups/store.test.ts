import { beforeEach, describe, expect, it } from 'vitest';
import { emptyDraft, listSetups, saveSetup } from './store';

const NOW = '2026-08-18T00:00:00.000Z';

beforeEach(() => {
  localStorage.clear();
});

describe('saveSetup görünürlüğü', () => {
  /*
   * VARSAYILAN GÖRÜNÜR. Ekipman profil vitrininin çekirdeği ve varsayılan
   * gizliyken kimse açmıyordu. Bu sınav kararı sabitliyor: varsayılanı
   * sessizce "ozel"e geri çeviren bir düzenleme burada düşer.
   */
  it('yeni kayıt varsayılan olarak profilde görünür', () => {
    const kayit = saveSetup({ name: 'Gece kurulumu', draft: emptyDraft() }, NOW);
    expect(kayit.visibility).toBe('profilde');
  });

  it('açıkça verilen görünürlük varsayılanı ezer', () => {
    const kayit = saveSetup(
      { name: 'Özel', visibility: 'ozel', draft: emptyDraft() },
      NOW
    );
    expect(kayit.visibility).toBe('ozel');
  });

  /*
   * EN ÖNEMLİ KURAL. Kullanıcının bilerek gizlediği bir ekipmanı, sonraki
   * bir kaydetmede varsayılana döndürmek — ona sormadan verisini yayına
   * almak olurdu. Görünürlük belirtilmeden yapılan güncelleme mevcut
   * seçimi korumalı.
   */
  it('var olan kaydın gizliliği güncellemede korunur', () => {
    const ilk = saveSetup(
      { name: 'Özel', visibility: 'ozel', draft: emptyDraft() },
      NOW
    );

    const guncel = saveSetup(
      { id: ilk.id, name: 'Özel — yeni ad', draft: emptyDraft() },
      '2026-08-19T00:00:00.000Z'
    );

    expect(guncel.id).toBe(ilk.id);
    expect(guncel.visibility).toBe('ozel');
    expect(listSetups()).toHaveLength(1);
  });
});
