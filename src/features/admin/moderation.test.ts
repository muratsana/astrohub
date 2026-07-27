import { describe, it, expect } from 'vitest';
import {
  countByStatus,
  targetLabels,
  statusLabels,
  reasonLabels,
  type ModerationStatus,
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
  it('her hedef türünün Türkçe karşılığı var', () => {
    expect(Object.keys(targetLabels)).toHaveLength(8);
    expect(targetLabels.forum_post).toBe('Forum mesajı');
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
