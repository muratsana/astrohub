import { describe, expect, it } from 'vitest';
import { targetKindLabels, type TargetKind } from '../../domain/targets/derive';
import {
  groupOfKind,
  matchesGroup,
  TARGET_GROUP_CHIPS,
  type TargetGroup,
} from './grouping';
import { targets } from './data';

const ALL_KINDS = Object.keys(targetKindLabels) as TargetKind[];

describe('grouping — her tür bir karar taşıyor', () => {
  /*
   * `Record<TargetKind, …>` bunu derleme zamanında zaten zorluyor. Test
   * çalışma zamanında da bakıyor çünkü tip bilgisi derlemede siliniyor:
   * eşlemeye `as` ile dokunan bir düzenleme derlemeyi geçer, bu testi
   * geçemez.
   */
  it('katalogdaki 19 türün hepsi eşlemede var', () => {
    for (const kind of ALL_KINDS) {
      expect(
        groupOfKind(kind),
        `${kind} eşlemede yok`
      ).not.toBeUndefined();
    }
  });

  it('grup adları yalnızca üç değerden biri ya da null', () => {
    const allowed: (TargetGroup | null)[] = [
      'bulutsu',
      'kume',
      'galaksi',
      null,
    ];
    for (const kind of ALL_KINDS) {
      expect(allowed).toContain(groupOfKind(kind));
    }
  });
});

describe('grouping — gözlem davranışına göre ayrılıyor', () => {
  it('süpernova kalıntısı bulutsu tarafında', () => {
    // Çekim tarafında Ha/OIII ile çalışan bir gaz bulutu.
    expect(groupOfKind('sungerimsi-kalinti')).toBe('bulutsu');
  });

  it('yıldız bulutu küme sayılmıyor', () => {
    // M 24 bir küme değil, Samanyolu'nda bir pencere.
    expect(groupOfKind('yildiz-bulutu')).toBeNull();
  });

  it('asterizm ve çift yıldız hiçbir çipe girmiyor', () => {
    expect(groupOfKind('asterizm')).toBeNull();
    expect(groupOfKind('cift-yildiz')).toBeNull();
  });

  it('galaksi grubu galaksiyle aynı çipte', () => {
    expect(groupOfKind('galaksi-grubu')).toBe('galaksi');
  });
});

describe('matchesGroup', () => {
  it('"hepsi" hiçbir şeyi elemiyor', () => {
    for (const kind of ALL_KINDS) {
      expect(matchesGroup(kind, 'hepsi')).toBe(true);
    }
  });

  it('grupsuz tür hiçbir çipte görünmüyor', () => {
    for (const filter of ['bulutsu', 'kume', 'galaksi'] as const) {
      expect(matchesGroup('cift-yildiz', filter)).toBe(false);
    }
  });

  it('her tür en fazla bir çipte görünüyor', () => {
    for (const kind of ALL_KINDS) {
      const hits = (['bulutsu', 'kume', 'galaksi'] as const).filter((f) =>
        matchesGroup(kind, f)
      );
      expect(hits.length, `${kind} ${hits.length} çipte`).toBeLessThanOrEqual(1);
    }
  });
});

describe('grouping — çipler kataloğa karşı boş kalmıyor', () => {
  /*
   * ASIL RİSK BU. Eşleme kendi içinde tutarlı olabilir ve yine de işe
   * yaramaz: kataloğun hiçbir kaydı "Küme" grubuna düşmüyorsa çip her
   * zaman boş liste gösterir. Bu, gözle bakmadan fark edilmeyen türden
   * bir kırıklık — çipe basan kullanıcı arıza sanır.
   */
  it('üç çipin her biri katalogda en az on kayıt buluyor', () => {
    for (const { value, label } of TARGET_GROUP_CHIPS) {
      if (value === 'hepsi') continue;
      const count = targets.filter((t) => matchesGroup(t.kind, value)).length;
      expect(count, `${label} çipi ${count} kayıt buluyor`).toBeGreaterThan(10);
    }
  });

  it('çip listesi "Tümü" ile başlıyor ve dört öğe', () => {
    expect(TARGET_GROUP_CHIPS).toHaveLength(4);
    expect(TARGET_GROUP_CHIPS[0].value).toBe('hepsi');
  });
});
