import { beforeEach, describe, expect, it } from 'vitest';
import {
  emptyDraft,
  listSetups,
  saveSetup,
  setDefaultSetup,
} from './store';

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

/**
 * DÜZENLEME (F01) — kayıtlı ekipman silinip yeniden kurulmadan
 * değiştirilebilmeli. Silip yeniden kurmak paylaşım bağlantısını
 * (kimlik), varsayılan seçimini ve oluşturma tarihini götürüyordu.
 */
describe('saveSetup düzenleme (F01)', () => {
  it('bileşen değişimi aynı kayda yazılır, kimlik korunur', () => {
    const taslak = emptyDraft();
    taslak.slots.montur = 'eq6-r';
    const ilk = saveSetup({ name: 'Bahçe', draft: taslak }, NOW);

    const yeniTaslak = emptyDraft();
    yeniTaslak.slots.montur = 'cem70';
    const guncel = saveSetup(
      { id: ilk.id, name: 'Bahçe', draft: yeniTaslak },
      '2026-08-19T00:00:00.000Z'
    );

    expect(guncel.id).toBe(ilk.id);
    expect(guncel.draft.slots.montur).toBe('cem70');
    expect(listSetups()).toHaveLength(1);
  });

  it('düzenleme varsayılan bayrağını ve oluşturma tarihini korur', () => {
    const ilk = saveSetup({ name: 'Ana', draft: emptyDraft() }, NOW);
    setDefaultSetup(ilk.id);

    const guncel = saveSetup(
      {
        id: ilk.id,
        name: 'Ana — güncel',
        purpose: 'Geniş alan',
        draft: emptyDraft(),
      },
      '2026-08-20T00:00:00.000Z'
    );

    expect(guncel.isDefault).toBe(true);
    expect(guncel.createdAt).toBe(NOW);
    expect(guncel.updatedAt).toBe('2026-08-20T00:00:00.000Z');
    expect(guncel.name).toBe('Ana — güncel');
    expect(guncel.purpose).toBe('Geniş alan');
  });
});
