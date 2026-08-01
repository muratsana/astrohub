import { describe, it, expect } from 'vitest';
import {
  countByStatus,
  targetLabels,
  statusLabels,
  reasonLabels,
  type ModerationStatus,
  type ModerationTarget,
} from './moderation';

describe('moderasyon kuyruğu sayımı', () => {
  it('boş kuyrukta tüm durumlar sıfır döner', () => {
    const counts = countByStatus([]);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
    // Panelin rozetleri eksik anahtar bekleyemez; hepsi tanımlı olmalı.
    expect(Object.keys(counts)).toHaveLength(5);
  });

  it('durumlara göre sayar', () => {
    const counts = countByStatus([
      { status: 'pending' },
      { status: 'pending' },
      { status: 'approved' },
      { status: 'escalated' },
    ]);

    expect(counts.pending).toBe(2);
    expect(counts.approved).toBe(1);
    expect(counts.escalated).toBe(1);
    expect(counts.rejected).toBe(0);
  });
});

describe('etiket sözlükleri', () => {
  /*
   * SAYI SABİTİ KALDIRILDI. Test "8 hedef türü olmalı" diyordu ve dokuzuncu
   * tür eklenince (0047: özel mesaj) kırıldı — oysa ölçmek istediği şey
   * sayı değil, HER TÜRÜN BİR KARŞILIĞI OLMASI. Zaten `Record<
   * ModerationTarget, string>` tipi eksik anahtarı derlemede yakalıyor;
   * buradaki testin işi etiketin BOŞ ya da yer tutucu olmadığını
   * doğrulamak.
   */
  it('her hedef türünün dolu bir Türkçe karşılığı var', () => {
    const targets = Object.keys(targetLabels) as ModerationTarget[];
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(targetLabels[target].trim().length).toBeGreaterThan(2);
    }
    expect(targetLabels.forum_post).toBe('Forum mesajı');
    expect(targetLabels.message).toBe('Özel mesaj');
  });

  it('her durumun karşılığı var ve boş değil', () => {
    const statuses: ModerationStatus[] = [
      'pending',
      'in_review',
      'approved',
      'rejected',
      'escalated',
    ];
    for (const status of statuses) {
      expect(statusLabels[status].length).toBeGreaterThan(2);
    }
  });

  it('gerekçeler şartnamedeki başlıkları karşılar', () => {
    expect(reasonLabels.telif).toBe('Telif ihlali');
    expect(reasonLabels['yanlis-konum']).toBe('Hassas konum ifşası');
    expect(Object.keys(reasonLabels)).toHaveLength(7);
  });
});
